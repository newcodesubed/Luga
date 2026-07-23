const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { validate, outfitSchema } = require('../middleware/validate');
const authenticateToken = require('../middleware/authenticateToken');
const requireScope = require('../middleware/requireScope');
const llmService = require('../services/llmService');
const clothingService = require('../services/clothingService');
const { generateOutfitLimiter } = require('../middleware/rateLimiter');

const generateOutfitSchema = z.object({
  occasion: z.string().min(1, { message: 'Occasion is required' }),
  weather: z.string().optional().nullable(),
});

/**
 * @route POST /api/outfits/generate
 * @desc Generate an AI-recommended outfit preview (does NOT save to DB)
 * @access Private
 */
router.post('/generate', authenticateToken, requireScope('outfit:write'), generateOutfitLimiter, validate(generateOutfitSchema), async (req, res, next) => {
  const { occasion, weather } = req.body;
  const userId = req.user.id;

  try {
    const clothingItems = await clothingService.getClothingItemsByUser(userId);

    if (clothingItems.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No clothing items found in your closet. Please upload some clothes first!',
      });
    }

    const result = await llmService.generateOutfitRecommendations(clothingItems, occasion, weather);

    if (result.noNewCombinations) {
      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: {
          noNewCombinations: true,
          message: result.message
        }
      });
    }

    if (!result.clothingItemIds || result.clothingItemIds.length === 0) {
      return res.status(422).json({
        status: 'fail',
        message: 'The AI model could not construct a valid outfit selection.',
      });
    }

    const selectedItems = clothingItems.filter(item => result.clothingItemIds.includes(item.id));

    res.status(200).json({
      status: 'success',
      message: 'AI Outfit recommended successfully (preview).',
      data: {
        outfitName: result.outfitName,
        rationale: result.rationale,
        clothingItemIds: result.clothingItemIds,
        selectedItems
      }
    });
  } catch (error) {
    console.error("AI Outfit generation failed:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      status: 'error',
      message: error.message || "The AI agent failed to assemble a look."
    });
  }
});

/**
 * @route POST /api/outfits
 * @desc Save a generated outfit to the database
 * @access Private
 */
router.post('/', authenticateToken, requireScope('outfit:write'), validate(outfitSchema), async (req, res, next) => {
  const { name, occasion, clothingItemIds } = req.body;
  const userId = req.user.id;

  try {
    const verifiedIds = await clothingService.verifyUserClothingItemIds(userId, clothingItemIds);

    if (verifiedIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'None of the selected clothing items exist in your wardrobe.'
      });
    }

    const savedOutfit = await prisma.$transaction(async (tx) => {
      const outfit = await tx.outfit.create({
        data: {
          userId,
          name,
          occasion,
          isAiGenerated: true,
        }
      });

      const outfitItemData = verifiedIds.map(clothingItemId => ({
        outfitId: outfit.id,
        clothingItemId,
      }));

      await tx.outfitItem.createMany({
        data: outfitItemData,
      });

      return await tx.outfit.findUnique({
        where: { id: outfit.id },
        include: {
          outfitItems: {
            include: {
              clothingItem: true,
            }
          }
        }
      });
    });

    res.status(201).json({
      status: 'success',
      message: 'Outfit saved to lookbook successfully.',
      data: savedOutfit
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/outfits
 * @desc Get all saved outfits for the logged-in user
 * @access Private
 */
router.get('/', authenticateToken, requireScope('outfit:read'), async (req, res, next) => {
  const userId = req.user.id;
  try {
    const outfits = await prisma.outfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        outfitItems: {
          include: {
            clothingItem: true,
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: outfits.length,
      data: outfits,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/outfits/:id
 * @desc Delete a saved outfit by ID
 * @access Private
 */
router.delete('/:id', authenticateToken, requireScope('outfit:write'), async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const outfit = await prisma.outfit.findFirst({
      where: { id, userId },
    });

    if (!outfit) {
      return res.status(404).json({
        status: 'fail',
        message: 'Outfit not found or unauthorized',
      });
    }

    await prisma.outfit.delete({
      where: { id },
    });

    res.status(200).json({
      status: 'success',
      message: 'Outfit deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/outfits/:id
 * @desc Update an existing saved outfit (name, occasion, clothing items)
 * @access Private
 */
router.put('/:id', authenticateToken, requireScope('outfit:write'), validate(outfitSchema), async (req, res, next) => {
  const { id } = req.params;
  const { name, occasion, clothingItemIds } = req.body;
  const userId = req.user.id;

  try {
    const existingOutfit = await prisma.outfit.findFirst({
      where: { id, userId },
    });

    if (!existingOutfit) {
      return res.status(404).json({
        status: 'fail',
        message: 'Outfit not found or unauthorized',
      });
    }

    const verifiedIds = await clothingService.verifyUserClothingItemIds(userId, clothingItemIds);

    if (verifiedIds.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'None of the selected clothing items exist in your wardrobe.'
      });
    }

    const updatedOutfit = await prisma.$transaction(async (tx) => {
      await tx.outfit.update({
        where: { id },
        data: {
          name,
          occasion,
        }
      });

      await tx.outfitItem.deleteMany({
        where: { outfitId: id }
      });

      const outfitItemData = verifiedIds.map(clothingItemId => ({
        outfitId: id,
        clothingItemId,
      }));

      await tx.outfitItem.createMany({
        data: outfitItemData,
      });

      return await tx.outfit.findUnique({
        where: { id },
        include: {
          outfitItems: {
            include: {
              clothingItem: true,
            }
          }
        }
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Outfit updated successfully.',
      data: updatedOutfit
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

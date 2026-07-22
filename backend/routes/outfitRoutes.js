const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const authenticateToken = require('../middleware/authenticateToken');
const requireScope = require('../middleware/requireScope');
const llmService = require('../services/llmService');

const generateOutfitSchema = z.object({
  occasion: z.string().min(1, { message: 'Occasion is required' }),
  weather: z.string().optional().nullable(),
});

/**
 * @route POST /api/outfits/generate
 * @desc Generate an AI-recommended outfit and save it to the DB
 * @access Private
 */
router.post('/generate', authenticateToken, requireScope('outfit:write'), validate(generateOutfitSchema), async (req, res, next) => {
  const { occasion, weather } = req.body;
  const userId = req.user.id;

  try {
    // 1. Fetch user's clothing items
    const clothingItems = await prisma.clothingItem.findMany({
      where: { userId },
    });

    if (clothingItems.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No clothing items found in your closet. Please upload some clothes first!',
      });
    }

    // 2. Call LLM Service using Gemini
    const result = await llmService.generateOutfitRecommendations(clothingItems, occasion, weather);

    if (!result.clothingItemIds || result.clothingItemIds.length === 0) {
      return res.status(422).json({
        status: 'fail',
        message: 'The AI model could not construct a valid outfit selection.',
      });
    }

    // 3. Save to outfits & outfit_items tables in transaction
    const savedOutfit = await prisma.$transaction(async (tx) => {
      const outfit = await tx.outfit.create({
        data: {
          userId,
          name: result.outfitName,
          occasion: occasion,
          isAiGenerated: true,
        }
      });

      const outfitItemData = result.clothingItemIds.map(clothingItemId => ({
        outfitId: outfit.id,
        clothingItemId,
      }));

      await tx.outfitItem.createMany({
        data: outfitItemData,
      });

      // Query the full outfit back with items to return
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
      message: 'AI Outfit recommended and saved successfully.',
      data: {
        outfitName: result.outfitName,
        rationale: result.rationale,
        outfit: savedOutfit,
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

module.exports = router;

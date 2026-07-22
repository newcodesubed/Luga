const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const authenticateToken = require('../middleware/authenticateToken');
const requireScope = require('../middleware/requireScope');
const { OpenAI } = require('openai');

const generateOutfitSchema = z.object({
  occasion: z.string().min(1, { message: 'Occasion is required' }),
  weather: z.string().optional().nullable(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    // 2. Serialize and optimize items for token reduction
    const serializedCloset = clothingItems.map((item, index) => ({
      idx: index,
      c: item.category,
      s: item.subCategory || '',
      col: item.primaryColor,
      d: item.aiDescription || ''
    }));

    // 3. Construct system prompt defining style persona, strict rules
    const systemPrompt = `You are "Luga Stylist", an elite fashion designer and personal wardrobe stylist. 
Your task is to review the user's available wardrobe inventory and assemble ONE highly coordinated, aesthetically pleasing outfit perfect for the requested occasion and weather.

Strict constraints:
- You MUST only select items from the user's available closet.
- Use the item indices ('idx' field) to refer to selected items.
- Ensure the selection is cohesive (e.g. usually include at least one Top and one Bottom, or a dress, and appropriate shoes). Do not recommend mismatched colors or conflicting styles.
- You must output valid JSON matching this schema precisely:
{
  "outfitName": "A catchy, stylish name for the look",
  "rationale": "Detailed explanation of why these items work together for the occasion and weather",
  "selectedIdxs": [0, 2, ...] // Array of selected clothing indices matching the 'idx' field
}`;

    const userPrompt = `Occasion: ${occasion}
Weather Condition: ${weather || 'Any/Normal'}
Available Wardrobe Inventory JSON: ${JSON.stringify(serializedCloset)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Validate the response contains selected index list
    if (!result.selectedIdxs || !Array.isArray(result.selectedIdxs) || result.selectedIdxs.length === 0) {
      return res.status(422).json({
        status: 'fail',
        message: 'The AI model could not construct a valid outfit selection.',
      });
    }

    // Map selected indices back to real DB clothing item UUIDs
    const dbClothingIds = result.selectedIdxs
      .map(idx => clothingItems[idx]?.id)
      .filter(Boolean);

    if (dbClothingIds.length === 0) {
      return res.status(422).json({
        status: 'fail',
        message: 'The AI model selected items that do not exist in your closet.',
      });
    }

    // 4. Save to outfits & outfit_items tables in transaction
    const savedOutfit = await prisma.$transaction(async (tx) => {
      const outfit = await tx.outfit.create({
        data: {
          userId,
          name: result.outfitName,
          occasion: occasion,
          isAiGenerated: true,
        }
      });

      const outfitItemData = dbClothingIds.map(clothingItemId => ({
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
    res.status(500).json({ 
      status: 'error',
      message: "The AI agent failed to assemble a look.",
      error: error.message
    });
  }
});

module.exports = router;

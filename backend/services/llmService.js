const { GoogleGenAI } = require('@google/genai');
const { OpenAI } = require('openai');
const prisma = require('../utils/prisma');

// Read the provider from environment variables (defaults to 'gemini')
const provider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

let geminiClient = null;
let openaiClient = null;

if (provider === 'gemini') {
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
} else if (provider === 'openai') {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Helper to identify and standardize common API errors
 */
function standardizeError(error) {
  const errorMessage = error.message || '';
  
  if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('high demand')) {
    const err = new Error('The styling service is currently experiencing high demand. Please try again in a few moments.');
    err.statusCode = 503;
    return err;
  }
  
  if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RateLimit')) {
    const err = new Error('The service is temporarily busy or rate-limited. Please try again later.');
    err.statusCode = 429;
    return err;
  }

  const err = new Error('The AI agent failed to assemble a look.');
  err.statusCode = 500;
  return err;
}

/**
 * Generate outfit recommendations based on a user's closet, saved history, and a given occasion.
 */
async function generateOutfitRecommendations(clothingItems, occasion, weather = null) {
  // 1. Fetch user's existing saved outfits to prevent duplicates
  const userId = clothingItems[0]?.userId;
  const savedOutfits = userId ? await prisma.outfit.findMany({
    where: { userId },
    include: { outfitItems: true }
  }) : [];

  // Map database UUIDs to short indices
  const idToIdx = {};
  clothingItems.forEach((item, index) => {
    idToIdx[item.id] = index;
  });

  const existingOutfitsFormatted = savedOutfits.map(outfit => {
    const idxs = outfit.outfitItems
      .map(item => idToIdx[item.clothingItemId])
      .filter(val => val !== undefined)
      .sort((a, b) => a - b);
    return {
      name: outfit.name,
      idxs
    };
  });

  // 2. Serialize current wardrobe items
  const serializedCloset = clothingItems.map((item, index) => ({
    idx: index,
    c: item.category,
    s: item.subCategory || '',
    col: item.primaryColor,
    d: item.aiDescription || ''
  }));

  const systemPrompt = `You are "Luga Stylist", an elite fashion designer and personal wardrobe stylist. 
Your task is to review the user's available wardrobe inventory and assemble ONE highly coordinated, aesthetically pleasing outfit perfect for the requested occasion and weather.

Strict constraints:
- You MUST only select items from the user's available closet.
- Use the item indices ('idx' field) to refer to selected items.
- Ensure the selection is cohesive (e.g. usually include at least one Top and one Bottom, or a dress, and appropriate shoes). Do not recommend mismatched colors or conflicting styles.
- You MUST NOT recommend an outfit containing the exact same combination of clothing items as any of the already saved outfits.

Lookbook History (already saved item combinations to avoid duplicating):
${JSON.stringify(existingOutfitsFormatted)}

If it is impossible to generate a new, coordinated outfit combination for this occasion because the wardrobe is too small or all viable matching combinations are already saved, you must output:
{
  "noNewCombinations": true,
  "message": "It looks like you've already saved all the best combinations for this occasion from your current wardrobe!"
}

Otherwise, output valid JSON matching this schema precisely:
{
  "outfitName": "A catchy, stylish name for the look",
  "rationale": "Detailed explanation of why these items work together for the occasion and weather",
  "selectedIdxs": [0, 2, ...] // Array of selected clothing indices matching the 'idx' field
}`;

  const userPrompt = `Occasion: ${occasion}
Weather Condition: ${weather || 'Any/Normal'}
Available Wardrobe Inventory JSON: ${JSON.stringify(serializedCloset)}`;

  try {
    let resultJson = '';

    if (provider === 'openai') {
      if (!openaiClient) throw new Error('OpenAI client is not configured.');
      
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      resultJson = response.choices[0].message.content;

    } else {
      if (!geminiClient) throw new Error('Gemini client is not configured.');

      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: userPrompt }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        }
      });
      resultJson = response.text;
    }

    const result = JSON.parse(resultJson);
    
    // Check if the AI returned a "no new combinations" state
    if (result.noNewCombinations) {
      return {
        noNewCombinations: true,
        message: result.message
      };
    }

    // Map selected indices back to original database UUIDs safely
    const clothingItemIds = result.selectedIdxs
      .map(idx => clothingItems[idx]?.id)
      .filter(Boolean);

    return {
      outfitName: result.outfitName,
      rationale: result.rationale,
      clothingItemIds
    };

  } catch (error) {
    console.error(`LLM Service Error using ${provider.toUpperCase()}:`, error);
    throw standardizeError(error);
  }
}

module.exports = {
  generateOutfitRecommendations
};

const { GoogleGenAI } = require('@google/genai');
const { OpenAI } = require('openai');

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
 * Helper to identify and standardize common API errors (rate limits, overload/503s)
 */
function standardizeError(error) {
  const errorMessage = error.message || '';
  
  // Check if it looks like a Gemini overload or unavailable error
  if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('high demand')) {
    const err = new Error('The styling service is currently experiencing high demand. Please try again in a few moments.');
    err.statusCode = 503;
    return err;
  }
  
  // Check if it is an OpenAI/Gemini rate limit (429)
  if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RateLimit')) {
    const err = new Error('The service is temporarily busy or rate-limited. Please try again later.');
    err.statusCode = 429;
    return err;
  }

  // Generic fallback
  const err = new Error('The AI agent failed to assemble a look.');
  err.statusCode = 500;
  return err;
}

/**
 * Generate outfit recommendations based on a user's closet and a given occasion.
 * Dynamically switches between Gemini and OpenAI based on the LLM_PROVIDER env variable.
 */
async function generateOutfitRecommendations(clothingItems, occasion, weather = null) {
  // 1. Serialize and map items to short indices to optimize tokens
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
- You must output valid JSON matching this schema precisely:
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
      // Default to Gemini
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

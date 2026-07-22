const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Analyze an uploaded clothing item image using Gemini 2.5 Flash (free tier)
 * 
 * @param {string} imageUrl - The public URL of the uploaded image
 * @returns {Promise<{ category: string, subCategory: string, primaryColor: string, aiDescription: string }>}
 */
async function analyzeClothingImage(imageUrl) {
  // 1. Fetch image bytes and convert to base64 inlineData
  const imgResponse = await fetch(imageUrl);
  const arrayBuffer = await imgResponse.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = imgResponse.headers.get('content-type') || 'image/jpeg';

  const systemPrompt = `You are an expert fashion AI assistant. Analyze the clothing item image provided and return structured details.
You must return only a JSON object matching this structure:
{
  "category": "Tops" | "Bottoms" | "Outerwear" | "Shoes" | "Accessories",
  "subCategory": "e.g., T-shirt, Jeans, Sneakers, Jacket",
  "primaryColor": "e.g., #FFFFFF, #FF0000, #0000FF, #333333 (hex format)",
  "aiDescription": "A concise description of the clothing item including pattern, material, style, and fit."
}`;

  // 2. Query Gemini model
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      },
      { text: 'Analyze this clothing item.' }
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("Failed to process image analysis response from Gemini");
  }
}

/**
 * Generate outfit recommendations based on a user's closet and a given occasion.
 * Uses index-mapped token optimization to keep payloads highly compact.
 * 
 * @param {Array} clothingItems - Array of clothing items available in the user's closet
 * @param {string} occasion - The occasion or theme for the outfit (e.g., casual, wedding, business meeting)
 * @param {string|null} weather - Optional weather conditions (e.g., cold, rainy, hot)
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

  // 2. Query Gemini model
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ text: userPrompt }],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    }
  });

  try {
    const result = JSON.parse(response.text);
    
    // 3. Map selected indices back to original database UUIDs safely
    const clothingItemIds = result.selectedIdxs
      .map(idx => clothingItems[idx]?.id)
      .filter(Boolean);

    return {
      outfitName: result.outfitName,
      rationale: result.rationale,
      clothingItemIds
    };
  } catch (error) {
    console.error("Failed to parse Gemini outfit response:", error);
    throw new Error("Failed to generate outfit recommendation");
  }
}

module.exports = {
  analyzeClothingImage,
  generateOutfitRecommendations
};

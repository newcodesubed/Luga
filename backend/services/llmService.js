const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze an uploaded clothing item image using OpenAI GPT-4o-mini
 * @param {string} imageUrl - The public URL of the uploaded image
 * @returns {Promise<{ category: string, subCategory: string, primaryColor: string, aiDescription: string }>}
 */
async function analyzeClothingImage(imageUrl) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert fashion AI assistant. Analyze the clothing item image provided and return structured details.
You must return only a JSON object matching this structure:
{
  "category": "Tops" | "Bottoms" | "Outerwear" | "Shoes" | "Accessories",
  "subCategory": "e.g., T-shirt, Jeans, Sneakers, Jacket",
  "primaryColor": "e.g., #FFFFFF, #FF0000, #0000FF, #333333 (hex format)",
  "aiDescription": "A concise description of the clothing item including pattern, material, style, and fit."
}`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this clothing item:' },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    throw new Error("Failed to process image analysis response from AI");
  }
}

/**
 * Generate outfit recommendations based on a user's closet and a given occasion.
 * Uses index-mapped token optimization to keep payloads highly compact.
 * 
 * @param {Array} clothingItems - Array of clothing items available in the user's closet
 * @param {string} occasion - The occasion or theme for the outfit (e.g., casual, wedding, business meeting)
 */
async function generateOutfitRecommendations(clothingItems, occasion) {
  // 1. Serialize and map items to short indices to optimize tokens
  const serializedCloset = clothingItems.map((item, index) => ({
    idx: index,      // extremely light identifier instead of UUID
    c: item.category,
    s: item.subCategory || '',
    col: item.primaryColor,
    d: item.aiDescription || ''
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional personal fashion stylist. 
Given a list of clothing items in a user's closet (represented by compact JSON), generate 1-3 highly coordinated outfit recommendations for the requested occasion.
Choose items ONLY from the user's closet.
Return a JSON object with this exact structure:
{
  "outfits": [
    {
      "name": "Outfit Name",
      "occasion": "Occasion Name",
      "clothingItemIdxs": [0, 2, ...], // Use the 'idx' field from the input list
      "stylistNotes": "Notes explaining why these items match."
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Closet items: ${JSON.stringify(serializedCloset)}\nOccasion: ${occasion}`
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    const result = JSON.parse(response.choices[0].message.content);
    
    // 2. Map the indices back to the original database UUIDs safely
    const outfits = result.outfits.map(outfit => {
      const clothingItemIds = outfit.clothingItemIdxs
        .map(idx => clothingItems[idx]?.id)
        .filter(Boolean); // Filter out any invalid indices returned by the LLM
        
      return {
        name: outfit.name,
        occasion: outfit.occasion,
        clothingItemIds,
        stylistNotes: outfit.stylistNotes
      };
    });

    return { outfits };
  } catch (error) {
    console.error("Failed to parse LLM outfit response:", error);
    throw new Error("Failed to generate outfit recommendation");
  }
}

module.exports = {
  analyzeClothingImage,
  generateOutfitRecommendations
};

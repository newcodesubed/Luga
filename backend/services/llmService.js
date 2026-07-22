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
 * Generate outfit recommendations based on a user's closet and a given occasion
 * @param {Array} clothingItems - Array of clothing items available in the user's closet
 * @param {string} occasion - The occasion or theme for the outfit (e.g., casual, wedding, business meeting)
 */
async function generateOutfitRecommendations(clothingItems, occasion) {
  const closetSummary = clothingItems.map(item => ({
    id: item.id,
    category: item.category,
    subCategory: item.subCategory,
    primaryColor: item.primaryColor,
    aiDescription: item.aiDescription
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a professional personal fashion stylist. 
Given a list of clothing items in a user's closet, generate 1-3 highly coordinated outfit recommendations for the requested occasion.
Choose items ONLY from the user's closet.
You must return a JSON object with this exact structure:
{
  "outfits": [
    {
      "name": "Outfit Name",
      "occasion": "Occasion Name",
      "clothingItemIds": ["id1", "id2", ...],
      "stylistNotes": "Stylist note explaining why these items go well together for this occasion."
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Closet items: ${JSON.stringify(closetSummary)}\nOccasion: ${occasion}`
      }
    ],
    response_format: { type: "json_object" }
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Failed to parse LLM outfit response:", error);
    throw new Error("Failed to generate outfit recommendation");
  }
}

module.exports = {
  analyzeClothingImage,
  generateOutfitRecommendations
};

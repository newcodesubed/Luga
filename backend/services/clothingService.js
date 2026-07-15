const prisma = require('../utils/prisma');

/**
 * Save a new clothing item to the database.
 * @param {object} itemData 
 * @returns {Promise<object>}
 */
async function createClothingItem({ userId, imageUrl, category, subCategory, primaryColor, aiDescription }) {
  return await prisma.clothingItem.create({
    data: {
      userId,
      imageUrl,
      category,
      subCategory: subCategory || null,
      primaryColor,
      aiDescription: aiDescription || null,
    },
  });
}

/**
 * Retrieve all clothing items belonging to a specific user.
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
async function getClothingItemsByUser(userId) {
  return await prisma.clothingItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Retrieve a specific clothing item by ID.
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
async function getClothingItemById(id, userId) {
  return await prisma.clothingItem.findFirst({
    where: { id, userId },
  });
}

/**
 * Delete a clothing item by ID.
 * @param {string} id 
 * @param {string} userId 
 * @returns {Promise<object>}
 */
async function deleteClothingItem(id, userId) {
  return await prisma.clothingItem.delete({
    where: { id, userId },
  });
}

module.exports = {
  createClothingItem,
  getClothingItemsByUser,
  getClothingItemById,
  deleteClothingItem,
};

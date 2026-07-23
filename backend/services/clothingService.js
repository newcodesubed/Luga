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

/**
 * Update an existing clothing item by ID.
 * @param {string} id 
 * @param {string} userId 
 * @param {object} updateData 
 * @returns {Promise<object>}
 */
async function updateClothingItem(id, userId, { category, subCategory, primaryColor, aiDescription, imageUrl }) {
  return await prisma.clothingItem.update({
    where: { id, userId },
    data: {
      category,
      subCategory: subCategory !== undefined ? subCategory : undefined,
      primaryColor,
      aiDescription: aiDescription !== undefined ? aiDescription : undefined,
      imageUrl: imageUrl !== undefined ? imageUrl : undefined,
    },
  });
}

/**
 * Verify that a list of clothing item IDs exist and belong to the user.
 * @param {string} userId 
 * @param {Array<string>} itemIds 
 * @returns {Promise<Array<string>>} Array of verified item IDs
 */
async function verifyUserClothingItemIds(userId, itemIds = []) {
  if (!itemIds || itemIds.length === 0) return [];
  const validItems = await prisma.clothingItem.findMany({
    where: {
      id: { in: itemIds },
      userId,
    },
    select: { id: true }
  });
  return validItems.map(item => item.id);
}

module.exports = {
  createClothingItem,
  getClothingItemsByUser,
  getClothingItemById,
  deleteClothingItem,
  updateClothingItem,
  verifyUserClothingItemIds,
};

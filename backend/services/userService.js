const prisma = require('../utils/prisma');

/**
 * Find a user by their email address.
 * @param {string} email 
 * @returns {Promise<object|null>}
 */
async function findUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find a user by their unique ID.
 * @param {string} id 
 * @returns {Promise<object|null>}
 */
async function findUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });
}

/**
 * Create a new user in the database.
 * @param {object} userData
 * @param {string} userData.email
 * @param {string} userData.passwordHash
 * @returns {Promise<object>}
 */
async function createUser({ email, passwordHash }) {
  return await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
};

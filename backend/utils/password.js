const argon2 = require('argon2');

/**
 * Utility function to hash a plain text password.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} The hashed password.
 */
async function hashPassword(password) {
  return await argon2.hash(password);
}

/**
 * Utility function to verify a plain text password against a hash.
 * @param {string} hash - The hashed password.
 * @param {string} password - The plain text password.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
async function verifyPassword(hash, password) {
  return await argon2.verify(hash, password);
}

/**
 * Express middleware to automatically hash req.body.password and map it to req.body.passwordHash.
 */
async function hashPasswordMiddleware(req, res, next) {
  try {
    if (req.body && req.body.password) {
      req.body.passwordHash = await hashPassword(req.body.password);
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  hashPasswordMiddleware,
};

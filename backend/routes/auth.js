const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { hashPassword } = require('../utils/auth');
const { validate, registerSchema } = require('../middleware/validate');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', validate(registerSchema), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await userService.findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is already registered',
      });
    }

    // 2. Hash the password
    const passwordHash = await hashPassword(password);

    // 3. Create user in database
    const newUser = await userService.createUser({
      email,
      passwordHash,
    });

    // 4. Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 5. Send response
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

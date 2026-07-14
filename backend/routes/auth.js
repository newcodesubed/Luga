const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');
const { hashPassword, verifyPassword } = require('../utils/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validate');

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

/**
 * @route POST /api/auth/login
 * @desc Login user and return JWT token
 * @access Public
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Find user by email
    const user = await userService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    // 2. Verify password
    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password',
      });
    }

    // 3. Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4. Send response
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

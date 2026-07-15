const { z } = require('zod');

/**
 * Reusable Express middleware to validate request data against a Zod schema.
 * Supports validating req.body, req.query, or req.params.
 * 
 * @param {z.ZodSchema} schema - The Zod schema to validate against.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Parse and validate the incoming request body
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'fail',
        message: 'Validation error',
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }
    next(error);
  }
};

// --- Validation Schemas ---

const registerSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const clothingItemSchema = z.object({
  imageUrl: z.string().url({ message: 'Invalid image URL' }),
  key: z.string().min(1, { message: 'Storage key is required' }),
  category: z.string().min(1, { message: 'Category is required' }),
  subCategory: z.string().optional().nullable(),
  primaryColor: z.string().min(1, { message: 'Primary color is required' }),
  aiDescription: z.string().optional().nullable(),
});

const outfitSchema = z.object({
  name: z.string().min(1, { message: 'Outfit name is required' }),
  occasion: z.string().min(1, { message: 'Occasion is required' }),
  clothingItemIds: z.array(z.string().uuid({ message: 'Invalid clothing item ID format' })).min(1, {
    message: 'An outfit must contain at least one clothing item',
  }),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  clothingItemSchema,
  outfitSchema,
};

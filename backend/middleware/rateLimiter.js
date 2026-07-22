const rateLimit = require('express-rate-limit');

/**
 * Rate limiter middleware to prevent spamming LLM endpoints.
 * Limits users to 10 generation requests every 15 minutes per IP address.
 */
const generateOutfitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 outfit generations per windowMs
  message: {
    status: 'error',
    message: 'Too many outfit generation requests. Please try again in 15 minutes.'
  },
  standardHeaders: true, // Return standard rate limit info headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false,  // Disable older X-RateLimit-* headers
});

module.exports = {
  generateOutfitLimiter
};

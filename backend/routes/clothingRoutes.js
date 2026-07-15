const express = require('express');
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const router = express.Router();
const clothingService = require('../services/clothingService');
const r2Client = require('../utils/r2Client');
const authenticateToken = require('../middleware/authenticateToken');
const requireScope = require('../middleware/requireScope');
const { validate, clothingItemSchema } = require('../middleware/validate');

/**
 * Checks the magic numbers of a buffer to verify if it matches a valid image type.
 * Supports PNG, JPEG, GIF, and WEBP.
 */
function checkImageMagicNumbers(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }

  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50 // WEBP
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * @route POST /api/clothing
 * @desc Create/save a new clothing item
 * @access Private
 */
router.post('/', authenticateToken, requireScope('clothing:write'), validate(clothingItemSchema), async (req, res, next) => {
  const { imageUrl, key, category, subCategory, primaryColor, aiDescription } = req.body;

  try {
    // 1. Fetch only the first 12 bytes from Cloudflare R2
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Range: 'bytes=0-11', // Only retrieve the magic number header range
    });

    const r2Response = await r2Client.send(getCommand);
    
    // Convert stream to Buffer
    const chunks = [];
    for await (const chunk of r2Response.Body) {
      chunks.push(chunk);
    }
    const headerBuffer = Buffer.concat(chunks);

    // 2. Validate magic numbers
    const detectedMimeType = checkImageMagicNumbers(headerBuffer);

    if (!detectedMimeType) {
      // Security violation: The file is not a valid image format. Delete it immediately.
      await r2Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Security Alert: The uploaded file content is not a valid image format (PNG, JPEG, GIF, or WEBP).',
      });
    }

    // 3. File is verified and safe, save database record
    const newItem = await clothingService.createClothingItem({
      userId: req.user.id,
      imageUrl,
      category,
      subCategory,
      primaryColor,
      aiDescription,
    });

    res.status(201).json({
      status: 'success',
      message: 'Clothing item saved successfully and file contents verified.',
      data: newItem,
    });
  } catch (error) {
    // If the file was not found on R2 or S3 error occurred
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({
        status: 'fail',
        message: 'The uploaded file key does not exist in storage.',
      });
    }
    next(error);
  }
});

/**
 * @route GET /api/clothing
 * @desc Get all clothing items for the logged-in user
 * @access Private
 */
router.get('/', authenticateToken, requireScope('clothing:read'), async (req, res, next) => {
  try {
    const items = await clothingService.getClothingItemsByUser(req.user.id);
    
    res.status(200).json({
      status: 'success',
      results: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/clothing/:id
 * @desc Get a single clothing item by ID
 * @access Private
 */
router.get('/:id', authenticateToken, requireScope('clothing:read'), async (req, res, next) => {
  try {
    const item = await clothingService.getClothingItemById(req.params.id, req.user.id);
    
    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clothing item not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: item,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/clothing/:id
 * @desc Delete a clothing item by ID
 * @access Private
 */
router.delete('/:id', authenticateToken, requireScope('clothing:write'), async (req, res, next) => {
  try {
    const item = await clothingService.getClothingItemById(req.params.id, req.user.id);
    
    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clothing item not found or unauthorized',
      });
    }

    await clothingService.deleteClothingItem(req.params.id, req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Clothing item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const clothingService = require('../services/clothingService');
const authenticateToken = require('../middleware/authenticateToken');
const requireScope = require('../middleware/requireScope');
const { validate, clothingItemSchema, updateClothingItemSchema } = require('../middleware/validate');
const { validateR2ImageFile, deleteR2FileByUrl } = require('../utils/r2Helper');

/**
 * @route POST /api/clothing
 * @desc Create/save a new clothing item (with R2 file magic number security scan)
 * @access Private
 */
router.post('/', authenticateToken, requireScope('clothing:write'), validate(clothingItemSchema), async (req, res, next) => {
  const { imageUrl, key, category, subCategory, primaryColor, aiDescription } = req.body;

  try {
    // 1. Verify R2 image magic numbers (auto-deletes invalid upload)
    const { isValid } = await validateR2ImageFile(key);

    if (!isValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Security Alert: The uploaded file content is not a valid image format (PNG, JPEG, GIF, or WEBP).',
      });
    }

    // 2. File verified safe, create database record
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
 * @desc Delete a clothing item by ID and clean up its R2 storage object
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

    // Clean up file from Cloudflare R2
    await deleteR2FileByUrl(item.imageUrl);

    await clothingService.deleteClothingItem(req.params.id, req.user.id);

    res.status(200).json({
      status: 'success',
      message: 'Clothing item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/clothing/:id
 * @desc Update an existing clothing item's details (and replace image if uploaded)
 * @access Private
 */
router.put('/:id', authenticateToken, requireScope('clothing:write'), validate(updateClothingItemSchema), async (req, res, next) => {
  try {
    const item = await clothingService.getClothingItemById(req.params.id, req.user.id);
    
    if (!item) {
      return res.status(404).json({
        status: 'fail',
        message: 'Clothing item not found or unauthorized',
      });
    }

    // If replacing the image
    if (req.body.imageUrl && req.body.key) {
      // Validate magic numbers of replacement image
      const { isValid } = await validateR2ImageFile(req.body.key);

      if (!isValid) {
        return res.status(400).json({
          status: 'fail',
          message: 'Security Alert: The uploaded file content is not a valid image format.',
        });
      }

      // Delete old image file from R2
      await deleteR2FileByUrl(item.imageUrl);
    }

    const updatedItem = await clothingService.updateClothingItem(req.params.id, req.user.id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Clothing item updated successfully',
      data: updatedItem,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

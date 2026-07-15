const express = require('express');
const router = express.Router();
const clothingService = require('../services/clothingService');
const authenticateToken = require('../middleware/authenticateToken');
const { validate, clothingItemSchema } = require('../middleware/validate');

/**
 * @route POST /api/clothing
 * @desc Create/save a new clothing item
 * @access Private
 */
router.post('/', authenticateToken, validate(clothingItemSchema), async (req, res, next) => {
  const { imageUrl, category, subCategory, primaryColor, aiDescription } = req.body;

  try {
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
      message: 'Clothing item saved successfully',
      data: newItem,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/clothing
 * @desc Get all clothing items for the logged-in user
 * @access Private
 */
router.get('/', authenticateToken, async (req, res, next) => {
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
router.get('/:id', authenticateToken, async (req, res, next) => {
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
router.delete('/:id', authenticateToken, async (req, res, next) => {
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

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * @route GET /api/calendar
 * @desc Fetch all logs for a given month and year
 * @access Private
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month, 10) || (new Date().getMonth() + 1);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const logs = await prisma.dailyLog.findMany({
      where: {
        userId: req.user.id,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        items: {
          select: { id: true, imageUrl: true, category: true, subCategory: true, primaryColor: true }
        },
        outfit: {
          include: {
            outfitItems: {
              include: {
                clothingItem: {
                  select: { id: true, imageUrl: true, category: true, subCategory: true, primaryColor: true }
                }
              }
            }
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/calendar
 * @desc Log an outfit or items for a specific date (with atomic diffing & wear count sync)
 * @access Private
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { date, outfitId, clothingItemIds, itemIds } = req.body;
    const userId = req.user.id;

    if (!date) {
      return res.status(400).json({
        status: 'fail',
        message: 'Date (YYYY-MM-DD) is required',
      });
    }

    const logDate = new Date(date);
    const inputItemIds = itemIds || clothingItemIds || [];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Gather all item IDs involved in the NEW log
      let finalItemIds = [...inputItemIds];

      if (outfitId) {
        const outfit = await tx.outfit.findUnique({
          where: { id: outfitId },
          include: { outfitItems: { select: { clothingItemId: true } } }
        });
        if (outfit) {
          const outfitItemIds = outfit.outfitItems.map(i => i.clothingItemId);
          finalItemIds = Array.from(new Set([...finalItemIds, ...outfitItemIds]));
        }
      }

      // 2. Fetch any EXISTING log for this user & date to perform diffing
      const existingLog = await tx.dailyLog.findUnique({
        where: {
          userId_date: {
            userId,
            date: logDate
          }
        },
        include: {
          items: { select: { id: true } },
          outfit: {
            include: {
              outfitItems: { select: { clothingItemId: true } }
            }
          }
        }
      });

      let oldItemIds = new Set();
      let oldOutfitId = null;

      if (existingLog) {
        oldOutfitId = existingLog.outfitId;
        if (existingLog.items) {
          existingLog.items.forEach(i => oldItemIds.add(i.id));
        }
        if (existingLog.outfit && existingLog.outfit.outfitItems) {
          existingLog.outfit.outfitItems.forEach(i => oldItemIds.add(i.clothingItemId));
        }
      }

      // 3. Compute Item Diff: items to remove vs items to add
      const newItemsSet = new Set(finalItemIds);
      const itemsToRemove = [...oldItemIds].filter(id => !newItemsSet.has(id));
      const itemsToAdd = finalItemIds.filter(id => !oldItemIds.has(id));

      // Decrement removed items
      if (itemsToRemove.length > 0) {
        await tx.clothingItem.updateMany({
          where: { id: { in: itemsToRemove }, userId },
          data: { wearCount: { decrement: 1 } }
        });
      }

      // Increment added items
      if (itemsToAdd.length > 0) {
        await tx.clothingItem.updateMany({
          where: { id: { in: itemsToAdd }, userId },
          data: { wearCount: { increment: 1 }, lastWornAt: logDate }
        });
      }

      // Decrement old outfit if changed or cleared
      if (oldOutfitId && oldOutfitId !== outfitId) {
        await tx.outfit.updateMany({
          where: { id: oldOutfitId, userId },
          data: { wearCount: { decrement: 1 } }
        });
      }

      // Increment new outfit if added or changed
      if (outfitId && outfitId !== oldOutfitId) {
        await tx.outfit.updateMany({
          where: { id: outfitId, userId },
          data: { wearCount: { increment: 1 }, lastWornAt: logDate }
        });
      }

      // 4. Create or Update the DailyLog entry
      const log = await tx.dailyLog.upsert({
        where: {
          userId_date: {
            userId,
            date: logDate
          }
        },
        create: {
          userId,
          date: logDate,
          outfitId: outfitId || null,
          items: {
            connect: finalItemIds.map(id => ({ id }))
          }
        },
        update: {
          outfitId: outfitId || null,
          items: {
            set: finalItemIds.map(id => ({ id }))
          }
        },
        include: {
          items: true,
          outfit: {
            include: {
              outfitItems: {
                include: {
                  clothingItem: true
                }
              }
            }
          }
        }
      });

      return log;
    });

    res.status(201).json({
      status: 'success',
      message: 'Outfit logged to calendar successfully with wear counts synchronized.',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/calendar/:id
 * @desc Delete a daily log entry and decrement wear counts for its items
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const log = await prisma.dailyLog.findFirst({
      where: { id, userId },
      include: {
        items: { select: { id: true } },
        outfit: {
          include: {
            outfitItems: { select: { clothingItemId: true } }
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({
        status: 'fail',
        message: 'Calendar log not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Gather all items to decrement
      let itemIdsToDecrement = new Set();
      if (log.items) {
        log.items.forEach(i => itemIdsToDecrement.add(i.id));
      }
      if (log.outfit && log.outfit.outfitItems) {
        log.outfit.outfitItems.forEach(i => itemIdsToDecrement.add(i.clothingItemId));
      }

      // 2. Decrement wear counts for removed items
      const itemIdsArray = [...itemIdsToDecrement];
      if (itemIdsArray.length > 0) {
        await tx.clothingItem.updateMany({
          where: { id: { in: itemIdsArray }, userId },
          data: { wearCount: { decrement: 1 } }
        });
      }

      // 3. Decrement wear count for outfit combination if present
      if (log.outfitId) {
        await tx.outfit.updateMany({
          where: { id: log.outfitId, userId },
          data: { wearCount: { decrement: 1 } }
        });
      }

      // 4. Delete the DailyLog entry
      await tx.dailyLog.delete({
        where: { id }
      });
    });

    res.status(200).json({
      status: 'success',
      message: 'Calendar log removed and wear counts decremented.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

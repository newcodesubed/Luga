const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * Helper to recalibrate wear counts and lastWornAt for all clothing items and outfits of a user.
 * Guarantees 100% mathematical accuracy based strictly on existing DailyLogs in DB.
 */
async function recalibrateUserWearCounts(userId, tx) {
  const db = tx || prisma;

  // 1. Reset user clothing items
  await db.clothingItem.updateMany({
    where: { userId },
    data: { wearCount: 0, lastWornAt: null }
  });

  // 2. Reset user outfits
  await db.outfit.updateMany({
    where: { userId },
    data: { wearCount: 0, lastWornAt: null }
  });

  // 3. Fetch user daily logs ordered chronologically
  const userLogs = await db.dailyLog.findMany({
    where: { userId },
    include: {
      items: { select: { id: true } },
      outfit: {
        include: {
          outfitItems: { select: { clothingItemId: true } }
        }
      }
    },
    orderBy: { date: 'asc' }
  });

  const itemStats = {};
  const outfitStats = {};

  for (const log of userLogs) {
    const itemIdsInLog = new Set();
    if (log.items) log.items.forEach(i => itemIdsInLog.add(i.id));
    if (log.outfit && log.outfit.outfitItems) {
      log.outfit.outfitItems.forEach(i => itemIdsInLog.add(i.clothingItemId));
    }

    itemIdsInLog.forEach(itemId => {
      if (!itemStats[itemId]) itemStats[itemId] = { wearCount: 0, lastWornAt: log.date };
      itemStats[itemId].wearCount += 1;
      itemStats[itemId].lastWornAt = log.date;
    });

    if (log.outfitId) {
      if (!outfitStats[log.outfitId]) outfitStats[log.outfitId] = { wearCount: 0, lastWornAt: log.date };
      outfitStats[log.outfitId].wearCount += 1;
      outfitStats[log.outfitId].lastWornAt = log.date;
    }
  }

  for (const [itemId, stats] of Object.entries(itemStats)) {
    await db.clothingItem.updateMany({
      where: { id: itemId, userId },
      data: { wearCount: stats.wearCount, lastWornAt: stats.lastWornAt }
    });
  }

  for (const [outfitId, stats] of Object.entries(outfitStats)) {
    await db.outfit.updateMany({
      where: { id: outfitId, userId },
      data: { wearCount: stats.wearCount, lastWornAt: stats.lastWornAt }
    });
  }
}

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
 * @route POST /api/calendar/recalibrate
 * @desc Explicitly trigger wear count recalibration
 * @access Private
 */
router.post('/recalibrate', authenticateToken, async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await recalibrateUserWearCounts(req.user.id, tx);
    });

    res.status(200).json({
      status: 'success',
      message: 'Wear counts successfully recalibrated from actual calendar logs.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/calendar
 * @desc Log an outfit or items for a specific date (with automatic wear count recalibration)
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
      // 1. Gather item IDs for the outfit if outfitId provided
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

      // 2. Upsert the DailyLog entry for the date
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

      // 3. Recalibrate wear counts atomically to guarantee absolute accuracy
      await recalibrateUserWearCounts(userId, tx);

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
 * @desc Delete a daily log entry and recalibrate wear counts
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const log = await prisma.dailyLog.findFirst({
      where: { id, userId }
    });

    if (!log) {
      return res.status(404).json({
        status: 'fail',
        message: 'Calendar log not found',
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete the DailyLog entry
      await tx.dailyLog.delete({
        where: { id }
      });

      // 2. Recalibrate wear counts atomically
      await recalibrateUserWearCounts(userId, tx);
    });

    res.status(200).json({
      status: 'success',
      message: 'Calendar log removed and wear counts recalibrated.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

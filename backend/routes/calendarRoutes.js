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
 * @desc Log an outfit or items for a specific date
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
      // 1. Gather all item IDs involved in this wear log
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

      // 2. Create or Update the DailyLog entry
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
            set: finalItemIds.map(id => ({ id })) // Overwrites previous log for that day
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

      // 3. Increment wear counts and update lastWornAt for all involved items
      if (finalItemIds.length > 0) {
        await tx.clothingItem.updateMany({
          where: {
            id: { in: finalItemIds },
            userId
          },
          data: {
            wearCount: { increment: 1 },
            lastWornAt: logDate
          }
        });
      }

      // 4. Increment wear count and update lastWornAt for the Outfit combination if outfitId is provided
      if (outfitId) {
        await tx.outfit.updateMany({
          where: {
            id: outfitId,
            userId
          },
          data: {
            wearCount: { increment: 1 },
            lastWornAt: logDate
          }
        });
      }

      return log;
    });

    res.status(201).json({
      status: 'success',
      message: 'Outfit logged to calendar successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/calendar/:id
 * @desc Delete a daily log entry
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

    await prisma.dailyLog.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Calendar log removed',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

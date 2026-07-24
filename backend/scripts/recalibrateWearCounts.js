const prisma = require('../utils/prisma');

async function recalibrateWearCounts() {
  console.log('🔄 Starting wear count recalibration...');

  // 1. Reset all clothing items
  await prisma.clothingItem.updateMany({
    data: {
      wearCount: 0,
      lastWornAt: null,
    }
  });

  // 2. Reset all outfits
  await prisma.outfit.updateMany({
    data: {
      wearCount: 0,
      lastWornAt: null,
    }
  });

  // 3. Fetch all DailyLogs with item & outfit relations
  const allLogs = await prisma.dailyLog.findMany({
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

  console.log(`Found ${allLogs.length} total calendar logs in database.`);

  const itemStats = {}; // itemId -> { wearCount, lastWornAt }
  const outfitStats = {}; // outfitId -> { wearCount, lastWornAt }

  for (const log of allLogs) {
    const logDate = log.date;

    // Collect clothing item IDs in this log
    const itemIdsInLog = new Set();
    if (log.items) {
      log.items.forEach(i => itemIdsInLog.add(i.id));
    }
    if (log.outfit && log.outfit.outfitItems) {
      log.outfit.outfitItems.forEach(i => itemIdsInLog.add(i.clothingItemId));
    }

    itemIdsInLog.forEach(itemId => {
      if (!itemStats[itemId]) {
        itemStats[itemId] = { wearCount: 0, lastWornAt: logDate };
      }
      itemStats[itemId].wearCount += 1;
      itemStats[itemId].lastWornAt = logDate;
    });

    if (log.outfitId) {
      if (!outfitStats[log.outfitId]) {
        outfitStats[log.outfitId] = { wearCount: 0, lastWornAt: logDate };
      }
      outfitStats[log.outfitId].wearCount += 1;
      outfitStats[log.outfitId].lastWornAt = logDate;
    }
  }

  // Update ClothingItem records
  for (const [itemId, stats] of Object.entries(itemStats)) {
    await prisma.clothingItem.update({
      where: { id: itemId },
      data: {
        wearCount: stats.wearCount,
        lastWornAt: stats.lastWornAt,
      }
    });
  }

  // Update Outfit records
  for (const [outfitId, stats] of Object.entries(outfitStats)) {
    await prisma.outfit.update({
      where: { id: outfitId },
      data: {
        wearCount: stats.wearCount,
        lastWornAt: stats.lastWornAt,
      }
    });
  }

  console.log('✅ Recalibration complete! All wear counts are now perfectly synchronized with current DailyLogs.');
  process.exit(0);
}

recalibrateWearCounts().catch(err => {
  console.error('Error during recalibration:', err);
  process.exit(1);
});

const Listing = require("../modules/Listings/model");
const logger = require("./logger").child({ context: "EXP-Job" });

/**
 * Run marketplace hygiene tasks (expire listings and clear old boosts)
 */
const runMarketplaceCleanups = async () => {
  try {
    const now = new Date();

    // 1. Expire listings
    const expiredResult = await Listing.updateMany(
      {
        status: "active",
        expiresAt: { $lt: now },
        isDeleted: false,
      },
      {
        $set: { status: "expired" },
      },
    );

    if (expiredResult.modifiedCount > 0) {
      logger.info(`Auto-expired ${expiredResult.modifiedCount} listings.`);
    }

    // 2. Clear expired boosts
    const boostResult = await Listing.updateMany(
      {
        boostedUntil: { $lt: now },
        isDeleted: false,
      },
      {
        $set: { boostedUntil: null },
      },
    );

    if (boostResult.modifiedCount > 0) {
      logger.info(`Cleared ${boostResult.modifiedCount} expired boosts.`);
    }
  } catch (error) {
    logger.error("Error running marketplace cleanup job:", error);
  }
};

/**
 * Initialize all lifecycle background jobs
 */
const initLifecycleJobs = () => {
  // Run every hour
  const ONE_HOUR = 60 * 60 * 1000;

  // Initial run
  runMarketplaceCleanups();

  // Schedule
  setInterval(runMarketplaceCleanups, ONE_HOUR);

  logger.info("Lifecycle jobs initialized (Consolidated cleanup every 1 hour)");
};

module.exports = {
  initLifecycleJobs,
  runMarketplaceCleanups,
};

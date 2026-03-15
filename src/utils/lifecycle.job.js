const Listing = require("../modules/Listings/model");
const logger = require("./logger").child({ context: "EXP-Job" });

/**
 * Automatically set expired listings items to 'expired' status
 */
const expireListings = async () => {
  try {
    const now = new Date();
    const result = await Listing.updateMany(
      {
        status: "active",
        expiresAt: { $lt: now },
        isDeleted: false,
      },
      {
        $set: { status: "expired" },
      },
    );

    if (result.modifiedCount > 0) {
      logger.info(`Auto-expired ${result.modifiedCount} listings.`);
    }
  } catch (error) {
    logger.error("Error running listing expiry job:", error);
  }
};

/**
 * Initialize all lifecycle background jobs
 */
const initLifecycleJobs = () => {
  // Run every hour
  const ONE_HOUR = 60 * 60 * 1000;

  // Initial run
  expireListings();

  // Schedule
  setInterval(expireListings, ONE_HOUR);

  logger.info("Lifecycle jobs initialized (Check every 1 hour)");
};

module.exports = {
  initLifecycleJobs,
  expireListings,
};

const Subscription = require("./model");
const User = require("../Users/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const logger = require("../../utils/logger").child({ context: "Subscriptions" });

const PLANS = {
  free: {
    name: "Free",
    listingLimit: 3,
    featuredQuota: 0,
    boostQuota: 0,
  },
  verified: {
    name: "Verified",
    listingLimit: 10,
    featuredQuota: 2,
    boostQuota: 5,
  },
  business: {
    name: "Business",
    listingLimit: 1000, // Effectively unlimited
    featuredQuota: 10,
    boostQuota: 50,
  },
};

// Get user's current subscription or create default 'free' one
const getOrCreateSubscription = async (userId) => {
  let subscription = await Subscription.findOne({ user: userId });

  if (!subscription) {
    subscription = await Subscription.create({
      user: userId,
      plan: "free",
      status: "active",
      featuredAdsQuota: PLANS.free.featuredQuota,
      boostsQuota: PLANS.free.boostQuota,
    });

    await User.findByIdAndUpdate(userId, { subscription: subscription._id });
  }

  return subscription;
};

// Check if user can post a new ad based on their plan
const checkListingQuota = async (userId) => {
  const subscription = await getOrCreateSubscription(userId);
  const planDetails = PLANS[subscription.plan];

  const activeListingsCount = await require("../Listings/model").countDocuments({
    seller: userId,
    status: { $in: ["active", "featured", "draft"] },
    isDeleted: false
  });

  if (activeListingsCount >= planDetails.listingLimit) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Listing limit reached for your ${planDetails.name} plan (${planDetails.listingLimit} ads). Please upgrade your plan.`
    );
  }

  return true;
};

// Revert user to free plan (triggered by cancellation or payment failure)
const revertToFreePlan = async (userId) => {
  await Subscription.findOneAndUpdate(
    { user: userId },
    {
      plan: "free",
      status: "active",
      featuredAdsQuota: PLANS.free.featuredQuota,
      boostsQuota: PLANS.free.boostQuota,
      stripeSubscriptionId: null,
    }
  );
  logger.info(`User ${userId} reverted to free plan`);
};

module.exports = {
  getOrCreateSubscription,
  checkListingQuota,
  revertToFreePlan,
  PLANS,
};

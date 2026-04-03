const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../Subscriptions/model");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const { API_CONFIG, ENV } = require("../../constants");
const logger = require("../../utils/logger").child({ context: "Payments" });

// Plan hierarchy for upgrade/downgrade detection
const PLAN_HIERARCHY = {
  free: 0,
  verified: 1,
  business: 2,
};

/**
 * Create a Stripe Checkout Session for subscription or handle plan changes
 */
const createSubscriptionCheckout = async (userId, plan) => {
  const plans = require("../Subscriptions/service").PLANS;
  if (!plans[plan]) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan selected");
  }

  if (plan === "free") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Cannot subscribe to free plan. Use the portal to downgrade.");
  }

  const existingSubscription = await Subscription.findOne({ user: userId });

  // Prevent subscribing to the same plan if already active
  if (existingSubscription && existingSubscription.plan === plan && existingSubscription.status === "active") {
    throw new ApiError(httpStatus.BAD_REQUEST, `You are already subscribed to the ${plan} plan`);
  }

  // Handle plan changes for existing paid subscriptions
  if (existingSubscription && existingSubscription.stripeSubscriptionId && existingSubscription.plan !== "free") {
    return handlePlanChange(userId, existingSubscription, plan, plans);
  }

  // New subscription flow
  const sessionConfig = {
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: `BanzaarnaZone ${plan} subscription`,
          },
          unit_amount: plan === "verified" ? 10000 : 25000,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${ENV.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.CLIENT_URL}/payment-cancel`,
    metadata: {
      userId: String(userId),
      plan: plan,
      type: "subscription_upgrade",
    },
  };

  if (existingSubscription && existingSubscription.stripeCustomerId) {
    sessionConfig.customer = existingSubscription.stripeCustomerId;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return { url: session.url };
};

/**
 * Handle plan changes for existing subscriptions
 * Uses checkout session approach (supports inline price_data without needing Stripe Price IDs)
 */
const handlePlanChange = async (userId, existingSubscription, newPlan, plans) => {
  const currentHierarchy = PLAN_HIERARCHY[existingSubscription.plan];
  const newHierarchy = PLAN_HIERARCHY[newPlan];
  const isUpgrade = newHierarchy > currentHierarchy;

  logger.info(`Initiating plan change for user ${userId} from ${existingSubscription.plan} to ${newPlan} (${isUpgrade ? "upgrade" : "downgrade"})`);
  
  // Use checkout session for plan changes (supports inline price_data)
  return createNewSubscriptionCheckout(userId, newPlan, plans);
};

/**
 * Create new subscription checkout (fallback)
 */
const createNewSubscriptionCheckout = async (userId, plan, plans) => {
  const existingSubscription = await Subscription.findOne({ user: userId });

  const sessionConfig = {
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: `BanzaarnaZone ${plan} subscription`,
          },
          unit_amount: plan === "verified" ? 10000 : 25000,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${ENV.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.CLIENT_URL}/payment-cancel`,
    metadata: {
      userId: String(userId),
      plan: plan,
      type: "subscription_upgrade",
    },
  };

  if (existingSubscription && existingSubscription.stripeCustomerId) {
    sessionConfig.customer = existingSubscription.stripeCustomerId;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return { url: session.url };
};

/**
 * Create a Stripe Checkout Session for a single ad boost
 */
const createBoostCheckout = async (userId, listingId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }

  if (String(listing.seller) !== String(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not own this listing");
  }

  // Check if listing is already boosted
  if (listing.boostedUntil && listing.boostedUntil > new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "This listing is already boosted");
  }

  // Check boost quota
  const subscription = await Subscription.findOne({ user: userId });
  if (!subscription || subscription.boostsQuota <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No boost credits remaining. Please upgrade your plan.");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd", // Or PKR depends on config
          product_data: {
            name: `Ad Boost: ${listing.title}`,
            description: "Feature your ad at the top of results for 7 days",
          },
          unit_amount: 500, // $5.00 fixed for boost
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${ENV.CLIENT_URL}/listings/${listingId}?boost_success=true`,
    cancel_url: `${ENV.CLIENT_URL}/listings/${listingId}`,
    metadata: {
      userId: String(userId),
      listingId: String(listingId),
      type: "ad_boost",
    },
  });

  return { url: session.url };
};

/**
 * Create a Stripe Customer Portal session
 */
const createCustomerPortal = async (userId) => {
  const subscription = await Subscription.findOne({ user: userId });
  if (!subscription || !subscription.stripeCustomerId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No active billing profile found",
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${ENV.CLIENT_URL}/profile/subscription`,
  });

  return { url: session.url };
};

module.exports = {
  createSubscriptionCheckout,
  createBoostCheckout,
  createCustomerPortal,
};

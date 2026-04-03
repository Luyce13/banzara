const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../Subscriptions/model");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const { API_CONFIG, ENV } = require("../../constants");
const logger = require("../../utils/logger").child({ context: "Payments" });

const getConfiguredPriceId = (plan) => {
  if (plan === "verified") {
    return process.env.STRIPE_PRICE_VERIFIED || null;
  }
  if (plan === "business") {
    return process.env.STRIPE_PRICE_BUSINESS || null;
  }
  return null;
};

const setConfiguredPriceId = (plan, priceId) => {
  if (plan === "verified") {
    process.env.STRIPE_PRICE_VERIFIED = priceId;
  } else if (plan === "business") {
    process.env.STRIPE_PRICE_BUSINESS = priceId;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan for Stripe price config");
  }
  return priceId;
};

// Plan hierarchy for upgrade/downgrade detection
const PLAN_HIERARCHY = {
  free: 0,
  verified: 1,
  business: 2,
};

const getStripePriceIdForPlan = async (plan) => {
  const configured = getConfiguredPriceId(plan);
  if (configured) {
    return configured;
  }

  // Fallback: create product + price in Stripe and persist
  const productName = `BanzaarnaZone ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
  const product = await stripe.products.create({
    name: productName,
    metadata: { plan },
  });

  const amount = plan === 'verified' ? 10000 : 25000;
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    product: product.id,
    metadata: { plan },
  });

  setConfiguredPriceId(plan, price.id);
  return price.id;
};

const getStripePriceConfig = () => ({
  verified: process.env.STRIPE_PRICE_VERIFIED || null,
  business: process.env.STRIPE_PRICE_BUSINESS || null,
});

const createStripePriceForPlan = async (plan, rate) => {
  const plans = require("../Subscriptions/service").PLANS;
  if (!plans[plan] || plan === "free") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan for Stripe price creation");
  }

  const configured = getConfiguredPriceId(plan);
  if (configured) {
    return configured;
  }

  const productName = `BanzaarnaZone ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
  const product = await stripe.products.create({ name: productName, metadata: { plan } });

  const unitAmount = Number(rate || (plan === "verified" ? 10000 : 25000));
  if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid rate for Stripe price");
  }

  const price = await stripe.prices.create({
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    product: product.id,
    metadata: { plan },
  });

  setConfiguredPriceId(plan, price.id);
  return price.id;
};

const setStripePriceId = (plan, priceId) => {
  const plans = require("../Subscriptions/service").PLANS;
  if (!plans[plan] || plan === "free") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan for Stripe price config");
  }
  setConfiguredPriceId(plan, priceId);
  return priceId;
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
    const currentHierarchy = PLAN_HIERARCHY[existingSubscription.plan];
    const newHierarchy = PLAN_HIERARCHY[plan];
    const isUpgrade = newHierarchy > currentHierarchy;

    if (isUpgrade) {
      // UPGRADE: Require checkout confirmation before charging
      const planPriceId = await getStripePriceIdForPlan(plan);
      if (!planPriceId) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to resolve Stripe price for plan");
      }

      const sessionConfig = {
        payment_method_types: ["card"],
        line_items: [
          {
            price: planPriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${ENV.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${ENV.CLIENT_URL}/payment-cancel`,
        metadata: {
          userId: String(userId),
          plan: plan,
          type: "plan_upgrade",
          previousPlan: existingSubscription.plan,
          stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
        },
      };

      if (existingSubscription.stripeCustomerId) {
        sessionConfig.customer = existingSubscription.stripeCustomerId;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      return { url: session.url, isUpgrade: true };
    } else {
      // DOWNGRADE: Direct API update (no payment required)
      const updateResult = await handlePlanChange(userId, existingSubscription, plan, plans);
      return { ...updateResult, isUpgrade: false };
    }
  }

  // New subscription flow
  const planPriceId = await getStripePriceIdForPlan(plan);
  if (!planPriceId) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to resolve Stripe price for plan");
  }

  const sessionConfig = {
    payment_method_types: ["card"],
    line_items: [
      {
        price: planPriceId,
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

  // Get existing Stripe subscription and item
  const stripeSubscription = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
  const subscriptionItem = stripeSubscription.items.data[0];
  if (!subscriptionItem) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Existing Stripe subscription item not found.");
  }

  // Determine price for the new plan (env values preferred)
  const newPriceId = await getStripePriceIdForPlan(newPlan);

  // Update Stripe subscription with new plan
  const updated = await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
    proration_behavior: isUpgrade ? "create_prorations" : "create_prorations",
    items: [
      {
        id: subscriptionItem.id,
        price: newPriceId,
      },
    ],
  });

  // Persist data to DB
  // Use current_period_end if available; fallback to billing_cycle_anchor + 30 days
  let periodEnd = null;
  if (updated.current_period_end) {
    periodEnd = new Date(updated.current_period_end * 1000);
  } else if (updated.billing_cycle_anchor) {
    // Fallback: add 30 days to billing cycle anchor (for monthly plans)
    periodEnd = new Date((updated.billing_cycle_anchor + 30 * 24 * 60 * 60) * 1000);
  }

  await Subscription.findOneAndUpdate(
    { user: userId },
    {
      plan: newPlan,
      status: updated.status,
      stripeSubscriptionId: updated.id,
      stripeCustomerId: updated.customer,
      featuredAdsQuota: plans[newPlan].featuredQuota,
      boostsQuota: plans[newPlan].boostQuota,
      currentPeriodEnd: periodEnd,
    },
    { upsert: true }
  );

  logger.info(`Plan change done for user ${userId} to ${newPlan}`);
  return {
    message: `Plan changed to ${newPlan}`,
    stripeSubscriptionId: updated.id,
    newPlan,
    isUpgrade,
  };
};

/**
 * Create new subscription checkout (fallback)
 */
const createNewSubscriptionCheckout = async (userId, plan, plans) => {
  const existingSubscription = await Subscription.findOne({ user: userId });

  const planPriceId = await getStripePriceIdForPlan(plan);
  if (!planPriceId) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to resolve Stripe price for plan");
  }

  const sessionConfig = {
    payment_method_types: ["card"],
    line_items: [
      {
        price: planPriceId,
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
  getStripePriceConfig,
  createStripePriceForPlan,
  setStripePriceId,
};

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../Subscriptions/model");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const { API_CONFIG, ENV } = require("../../constants");

/**
 * Create a Stripe Checkout Session for subscription upgrade
 */
const createSubscriptionCheckout = async (userId, plan) => {
  const plans = require("../Subscriptions/service").PLANS;
  if (!plans[plan]) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid plan selected");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd", // default currency
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
  });

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

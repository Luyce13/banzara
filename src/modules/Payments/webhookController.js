const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../Subscriptions/model");
const Listing = require("../Listings/model");
const logger = require("../../utils/logger").child({ context: "Payments" });

const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;
    case "invoice.paid":
      const invoice = event.data.object;
      await handleInvoicePaid(invoice);
      break;
    case "customer.subscription.deleted":
      const deletedSub = event.data.object;
      await handleSubscriptionDeleted(deletedSub);
      break;
    case "invoice.payment_failed":
      const failedInvoice = event.data.object;
      await handlePaymentFailed(failedInvoice);
      break;
    default:
      logger.info(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

async function handleCheckoutCompleted(session) {
  const { userId, plan, listingId, type } = session.metadata;

  if (type === "subscription_upgrade") {
    const plans = require("../Subscriptions/service").PLANS;
    await Subscription.findOneAndUpdate(
      { user: userId },
      {
        plan: plan,
        status: "active",
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        featuredAdsQuota: plans[plan].featuredQuota,
        boostsQuota: plans[plan].boostQuota,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Approx 30 days
      },
      { upsert: true }
    );
    logger.info(`User ${userId} upgraded to ${plan} plan`);
  } else if (type === "ad_boost") {
    const boostedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 day boost
    await Listing.findByIdAndUpdate(listingId, {
      boostedUntil: boostedUntil,
    });
    // Decrement boost quota
    await Subscription.findOneAndUpdate(
      { user: userId },
      { $inc: { boostsQuota: -1 } }
    );
    logger.info(`Listing ${listingId} boosted until ${boostedUntil}`);
  }
}

async function handleInvoicePaid(invoice) {
  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  const subscription = await Subscription.findOne({ stripeSubscriptionId });
  if (!subscription) return;

  const plans = require("../Subscriptions/service").PLANS;
  const plan = subscription.plan;

  // Renew the period and reset quotas
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId },
    {
      status: "active",
      featuredAdsQuota: plans[plan].featuredQuota,
      boostsQuota: plans[plan].boostQuota,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }
  );
  
  logger.info(`Subscription ${stripeSubscriptionId} renewed via invoice.paid`);
}

async function handleSubscriptionDeleted(subscription) {
  const stripeSubscriptionId = subscription.id;
  const subDoc = await Subscription.findOne({ stripeSubscriptionId });
  if (subDoc) {
    const subscriptionService = require("../Subscriptions/service");
    await subscriptionService.revertToFreePlan(subDoc.user);
  }
}

async function handlePaymentFailed(invoice) {
  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId },
    { status: "past_due" }
  );
  logger.warn(`Subscription ${stripeSubscriptionId} marked as past_due`);
}

module.exports = {
  handleWebhook,
};

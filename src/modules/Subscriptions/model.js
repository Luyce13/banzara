const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "verified", "business"],
      default: "free",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "past_due", "canceled", "incomplete", "incomplete_expired", "trialing", "unpaid"],
      default: "active",
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    currentPeriodEnd: {
      type: Date,
    },
    // Feature quotas available for the current period
    featuredAdsQuota: {
      type: Number,
      default: 0,
    },
    boostsQuota: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;

const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String },
    position: {
      type: String,
      enum: ["top", "sidebar", "in-feed", "popup"],
      required: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    durationDays: {
      type: Number,
      default: 30,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;

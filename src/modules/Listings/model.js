const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    slug: { type: String, unique: true },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["product", "service"],
      required: true,
    },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },
    images: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
      },
    ],
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
      label: String,
    },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
    },
    status: {
      type: String,
      enum: ["draft", "active", "sold", "expired", "archived"],
      default: "active",
      index: true,
    },
    // Classifieds Metadata
    expiresAt: {
      type: Date,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    boostedUntil: {
      type: Date,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    avgRating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Plugin
const softDeletePlugin = require("../../utils/softDeletePlugin");
listingSchema.plugin(softDeletePlugin);

// Indexes
listingSchema.index({ location: "2dsphere" });
listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ seller: 1, status: 1 });

// Auto-generate slug from title
listingSchema.pre("save", function () {
  if (this.isModified("title") && !this.slug) {
    const base = this.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const suffix = Date.now().toString(36);
    this.slug = `${base}-${suffix}`;
  }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;

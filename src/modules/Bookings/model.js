const mongoose = require("mongoose");
const softDeletePlugin = require("../../utils/softDeletePlugin");

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: ["buyer", "seller"],
    },
    note: {
      type: String,
      trim: true,
    },
    scheduledAt: {
      type: Date,
    },
    price: {
      type: Number,
      required: true, // Snapshot of price at time of booking
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.plugin(softDeletePlugin);

// Ensure price is captured from listing if not provided, but service should handle this
// Adding compound indexes for efficiency
bookingSchema.index({ buyer: 1, status: 1 });
bookingSchema.index({ seller: 1, status: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;

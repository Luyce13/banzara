const mongoose = require("mongoose");
const Review = require("./model");
const Booking = require("../Bookings/model");
const User = require("../Users/model");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;

/**
 * Calculate and update user's aggregate rating (across all his/her listings)
 */
const updateUserRating = async (userId) => {
  const stats = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId), isDeleted: false } },
    {
      $group: {
        _id: "$reviewee",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      avgRating: stats[0].avgRating.toFixed(1),
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await User.findByIdAndUpdate(userId, { avgRating: 0, reviewCount: 0 });
  }
};

/**
 * Calculate and update listing's aggregate rating (specific to the listing)
 */
const updateListingRating = async (listingId) => {
  const stats = await Review.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(listingId), isDeleted: false } },
    {
      $group: {
        _id: "$listing",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Listing.findByIdAndUpdate(listingId, {
      avgRating: stats[0].avgRating.toFixed(1),
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await Listing.findByIdAndUpdate(listingId, { avgRating: 0, reviewCount: 0 });
  }
};

/**
 * Create a new review
 */
const createReview = async (body, userId) => {
  const { booking: bookingId, rating, comment } = body;

  const booking = await Booking.findById(bookingId).populate("listing");
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  // 1. Must be the buyer
  if (String(booking.buyer) !== String(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, "Only the buyer can review this booking");
  }

  // 2. Booking must be completed
  if (booking.status !== "completed") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only review completed bookings",
    );
  }

  // 3. Check if review already exists
  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    throw new ApiError(httpStatus.CONFLICT, "Review already exists for this booking");
  }

  const review = await Review.create({
    reviewer: userId,
    reviewee: booking.seller,
    listing: booking.listing._id,
    booking: bookingId,
    rating,
    comment,
  });

  // 4. Update aggregate ratings asynchronously
  const sellerId = booking.seller;
  const listingId = booking.listing._id;

  updateUserRating(sellerId).catch((err) => {
    console.error(`Failed to update rating for seller ${sellerId}:`, err);
  });
  
  updateListingRating(listingId).catch((err) => {
    console.error(`Failed to update rating for listing ${listingId}:`, err);
  });

  return review;
};

/**
 * Get reviews for a user (reviewee)
 */
const getReviewsForUser = async (userId, query, options) => {
  const filter = { ...query, reviewee: userId };
  const reviews = await Review.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .skip(options.skip)
    .limit(options.limit)
    .populate("reviewer", "name avatar avgRating")
    .populate("listing", "title slug");

  const total = await Review.countDocuments(filter);

  return {
    reviews,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

/**
 * Get reviews for a listing
 */
const getReviewsForListing = async (listingId, query, options) => {
  const filter = { ...query, listing: listingId };
  const reviews = await Review.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .skip(options.skip)
    .limit(options.limit)
    .populate("reviewer", "name avatar");

  const total = await Review.countDocuments(filter);

  return {
    reviews,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

module.exports = {
  createReview,
  getReviewsForUser,
  getReviewsForListing,
};

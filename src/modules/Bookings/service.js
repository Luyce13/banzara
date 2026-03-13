const Booking = require("./model");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;

/**
 * Create a new booking
 */
const createBooking = async (listingId, body, userId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }

  if (listing.status !== "active") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Listing is not active");
  }

  if (String(listing.seller) === String(userId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You cannot book your own listing");
  }

  const bookingData = {
    ...body,
    listing: listingId,
    buyer: userId,
    seller: listing.seller,
    price: listing.price, // Snapshot of price
    status: "pending",
  };

  const booking = await Booking.create(bookingData);
  return booking.populate(["listing", "buyer", "seller"]);
};

/**
 * Get booking by ID
 */
const getBookingById = async (id, userId) => {
  const booking = await Booking.findById(id).populate([
    "listing",
    "buyer",
    "seller",
  ]);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (
    String(booking.buyer._id) !== String(userId) &&
    String(booking.seller._id) !== String(userId)
  ) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to view this booking",
    );
  }

  return booking;
};

/**
 * Get user bookings
 */
const getMyBookings = async (userId, role, query, options) => {
  const filter = { ...query };
  if (role === "buyer") {
    filter.buyer = userId;
  } else if (role === "seller") {
    filter.seller = userId;
  } else {
    filter.$or = [{ buyer: userId }, { seller: userId }];
  }

  const bookings = await Booking.find(filter)
    .sort(options.sort || { createdAt: -1 })
    .skip(options.skip)
    .limit(options.limit)
    .populate("listing", "title slug images price")
    .populate("buyer", "name email")
    .populate("seller", "name email");

  const total = await Booking.countDocuments(filter);

  return {
    bookings,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

/**
 * Update booking status
 */
const updateBookingStatus = async (id, newStatus, userId) => {
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const { status, seller, buyer } = booking;
  const isSeller = String(seller) === String(userId);
  const isBuyer = String(buyer) === String(userId);

  // State Machine Logic
  if (newStatus === "confirmed") {
    if (!isSeller) {
      throw new ApiError(httpStatus.FORBIDDEN, "Only seller can confirm booking");
    }
    if (status !== "pending") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot confirm booking with status ${status}`,
      );
    }
  } else if (newStatus === "completed") {
    if (!isSeller) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Only seller can mark booking as completed",
      );
    }
    if (status !== "confirmed") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot complete booking with status ${status}`,
      );
    }
  } else if (newStatus === "cancelled") {
    if (!isSeller && !isBuyer) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You do not have permission to cancel this booking",
      );
    }
    if (status === "completed" || status === "cancelled") {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot cancel booking with status ${status}`,
      );
    }
    booking.cancelledBy = isSeller ? "seller" : "buyer";
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid status transition");
  }

  booking.status = newStatus;
  await booking.save();
  return booking.populate(["listing", "buyer", "seller"]);
};

module.exports = {
  createBooking,
  getBookingById,
  getMyBookings,
  updateBookingStatus,
};

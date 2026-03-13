const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const bookingService = require("./service");

const createBooking = catchAsync(async (req, res) => {
  const { listing, ...body } = req.body;
  const booking = await bookingService.createBooking(listing, body, req.user.id);
  return ApiResponse(
    res,
    httpStatus.CREATED,
    "Booking created successfully",
    booking,
  );
});

const getMyBookings = catchAsync(async (req, res) => {
  const { role } = req.query;
  const result = await bookingService.getMyBookings(
    req.user.id,
    role,
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "Bookings retrieved", result);
});

const getBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.id);
  return ApiResponse(res, httpStatus.OK, "Booking retrieved", booking);
});

const updateBookingStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const booking = await bookingService.updateBookingStatus(
    req.params.id,
    status,
    req.user.id,
  );
  return ApiResponse(res, httpStatus.OK, `Booking status updated to ${status}`, booking);
});

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, "Bookings module ping successful");
});

module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  ping,
};

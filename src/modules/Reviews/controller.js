const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const reviewService = require("./service");

const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(req.body, req.user.id);
  return ApiResponse(
    res,
    httpStatus.CREATED,
    "Review submitted successfully",
    review,
  );
});

const getReviewsForUser = catchAsync(async (req, res) => {
  const result = await reviewService.getReviewsForUser(
    req.params.userId,
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "User reviews retrieved", result);
});

const getReviewsForListing = catchAsync(async (req, res) => {
  const result = await reviewService.getReviewsForListing(
    req.params.listingId,
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "Listing reviews retrieved", result);
});

module.exports = {
  createReview,
  getReviewsForUser,
  getReviewsForListing,
};

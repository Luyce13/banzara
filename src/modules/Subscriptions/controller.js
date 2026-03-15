const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const subscriptionService = require('./service');

const getMySubscription = catchAsync(async (req, res) => {
  const subscription = await subscriptionService.getOrCreateSubscription(req.user.id);
  return ApiResponse(res, httpStatus.OK, "User subscription retrieved", subscription);
});

const getPlans = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, "Subscription plans retrieved", subscriptionService.PLANS);
});

module.exports = {
  getMySubscription,
  getPlans,
};

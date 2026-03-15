const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const paymentService = require('./service');

const createSubscriptionCheckout = catchAsync(async (req, res) => {
  const { plan } = req.body;
  const result = await paymentService.createSubscriptionCheckout(req.user.id, plan);
  return ApiResponse(res, httpStatus.OK, "Subscription checkout session created", result);
});

const createBoostCheckout = catchAsync(async (req, res) => {
  const { listingId } = req.query || req.body;
  const result = await paymentService.createBoostCheckout(req.user.id, listingId);
  return ApiResponse(res, httpStatus.OK, "Ad boost checkout session created", result);
});

const createCustomerPortal = catchAsync(async (req, res) => {
  const result = await paymentService.createCustomerPortal(req.user.id);
  return ApiResponse(res, httpStatus.OK, "Customer portal session created", result);
});

module.exports = {
  createSubscriptionCheckout,
  createBoostCheckout,
  createCustomerPortal,
};

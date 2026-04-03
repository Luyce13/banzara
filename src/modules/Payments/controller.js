const httpStatusObj = require('http-status');
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const catchAsync = require('../../utils/catchAsync');
const paymentService = require('./service');

const requireAdmin = (user) => {
  if (!user || user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Admin privileges are required');
  }
};
const createSubscriptionCheckout = catchAsync(async (req, res) => {
  const { plan } = req.body;
  const result = await paymentService.createSubscriptionCheckout(req.user.id, plan);
  return ApiResponse(res, httpStatus.OK, "Subscription checkout session created", result);
});

const createBoostCheckout = catchAsync(async (req, res) => {
  const { listingId } =  req.body;
  const result = await paymentService.createBoostCheckout(req.user.id, listingId);
  return ApiResponse(res, httpStatus.OK, "Ad boost checkout session created", result);
});

const createCustomerPortal = catchAsync(async (req, res) => {
  const result = await paymentService.createCustomerPortal(req.user.id);
  return ApiResponse(res, httpStatus.OK, "Customer portal session created", result);
});

const getStripePriceConfig = catchAsync(async (req, res) => {
  requireAdmin(req.user);
  const result = paymentService.getStripePriceConfig();
  return ApiResponse(res, httpStatus.OK, "Stripe price config retrieved", result);
});

const createStripePrice = catchAsync(async (req, res) => {
  requireAdmin(req.user);
  const { plan, rate } = req.body;
  const result = await paymentService.createStripePriceForPlan(plan, rate);
  return ApiResponse(res, httpStatus.CREATED, "Stripe price created", { plan, priceId: result, rate: Number(rate) || (plan === 'verified' ? 10000 : 25000) });
});

const setStripePrice = catchAsync(async (req, res) => {
  requireAdmin(req.user);
  const { plan } = req.params;
  const { priceId } = req.body;
  const result = paymentService.setStripePriceId(plan, priceId);
  return ApiResponse(res, httpStatus.OK, "Stripe price configured", { plan, priceId: result });
});

module.exports = {
  createSubscriptionCheckout,
  createBoostCheckout,
  createCustomerPortal,
  getStripePriceConfig,
  createStripePrice,
  setStripePrice,
};

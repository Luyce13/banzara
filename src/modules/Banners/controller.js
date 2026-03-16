const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const bannerService = require("./service");

const getBanners = catchAsync(async (req, res) => {
  const { position } = req.query;
  const banners = await bannerService.getBannersByPosition(position);
  return ApiResponse(res, httpStatus.OK, "Banners retrieved", banners);
});

const createBanner = catchAsync(async (req, res) => {
  const banner = await bannerService.createBanner(req.body);
  return ApiResponse(res, httpStatus.CREATED, "Banner created", banner);
});

const updateBanner = catchAsync(async (req, res) => {
  const banner = await bannerService.updateBanner(req.params.id, req.body);
  return ApiResponse(res, httpStatus.OK, "Banner updated", banner);
});

const deleteBanner = catchAsync(async (req, res) => {
  await bannerService.deleteBanner(req.params.id);
  return ApiResponse(res, httpStatus.OK, "Banner deleted");
});

module.exports = {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};

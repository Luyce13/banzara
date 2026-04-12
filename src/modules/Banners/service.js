const Banner = require("./model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;

// Get active banners for a specific position
const getBannersByPosition = async (position) => {
  return Banner.find({
    position,
    status: "active",
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
  }).sort({ order: 1, createdAt: -1 });
};

// Create a new banner
const createBanner = async (bannerBody) => {
  if (bannerBody.durationDays) {
    bannerBody.expiresAt = new Date(
      Date.now() + bannerBody.durationDays * 24 * 60 * 60 * 1000
    );
  }
  return Banner.create(bannerBody);
};

// Update a banner
const updateBanner = async (bannerId, updateBody) => {
  const banner = await Banner.findById(bannerId);
  if (!banner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Banner not found");
  }

  if (updateBody.durationDays) {
    updateBody.expiresAt = new Date(
      Date.now() + updateBody.durationDays * 24 * 60 * 60 * 1000
    );
  }

  Object.assign(banner, updateBody);
  await banner.save();
  return banner;
};

// Delete a banner
const deleteBanner = async (bannerId) => {
  const result = await Banner.findByIdAndDelete(bannerId);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Banner not found");
  }
  return result;
};

module.exports = {
  getBannersByPosition,
  createBanner,
  updateBanner,
  deleteBanner,
};

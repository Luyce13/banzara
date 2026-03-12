const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const logger = require("../../utils/logger").child({ context: "Listings" });
const listingService = require("./service");
const fileService = require("../Files/service");

const createListing = catchAsync(async (req, res) => {
  let fileDocs = [];

  if (req.files && req.files.length > 0) {
    fileDocs = await Promise.all(
      req.files.map((file) => fileService.getOrCreateFile(file, "listings")),
    );
    req.body.images = fileDocs.map((f) => f._id);
  }

  try {
    const listing = await listingService.createListing(req.body, req.user.id);
    return ApiResponse(
      res,
      httpStatus.CREATED,
      "Listing created successfully",
      listing,
    );
  } catch (error) {
    // Defensive decrement on failure
    for (const doc of fileDocs) {
      await fileService.decrementRefCount(doc._id);
    }
    throw error;
  }
});

const getListings = catchAsync(async (req, res) => {
  const result = await listingService.getListings(
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "Listings retrieved", result);
});

const getListing = catchAsync(async (req, res) => {
  const listing = await listingService.getListingBySlug(req.params.slug);
  return ApiResponse(res, httpStatus.OK, "Listing retrieved", listing);
});

const updateListing = catchAsync(async (req, res) => {
  let fileDocs = [];

  if (req.files && req.files.length > 0) {
    fileDocs = await Promise.all(
      req.files.map((file) => fileService.getOrCreateFile(file, "listings")),
    );
    req.body.images = fileDocs.map((f) => f._id);
  }

  try {
    const listing = await listingService.updateListingById(
      req.params.id,
      req.body,
      req.user.id,
    );
    return ApiResponse(res, httpStatus.OK, "Listing updated", listing);
  } catch (error) {
    for (const doc of fileDocs) {
      await fileService.decrementRefCount(doc._id);
    }
    throw error;
  }
});

const deleteListing = catchAsync(async (req, res) => {
  await listingService.deleteListingById(req.params.id, req.user.id);
  return ApiResponse(res, httpStatus.OK, "Listing deleted");
});

const getNearbyListings = catchAsync(async (req, res) => {
  const { lng, lat, radius } = req.query;
  const listings = await listingService.getNearbyListings(
    parseFloat(lng),
    parseFloat(lat),
    parseFloat(radius) || 10,
  );
  return ApiResponse(res, httpStatus.OK, "Nearby listings retrieved", listings);
});

const getMyListings = catchAsync(async (req, res) => {
  const result = await listingService.getMyListings(
    req.user.id,
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "My listings retrieved", result);
});

const searchListings = catchAsync(async (req, res) => {
  const { q, ...rest } = req.query;
  const result = await listingService.searchListings(
    q,
    req.mongoQuery,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "Search results", result);
});

const ping = catchAsync(async (req, res) => {
  return ApiResponse(res, httpStatus.OK, "Listings module ping successful");
});

module.exports = {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getNearbyListings,
  getMyListings,
  searchListings,
  ping,
};

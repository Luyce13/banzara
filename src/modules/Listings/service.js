const Listing = require("./model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const fileService = require("../Files/service");
const Category = require("../Categories/model");
const subscriptionService = require("../Subscriptions/service");
const logger = require("../../utils/logger").child({ context: "Listings" });

const createListing = async (body, userId) => {
  // Enforce listing quota (Free, Verified, Business)
  await subscriptionService.checkListingQuota(userId);

  // Ensure category exists
  if (body.category) {
    const categoryExists = await Category.findById(body.category);
    if (!categoryExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid category");
    }
  }

  body.seller = userId;
  const listing = await Listing.create(body);
  await listing.populate([
    { path: "seller", select: "name avatar" },
    { path: "category", select: "name slug" },
    { path: "images", select: "url" },
  ]);
  return listing.toObject();
};

const getListings = async (query, options) => {
  const filter = { ...query, status: "active" };
  const listings = await Listing.find(filter)
    .sort({ boostedUntil: -1 })
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .select(options.select)
    .populate("seller", "name avatar")
    .populate("category", "name slug")
    .populate("images", "url")
    .lean();

  const total = await Listing.countDocuments(filter);

  return {
    listings,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

const getListingBySlug = async (slug) => {
  const listing = await Listing.findOne({ slug, status: "active" })
    .populate("seller", "name avatar")
    .populate("category", "name slug attributeSchema")
    .populate("images", "url")
    .lean();

  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }
  return listing;
};

const getListingById = async (id) => {
  const listing = await Listing.findById(id).lean();
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }
  return listing;
};

const updateListingById = async (id, body, userId) => {
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }
  if (String(listing.seller) !== String(userId)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only edit your own listings",
    );
  }

  if (body.images) {
    const oldIds = (listing.images || []).map(String);
    const newIds = body.images.map(String);

    // Decrement old images that are no longer in the new set
    for (const oldId of oldIds) {
      if (!newIds.includes(oldId)) {
        await fileService.decrementRefCount(oldId);
      }
    }

    // Decrement new images that were already in the old set
    // (to balance the optimistic increment from getOrCreateFile)
    for (const newId of newIds) {
      if (oldIds.includes(newId)) {
        await fileService.decrementRefCount(newId);
      }
    }
  }

  Object.assign(listing, body);
  await listing.save();
  await listing.populate([
    { path: "seller", select: "name avatar" },
    { path: "category", select: "name slug" },
    { path: "images", select: "url" },
  ]);
  return listing.toObject();
};

const deleteListingById = async (id, userId) => {
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }
  if (String(listing.seller) !== String(userId)) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only delete your own listings",
    );
  }

  listing.status = "expired";
  await listing.softDelete(userId);
  logger.info(`Listing soft-deleted: ${listing.slug}`);
  return listing;
};

const getNearbyListings = async (lng, lat, radiusKm = 10) => {
  const radiusInMeters = radiusKm * 1000;
  return Listing.find({
    status: "active",
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusInMeters,
      },
    },
  })
    .limit(50)
    .populate("seller", "name avatar")
    .populate("category", "name slug")
    .populate("images", "url")
    .lean();
};

const getMyListings = async (userId, query, options) => {
  const filter = { ...query, seller: userId };
  const listings = await Listing.find(filter)
    .setOptions({ includeDeleted: true })
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .select(options.select)
    .populate("category", "name slug")
    .populate("images", "url")
    .lean();

  const total = await Listing.countDocuments(filter);

  return {
    listings,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

const searchListings = async (text, query, options) => {
  const filter = { ...query, status: "active", $text: { $search: text } };
  const listings = await Listing.find(filter, { score: { $meta: "textScore" } })
    .sort({ boostedUntil: -1, score: { $meta: "textScore" } })
    .skip(options.skip)
    .limit(options.limit)
    .populate("seller", "name avatar")
    .populate("category", "name slug")
    .populate("images", "url")
    .lean();

  const total = await Listing.countDocuments(filter);

  return {
    listings,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

module.exports = {
  createListing,
  getListings,
  getListingBySlug,
  getListingById,
  updateListingById,
  deleteListingById,
  getNearbyListings,
  getMyListings,
  searchListings,
};

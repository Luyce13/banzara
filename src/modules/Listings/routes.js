const express = require("express");
const listingsController = require("./controller");
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const listingValidation = require("./validator");
const queryParser = require("../../middlewares/queryParser");
const upload = require("../../middlewares/multer");

const router = express.Router();

// Public
router.get("/", queryParser, listingsController.getListings);
router.get(
  "/search",
  validate(listingValidation.searchListings),
  queryParser,
  listingsController.searchListings,
);
router.get(
  "/nearby",
  validate(listingValidation.getNearbyListings),
  listingsController.getNearbyListings,
);
router.get("/slug/:slug", listingsController.getListing);

// Protected
router.get("/me", authMiddleware, queryParser, listingsController.getMyListings);
router.post(
  "/",
  authMiddleware,
  upload.array("images", 10),
  validate(listingValidation.createListing),
  listingsController.createListing,
);
router.patch(
  "/:id",
  authMiddleware,
  upload.array("images", 10),
  validate(listingValidation.updateListing),
  listingsController.updateListing,
);
router.delete("/:id", authMiddleware, listingsController.deleteListing);

router.get("/ping", listingsController.ping);

module.exports = router;

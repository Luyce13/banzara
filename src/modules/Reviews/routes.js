const express = require("express");
const reviewController = require("./controller");
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const reviewValidation = require("./validator");
const queryParser = require("../../middlewares/queryParser");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validate(reviewValidation.createReview),
  reviewController.createReview,
);

router.get(
  "/user/:userId",
  validate(reviewValidation.getReviews),
  queryParser,
  reviewController.getReviewsForUser,
);

router.get(
  "/listing/:listingId",
  validate(reviewValidation.getReviews),
  queryParser,
  reviewController.getReviewsForListing,
);

module.exports = router;

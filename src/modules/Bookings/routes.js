const express = require("express");
const bookingController = require("./controller");
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const bookingValidation = require("./validator");
const queryParser = require("../../middlewares/queryParser");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  validate(bookingValidation.createBooking),
  bookingController.createBooking,
);

router.get("/me", queryParser, bookingController.getMyBookings);

router.get("/:id", bookingController.getBooking);

router.patch(
  "/:id/status",
  validate(bookingValidation.updateBookingStatus),
  bookingController.updateBookingStatus,
);

router.get("/ping", bookingController.ping);

module.exports = router;

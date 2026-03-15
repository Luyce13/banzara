const express = require("express");
const auth = require("../../middlewares/auth");
const paymentController = require("./controller");
const webhookController = require("./webhookController");
const catchAsync = require("../../utils/catchAsync");

const router = express.Router();

// Webhook route - MUST use raw body (configured in app.js)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webhookController.handleWebhook,
);

router.post(
  "/create-subscription",
  auth,
  paymentController.createSubscriptionCheckout,
);

router.post("/create-boost", auth, paymentController.createBoostCheckout);
router.get("/create-portal", auth, paymentController.createCustomerPortal);

module.exports = router;

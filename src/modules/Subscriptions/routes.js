const express = require("express");
const auth = require("../../middlewares/auth");
const subscriptionController = require("./controller");

const router = express.Router();

router.get("/me", auth, subscriptionController.getMySubscription);
router.get("/plans", subscriptionController.getPlans);

module.exports = router;

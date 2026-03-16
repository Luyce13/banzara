const express = require("express");
const bannerController = require("./controller");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
// Import validation later if needed

const router = express.Router();

// Public
router.get("/", bannerController.getBanners);

// Protected (Admin)
router.post("/", auth, bannerController.createBanner);
router.patch("/:id", auth, bannerController.updateBanner);
router.delete("/:id", auth, bannerController.deleteBanner);

module.exports = router;

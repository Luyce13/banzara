const express = require("express");
const usersController = require("./controller");
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const userValidation = require("./validator");

const upload = require("../../middlewares/multer");

const router = express.Router();

router.get("/me", authMiddleware, usersController.getMe);
router.patch(
  "/me",
  authMiddleware,
  upload.single("avatar"),
  validate(userValidation.updateProfile),
  usersController.updateMe,
);
router.get("/ping", usersController.ping);

module.exports = router;

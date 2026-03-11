const express = require("express");
const authController = require("./controller");
const authValidation = require("./validator");
const validate = require("../../middlewares/validate");

const router = express.Router();

router.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);
router.post("/login", validate(authValidation.login), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh-tokens", authController.refreshTokens);
router.post(
  "/resend-verification-email",
  validate(authValidation.resendVerificationEmail),
  authController.resendVerificationEmail,
);
router.get(
  "/verify-email",
  validate(authValidation.verifyEmail),
  authController.verifyEmail,
);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  authController.resetPassword,
);
const authMiddleware = require("../../middlewares/auth");
router.post(
  "/change-password",
  authMiddleware,
  validate(authValidation.changePassword),
  authController.changePassword,
);

module.exports = router;

const express = require("express");
const chatController = require("./controller");
const authMiddleware = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const chatValidation = require("./validator");
const queryParser = require("../../middlewares/queryParser");

const router = express.Router();

router.use(authMiddleware);

router.get("/conversations", chatController.getMyConversations);

router.post(
  "/conversations",
  validate(chatValidation.getOrCreateConversation),
  chatController.getOrCreateConversation,
);

router.get(
  "/conversations/:id/messages",
  validate(chatValidation.getMessages),
  queryParser,
  chatController.getMessages,
);

router.post(
  "/conversations/:id/messages",
  validate(chatValidation.sendMessage),
  chatController.sendMessage,
);

router.patch("/conversations/:id/read", chatController.markAsRead);

module.exports = router;

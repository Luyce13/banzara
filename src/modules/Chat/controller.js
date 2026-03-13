const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const ApiResponse = require("../../utils/ApiResponse");
const catchAsync = require("../../utils/catchAsync");
const chatService = require("./service");

const getOrCreateConversation = catchAsync(async (req, res) => {
  const { listing } = req.body;
  const conversation = await chatService.getOrCreateConversation(listing, req.user.id);
  return ApiResponse(res, httpStatus.OK, "Conversation ready", conversation);
});

const getMyConversations = catchAsync(async (req, res) => {
  const conversations = await chatService.getMyConversations(req.user.id);
  return ApiResponse(res, httpStatus.OK, "Conversations retrieved", conversations);
});

const sendMessage = catchAsync(async (req, res) => {
  const message = await chatService.sendMessage(req.params.id, req.body, req.user.id);
  return ApiResponse(res, httpStatus.CREATED, "Message sent", message);
});

const getMessages = catchAsync(async (req, res) => {
  const result = await chatService.getMessages(
    req.params.id,
    req.user.id,
    req.mongoOptions,
  );
  return ApiResponse(res, httpStatus.OK, "Messages retrieved", result);
});

const markAsRead = catchAsync(async (req, res) => {
  await chatService.markAsRead(req.params.id, req.user.id);
  return ApiResponse(res, httpStatus.OK, "Messages marked as read");
});

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markAsRead,
};

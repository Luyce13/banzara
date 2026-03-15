const Conversation = require("./model");
const Message = require("./messageModel");
const Listing = require("../Listings/model");
const ApiError = require("../../utils/ApiError");
const httpStatusObj = require("http-status");
const httpStatus = httpStatusObj.status || httpStatusObj;
const socketService = require("../../utils/socket.service");

/**
 * Get or create a conversation for a listing
 */
const getOrCreateConversation = async (listingId, userId) => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new ApiError(httpStatus.NOT_FOUND, "Listing not found");
  }

  const sellerId = listing.seller;
  if (String(sellerId) === String(userId)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You cannot start a conversation with yourself about your own listing",
    );
  }

  // Find conversation between these two regardless of listing
  let conversation = await Conversation.findOne({
    participants: { $all: [userId, sellerId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      listing: listingId,
      participants: [userId, sellerId],
    });
  } else if (String(conversation.listing) !== String(listingId)) {
    // Update context if it's a different listing
    conversation.listing = listingId;
    await conversation.save();
  }

  return conversation.populate([
    { path: "participants", select: "name avatar" },
    { path: "listing", select: "title images price" },
  ]);
};

/**
 * Get all conversations for a user
 */
const getMyConversations = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .sort({ lastMessageAt: -1 })
    .populate([
      { path: "participants", select: "name avatar" },
      { path: "listing", select: "title images price" },
      { path: "lastMessage", select: "text sender createdAt" },
    ]);

  return conversations;
};

/**
 * Send a message
 */
const sendMessage = async (conversationId, body, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
  }

  if (!conversation.participants.includes(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation");
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    text: body.text,
    readBy: [userId],
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  const populatedMessage = await message.populate("sender", "name avatar");
  
  // Real-time emission
  socketService.emitToConversation(conversationId, "new_message", populatedMessage);
  
  return populatedMessage;
};

/**
 * Get messages for a conversation
 */
const getMessages = async (conversationId, userId, options) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(httpStatus.NOT_FOUND, "Conversation not found");
  }

  if (!conversation.participants.includes(userId)) {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not a participant in this conversation");
  }

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .skip(options.skip)
    .limit(options.limit)
    .populate("sender", "name avatar");

  const total = await Message.countDocuments({ conversation: conversationId });

  return {
    messages,
    total,
    page: options.page,
    pages: Math.ceil(total / options.limit),
  };
};

/**
 * Mark all messages in a conversation as read
 */
const markAsRead = async (conversationId, userId) => {
  await Message.updateMany(
    { conversation: conversationId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );
};

module.exports = {
  getOrCreateConversation,
  getMyConversations,
  sendMessage,
  getMessages,
  markAsRead,
};

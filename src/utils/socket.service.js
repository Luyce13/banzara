const socketIo = require("socket.io");
const tokenService = require("../modules/Tokens/service");
const logger = require("./logger").child({ context: "Socket" });
const corsConfig = require("../config/cors");

let io;
const userSockets = new Map(); // userId -> Set(socketIds)

/**
 * Initialize Socket.io
 */
const initSocket = (server) => {
  io = socketIo(server, {
    cors: corsConfig,
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
      socket.handshake.headers.cookie || socket.handshake.auth.token || socket.handshake.headers.token;
      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const payload = await tokenService.verifyToken(token, "access");
      socket.userId = payload.user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.userId);
    logger.info(`User connected: ${userId} (${socket.id})`);

    // Add to mapping
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      logger.info(`Socket ${socket.id} joined conversation: ${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info(`Socket ${socket.id} left conversation: ${conversationId}`);
    });

    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${userId} (${socket.id})`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

/**
 * Emit event to a specific conversation
 */
const emitToConversation = (conversationId, event, data) => {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};

/**
 * Emit event to a specific user
 */
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToConversation,
  emitToUser,
};

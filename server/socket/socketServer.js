const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const DirectMessage = require("../models/directMessageModel");
const SpacePost = require("../models/spacePostModel");
const SpaceTask = require("../models/spaceTaskModel");

let io = null;

// Track active connected users: Map<userId, Set<socketId>>
const activeSockets = new Map();

/**
 * Initialize Socket.io Server with authentication and event listeners
 */
const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // JWT Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "") ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded || !decoded.id) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await User.findById(decoded.id).select(
        "_id name email profilePicture college course"
      );

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (err) {
      return next(new Error("Authentication error: " + err.message));
    }
  });

  // Connection Handler
  io.on("connection", (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    // 1. Register socket in activeSockets map
    if (!activeSockets.has(userId)) {
      activeSockets.set(userId, new Set());
    }
    activeSockets.get(userId).add(socket.id);

    // Join personal user room for direct events
    socket.join(`user:${userId}`);

    // Broadcast user online status to all clients
    io.emit("presence:user_status", {
      userId,
      isOnline: true,
      lastActive: new Date(),
    });

    // Send current online user list to newly connected user
    socket.emit("presence:online_users", Array.from(activeSockets.keys()));

    /* =========================================================================
       1. DIRECT MESSAGING (User A <-> User B)
       ========================================================================= */

    // Join DM conversation room
    socket.on("dm:join", ({ recipientId }) => {
      if (!recipientId) return;
      const conversationId = DirectMessage.getConversationId(userId, recipientId);
      socket.join(`dm:${conversationId}`);
    });

    // Leave DM conversation room
    socket.on("dm:leave", ({ recipientId }) => {
      if (!recipientId) return;
      const conversationId = DirectMessage.getConversationId(userId, recipientId);
      socket.leave(`dm:${conversationId}`);
    });

    // Typing indicator in DM
    socket.on("dm:typing", ({ recipientId, isTyping }) => {
      if (!recipientId) return;
      io.to(`user:${recipientId}`).emit("dm:typing", {
        senderId: userId,
        senderName: user.name,
        isTyping: !!isTyping,
      });
    });

    // Send direct message (Persists in MongoDB and emits in real-time)
    socket.on("dm:send_message", async (payload, callback) => {
      try {
        const { recipientId, content, attachments } = payload;
        if (!recipientId || !content || !content.trim()) {
          if (callback) callback({ success: false, message: "Recipient and content required" });
          return;
        }

        const conversationId = DirectMessage.getConversationId(userId, recipientId);

        const newMsg = await DirectMessage.create({
          sender: userId,
          recipient: recipientId,
          conversationId,
          content: content.trim(),
          attachments: Array.isArray(attachments) ? attachments : [],
          isRead: false,
        });

        const populatedMsg = await DirectMessage.findById(newMsg._id)
          .populate("sender", "_id name email profilePicture college")
          .populate("recipient", "_id name email profilePicture college");

        // Emit real-time message to recipient's personal room & sender's personal room
        io.to(`user:${recipientId}`).emit("dm:new_message", populatedMsg);
        io.to(`user:${userId}`).emit("dm:new_message", populatedMsg);

        // Emit real-time push notification to recipient
        io.to(`user:${recipientId}`).emit("notification:new", {
          id: `msg_${populatedMsg._id}`,
          type: "message",
          title: `Message from ${user.name}`,
          message: content.length > 60 ? content.slice(0, 57) + "..." : content,
          sender: {
            _id: user._id,
            name: user.name,
            profilePicture: user.profilePicture,
          },
          data: {
            conversationId,
            senderId: userId,
          },
          createdAt: new Date(),
        });

        if (callback) callback({ success: true, data: populatedMsg });
      } catch (err) {
        console.error("Socket dm:send_message error:", err);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    // Mark messages as read
    socket.on("dm:mark_read", async ({ senderId }) => {
      try {
        if (!senderId) return;
        const conversationId = DirectMessage.getConversationId(userId, senderId);

        await DirectMessage.updateMany(
          { conversationId, recipient: userId, isRead: false },
          { $set: { isRead: true, readAt: new Date() } }
        );

        // Notify original sender that their messages were read
        io.to(`user:${senderId}`).emit("dm:messages_read", {
          readerId: userId,
          conversationId,
        });
      } catch (err) {
        console.error("Socket dm:mark_read error:", err);
      }
    });

    /* =========================================================================
       2. SPACE REAL-TIME COLLABORATION (Discussions, Typing, Announcements)
       ========================================================================= */

    // Join space room
    socket.on("space:join", ({ spaceId }) => {
      if (!spaceId) return;
      socket.join(`space:${spaceId}`);
    });

    // Leave space room
    socket.on("space:leave", ({ spaceId }) => {
      if (!spaceId) return;
      socket.leave(`space:${spaceId}`);
    });

    // Typing indicator in Space Discussion
    socket.on("space:typing", ({ spaceId, isTyping }) => {
      if (!spaceId) return;
      socket.to(`space:${spaceId}`).emit("space:typing", {
        spaceId,
        user: {
          _id: user._id,
          name: user.name,
          profilePicture: user.profilePicture,
        },
        isTyping: !!isTyping,
      });
    });

    /* =========================================================================
       3. REAL-TIME TASK UPDATES
       ========================================================================= */

    // Notify peers of a task completion or update in real-time
    socket.on("task:status_update", ({ spaceId, taskId, newStatus }) => {
      if (spaceId) {
        socket.to(`space:${spaceId}`).emit("space:task_updated", {
          taskId,
          spaceId,
          status: newStatus,
          updatedBy: { _id: user._id, name: user.name },
        });
      }
    });

    /* =========================================================================
       4. DISCONNECTION & CLEANUP
       ========================================================================= */

    socket.on("disconnect", () => {
      if (activeSockets.has(userId)) {
        const userSocketSet = activeSockets.get(userId);
        userSocketSet.delete(socket.id);

        // If user has no more active socket connections, mark them offline
        if (userSocketSet.size === 0) {
          activeSockets.delete(userId);
          io.emit("presence:user_status", {
            userId,
            isOnline: false,
            lastActive: new Date(),
          });
        }
      }
    });
  });

  return io;
};

/**
 * Helper utility to get active Socket.io instance
 */
const getIO = () => {
  if (!io) {
    console.warn("Socket.io has not been initialized yet.");
  }
  return io;
};

/**
 * Emit event to a specific user's connected devices
 */
const emitToUser = (userId, event, data) => {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
};

/**
 * Emit event to all members inside a Space room
 */
const emitToSpace = (spaceId, event, data) => {
  if (!io || !spaceId) return;
  io.to(`space:${spaceId.toString()}`).emit(event, data);
};

/**
 * Check if a user is currently online
 */
const isUserOnline = (userId) => {
  if (!userId) return false;
  return activeSockets.has(userId.toString());
};

/**
 * Get array of all online user IDs
 */
const getOnlineUsers = () => {
  return Array.from(activeSockets.keys());
};

module.exports = {
  initSocketServer,
  getIO,
  emitToUser,
  emitToSpace,
  isUserOnline,
  getOnlineUsers,
};

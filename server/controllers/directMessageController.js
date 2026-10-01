const DirectMessage = require("../models/directMessageModel");
const User = require("../models/userModel");
const { emitToUser, isUserOnline } = require("../socket/socketServer");

/**
 * @desc    Get user's recent direct message conversations
 * @route   GET /api/dm/conversations
 * @access  Private
 */
const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all messages involving current user
    const messages = await DirectMessage.find({
      $or: [{ sender: currentUserId }, { recipient: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "_id name email profilePicture college course")
      .populate("recipient", "_id name email profilePicture college course");

    // Group by conversationId to get the latest message and unread count per partner
    const conversationMap = new Map();

    for (const msg of messages) {
      const isSender = msg.sender._id.toString() === currentUserId.toString();
      const partner = isSender ? msg.recipient : msg.sender;

      if (!partner) continue;
      const partnerId = partner._id.toString();

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          conversationId: msg.conversationId,
          partner: {
            _id: partner._id,
            name: partner.name,
            email: partner.email,
            profilePicture: partner.profilePicture,
            college: partner.college,
            course: partner.course,
            isOnline: isUserOnline(partner._id),
          },
          lastMessage: {
            _id: msg._id,
            content: msg.content,
            senderId: msg.sender._id,
            createdAt: msg.createdAt,
            isRead: msg.isRead,
          },
          unreadCount: 0,
        });
      }

      // If current user is recipient and message is unread, increment count
      if (!isSender && !msg.isRead) {
        const conv = conversationMap.get(partnerId);
        conv.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values());

    res.json({
      success: true,
      data: conversations,
    });
  } catch (err) {
    console.error("Error in getConversations:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load conversations: " + err.message,
    });
  }
};

/**
 * @desc    Get chat message history with a specific student
 * @route   GET /api/dm/:userId
 * @access  Private
 */
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const targetUser = await User.findById(targetUserId).select(
      "_id name email profilePicture college course"
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const conversationId = DirectMessage.getConversationId(currentUserId, targetUserId);

    const messages = await DirectMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", "_id name email profilePicture")
      .populate("recipient", "_id name email profilePicture");

    // Automatically mark unread messages sent to current user as read
    await DirectMessage.updateMany(
      { conversationId, recipient: currentUserId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      data: {
        partner: {
          ...targetUser.toObject(),
          isOnline: isUserOnline(targetUser._id),
        },
        conversationId,
        messages,
      },
    });
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load messages: " + err.message,
    });
  }
};

/**
 * @desc    Send a direct message to a student
 * @route   POST /api/dm/:userId
 * @access  Private
 */
const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const recipientId = req.params.userId;
    const { content, attachments } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient student not found",
      });
    }

    const conversationId = DirectMessage.getConversationId(currentUserId, recipientId);

    const message = await DirectMessage.create({
      sender: currentUserId,
      recipient: recipientId,
      conversationId,
      content: content.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      isRead: false,
    });

    const populatedMessage = await DirectMessage.findById(message._id)
      .populate("sender", "_id name email profilePicture college")
      .populate("recipient", "_id name email profilePicture college");

    // Real-time broadcast via Socket.io to recipient & sender
    emitToUser(recipientId, "dm:new_message", populatedMessage);
    emitToUser(currentUserId, "dm:new_message", populatedMessage);

    // Real-time push notification to recipient
    emitToUser(recipientId, "notification:new", {
      id: `msg_${populatedMessage._id}`,
      type: "message",
      title: `Message from ${req.user.name}`,
      message: content.length > 60 ? content.slice(0, 57) + "..." : content,
      sender: {
        _id: req.user._id,
        name: req.user.name,
        profilePicture: req.user.profilePicture,
      },
      data: {
        conversationId,
        senderId: currentUserId,
      },
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Message sent",
      data: populatedMessage,
    });
  } catch (err) {
    console.error("Error in sendMessage:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send message: " + err.message,
    });
  }
};

/**
 * @desc    Mark all messages in conversation as read
 * @route   PATCH /api/dm/:userId/read
 * @access  Private
 */
const markConversationAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.userId;

    const conversationId = DirectMessage.getConversationId(currentUserId, partnerId);

    await DirectMessage.updateMany(
      { conversationId, recipient: currentUserId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Notify partner that messages were read
    emitToUser(partnerId, "dm:messages_read", {
      readerId: currentUserId,
      conversationId,
    });

    res.json({
      success: true,
      message: "Conversation marked as read",
    });
  } catch (err) {
    console.error("Error in markConversationAsRead:", err);
    res.status(500).json({
      success: false,
      message: "Failed to mark as read: " + err.message,
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
};

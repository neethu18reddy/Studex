const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient is required"],
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [4000, "Message cannot exceed 4000 characters"],
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["link", "pdf", "image", "document", "video"],
          default: "link",
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          trim: true,
          default: "Attachment",
        },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helper static method to generate consistent conversationId between two user IDs
directMessageSchema.statics.getConversationId = function (userIdA, userIdB) {
  const strA = userIdA.toString();
  const strB = userIdB.toString();
  return strA < strB ? `${strA}_${strB}` : `${strB}_${strA}`;
};

// Compound index for fast conversation retrieval sorted by time
directMessageSchema.index({ conversationId: 1, createdAt: 1 });

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);

module.exports = DirectMessage;

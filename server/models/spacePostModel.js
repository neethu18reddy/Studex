const mongoose = require("mongoose");

const spacePostSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: [true, "Space reference is required"],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Post author is required"],
    },
    content: {
      type: String,
      required: [true, "Post content cannot be empty"],
      trim: true,
      maxlength: [3000, "Content cannot exceed 3000 characters"],
    },
    type: {
      type: String,
      enum: ["discussion", "announcement", "question"],
      default: "discussion",
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["pdf", "image", "document", "link", "video"],
          default: "link",
        },
        url: { type: String, required: true },
        name: { type: String, default: "Attachment" },
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replies: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, "Reply cannot exceed 1000 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

spacePostSchema.index({ space: 1, isPinned: -1, createdAt: -1 });

const SpacePost = mongoose.model("SpacePost", spacePostSchema);

module.exports = SpacePost;

const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      required: [true, "Resource type is required"],
      enum: {
        values: ["pdf", "image", "document", "link"],
        message: "{VALUE} is not a supported resource type (pdf, image, document, link)",
      },
    },
    url: {
      type: String,
      required: [true, "Resource URL is required"],
      trim: true,
    },
    public_id: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject reference is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying resources by subject and user
resourceSchema.index({ subject: 1, user: 1, createdAt: -1 });

const Resource = mongoose.model("Resource", resourceSchema);

module.exports = Resource;

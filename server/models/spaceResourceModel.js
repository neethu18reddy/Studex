const mongoose = require("mongoose");

const spaceResourceSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: [true, "Space reference is required"],
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader reference is required"],
    },
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: {
        values: ["pdf", "image", "document", "link", "video"],
        message: "{VALUE} is not a valid resource type (pdf, image, document, link, video)",
      },
      required: [true, "Resource type is required"],
      index: true,
    },
    url: {
      type: String,
      required: [true, "Resource URL or file link is required"],
      trim: true,
    },
    fileSize: {
      type: Number, // In bytes (optional)
      default: 0,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    downloadsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

spaceResourceSchema.index({ space: 1, type: 1, createdAt: -1 });

const SpaceResource = mongoose.model("SpaceResource", spaceResourceSchema);

module.exports = SpaceResource;

const mongoose = require("mongoose");

const documentChunkSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      required: false,
    },
    documentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    content: {
      type: String,
      required: true,
    },
    keywords: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Text index for semantic / text search across student study materials
documentChunkSchema.index({ content: "text", documentTitle: "text", subjectName: "text" });

module.exports = mongoose.model("DocumentChunk", documentChunkSchema);

const mongoose = require("mongoose");

const spaceMemberSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Space",
      required: [true, "Space reference is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
    },
    role: {
      type: String,
      enum: {
        values: ["owner", "admin", "member"],
        message: "{VALUE} is not a valid space member role (owner, admin, member)",
      },
      default: "member",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "invited", "pending_approval"],
        message: "{VALUE} is not a valid status",
      },
      default: "active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate membership in the same space
spaceMemberSchema.index({ space: 1, user: 1 }, { unique: true });
spaceMemberSchema.index({ user: 1, role: 1 });
spaceMemberSchema.index({ space: 1, role: 1 });

const SpaceMember = mongoose.model("SpaceMember", spaceMemberSchema);

module.exports = SpaceMember;

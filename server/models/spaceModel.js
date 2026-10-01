const mongoose = require("mongoose");
const crypto = require("crypto");

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Space name is required"],
      trim: true,
      maxlength: [60, "Space name cannot exceed 60 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [300, "Description cannot exceed 300 characters"],
    },
    category: {
      type: String,
      enum: {
        values: ["study_group", "project_team", "class", "peer_circle", "general"],
        message: "{VALUE} is not a valid space category",
      },
      default: "study_group",
    },
    icon: {
      type: String,
      default: "🚀",
    },
    color: {
      type: String,
      default: "#9333EA",
    },
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Space creator is required"],
    },
    memberCount: {
      type: Number,
      default: 1,
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: true,
      },
      allowMemberPost: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate unique invite code before initial save
spaceSchema.pre("validate", function () {
  if (!this.inviteCode) {
    this.inviteCode = `SX-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }
});

spaceSchema.index({ creator: 1 });
spaceSchema.index({ category: 1, isPrivate: 1 });

const Space = mongoose.model("Space", spaceSchema);

module.exports = Space;

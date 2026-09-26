const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    profilePicture: {
      url: {
        type: String,
        default:
          "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png",
      },
      public_id: {
        type: String,
        default: "",
      },
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other", "prefer_not_to_say"],
        message: "{VALUE} is not a valid gender (male, female, other, prefer_not_to_say)",
      },
      default: "other",
      trim: true,
      lowercase: true,
    },
    college: {
      type: String,
      trim: true,
      default: "",
    },
    course: {
      type: String,
      trim: true,
      default: "",
    },
    year: {
      type: String,
      trim: true,
      default: "",
    },
    subjects: {
      type: [String],
      default: [],
    },
    weeklyStudyGoalHours: {
      type: Number,
      default: 15,
      min: [1, "Weekly study goal must be at least 1 hour"],
    },
    weeklyTaskGoal: {
      type: Number,
      default: 28,
      min: [1, "Weekly task goal must be at least 1 task"],
    },
  },
  {
    timestamps: true,
  }
);

// Default avatars mapped by gender
const GENDER_AVATARS = {
  male: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-7.png",
  female: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-8.png",
  other: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-1.png",
  prefer_not_to_say: "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png",
};

const getDefaultAvatarForGender = (gender) => {
  const normalized = (gender || "").toLowerCase().trim();
  return GENDER_AVATARS[normalized] || GENDER_AVATARS.other;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
module.exports.GENDER_AVATARS = GENDER_AVATARS;
module.exports.getDefaultAvatarForGender = getDefaultAvatarForGender;


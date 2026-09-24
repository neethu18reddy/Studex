const User = require("../models/userModel");
const { getDefaultAvatarForGender, GENDER_AVATARS } = require("../models/userModel");
const asyncHandler = require("../middleware/asyncHandler");
const {
  uploadStream,
  deleteImage,
  isCloudinaryConfigured,
} = require("../config/cloudinary");

/**
 * @desc    Get current student profile
 * @route   GET /api/users/me
 * @access  Private (Requires JWT Auth)
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found",
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Update student profile information (supports details and custom avatar/image URL)
 * @route   PUT /api/users/me
 * @access  Private (Requires JWT Auth)
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, gender, college, course, year, subjects, profilePicture, avatar, imageUrl } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found",
    });
  }

  // Check if new email conflicts with another user
  if (email && email !== user.email) {
    const emailExists = await User.findOne({
      email,
      _id: { $ne: req.user._id },
    });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email address is already in use by another student",
      });
    }
    user.email = email;
  }

  if (name !== undefined) user.name = name;
  if (college !== undefined) user.college = college;
  if (course !== undefined) user.course = course;
  if (year !== undefined) user.year = year;
  if (subjects !== undefined) user.subjects = subjects;

  const customPicture = profilePicture || avatar || imageUrl;

  if (gender !== undefined) {
    const oldGender = user.gender;
    user.gender = gender;
    // If the user currently has one of the default gender avatars and hasn't uploaded a custom image, update default avatar
    const isDefaultAvatar =
      !user.profilePicture?.public_id &&
      Object.values(GENDER_AVATARS).includes(user.profilePicture?.url);

    if (isDefaultAvatar && !customPicture && oldGender !== gender) {
      user.profilePicture = {
        url: getDefaultAvatarForGender(gender),
        public_id: "",
      };
    }
  }

  // Allow setting custom profile picture via URL or base64
  if (customPicture) {
    if (typeof customPicture === "string") {
      user.profilePicture = {
        url: customPicture.trim(),
        public_id: "",
      };
    } else if (typeof customPicture === "object" && customPicture.url) {
      user.profilePicture = {
        url: customPicture.url.trim(),
        public_id: customPicture.public_id || "",
      };
    }
  }

  const updatedUser = await user.save();

  // Omit password from response
  const userObj = updatedUser.toObject();
  delete userObj.password;

  res.status(200).json({
    success: true,
    message: "Student profile updated successfully",
    data: userObj,
  });
});

/**
 * @desc    Upload student profile image (supports Cloudinary with automatic fallback)
 * @route   POST /api/users/profile-image
 * @access  Private (Requires JWT Auth)
 */
const uploadProfileImage = asyncHandler(async (req, res) => {
  let pictureUrl = "";
  let publicId = "";

  // 1. If file uploaded
  if (req.file) {
    if (isCloudinaryConfigured()) {
      // Stream upload directly to Cloudinary
      const uploadResult = await uploadStream(req.file.buffer, {
        folder: "studex/avatars",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      });
      pictureUrl = uploadResult.url;
      publicId = uploadResult.public_id;
    } else {
      // Direct Data URI fallback if Cloudinary is not configured
      const base64Data = req.file.buffer.toString("base64");
      pictureUrl = `data:${req.file.mimetype};base64,${base64Data}`;
      publicId = "";
    }
  } else if (req.body && (req.body.imageUrl || req.body.url)) {
    // 2. Or if URL string provided in body
    pictureUrl = (req.body.imageUrl || req.body.url).trim();
    publicId = "";
  } else {
    return res.status(400).json({
      success: false,
      message: "Please select an image file or provide an image URL to upload",
    });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found",
    });
  }

  // Clean up previous Cloudinary asset if one existed
  if (publicId && user.profilePicture && user.profilePicture.public_id) {
    deleteImage(user.profilePicture.public_id, "image").catch((err) =>
      console.error(`Failed to clean up old avatar: ${err.message}`)
    );
  }

  // Update user's profile picture
  user.profilePicture = {
    url: pictureUrl,
    public_id: publicId,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile picture updated successfully",
    data: {
      profilePicture: user.profilePicture,
    },
  });
});

module.exports = {
  getMe,
  updateMe,
  uploadProfileImage,
};

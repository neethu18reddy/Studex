const User = require("../models/userModel");
const asyncHandler = require("../middleware/asyncHandler");
const { uploadStream, deleteImage, isCloudinaryConfigured } = require("../config/cloudinary");

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
 * @desc    Update student profile information
 * @route   PUT /api/users/me
 * @access  Private (Requires JWT Auth)
 */
const updateMe = asyncHandler(async (req, res) => {
  const { name, email, college, course, year, subjects } = req.body;

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
 * @desc    Upload student profile image to Cloudinary
 * @route   POST /api/users/profile-image
 * @access  Private (Requires JWT Auth)
 */
const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please select an image file to upload",
    });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Student profile not found",
    });
  }

  // Check if Cloudinary credentials are configured
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({
      success: false,
      message:
        "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env.",
    });
  }

  // Upload image buffer to Cloudinary
  const oldPublicId = user.profilePicture ? user.profilePicture.public_id : null;
  const result = await uploadStream(req.file.buffer, {
    folder: "studex/profiles",
    public_id: `user_${user._id}_${Date.now()}`,
  });

  // Update user's profile picture
  user.profilePicture = {
    url: result.url,
    public_id: result.public_id,
  };

  await user.save();

  // If previous custom image exists, clean it up from Cloudinary asynchronously
  if (oldPublicId) {
    deleteImage(oldPublicId).catch((err) =>
      console.error(`Failed to delete old image ${oldPublicId}:`, err.message)
    );
  }

  res.status(200).json({
    success: true,
    message: "Profile picture uploaded successfully",
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

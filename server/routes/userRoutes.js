const express = require("express");
const router = express.Router();

const {
  getMe,
  updateMe,
  uploadProfileImage,
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const { validateUpdateProfile } = require("../middleware/validationMiddleware");
const { uploadSingleImage } = require("../middleware/uploadMiddleware");

/**
 * @route   GET /api/users/me
 * @desc    Get current student's full profile
 * @access  Private
 * @pipeline Route -> Auth Middleware (protect) -> Controller -> Model -> DB
 */
router.get("/me", protect, getMe);

/**
 * @route   PUT /api/users/me
 * @desc    Update student profile details (name, email, college, course, year, subjects)
 * @access  Private
 * @pipeline Route -> Auth Middleware (protect) -> Validation Middleware (validateUpdateProfile) -> Controller -> Model -> DB
 */
router.put("/me", protect, validateUpdateProfile, updateMe);

/**
 * @route   POST /api/users/profile-image
 * @desc    Upload profile picture to Cloudinary
 * @access  Private
 * @pipeline Route -> Auth Middleware (protect) -> Upload Middleware (uploadSingleImage) -> Controller -> Cloudinary -> DB
 */
router.post(
  "/profile-image",
  protect,
  uploadSingleImage("image"),
  uploadProfileImage
);

module.exports = router;

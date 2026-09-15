const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");

const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

const { protect } = require("../middleware/authMiddleware");

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 * @pipeline Route -> Validation Middleware -> Controller -> Model -> DB
 */
router.post("/register", validateRegister, registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & retrieve token
 * @access  Public
 * @pipeline Route -> Validation Middleware -> Controller -> Model -> DB
 */
router.post("/login", validateLogin, loginUser);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Private
 * @pipeline Route -> Auth Middleware -> Controller -> Model -> DB
 */
router.get("/me", protect, getMe);

module.exports = router;
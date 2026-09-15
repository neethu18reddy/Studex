const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * Generate JWT Token helper
 * @param {string} id - User ID
 * @returns {string} Signed JWT Token
 */
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || "studex_default_jwt_secret_key";
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d").split("#")[0].split("//")[0].trim();

  return jwt.sign({ id }, secret, {
    expiresIn: expiresIn || "7d",
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists with this email address",
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user in database
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  });
});

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Check password match
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  // Generate JWT token
  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    token,
  });
});

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by authMiddleware)
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by protect middleware
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  generateToken,
};
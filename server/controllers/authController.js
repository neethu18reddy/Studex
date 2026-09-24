const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { getDefaultAvatarForGender } = require("../models/userModel");
const Subject = require("../models/subjectModel");
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
  const { name, email, password, gender, college, school, course, year, subjects } = req.body;

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

  // Normalize subjects array
  let parsedSubjects = [];
  if (Array.isArray(subjects)) {
    parsedSubjects = subjects
      .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
      .filter((s) => s.length > 0);
  } else if (typeof subjects === "string" && subjects.trim()) {
    parsedSubjects = subjects
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  const collegeName = (college !== undefined ? college : school || "").trim();
  const courseName = (course || "").trim();
  const yearName = (year || "1st Year").trim();
  const userGender = (gender || "other").toLowerCase().trim();
  const defaultAvatar = getDefaultAvatarForGender(userGender);

  // Create user in database with full profile details
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPassword,
    gender: userGender,
    profilePicture: {
      url: defaultAvatar,
      public_id: "",
    },
    college: collegeName,
    course: courseName,
    year: yearName,
    subjects: parsedSubjects,
  });

  // Automatically create workspace Subject documents for entered subjects
  if (parsedSubjects.length > 0) {
    const defaultColors = ["#aa3bff", "#00d2ff", "#ff416c", "#10b981", "#f59e0b", "#8b5cf6"];
    try {
      const subjectDocs = parsedSubjects.map((subjName, idx) => ({
        name: subjName,
        code: subjName.slice(0, 4).toUpperCase(),
        color: defaultColors[idx % defaultColors.length],
        semester: yearName || "Semester 1",
        user: user._id,
      }));
      await Subject.insertMany(subjectDocs);
    } catch (err) {
      console.error("Note: Initial subject creation skipped:", err.message);
    }
  }

  // Generate JWT token
  const token = generateToken(user._id);

  // Omit password from response
  const userObj = user.toObject();
  delete userObj.password;

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: userObj,
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

  // Omit password from response
  const userObj = user.toObject();
  delete userObj.password;

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: userObj,
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
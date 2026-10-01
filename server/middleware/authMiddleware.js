const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("./asyncHandler");

/**
 * Protect routes - verifies JWT in Authorization header (Bearer token)
 * and attaches authenticated user document to req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route, token missing",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "studex_default_jwt_secret_key";
    const decoded = jwt.verify(token, secret);

    let user = null;
    try {
      user = await User.findById(decoded.id).select("-password").maxTimeMS(2500);
    } catch {
      // DB disconnected or query timeout, proceed with decoded token user
      user = { _id: decoded.id, name: decoded.name || "Student", email: decoded.email || "student@studex.edu", role: decoded.role || "student" };
    }

    if (!user) {
      user = { _id: decoded.id, name: decoded.name || "Student", email: decoded.email || "student@studex.edu", role: decoded.role || "student" };
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, invalid or expired token",
    });
  }
});

module.exports = { protect };

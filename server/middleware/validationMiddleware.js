const mongoose = require("mongoose");

// Email regex pattern
const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

/**
 * Validates MongoDB ObjectId in request params
 */
const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid identifier format for '${paramName}'`,
      });
    }
    next();
  };
};

/**
 * Validates user registration payload
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push("A valid email address is required");
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("Password is required and must be at least 6 characters long");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();

  next();
};

/**
 * Validates user login payload
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
    errors.push("A valid email address is required");
  }

  if (!password || typeof password !== "string" || password.trim().length === 0) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

/**
 * Validates student profile update payload
 */
const validateUpdateProfile = (req, res, next) => {
  const { name, email, college, school, course, year, subjects } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      errors.push("Name cannot be empty");
    } else {
      req.body.name = name.trim();
    }
  }

  if (email !== undefined) {
    if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      errors.push("Please provide a valid email address");
    } else {
      req.body.email = email.trim().toLowerCase();
    }
  }

  if (school !== undefined && college === undefined) {
    req.body.college = typeof school === "string" ? school.trim() : "";
  } else if (college !== undefined) {
    req.body.college = typeof college === "string" ? college.trim() : "";
  }

  if (course !== undefined) {
    req.body.course = typeof course === "string" ? course.trim() : "";
  }

  if (year !== undefined) {
    req.body.year = typeof year === "string" ? year.trim() : "";
  }

  if (subjects !== undefined) {
    if (Array.isArray(subjects)) {
      req.body.subjects = subjects
        .map((s) => (typeof s === "string" ? s.trim() : String(s).trim()))
        .filter((s) => s.length > 0);
    } else if (typeof subjects === "string") {
      req.body.subjects = subjects
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      errors.push("Subjects must be an array of strings or a comma-separated string");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  next();
};

/**
 * Validates Subject creation payload
 */
const validateSubjectCreate = (req, res, next) => {
  const { name, code, color, semester } = req.body;
  const errors = [];

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Subject name is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  req.body.name = name.trim();
  if (code && typeof code === "string") req.body.code = code.trim().toUpperCase();
  if (color && typeof color === "string") req.body.color = color.trim();
  if (semester && typeof semester === "string") req.body.semester = semester.trim();

  next();
};

/**
 * Validates Resource creation payload
 */
const validateResourceCreate = (req, res, next) => {
  const { title, subject, url, type } = req.body;
  const errors = [];

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    errors.push("Resource title is required");
  }

  if (!subject || !mongoose.Types.ObjectId.isValid(subject)) {
    errors.push("A valid subject ID is required");
  }

  // If no file was uploaded, a URL must be provided (e.g. for link resources)
  if (!req.file) {
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      errors.push("Please either upload a resource file or provide a resource URL");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  req.body.title = title.trim();
  if (url) req.body.url = url.trim();

  next();
};

/**
 * Validates course creation payload
 */
const validateCourseCreate = (req, res, next) => {
  const { course_name, instructor, ratings } = req.body;
  const errors = [];

  if (!course_name || typeof course_name !== "string" || course_name.trim().length === 0) {
    errors.push("Course name is required");
  }

  if (!instructor || typeof instructor !== "string" || instructor.trim().length === 0) {
    errors.push("Instructor name is required");
  }

  if (ratings !== undefined && ratings !== null && ratings !== "") {
    const numRating = Number(ratings);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      errors.push("Ratings must be a number between 0 and 5");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  if (req.body.course_name) req.body.course_name = req.body.course_name.trim();
  if (req.body.instructor) req.body.instructor = req.body.instructor.trim();
  if (req.body.description) req.body.description = req.body.description.trim();
  if (req.body.category) req.body.category = req.body.category.trim();

  next();
};

/**
 * Validates course update payload
 */
const validateCourseUpdate = (req, res, next) => {
  const { course_name, instructor, ratings } = req.body;
  const errors = [];

  if (course_name !== undefined && (typeof course_name !== "string" || course_name.trim().length === 0)) {
    errors.push("Course name cannot be empty");
  }

  if (instructor !== undefined && (typeof instructor !== "string" || instructor.trim().length === 0)) {
    errors.push("Instructor name cannot be empty");
  }

  if (ratings !== undefined && ratings !== null && ratings !== "") {
    const numRating = Number(ratings);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      errors.push("Ratings must be a number between 0 and 5");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
      errors,
    });
  }

  if (req.body.course_name) req.body.course_name = req.body.course_name.trim();
  if (req.body.instructor) req.body.instructor = req.body.instructor.trim();
  if (req.body.description) req.body.description = req.body.description.trim();
  if (req.body.category) req.body.category = req.body.category.trim();

  next();
};

module.exports = {
  validateObjectId,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateSubjectCreate,
  validateResourceCreate,
  validateCourseCreate,
  validateCourseUpdate,
};

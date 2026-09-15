const Course = require("../models/courseModel");
const { isDbConnected } = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");

// Helper to check DB readiness
const checkDb = (res) => {
  if (!isDbConnected()) {
    res.status(503).json({
      success: false,
      message:
        "Database is currently not connected. Please check your MONGO_URI in server/.env or start MongoDB.",
      data: [],
    });
    return false;
  }
  return true;
};

/**
 * @desc    Get all courses with optional filters
 * @route   GET /api/courses
 * @access  Public / Authenticated
 */
const getCourses = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { isPublished, category, search } = req.query;
  const filter = {};

  if (isPublished !== undefined) {
    filter.isPublished = isPublished === "true";
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.course_name = { $regex: search, $options: "i" };
  }

  const courses = await Course.find(filter)
    .populate("user", "name email profilePicture")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public / Authenticated
 */
const getCourseById = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const course = await Course.findById(req.params.id).populate(
    "user",
    "name email profilePicture"
  );

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course with id ${req.params.id} not found`,
    });
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private (Protected by authMiddleware)
 */
const createCourse = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { course_name, instructor, ratings, isPublished, description, category } = req.body;

  const course = await Course.create({
    user: req.user ? req.user._id : undefined,
    course_name,
    instructor: instructor || (req.user ? req.user.name : "Instructor"),
    ratings: ratings !== undefined ? Number(ratings) : 0,
    isPublished: Boolean(isPublished),
    description: description || "",
    category: category || "General",
  });

  res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
});

/**
 * @desc    Update a course by ID
 * @route   PUT /api/courses/:id
 * @access  Private (Protected by authMiddleware)
 */
const updateCourse = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course with id ${req.params.id} not found`,
    });
  }

  const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Course updated successfully",
    data: updatedCourse,
  });
});

/**
 * @desc    Delete a course by ID
 * @route   DELETE /api/courses/:id
 * @access  Private (Protected by authMiddleware)
 */
const deleteCourse = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: `Course with id ${req.params.id} not found`,
    });
  }

  await Course.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
    data: {},
  });
});

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};

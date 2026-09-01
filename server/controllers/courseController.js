const Course = require("../models/courseModel");
const { isDbConnected } = require("../config/db");

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

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
const getCourses = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { isPublished, category } = req.query;
    const filter = {};

    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }

    if (category) {
      filter.category = category;
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course with id ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new course
// @route   POST /api/courses
// @access  Public
const createCourse = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const { course_name, instructor, ratings, isPublished, description, category } = req.body;

    if (!course_name || !instructor) {
      return res.status(400).json({
        success: false,
        message: "Please provide both course_name and instructor",
      });
    }

    const course = await Course.create({
      course_name,
      instructor,
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
  } catch (error) {
    next(error);
  }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Public
const updateCourse = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course with id ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Public
const deleteCourse = async (req, res, next) => {
  try {
    if (!checkDb(res)) return;

    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: `Course with id ${req.params.id} not found`,
      });
    }

    res.json({
      success: true,
      message: "Course deleted successfully",
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};

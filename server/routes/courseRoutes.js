const express = require("express");
const router = express.Router();

const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");

const {
  validateObjectId,
  validateCourseCreate,
  validateCourseUpdate,
} = require("../middleware/validationMiddleware");

const { protect } = require("../middleware/authMiddleware");

/**
 * @route   GET /api/courses (Public)
 *          POST /api/courses (Protected - requires student login)
 * @pipeline Route -> [Auth Middleware] -> [Validation Middleware] -> Controller -> Model -> DB
 */
router
  .route("/")
  .get(getCourses)
  .post(protect, validateCourseCreate, createCourse);

/**
 * @route   GET /api/courses/:id (Public)
 *          PUT /api/courses/:id (Protected - requires student login)
 *          DELETE /api/courses/:id (Protected - requires student login)
 * @pipeline Route -> [Auth Middleware] -> [Validation Middleware] -> Controller -> Model -> DB
 */
router
  .route("/:id")
  .get(validateObjectId("id"), getCourseById)
  .put(protect, validateObjectId("id"), validateCourseUpdate, updateCourse)
  .delete(protect, validateObjectId("id"), deleteCourse);

module.exports = router;

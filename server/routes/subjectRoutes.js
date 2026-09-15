const express = require("express");
const router = express.Router();

const {
  createSubject,
  getSubjects,
  deleteSubject,
} = require("../controllers/subjectController");

const { protect } = require("../middleware/authMiddleware");
const {
  validateSubjectCreate,
  validateObjectId,
} = require("../middleware/validationMiddleware");

/**
 * @route   GET /api/subjects (Get all student's subjects)
 *          POST /api/subjects (Create subject)
 * @pipeline Route -> Auth Middleware (protect) -> Validation -> Controller -> Model -> DB
 */
router
  .route("/")
  .get(protect, getSubjects)
  .post(protect, validateSubjectCreate, createSubject);

/**
 * @route   DELETE /api/subjects/:id (Delete subject and its resources)
 * @pipeline Route -> Auth Middleware (protect) -> validateObjectId -> Controller -> Model -> DB
 */
router.route("/:id").delete(protect, validateObjectId("id"), deleteSubject);

module.exports = router;

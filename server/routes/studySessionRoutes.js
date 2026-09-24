const express = require("express");
const router = express.Router();

const {
  recordSession,
  getStudySessions,
  getStudyStats,
  deleteSession,
} = require("../controllers/studySessionController");

const { protect } = require("../middleware/authMiddleware");
const {
  validateStudySessionCreate,
  validateObjectId,
} = require("../middleware/validationMiddleware");

/**
 * @route   GET /api/study-sessions (Get user's focus session history)
 *          POST /api/study-sessions (Record completed focus timer session)
 * @pipeline Route -> Auth Middleware (protect) -> Validation -> Controller -> Model -> DB
 */
router
  .route("/")
  .get(protect, getStudySessions)
  .post(protect, validateStudySessionCreate, recordSession);

/**
 * @route   GET /api/study-sessions/stats (Get aggregated study focus metrics)
 * @pipeline Route -> Auth Middleware (protect) -> Controller -> Model -> DB
 */
router.get("/stats", protect, getStudyStats);

/**
 * @route   DELETE /api/study-sessions/:id (Delete a study session)
 * @pipeline Route -> Auth Middleware (protect) -> validateObjectId -> Controller -> Model -> DB
 */
router.route("/:id").delete(protect, validateObjectId("id"), deleteSession);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  createTask,
  getTasks,
  getTodayTasks,
  getUpcomingTasks,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const { protect } = require("../middleware/authMiddleware");
const {
  validateTaskCreate,
  validateTaskUpdate,
  validateObjectId,
} = require("../middleware/validationMiddleware");

/**
 * @route   GET /api/tasks (List student tasks with optional query filters)
 *          POST /api/tasks (Create a new task)
 * @pipeline Route -> Auth Middleware (protect) -> Validation -> Controller -> Model -> DB
 */
router
  .route("/")
  .get(protect, getTasks)
  .post(protect, validateTaskCreate, createTask);

/**
 * @route   GET /api/tasks/today (Get tasks scheduled for today)
 * @pipeline Route -> Auth Middleware (protect) -> Controller -> Model -> DB
 */
router.get("/today", protect, getTodayTasks);

/**
 * @route   GET /api/tasks/upcoming (Get upcoming future tasks)
 * @pipeline Route -> Auth Middleware (protect) -> Controller -> Model -> DB
 */
router.get("/upcoming", protect, getUpcomingTasks);

/**
 * @route   PATCH /api/tasks/:id (Partial update / status toggle)
 *          PUT /api/tasks/:id (Full task update)
 *          DELETE /api/tasks/:id (Delete task)
 * @pipeline Route -> Auth Middleware (protect) -> validateObjectId -> Validation -> Controller -> Model -> DB
 */
router
  .route("/:id")
  .patch(protect, validateObjectId("id"), validateTaskUpdate, updateTask)
  .put(protect, validateObjectId("id"), validateTaskUpdate, updateTask)
  .delete(protect, validateObjectId("id"), deleteTask);

module.exports = router;

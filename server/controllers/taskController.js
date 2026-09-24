const Task = require("../models/taskModel");
const Subject = require("../models/subjectModel");
const asyncHandler = require("../middleware/asyncHandler");
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

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private (Requires JWT Auth)
 */
const createTask = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const {
    title,
    description,
    subject,
    priority,
    deadline,
    status,
    estimatedDuration,
  } = req.body;

  // If subject specified, ensure user owns the subject
  if (subject) {
    const subjectDoc = await Subject.findOne({
      _id: subject,
      user: req.user._id,
    });
    if (!subjectDoc) {
      return res.status(404).json({
        success: false,
        message: "Subject not found or does not belong to the current student",
      });
    }
  }

  const task = await Task.create({
    title,
    description: description || "",
    subject: subject || null,
    priority: priority || "medium",
    deadline: deadline ? new Date(deadline) : null,
    status: status || "todo",
    estimatedDuration: estimatedDuration !== undefined ? Number(estimatedDuration) : 30,
    user: req.user._id,
    completedAt: status === "completed" ? new Date() : null,
  });

  const populatedTask = await Task.findById(task._id).populate(
    "subject",
    "name code color"
  );

  res.status(201).json({
    success: true,
    message: "Task created successfully",
    data: populatedTask,
  });
});

/**
 * @desc    Get all tasks for the logged in student with optional filters
 * @route   GET /api/tasks
 * @access  Private (Requires JWT Auth)
 */
const getTasks = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { status, priority, subject, search } = req.query;
  const filter = { user: req.user._id };

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (subject) {
    filter.subject = subject;
  }

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const tasks = await Task.find(filter)
    .populate("subject", "name code color")
    .sort({ deadline: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * @desc    Get tasks due today
 * @route   GET /api/tasks/today
 * @access  Private (Requires JWT Auth)
 */
const getTodayTasks = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    user: req.user._id,
    deadline: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate("subject", "name code color")
    .sort({ priority: -1, deadline: 1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * @desc    Get upcoming tasks (due after today)
 * @route   GET /api/tasks/upcoming
 * @access  Private (Requires JWT Auth)
 */
const getUpcomingTasks = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const tasks = await Task.find({
    user: req.user._id,
    deadline: {
      $gt: endOfToday,
    },
  })
    .populate("subject", "name code color")
    .sort({ deadline: 1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

/**
 * @desc    Update / patch a task by ID
 * @route   PATCH /api/tasks/:id or PUT /api/tasks/:id
 * @access  Private (Requires JWT Auth)
 */
const updateTask = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: `Task with id ${req.params.id} not found`,
    });
  }

  // Ensure user owns the task
  if (task.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this task",
    });
  }

  const {
    title,
    description,
    subject,
    priority,
    deadline,
    status,
    estimatedDuration,
  } = req.body;

  if (subject !== undefined) {
    if (subject) {
      const subjectDoc = await Subject.findOne({
        _id: subject,
        user: req.user._id,
      });
      if (!subjectDoc) {
        return res.status(404).json({
          success: false,
          message: "Subject not found or does not belong to the current student",
        });
      }
      task.subject = subject;
    } else {
      task.subject = null;
    }
  }

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (estimatedDuration !== undefined) task.estimatedDuration = Number(estimatedDuration);
  if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : null;

  if (status !== undefined) {
    task.status = status;
    if (status === "completed" && !task.completedAt) {
      task.completedAt = new Date();
    } else if (status !== "completed") {
      task.completedAt = null;
    }
  }

  await task.save();

  const populatedTask = await Task.findById(task._id).populate(
    "subject",
    "name code color"
  );

  res.status(200).json({
    success: true,
    message: "Task updated successfully",
    data: populatedTask,
  });
});

/**
 * @desc    Delete a task by ID
 * @route   DELETE /api/tasks/:id
 * @access  Private (Requires JWT Auth)
 */
const deleteTask = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const task = await Task.findById(req.params.id);

  if (!task) {
    return res.status(404).json({
      success: false,
      message: `Task with id ${req.params.id} not found`,
    });
  }

  // Ensure user owns the task
  if (task.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this task",
    });
  }

  await Task.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
    data: {},
  });
});

module.exports = {
  createTask,
  getTasks,
  getTodayTasks,
  getUpcomingTasks,
  updateTask,
  deleteTask,
};

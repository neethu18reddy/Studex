const Subject = require("../models/subjectModel");
const Resource = require("../models/resourceModel");
const asyncHandler = require("../middleware/asyncHandler");
const { deleteImage } = require("../config/cloudinary");
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
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private (Requires JWT Auth)
 */
const createSubject = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { name, code, description, color, semester } = req.body;

  const subject = await Subject.create({
    name,
    code: code || "",
    description: description || "",
    color: color || "#aa3bff",
    semester: semester || "Semester 1",
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Subject created successfully",
    data: subject,
  });
});

/**
 * @desc    Get all subjects for current student with resource count
 * @route   GET /api/subjects
 * @access  Private (Requires JWT Auth)
 */
const getSubjects = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const subjects = await Subject.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  // Calculate resource counts for each subject
  const subjectsWithCounts = await Promise.all(
    subjects.map(async (subj) => {
      const resourceCount = await Resource.countDocuments({
        subject: subj._id,
        user: req.user._id,
      });
      const subjObj = subj.toObject();
      subjObj.resourceCount = resourceCount;
      return subjObj;
    })
  );

  res.status(200).json({
    success: true,
    count: subjectsWithCounts.length,
    data: subjectsWithCounts,
  });
});

/**
 * @desc    Delete a subject and its associated resources
 * @route   DELETE /api/subjects/:id
 * @access  Private (Requires JWT Auth)
 */
const deleteSubject = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: `Subject with id ${req.params.id} not found`,
    });
  }

  // Ensure user owns this subject
  if (subject.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this subject",
    });
  }

  // Find all associated resources
  const resources = await Resource.find({ subject: subject._id });

  // Clean up any Cloudinary assets associated with this subject
  for (const resource of resources) {
    if (resource.public_id) {
      deleteImage(
        resource.public_id,
        resource.type === "image" ? "image" : "raw"
      ).catch((err) =>
        console.error(`Failed to delete asset ${resource.public_id}:`, err.message)
      );
    }
  }

  // Delete resources from MongoDB
  await Resource.deleteMany({ subject: subject._id });

  // Delete subject
  await Subject.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Subject and all associated resources deleted successfully",
    data: {},
  });
});

module.exports = {
  createSubject,
  getSubjects,
  deleteSubject,
};

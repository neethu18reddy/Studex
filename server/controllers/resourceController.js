const Resource = require("../models/resourceModel");
const Subject = require("../models/subjectModel");
const asyncHandler = require("../middleware/asyncHandler");
const {
  uploadStream,
  deleteImage,
  isCloudinaryConfigured,
} = require("../config/cloudinary");
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
 * Helper to determine resource type from mimetype
 */
const getResourceTypeFromMime = (mime) => {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "document";
};

/**
 * @desc    Create a new learning resource (File upload to Cloudinary or Web Link)
 * @route   POST /api/resources
 * @access  Private (Requires JWT Auth)
 */
const createResource = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { title, description, subject: subjectId, url, tags } = req.body;

  // Validate subject ownership
  const subject = await Subject.findOne({
    _id: subjectId,
    user: req.user._id,
  });

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: "Subject not found or does not belong to the current student",
    });
  }

  let finalUrl = url;
  let finalType = req.body.type || "link";
  let publicId = "";
  let fileName = "";
  let fileSize = 0;

  // Handle uploaded file (PDF, Image, or Document)
  if (req.file) {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        success: false,
        message:
          "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env.",
      });
    }

    finalType = getResourceTypeFromMime(req.file.mimetype);
    fileName = req.file.originalname;
    fileSize = req.file.size;

    // Stream upload file directly to Cloudinary
    const uploadResult = await uploadStream(req.file.buffer, {
      folder: `studex/subjects/${subject.name.replace(/\s+/g, "_").toLowerCase()}`,
      resource_type: "auto",
    });

    finalUrl = uploadResult.url;
    publicId = uploadResult.public_id;
  }

  // Parse tags if provided
  let parsedTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === "string") {
      parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }
  }

  const resource = await Resource.create({
    title,
    description: description || "",
    type: finalType,
    url: finalUrl,
    public_id: publicId,
    fileName,
    fileSize,
    subject: subject._id,
    user: req.user._id,
    tags: parsedTags,
  });

  const populatedResource = await Resource.findById(resource._id).populate(
    "subject",
    "name code color"
  );

  res.status(201).json({
    success: true,
    message: "Resource created successfully",
    data: populatedResource,
  });
});

/**
 * @desc    Get resources for current student with optional filters (subject, type, search)
 * @route   GET /api/resources
 * @access  Private (Requires JWT Auth)
 */
const getResources = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const { subject, type, search } = req.query;
  const filter = { user: req.user._id };

  if (subject) {
    filter.subject = subject;
  }

  if (type && ["pdf", "image", "document", "link"].includes(type)) {
    filter.type = type;
  }

  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  const resources = await Resource.find(filter)
    .populate("subject", "name code color")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: resources.length,
    data: resources,
  });
});

/**
 * @desc    Delete a learning resource
 * @route   DELETE /api/resources/:id
 * @access  Private (Requires JWT Auth)
 */
const deleteResource = asyncHandler(async (req, res) => {
  if (!checkDb(res)) return;

  const resource = await Resource.findById(req.params.id);

  if (!resource) {
    return res.status(404).json({
      success: false,
      message: `Resource with id ${req.params.id} not found`,
    });
  }

  // Ensure user owns this resource
  if (resource.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this resource",
    });
  }

  // If stored on Cloudinary, delete remote asset
  if (resource.public_id) {
    deleteImage(
      resource.public_id,
      resource.type === "image" ? "image" : "raw"
    ).catch((err) =>
      console.error(`Failed to delete asset ${resource.public_id}:`, err.message)
    );
  }

  await Resource.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Resource deleted successfully",
    data: {},
  });
});

module.exports = {
  createResource,
  getResources,
  deleteResource,
};

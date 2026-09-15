const multer = require("multer");

// In-memory storage for streaming directly to Cloudinary
const storage = multer.memoryStorage();

// Profile Image Filter (Images Only - 5MB)
const imageFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      "Unsupported image format. Please upload an image (JPEG, PNG, WEBP, or GIF)."
    );
    error.statusCode = 400;
    cb(error, false);
  }
};

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

/**
 * Middleware wrapper for profile image upload
 */
const uploadSingleImage = (fieldName = "image") => {
  const multerSingle = imageUpload.single(fieldName);

  return (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File is too large. Maximum allowed image size is 5MB.",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file upload",
        });
      }
      next();
    });
  };
};

// Resource File Filter (PDFs, Images, Documents - 15MB)
const resourceFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // PDFs
    "application/pdf",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    // Documents
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/rtf",
    "application/epub+zip",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      "Unsupported resource file type. Please upload a PDF, image, Word document, PowerPoint presentation, or text file."
    );
    error.statusCode = 400;
    cb(error, false);
  }
};

const resourceUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit for PDFs/documents
  fileFilter: resourceFilter,
});

/**
 * Middleware wrapper for academic resource file upload
 */
const uploadResourceFile = (fieldName = "file") => {
  const multerSingle = resourceUpload.single(fieldName);

  return (req, res, next) => {
    multerSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Resource file is too large. Maximum allowed size is 15MB.",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid resource upload",
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadSingleImage,
  uploadResourceFile,
};

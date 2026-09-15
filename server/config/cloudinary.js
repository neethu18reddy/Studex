const cloudinary = require("cloudinary").v2;
const stream = require("stream");

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Checks whether Cloudinary credentials have been configured in environment
 * @returns {boolean}
 */
const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Uploads a buffer directly to Cloudinary using an upload stream
 * Supports images, PDFs, raw documents, and media
 * @param {Buffer} buffer - File buffer from Multer memory storage
 * @param {Object} options - Cloudinary upload options (e.g. folder, resource_type, transformation)
 * @returns {Promise<{url: string, public_id: string, resource_type: string, format: string, bytes: number}>}
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          "Cloudinary credentials are not configured in environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)."
        )
      );
    }

    const defaultOptions = {
      folder: "studex/resources",
      resource_type: "auto",
      ...options,
    };

    const uploadStreamHandler = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    bufferStream.pipe(uploadStreamHandler);
  });
};

/**
 * Deletes an asset from Cloudinary by its public ID and resource type
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'raw' | 'video'
 * @returns {Promise<any>}
 */
const deleteImage = async (publicId, resourceType = "image") => {
  if (!isCloudinaryConfigured() || !publicId) {
    return null;
  }
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error(`Error deleting asset from Cloudinary: ${error.message}`);
    return null;
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadStream,
  deleteImage,
};

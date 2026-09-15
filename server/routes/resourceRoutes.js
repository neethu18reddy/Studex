const express = require("express");
const router = express.Router();

const {
  createResource,
  getResources,
  deleteResource,
} = require("../controllers/resourceController");

const { protect } = require("../middleware/authMiddleware");
const { uploadResourceFile } = require("../middleware/uploadMiddleware");
const {
  validateResourceCreate,
  validateObjectId,
} = require("../middleware/validationMiddleware");

/**
 * @route   GET /api/resources (List learning resources)
 *          POST /api/resources (Upload or add resource link)
 * @pipeline Route -> Auth Middleware (protect) -> Upload Middleware -> Validation -> Controller -> Model -> DB
 */
router
  .route("/")
  .get(protect, getResources)
  .post(
    protect,
    uploadResourceFile("file"),
    validateResourceCreate,
    createResource
  );

/**
 * @route   DELETE /api/resources/:id (Delete resource)
 * @pipeline Route -> Auth Middleware (protect) -> validateObjectId -> Controller -> Model -> DB
 */
router.route("/:id").delete(protect, validateObjectId("id"), deleteResource);

module.exports = router;

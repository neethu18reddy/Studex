const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  requireSpaceMembership,
  requireSpaceRole,
} = require("../middleware/spaceAuthMiddleware");
const {
  createSpace,
  getMySpaces,
  getDiscoverableSpaces,
  getSpaceById,
  joinSpaceByCode,
  joinPublicSpace,
  leaveSpace,
  inviteMember,
  removeMember,
  updateMemberRole,
  updateSpace,
  regenerateInviteCode,
  deleteSpace,
} = require("../controllers/spaceController");

const {
  getSpacePosts,
  createSpacePost,
  addPostReply,
  toggleLikePost,
  togglePinPost,
  deleteSpacePost,
  getSpaceResources,
  createSpaceResource,
  deleteSpaceResource,
  getSpaceTasks,
  createSpaceTask,
  updateSpaceTask,
  deleteSpaceTask,
  syncTaskToPersonal,
  unsyncTaskFromPersonal,
} = require("../controllers/spaceCollaborationController");

// All routes require authenticated student
router.use(protect);

// 1. Base Space Collection Routes
router.route("/").post(createSpace);
router.route("/my").get(getMySpaces);
router.route("/discover").get(getDiscoverableSpaces);
router.route("/join").post(joinSpaceByCode);

// 2. Space Instance Routes
router.route("/:id").get(getSpaceById);
router.route("/:id/join-public").post(joinPublicSpace);
router.route("/:id/leave").post(leaveSpace);

// 3. Space Management (Owner/Admin)
router
  .route("/:id")
  .put(requireSpaceMembership, requireSpaceRole(["owner", "admin"]), updateSpace)
  .delete(requireSpaceMembership, requireSpaceRole(["owner"]), deleteSpace);

router
  .route("/:id/regenerate-code")
  .post(
    requireSpaceMembership,
    requireSpaceRole(["owner", "admin"]),
    regenerateInviteCode
  );

router
  .route("/:id/invite")
  .post(
    requireSpaceMembership,
    requireSpaceRole(["owner", "admin", "member"]),
    inviteMember
  );

router
  .route("/:id/members/:memberId")
  .delete(
    requireSpaceMembership,
    requireSpaceRole(["owner", "admin"]),
    removeMember
  );

router
  .route("/:id/members/:memberId/role")
  .patch(
    requireSpaceMembership,
    requireSpaceRole(["owner"]),
    updateMemberRole
  );

/* =========================================================================
   4. PHASE 13: COLLABORATION (Discussions, Resources, Tasks, Announcements)
   ========================================================================= */

// Discussions & Announcements
router.route("/:id/posts").get(getSpacePosts).post(createSpacePost);
router.route("/:id/posts/:postId/reply").post(addPostReply);
router.route("/:id/posts/:postId/like").post(toggleLikePost);
router.route("/:id/posts/:postId/pin").patch(togglePinPost);
router.route("/:id/posts/:postId").delete(deleteSpacePost);

// Shared Resources (PDF, Image, Document, Link, Video)
router.route("/:id/resources").get(getSpaceResources).post(createSpaceResource);
router.route("/:id/resources/:resourceId").delete(deleteSpaceResource);

// Group Tasks & Personal <-> Group Sync
router.route("/:id/tasks").get(getSpaceTasks).post(createSpaceTask);
router.route("/:id/tasks/:taskId").patch(updateSpaceTask).delete(deleteSpaceTask);
router
  .route("/:id/tasks/:taskId/sync-personal")
  .post(syncTaskToPersonal)
  .delete(unsyncTaskFromPersonal);

module.exports = router;

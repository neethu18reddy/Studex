const Space = require("../models/spaceModel");
const SpaceMember = require("../models/spaceMemberModel");
const SpacePost = require("../models/spacePostModel");
const SpaceResource = require("../models/spaceResourceModel");
const SpaceTask = require("../models/spaceTaskModel");
const Task = require("../models/taskModel");
const asyncHandler = require("../middleware/asyncHandler");
const { emitToSpace, emitToUser } = require("../socket/socketServer");

// Helper to verify user membership in space
async function verifyMembership(spaceId, userId) {
  const membership = await SpaceMember.findOne({
    space: spaceId,
    user: userId,
    status: "active",
  }).lean();
  return membership;
}

/* =========================================================================
   1. SPACE DISCUSSIONS & ANNOUNCEMENTS
   ========================================================================= */

/**
 * @desc    Get posts for a space (discussions & announcements)
 * @route   GET /api/spaces/:id/posts
 * @access  Private (Space Member)
 */
const getSpacePosts = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { type, search } = req.query;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "You must be a member of this space to view discussions." });
  }

  const query = { space: spaceId };
  if (type && type !== "all") {
    query.type = type;
  }
  if (search && search.trim()) {
    query.content = { $regex: search.trim(), $options: "i" };
  }

  const posts = await SpacePost.find(query)
    .populate("author", "name email profilePicture college role")
    .populate("replies.author", "name email profilePicture")
    .sort({ isPinned: -1, createdAt: -1 })
    .lean();

  const formatted = posts.map((p) => ({
    ...p,
    likesCount: p.likes?.length || 0,
    hasLiked: p.likes?.some((uId) => uId.toString() === req.user._id.toString()),
    repliesCount: p.replies?.length || 0,
  }));

  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

/**
 * @desc    Create a discussion post or announcement
 * @route   POST /api/spaces/:id/posts
 * @access  Private (Space Member; Announcements require Owner/Admin)
 */
const createSpacePost = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { content, type = "discussion", title, isPinned = false, attachments = [] } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Post content cannot be empty." });
  }

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "You must be an active member to post in this space." });
  }

  if (type === "announcement" && !["owner", "admin"].includes(membership.role)) {
    return res.status(403).json({ success: false, message: "Only Space Owners and Admins can publish official Announcements." });
  }

  const post = await SpacePost.create({
    space: spaceId,
    author: req.user._id,
    content: content.trim(),
    type: type || "discussion",
    title: title ? title.trim() : "",
    isPinned: isPinned === true && ["owner", "admin"].includes(membership.role),
    attachments: Array.isArray(attachments) ? attachments : [],
  });

  const populated = await SpacePost.findById(post._id)
    .populate("author", "name email profilePicture college role")
    .lean();

  const postData = {
    ...populated,
    likesCount: 0,
    hasLiked: false,
    repliesCount: 0,
  };

  // Real-time broadcast to all space members
  emitToSpace(spaceId, "space:new_post", postData);

  // If announcement, notify all space members
  if (type === "announcement") {
    emitToSpace(spaceId, "notification:new", {
      id: `ann_${post._id}`,
      type: "announcement",
      title: `📢 Announcement: ${title || "New Notice"}`,
      message: content.length > 70 ? content.slice(0, 67) + "..." : content,
      data: { spaceId, postId: post._id },
      createdAt: new Date(),
    });
  }

  res.status(201).json({
    success: true,
    message: type === "announcement" ? "Announcement published!" : "Discussion posted!",
    data: postData,
  });
});

/**
 * @desc    Add a reply to a discussion post
 * @route   POST /api/spaces/:id/posts/:postId/reply
 * @access  Private (Space Member)
 */
const addPostReply = asyncHandler(async (req, res) => {
  const { id: spaceId, postId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Reply content is required." });
  }

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "You must be a member of this space to reply." });
  }

  const post = await SpacePost.findOne({ _id: postId, space: spaceId });
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found." });
  }

  const newReply = {
    author: req.user._id,
    content: content.trim(),
    createdAt: new Date(),
  };

  post.replies.push(newReply);
  await post.save();

  const updated = await SpacePost.findById(postId)
    .populate("author", "name email profilePicture college")
    .populate("replies.author", "name email profilePicture")
    .lean();

  // Real-time broadcast reply to space
  emitToSpace(spaceId, "space:post_reply", {
    postId,
    updatedPost: updated,
  });

  res.status(201).json({
    success: true,
    message: "Reply added!",
    data: updated,
  });
});

/**
 * @desc    Toggle like on a post
 * @route   POST /api/spaces/:id/posts/:postId/like
 * @access  Private (Space Member)
 */
const toggleLikePost = asyncHandler(async (req, res) => {
  const { id: spaceId, postId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const post = await SpacePost.findOne({ _id: postId, space: spaceId });
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found." });
  }

  const userIdStr = req.user._id.toString();
  const alreadyLiked = post.likes.some((id) => id.toString() === userIdStr);

  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => id.toString() !== userIdStr);
  } else {
    post.likes.push(req.user._id);
  }

  await post.save();

  // Real-time broadcast like count to space
  emitToSpace(spaceId, "space:post_liked", {
    postId,
    likesCount: post.likes.length,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    liked: !alreadyLiked,
    likesCount: post.likes.length,
  });
});

/**
 * @desc    Toggle pin status for announcement
 * @route   PATCH /api/spaces/:id/posts/:postId/pin
 * @access  Private (Owner/Admin)
 */
const togglePinPost = asyncHandler(async (req, res) => {
  const { id: spaceId, postId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return res.status(403).json({ success: false, message: "Only space admins and owners can pin announcements." });
  }

  const post = await SpacePost.findOne({ _id: postId, space: spaceId });
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found." });
  }

  post.isPinned = !post.isPinned;
  await post.save();

  res.status(200).json({
    success: true,
    message: post.isPinned ? "Post pinned to top of Space!" : "Post unpinned.",
    isPinned: post.isPinned,
  });
});

/**
 * @desc    Delete a post
 * @route   DELETE /api/spaces/:id/posts/:postId
 * @access  Private (Author, Admin, or Owner)
 */
const deleteSpacePost = asyncHandler(async (req, res) => {
  const { id: spaceId, postId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const post = await SpacePost.findOne({ _id: postId, space: spaceId });
  if (!post) {
    return res.status(404).json({ success: false, message: "Post not found." });
  }

  const isAuthor = post.author.toString() === req.user._id.toString();
  const isManager = ["owner", "admin"].includes(membership.role);

  if (!isAuthor && !isManager) {
    return res.status(403).json({ success: false, message: "You do not have permission to delete this post." });
  }

  await SpacePost.findByIdAndDelete(postId);

  res.status(200).json({ success: true, message: "Post deleted successfully." });
});

/* =========================================================================
   2. SHARED ACADEMIC RESOURCES (PDF, Image, Doc, Link, Video)
   ========================================================================= */

/**
 * @desc    Get shared resources in a space
 * @route   GET /api/spaces/:id/resources
 * @access  Private (Space Member)
 */
const getSpaceResources = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { type, search, tag } = req.query;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "You must be a member of this space to access resources." });
  }

  const query = { space: spaceId };
  if (type && type !== "all") {
    query.type = type;
  }
  if (tag && tag.trim()) {
    query.tags = tag.trim();
  }
  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
      { subject: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const resources = await SpaceResource.find(query)
    .populate("uploadedBy", "name email profilePicture college")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, count: resources.length, data: resources });
});

/**
 * @desc    Share a new resource in a space
 * @route   POST /api/spaces/:id/resources
 * @access  Private (Space Member)
 */
const createSpaceResource = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { title, description, type, url, fileSize, subject, tags } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: "Resource title is required." });
  }
  if (!url || !url.trim()) {
    return res.status(400).json({ success: false, message: "Resource URL or file link is required." });
  }
  if (!["pdf", "image", "document", "link", "video"].includes(type)) {
    return res.status(400).json({ success: false, message: "Type must be pdf, image, document, link, or video." });
  }

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required to share resources." });
  }

  let parsedTags = [];
  if (Array.isArray(tags)) {
    parsedTags = tags.map((t) => t.trim()).filter(Boolean);
  } else if (typeof tags === "string" && tags.trim()) {
    parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  const resource = await SpaceResource.create({
    space: spaceId,
    uploadedBy: req.user._id,
    title: title.trim(),
    description: description ? description.trim() : "",
    type,
    url: url.trim(),
    fileSize: fileSize || 0,
    subject: subject ? subject.trim() : "",
    tags: parsedTags,
  });

  const populated = await SpaceResource.findById(resource._id)
    .populate("uploadedBy", "name email profilePicture college")
    .lean();

  // Real-time broadcast shared resource to space
  emitToSpace(spaceId, "space:new_resource", populated);
  emitToSpace(spaceId, "notification:new", {
    id: `res_${resource._id}`,
    type: "resource",
    title: `📁 New Resource: ${resource.title}`,
    message: `${req.user.name} shared a new ${resource.type.toUpperCase()} with the space`,
    data: { spaceId, resourceId: resource._id },
    createdAt: new Date(),
  });

  res.status(201).json({
    success: true,
    message: `Shared "${resource.title}" with the Space!`,
    data: populated,
  });
});

/**
 * @desc    Delete a shared resource
 * @route   DELETE /api/spaces/:id/resources/:resourceId
 * @access  Private (Uploader, Admin, or Owner)
 */
const deleteSpaceResource = asyncHandler(async (req, res) => {
  const { id: spaceId, resourceId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const resource = await SpaceResource.findOne({ _id: resourceId, space: spaceId });
  if (!resource) {
    return res.status(404).json({ success: false, message: "Resource not found." });
  }

  const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
  const isManager = ["owner", "admin"].includes(membership.role);

  if (!isUploader && !isManager) {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }

  await SpaceResource.findByIdAndDelete(resourceId);

  res.status(200).json({ success: true, message: "Resource deleted from space." });
});

/* =========================================================================
   3. GROUP TASKS & PERSONAL <-> GROUP INTEGRATION
   ========================================================================= */

/**
 * @desc    Get group tasks in a space
 * @route   GET /api/spaces/:id/tasks
 * @access  Private (Space Member)
 */
const getSpaceTasks = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { status, assignedTo, priority } = req.query;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required to view tasks." });
  }

  const query = { space: spaceId };
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;
  if (assignedTo && assignedTo !== "all") query.assignedTo = assignedTo;

  const tasks = await SpaceTask.find(query)
    .populate("assignedTo", "name email profilePicture college")
    .populate("creator", "name email profilePicture")
    .sort({ status: 1, deadline: 1, createdAt: -1 })
    .lean();

  const formatted = tasks.map((t) => ({
    ...t,
    isSyncedToMyTasks: t.syncedPersonalUsers?.some(
      (uId) => uId.toString() === req.user._id.toString()
    ),
    isAssignedToMe: t.assignedTo?._id?.toString() === req.user._id.toString(),
  }));

  res.status(200).json({ success: true, count: formatted.length, data: formatted });
});

/**
 * @desc    Create a new Group Task in a Space
 * @route   POST /api/spaces/:id/tasks
 * @access  Private (Space Member)
 */
const createSpaceTask = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { title, description, assignedTo, deadline, priority = "medium" } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: "Task title is required." });
  }

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required to create tasks." });
  }

  const space = await Space.findById(spaceId);

  // If assigned to someone, ensure they are in the space
  let assignedUserDoc = null;
  if (assignedTo) {
    const assignedMember = await SpaceMember.findOne({
      space: spaceId,
      user: assignedTo,
      status: "active",
    });
    if (!assignedMember) {
      return res.status(400).json({ success: false, message: "Assigned user is not an active member of this Space." });
    }
    assignedUserDoc = assignedTo;
  }

  const spaceTask = await SpaceTask.create({
    space: spaceId,
    creator: req.user._id,
    title: title.trim(),
    description: description ? description.trim() : "",
    assignedTo: assignedUserDoc,
    deadline: deadline ? new Date(deadline) : null,
    priority: priority || "medium",
    status: "todo",
    syncedPersonalUsers: assignedUserDoc ? [assignedUserDoc] : [req.user._id],
  });

  // Automatically sync to assignee's personal tasks
  const targetSyncUser = assignedUserDoc || req.user._id;
  try {
    await Task.create({
      title: spaceTask.title,
      description: spaceTask.description,
      priority: spaceTask.priority,
      deadline: spaceTask.deadline,
      status: "todo",
      user: targetSyncUser,
      isGroupTask: true,
      sourceSpace: spaceId,
      sourceSpaceTask: spaceTask._id,
      spaceName: space?.name || "Study Space",
    });
  } catch (syncErr) {
    console.warn("Auto sync to personal task failed:", syncErr.message);
  }

  const populated = await SpaceTask.findById(spaceTask._id)
    .populate("assignedTo", "name email profilePicture college")
    .populate("creator", "name email profilePicture")
    .lean();

  // Real-time broadcast task creation to space
  emitToSpace(spaceId, "space:task_created", populated);

  // If assigned to another member, send them a real-time notification
  if (assignedUserDoc && assignedUserDoc.toString() !== req.user._id.toString()) {
    emitToUser(assignedUserDoc, "notification:new", {
      id: `task_${spaceTask._id}`,
      type: "task",
      title: "📋 New Group Task Assigned",
      message: `${req.user.name} assigned you: "${spaceTask.title}" in ${space?.name || "Space"}`,
      data: { spaceId, taskId: spaceTask._id },
      createdAt: new Date(),
    });
  }

  res.status(201).json({
    success: true,
    message: `Group Task "${spaceTask.title}" created & synced!`,
    data: {
      ...populated,
      isSyncedToMyTasks: true,
      isAssignedToMe: assignedUserDoc?.toString() === req.user._id.toString(),
    },
  });
});

/**
 * @desc    Update a Group Task status, assignment, or deadline
 * @route   PATCH /api/spaces/:id/tasks/:taskId
 * @access  Private (Space Member)
 */
const updateSpaceTask = asyncHandler(async (req, res) => {
  const { id: spaceId, taskId } = req.params;
  const { status, priority, deadline, assignedTo, title, description } = req.body;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const spaceTask = await SpaceTask.findOne({ _id: taskId, space: spaceId });
  if (!spaceTask) {
    return res.status(404).json({ success: false, message: "Group task not found." });
  }

  if (status !== undefined) {
    spaceTask.status = status;
    spaceTask.completedAt = status === "completed" ? new Date() : null;
  }
  if (priority !== undefined) spaceTask.priority = priority;
  if (deadline !== undefined) spaceTask.deadline = deadline ? new Date(deadline) : null;
  if (title !== undefined) spaceTask.title = title.trim();
  if (description !== undefined) spaceTask.description = description.trim();
  if (assignedTo !== undefined) {
    spaceTask.assignedTo = assignedTo || null;
  }

  await spaceTask.save();

  // Bi-directional Sync: Update all linked Personal Task records!
  try {
    await Task.updateMany(
      { sourceSpaceTask: spaceTask._id },
      {
        $set: {
          title: spaceTask.title,
          description: spaceTask.description,
          priority: spaceTask.priority,
          deadline: spaceTask.deadline,
          status: spaceTask.status,
          completedAt: spaceTask.completedAt,
        },
      }
    );
  } catch (syncErr) {
    console.warn("Failed to propagate group task status to personal tasks:", syncErr.message);
  }

  const populated = await SpaceTask.findById(spaceTask._id)
    .populate("assignedTo", "name email profilePicture college")
    .populate("creator", "name email profilePicture")
    .lean();

  // Real-time broadcast task update to space and synced users
  emitToSpace(spaceId, "space:task_updated", populated);

  res.status(200).json({
    success: true,
    message: `Task updated to ${spaceTask.status.toUpperCase()}!`,
    data: {
      ...populated,
      isSyncedToMyTasks: spaceTask.syncedPersonalUsers?.some(
        (id) => id.toString() === req.user._id.toString()
      ),
      isAssignedToMe: spaceTask.assignedTo?.toString() === req.user._id.toString(),
    },
  });
});

/**
 * @desc    Delete a Group Task
 * @route   DELETE /api/spaces/:id/tasks/:taskId
 * @access  Private (Creator, Assignee, Admin, or Owner)
 */
const deleteSpaceTask = asyncHandler(async (req, res) => {
  const { id: spaceId, taskId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const spaceTask = await SpaceTask.findOne({ _id: taskId, space: spaceId });
  if (!spaceTask) {
    return res.status(404).json({ success: false, message: "Task not found." });
  }

  const isCreator = spaceTask.creator.toString() === req.user._id.toString();
  const isManager = ["owner", "admin"].includes(membership.role);

  if (!isCreator && !isManager) {
    return res.status(403).json({ success: false, message: "Permission denied." });
  }

  // Remove linked personal tasks
  await Task.deleteMany({ sourceSpaceTask: taskId });
  await SpaceTask.findByIdAndDelete(taskId);

  res.status(200).json({ success: true, message: "Group task deleted successfully." });
});

/**
 * @desc    Personal <-> Group Task Integration: Add/Sync Group Task to My Personal Tasks
 * @route   POST /api/spaces/:id/tasks/:taskId/sync-personal
 * @access  Private (Space Member)
 */
const syncTaskToPersonal = asyncHandler(async (req, res) => {
  const { id: spaceId, taskId } = req.params;

  const membership = await verifyMembership(spaceId, req.user._id);
  if (!membership) {
    return res.status(403).json({ success: false, message: "Membership required." });
  }

  const spaceTask = await SpaceTask.findOne({ _id: taskId, space: spaceId });
  if (!spaceTask) {
    return res.status(404).json({ success: false, message: "Group task not found." });
  }

  const space = await Space.findById(spaceId);

  // Create or Update in Student's Personal Tasks
  const personalTask = await Task.findOneAndUpdate(
    { user: req.user._id, sourceSpaceTask: spaceTask._id },
    {
      title: spaceTask.title,
      description: spaceTask.description,
      priority: spaceTask.priority,
      deadline: spaceTask.deadline,
      status: spaceTask.status,
      completedAt: spaceTask.completedAt,
      isGroupTask: true,
      sourceSpace: spaceId,
      sourceSpaceTask: spaceTask._id,
      spaceName: space?.name || "Study Space",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Add user to syncedPersonalUsers array on group task
  if (!spaceTask.syncedPersonalUsers.some((id) => id.toString() === req.user._id.toString())) {
    spaceTask.syncedPersonalUsers.push(req.user._id);
    await spaceTask.save();
  }

  res.status(200).json({
    success: true,
    isSynced: true,
    message: `⭐ Added "${spaceTask.title}" to your Personal Task Manager!`,
    data: {
      personalTaskId: personalTask._id,
      spaceTaskId: spaceTask._id,
    },
  });
});

/**
 * @desc    Remove Group Task from My Personal Tasks
 * @route   DELETE /api/spaces/:id/tasks/:taskId/sync-personal
 * @access  Private (Space Member)
 */
const unsyncTaskFromPersonal = asyncHandler(async (req, res) => {
  const { id: spaceId, taskId } = req.params;

  await Task.findOneAndDelete({ user: req.user._id, sourceSpaceTask: taskId });

  await SpaceTask.findByIdAndUpdate(taskId, {
    $pull: { syncedPersonalUsers: req.user._id },
  });

  res.status(200).json({
    success: true,
    isSynced: false,
    message: "Removed from your personal task list.",
  });
});

module.exports = {
  // Discussions & Announcements
  getSpacePosts,
  createSpacePost,
  addPostReply,
  toggleLikePost,
  togglePinPost,
  deleteSpacePost,
  // Shared Resources
  getSpaceResources,
  createSpaceResource,
  deleteSpaceResource,
  // Group Tasks & Integration
  getSpaceTasks,
  createSpaceTask,
  updateSpaceTask,
  deleteSpaceTask,
  syncTaskToPersonal,
  unsyncTaskFromPersonal,
};

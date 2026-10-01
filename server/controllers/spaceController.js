const crypto = require("crypto");
const mongoose = require("mongoose");
const Space = require("../models/spaceModel");
const SpaceMember = require("../models/spaceMemberModel");
const User = require("../models/userModel");
const asyncHandler = require("../middleware/asyncHandler");

/**
 * @desc    Create a new Space
 * @route   POST /api/spaces
 * @access  Private
 */
const createSpace = asyncHandler(async (req, res) => {
  const { name, description, category, icon, color, isPrivate, settings } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Space name is required",
    });
  }

  // 1. Create Space
  const space = await Space.create({
    name: name.trim(),
    description: description ? description.trim() : "",
    category: category || "study_group",
    icon: icon || "🚀",
    color: color || "#9333EA",
    isPrivate: isPrivate === true,
    creator: req.user._id,
    memberCount: 1,
    settings: {
      allowMemberInvites: settings?.allowMemberInvites !== false,
      allowMemberPost: settings?.allowMemberPost !== false,
    },
  });

  // 2. Add creator as Owner in SpaceMember
  const ownerMember = await SpaceMember.create({
    space: space._id,
    user: req.user._id,
    role: "owner",
    status: "active",
  });

  res.status(201).json({
    success: true,
    message: `Space "${space.name}" created successfully!`,
    data: {
      space,
      myRole: "owner",
      membershipId: ownerMember._id,
    },
  });
});

/**
 * @desc    Get all Spaces the logged-in student belongs to
 * @route   GET /api/spaces/my
 * @access  Private
 */
const getMySpaces = asyncHandler(async (req, res) => {
  const memberships = await SpaceMember.find({
    user: req.user._id,
    status: "active",
  })
    .populate({
      path: "space",
      populate: {
        path: "creator",
        select: "name email profilePicture college course",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  const formattedSpaces = memberships
    .filter((m) => m.space) // Ensure space wasn't deleted
    .map((m) => ({
      ...m.space,
      myRole: m.role,
      joinedAt: m.joinedAt,
      membershipId: m._id,
    }));

  res.status(200).json({
    success: true,
    count: formattedSpaces.length,
    data: formattedSpaces,
  });
});

/**
 * @desc    Discover public spaces
 * @route   GET /api/spaces/discover
 * @access  Private
 */
const getDiscoverableSpaces = asyncHandler(async (req, res) => {
  const { search, category } = req.query;

  const query = { isPrivate: false };

  if (category && category !== "all") {
    query.category = category;
  }

  if (search && search.trim()) {
    query.name = { $regex: search.trim(), $options: "i" };
  }

  const spaces = await Space.find(query)
    .populate("creator", "name email profilePicture college")
    .sort({ memberCount: -1, createdAt: -1 })
    .limit(30)
    .lean();

  // Check which spaces current user is already member of
  const myMemberships = await SpaceMember.find({
    user: req.user._id,
    status: "active",
  }).select("space role");

  const mySpaceMap = new Map(
    myMemberships.map((m) => [m.space.toString(), m.role])
  );

  const spacesWithJoinStatus = spaces.map((s) => ({
    ...s,
    isJoined: mySpaceMap.has(s._id.toString()),
    myRole: mySpaceMap.get(s._id.toString()) || null,
  }));

  res.status(200).json({
    success: true,
    count: spacesWithJoinStatus.length,
    data: spacesWithJoinStatus,
  });
});

/**
 * @desc    Get detailed Space info with members list
 * @route   GET /api/spaces/:id
 * @access  Private (Requires Space Membership or Public Space)
 */
const getSpaceById = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;

  const space = await Space.findById(spaceId)
    .populate("creator", "name email profilePicture college course year")
    .lean();

  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Space not found",
    });
  }

  // Check user membership
  const myMembership = await SpaceMember.findOne({
    space: spaceId,
    user: req.user._id,
    status: "active",
  }).lean();

  if (space.isPrivate && !myMembership) {
    return res.status(403).json({
      success: false,
      message: "This is a private space. You must join with an invite code to view contents.",
    });
  }

  // Fetch all active members
  const members = await SpaceMember.find({
    space: spaceId,
    status: "active",
  })
    .populate("user", "name email profilePicture college course year studentId")
    .sort({
      // Sort owners first, then admins, then members
      role: 1,
      createdAt: 1,
    })
    .lean();

  // Custom sort priority for roles
  const rolePriority = { owner: 1, admin: 2, member: 3 };
  members.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));

  res.status(200).json({
    success: true,
    data: {
      space,
      myRole: myMembership?.role || null,
      isMember: !!myMembership,
      members: members.map((m) => ({
        id: m._id,
        user: m.user,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      memberCount: members.length,
    },
  });
});

/**
 * @desc    Join a space using an Invite Code
 * @route   POST /api/spaces/join
 * @access  Private
 */
const joinSpaceByCode = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({
      success: false,
      message: "Invite code is required",
    });
  }

  const cleanCode = inviteCode.trim().toUpperCase();

  const space = await Space.findOne({ inviteCode: cleanCode });

  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Invalid invite code. No matching Space found.",
    });
  }

  // Check if already a member
  const existingMember = await SpaceMember.findOne({
    space: space._id,
    user: req.user._id,
  });

  if (existingMember && existingMember.status === "active") {
    return res.status(400).json({
      success: false,
      message: `You are already a member of "${space.name}"!`,
      data: { spaceId: space._id },
    });
  }

  if (existingMember) {
    existingMember.status = "active";
    existingMember.joinedAt = new Date();
    await existingMember.save();
  } else {
    await SpaceMember.create({
      space: space._id,
      user: req.user._id,
      role: "member",
      status: "active",
    });
  }

  // Update member count
  const totalCount = await SpaceMember.countDocuments({
    space: space._id,
    status: "active",
  });
  space.memberCount = totalCount;
  await space.save();

  res.status(200).json({
    success: true,
    message: `Welcome to "${space.name}"! You have successfully joined.`,
    data: {
      space,
      myRole: "member",
    },
  });
});

/**
 * @desc    Join a public space directly
 * @route   POST /api/spaces/:id/join-public
 * @access  Private
 */
const joinPublicSpace = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id);

  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Space not found",
    });
  }

  if (space.isPrivate) {
    return res.status(403).json({
      success: false,
      message: "This space is private. Please join using an invite code.",
    });
  }

  // Check existing membership
  const existing = await SpaceMember.findOne({
    space: space._id,
    user: req.user._id,
  });

  if (existing && existing.status === "active") {
    return res.status(400).json({
      success: false,
      message: "You are already a member of this space",
    });
  }

  if (existing) {
    existing.status = "active";
    existing.joinedAt = new Date();
    await existing.save();
  } else {
    await SpaceMember.create({
      space: space._id,
      user: req.user._id,
      role: "member",
      status: "active",
    });
  }

  space.memberCount = await SpaceMember.countDocuments({
    space: space._id,
    status: "active",
  });
  await space.save();

  res.status(200).json({
    success: true,
    message: `Joined "${space.name}"!`,
    data: { space, myRole: "member" },
  });
});

/**
 * @desc    Leave a Space
 * @route   POST /api/spaces/:id/leave
 * @access  Private (Space Member)
 */
const leaveSpace = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const userId = req.user._id;

  const membership = await SpaceMember.findOne({
    space: spaceId,
    user: userId,
    status: "active",
  });

  if (!membership) {
    return res.status(404).json({
      success: false,
      message: "You are not an active member of this space",
    });
  }

  const space = await Space.findById(spaceId);

  // If Owner is leaving
  if (membership.role === "owner") {
    const otherMembersCount = await SpaceMember.countDocuments({
      space: spaceId,
      user: { $ne: userId },
      status: "active",
    });

    if (otherMembersCount > 0) {
      return res.status(400).json({
        success: false,
        message: "As the Owner, you must transfer ownership to another member before leaving, or delete the space.",
      });
    }

    // Last member (owner) leaving deletes space
    await SpaceMember.deleteMany({ space: spaceId });
    await Space.findByIdAndDelete(spaceId);

    return res.status(200).json({
      success: true,
      message: "You were the last member. Space has been closed and deleted.",
    });
  }

  // Regular member or admin leaving
  await SpaceMember.findByIdAndDelete(membership._id);

  if (space) {
    space.memberCount = await SpaceMember.countDocuments({
      space: spaceId,
      status: "active",
    });
    await space.save();
  }

  res.status(200).json({
    success: true,
    message: `You have left "${space?.name || "the space"}".`,
  });
});

/**
 * @desc    Invite a user by email or student ID
 * @route   POST /api/spaces/:id/invite
 * @access  Private (Owner / Admin or Member if allowed)
 */
const inviteMember = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;
  const { studentEmailOrId } = req.body;

  if (!studentEmailOrId || !studentEmailOrId.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a student email or ID",
    });
  }

  const space = req.space || (await Space.findById(spaceId));

  // Find recipient user
  const targetUser = await User.findOne({
    $or: [
      { email: studentEmailOrId.trim().toLowerCase() },
      { studentId: studentEmailOrId.trim() },
    ],
  });

  if (!targetUser) {
    return res.status(404).json({
      success: false,
      message: `No student found with identifier "${studentEmailOrId}".`,
    });
  }

  // Check if already in space
  const existing = await SpaceMember.findOne({
    space: spaceId,
    user: targetUser._id,
  });

  if (existing && existing.status === "active") {
    return res.status(400).json({
      success: false,
      message: `${targetUser.name} is already a member of this space.`,
    });
  }

  if (existing) {
    existing.status = "active";
    existing.invitedBy = req.user._id;
    await existing.save();
  } else {
    await SpaceMember.create({
      space: spaceId,
      user: targetUser._id,
      role: "member",
      status: "active",
      invitedBy: req.user._id,
    });
  }

  space.memberCount = await SpaceMember.countDocuments({
    space: spaceId,
    status: "active",
  });
  await space.save();

  res.status(200).json({
    success: true,
    message: `Successfully added ${targetUser.name} to "${space.name}"!`,
  });
});

/**
 * @desc    Remove a member from the Space
 * @route   DELETE /api/spaces/:id/members/:memberId
 * @access  Private (Owner or Admin)
 */
const removeMember = asyncHandler(async (req, res) => {
  const { id: spaceId, memberId } = req.params;

  const targetMembership = await SpaceMember.findOne({
    _id: memberId,
    space: spaceId,
  }).populate("user", "name");

  if (!targetMembership) {
    return res.status(404).json({
      success: false,
      message: "Member not found in this space",
    });
  }

  // Owner cannot be removed
  if (targetMembership.role === "owner") {
    return res.status(400).json({
      success: false,
      message: "The space Owner cannot be removed.",
    });
  }

  // Admin cannot remove another Admin unless user is Owner
  if (req.spaceMember.role === "admin" && targetMembership.role === "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins cannot remove other Admins. Only the Owner can do that.",
    });
  }

  await SpaceMember.findByIdAndDelete(targetMembership._id);

  const space = await Space.findById(spaceId);
  if (space) {
    space.memberCount = await SpaceMember.countDocuments({
      space: spaceId,
      status: "active",
    });
    await space.save();
  }

  res.status(200).json({
    success: true,
    message: `${targetMembership.user?.name || "Member"} removed from space.`,
  });
});

/**
 * @desc    Update a member's role (Promote / Demote / Transfer Ownership)
 * @route   PATCH /api/spaces/:id/members/:memberId/role
 * @access  Private (Owner Only)
 */
const updateMemberRole = asyncHandler(async (req, res) => {
  const { id: spaceId, memberId } = req.params;
  const { newRole } = req.body;

  if (!["owner", "admin", "member"].includes(newRole)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Role must be 'owner', 'admin', or 'member'.",
    });
  }

  const targetMembership = await SpaceMember.findOne({
    _id: memberId,
    space: spaceId,
  }).populate("user", "name");

  if (!targetMembership) {
    return res.status(404).json({
      success: false,
      message: "Member not found in this space",
    });
  }

  // If transferring Ownership
  if (newRole === "owner") {
    // Demote current owner to admin
    await SpaceMember.findOneAndUpdate(
      { space: spaceId, user: req.user._id },
      { role: "admin" }
    );

    targetMembership.role = "owner";
    await targetMembership.save();

    await Space.findByIdAndUpdate(spaceId, { creator: targetMembership.user._id });

    return res.status(200).json({
      success: true,
      message: `Ownership transferred to ${targetMembership.user.name}. You are now an Admin.`,
      data: { newRole: "owner" },
    });
  }

  // Regular role change (admin / member)
  targetMembership.role = newRole;
  await targetMembership.save();

  res.status(200).json({
    success: true,
    message: `${targetMembership.user?.name}'s role updated to ${newRole.toUpperCase()}.`,
    data: { role: newRole },
  });
});

/**
 * @desc    Update Space Settings / Metadata
 * @route   PUT /api/spaces/:id
 * @access  Private (Owner or Admin)
 */
const updateSpace = asyncHandler(async (req, res) => {
  const { name, description, category, icon, color, isPrivate, settings } = req.body;

  const space = await Space.findById(req.params.id);
  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Space not found",
    });
  }

  if (name !== undefined) space.name = name.trim();
  if (description !== undefined) space.description = description.trim();
  if (category !== undefined) space.category = category;
  if (icon !== undefined) space.icon = icon;
  if (color !== undefined) space.color = color;
  if (isPrivate !== undefined) space.isPrivate = isPrivate === true;
  if (settings) {
    if (settings.allowMemberInvites !== undefined) {
      space.settings.allowMemberInvites = settings.allowMemberInvites;
    }
    if (settings.allowMemberPost !== undefined) {
      space.settings.allowMemberPost = settings.allowMemberPost;
    }
  }

  await space.save();

  res.status(200).json({
    success: true,
    message: "Space updated successfully",
    data: space,
  });
});

/**
 * @desc    Regenerate Space Invite Code
 * @route   POST /api/spaces/:id/regenerate-code
 * @access  Private (Owner or Admin)
 */
const regenerateInviteCode = asyncHandler(async (req, res) => {
  const space = await Space.findById(req.params.id);
  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Space not found",
    });
  }

  space.inviteCode = `SX-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  await space.save();

  res.status(200).json({
    success: true,
    message: "New invite code generated!",
    data: { inviteCode: space.inviteCode },
  });
});

/**
 * @desc    Delete a Space
 * @route   DELETE /api/spaces/:id
 * @access  Private (Owner Only)
 */
const deleteSpace = asyncHandler(async (req, res) => {
  const spaceId = req.params.id;

  const space = await Space.findById(spaceId);
  if (!space) {
    return res.status(404).json({
      success: false,
      message: "Space not found",
    });
  }

  await SpaceMember.deleteMany({ space: spaceId });
  await Space.findByIdAndDelete(spaceId);

  res.status(200).json({
    success: true,
    message: `Space "${space.name}" and all memberships have been deleted.`,
  });
});

module.exports = {
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
};

const Space = require("../models/spaceModel");
const SpaceMember = require("../models/spaceMemberModel");

/**
 * Middleware to verify user is an active member of the requested space
 */
const requireSpaceMembership = async (req, res, next) => {
  const spaceId = req.params.spaceId || req.params.id || req.body.spaceId;

  if (!spaceId) {
    return res.status(400).json({
      success: false,
      message: "Space ID is required",
    });
  }

  try {
    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    const membership = await SpaceMember.findOne({
      space: spaceId,
      user: req.user._id,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not a member of this space.",
      });
    }

    req.space = space;
    req.spaceMember = membership;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware generator for role-based permissions inside a Space (Owner, Admin, Member)
 * @param {Array<string>} allowedRoles - e.g. ['owner', 'admin']
 */
const requireSpaceRole = (allowedRoles = ["owner", "admin"]) => {
  return async (req, res, next) => {
    // If membership was already checked, use req.spaceMember
    if (req.spaceMember) {
      if (!allowedRoles.includes(req.spaceMember.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Action requires one of the following roles: [${allowedRoles.join(", ")}]. Your current role is '${req.spaceMember.role}'.`,
        });
      }
      return next();
    }

    // Otherwise lookup membership
    const spaceId = req.params.spaceId || req.params.id || req.body.spaceId;
    try {
      const membership = await SpaceMember.findOne({
        space: spaceId,
        user: req.user._id,
        status: "active",
      });

      if (!membership || !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Action requires one of the following roles: [${allowedRoles.join(", ")}].`,
        });
      }

      req.spaceMember = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  requireSpaceMembership,
  requireSpaceRole,
};

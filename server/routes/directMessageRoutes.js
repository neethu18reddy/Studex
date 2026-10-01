const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getConversations,
  getMessages,
  sendMessage,
  markConversationAsRead,
} = require("../controllers/directMessageController");

router.use(protect);

router.get("/conversations", getConversations);
router.get("/:userId", getMessages);
router.post("/:userId", sendMessage);
router.patch("/:userId/read", markConversationAsRead);

module.exports = router;

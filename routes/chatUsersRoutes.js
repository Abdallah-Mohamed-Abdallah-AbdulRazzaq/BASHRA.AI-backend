const express = require('express');
const router = express.Router();
const ChatUsersController = require('../controllers/chatUsersController');
const { authenticateJWT } = require('../middleware/authMiddleware');

/**
 * Chat Users Routes
 * مسارات جلب المستخدمين للشات
 * Base path: /api/chat-users
 */

// All routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/chat-users
 * @desc    Get all users for chat (excluding current user)
 * @access  Private
 * @query   type - filter by entity type (user, doctor, admin, assistant)
 * @query   search - search by name or email
 */
router.get('/', ChatUsersController.getChatUsers);

module.exports = router;

const express = require('express');
const router = express.Router();
const ConversationsController = require('../controllers/conversationsController');
const { 
  authenticateJWT, 
  authorizeUserOrDoctorOrAssistant 
} = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * ======================================
 * Conversations Routes
 * ======================================
 * جميع المسارات محمية وتتطلب مصادقة JWT
 * متاحة للمستخدمين والأطباء والمساعدين
 */

// حماية جميع المسارات بـ JWT authentication
router.use(authenticateJWT);

/**
 * GET /api/conversations
 * جلب قائمة المحادثات للمستخدم الحالي
 * مرتبة حسب آخر رسالة
 */
router.get(
  '/',
  authorizeUserOrDoctorOrAssistant,
  ConversationsController.getConversations
);

/**
 * POST /api/conversations
 * إنشاء محادثة جديدة
 * Body: { recipient_id, recipient_type }
 * يدعم JSON و Form-data
 */
router.post(
  '/',
  parseFormData,
  authorizeUserOrDoctorOrAssistant,
  ConversationsController.createConversation
);

/**
 * GET /api/conversations/:id
 * جلب تفاصيل محادثة معينة
 */
router.get(
  '/:id',
  authorizeUserOrDoctorOrAssistant,
  ConversationsController.getConversationById
);

/**
 * GET /api/conversations/:id/messages
 * جلب سجل الرسائل لمحادثة معينة مع Pagination
 * Query params: limit (default: 50), offset (default: 0)
 */
router.get(
  '/:id/messages',
  authorizeUserOrDoctorOrAssistant,
  ConversationsController.getMessages
);

module.exports = router;

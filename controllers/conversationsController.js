const db = require('../config/db');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'conversations.log' })
  ]
});

class ConversationsController {
  
  /**
   * GET /conversations
   * جلب قائمة المحادثات للمستخدم الحالي
   */
  static async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const entityType = req.user.entityType;

      // جلب جميع المحادثات التي يشارك فيها المستخدم
      const [conversations] = await db.query(
        `SELECT 
          c.id,
          c.uuid,
          c.last_message_at,
          c.created_at,
          (
            SELECT COUNT(*) 
            FROM messages m 
            WHERE m.conversation_id = c.id 
            AND m.is_read = 0 
            AND m.sender_id != ?
            AND m.sender_type != ?
          ) as unread_count,
          (
            SELECT m.content
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_content,
          (
            SELECT m.message_type
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_type
        FROM conversations c
        INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
        WHERE cp.participant_id = ? AND cp.participant_type = ?
        ORDER BY c.last_message_at DESC`,
        [userId, entityType, userId, entityType]
      );

      // جلب معلومات المشاركين في كل محادثة
      for (let conv of conversations) {
        const [participants] = await db.query(
          `SELECT 
            cp.participant_id,
            cp.participant_type,
            cp.joined_at,
            CASE 
              WHEN cp.participant_type = 'user' THEN (
                SELECT upt.full_name 
                FROM user_profiles up 
                LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id
                WHERE up.user_id = cp.participant_id 
                AND (upt.language_code = ? OR upt.language_code IS NULL)
                LIMIT 1
              )
              WHEN cp.participant_type = 'doctor' THEN (
                SELECT dpt.full_name 
                FROM doctor_profiles dp 
                LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id
                WHERE dp.doctor_id = cp.participant_id 
                AND (dpt.language_code = ? OR dpt.language_code IS NULL)
                LIMIT 1
              )
              WHEN cp.participant_type = 'admin' THEN (
                SELECT email FROM admins WHERE id = cp.participant_id
              )
              WHEN cp.participant_type = 'assistant' THEN (
                SELECT email FROM assistants WHERE id = cp.participant_id
              )
            END as name,
            CASE 
              WHEN cp.participant_type = 'user' THEN (
                SELECT up.profile_picture_url 
                FROM user_profiles up 
                WHERE up.user_id = cp.participant_id
              )
              WHEN cp.participant_type = 'doctor' THEN (
                SELECT dp.profile_picture_url 
                FROM doctor_profiles dp 
                WHERE dp.doctor_id = cp.participant_id
              )
              ELSE NULL
            END as profile_picture_url,
            CASE 
              WHEN cp.participant_type = 'user' THEN (
                SELECT u.email FROM users u WHERE u.id = cp.participant_id
              )
              WHEN cp.participant_type = 'doctor' THEN (
                SELECT d.email FROM doctors d WHERE d.id = cp.participant_id
              )
              WHEN cp.participant_type = 'admin' THEN (
                SELECT a.email FROM admins a WHERE a.id = cp.participant_id
              )
              WHEN cp.participant_type = 'assistant' THEN (
                SELECT ast.email FROM assistants ast WHERE ast.id = cp.participant_id
              )
            END as email
          FROM conversation_participants cp
          WHERE cp.conversation_id = ?`,
          [req.lang || 'ar', req.lang || 'ar', conv.id]
        );

        conv.participants = participants;
      }

      logger.info('Conversations retrieved', { 
        userId, 
        entityType, 
        count: conversations.length 
      });

      res.json({
        success: true,
        conversations: conversations
      });

    } catch (error) {
      logger.error('Get conversations error', { 
        error: error.message, 
        userId: req.user.id 
      });
      res.status(500).json({ 
        success: false, 
        message_ar: 'حدث خطأ في جلب المحادثات',
        message_en: 'Failed to retrieve conversations' 
      });
    }
  }

  /**
   * GET /conversations/:id/messages
   * جلب سجل الرسائل لمحادثة معينة مع Pagination
   */
  static async getMessages(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const entityType = req.user.entityType;
      
      // Pagination parameters
      let limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      // التأكد من أن limit أكبر من 0
      if (limit <= 0) {
        limit = 50; // القيمة الافتراضية
      }

      // التحقق من أن المستخدم مشارك في المحادثة
      const [participantCheck] = await db.query(
        `SELECT id FROM conversation_participants 
         WHERE conversation_id = ? AND participant_id = ? AND participant_type = ?`,
        [conversationId, userId, entityType]
      );

      if (participantCheck.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message_ar: 'غير مصرح لك بالوصول لهذه المحادثة',
          message_en: 'You are not authorized to access this conversation' 
        });
      }

      // جلب الرسائل مع Pagination
      const [messages] = await db.query(
        `SELECT 
          m.id,
          m.uuid,
          m.conversation_id,
          m.sender_id,
          m.sender_type,
          m.message_type,
          m.content,
          m.file_id,
          m.is_read,
          m.read_at,
          m.reply_to_message_id,
          m.is_deleted,
          m.deleted_at,
          m.created_at,
          m.updated_at,
          CASE 
            WHEN m.sender_type = 'user' THEN (
              SELECT upt.full_name 
              FROM user_profiles up 
              LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id
              WHERE up.user_id = m.sender_id 
              AND (upt.language_code = ? OR upt.language_code IS NULL)
              LIMIT 1
            )
            WHEN m.sender_type = 'doctor' THEN (
              SELECT dpt.full_name 
              FROM doctor_profiles dp 
              LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id
              WHERE dp.doctor_id = m.sender_id 
              AND (dpt.language_code = ? OR dpt.language_code IS NULL)
              LIMIT 1
            )
            WHEN m.sender_type = 'admin' THEN (
              SELECT email FROM admins WHERE id = m.sender_id
            )
            WHEN m.sender_type = 'assistant' THEN (
              SELECT email FROM assistants WHERE id = m.sender_id
            )
          END as sender_name,
          CASE 
            WHEN m.sender_type = 'user' THEN (
              SELECT up.profile_picture_url 
              FROM user_profiles up 
              WHERE up.user_id = m.sender_id
            )
            WHEN m.sender_type = 'doctor' THEN (
              SELECT dp.profile_picture_url 
              FROM doctor_profiles dp 
              WHERE dp.doctor_id = m.sender_id
            )
            ELSE NULL
          END as sender_profile_picture_url,
          f.file_path,
          f.original_filename,
          f.mime_type,
          f.file_size
        FROM messages m
        LEFT JOIN files f ON m.file_id = f.id
        WHERE m.conversation_id = ? AND m.is_deleted = 0
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?`,
        [req.lang || 'ar', req.lang || 'ar', conversationId, limit, offset]
      );

      // جلب العدد الكلي للرسائل
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM messages WHERE conversation_id = ? AND is_deleted = 0`,
        [conversationId]
      );

      const total = countResult[0].total;

      // تحديث حالة الرسائل إلى مقروءة للرسائل التي لم يرسلها المستخدم الحالي
      await db.query(
        `UPDATE messages 
         SET is_read = 1, read_at = NOW() 
         WHERE conversation_id = ? 
         AND sender_id != ? 
         AND sender_type != ? 
         AND is_read = 0`,
        [conversationId, userId, entityType]
      );

      logger.info('Messages retrieved', { 
        conversationId, 
        userId, 
        entityType,
        count: messages.length,
        limit,
        offset
      });

      res.json({
        success: true,
        messages: messages.reverse(), // عكس الترتيب لعرض الأقدم أولاً
        pagination: {
          total: total,
          limit: limit,
          offset: offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      logger.error('Get messages error', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user.id 
      });
      res.status(500).json({ 
        success: false, 
        message_ar: 'حدث خطأ في جلب الرسائل',
        message_en: 'Failed to retrieve messages' 
      });
    }
  }

  /**
   * POST /conversations
   * بدء محادثة جديدة
   */
  static async createConversation(req, res) {
    try {
      const { recipient_id, recipient_type } = req.body;
      const userId = req.user.id;
      const entityType = req.user.entityType;

      // التحقق من البيانات المطلوبة
      if (!recipient_id || !recipient_type) {
        return res.status(400).json({ 
          success: false, 
          message_ar: 'معرف المستلم ونوعه مطلوبان',
          message_en: 'Recipient ID and type are required' 
        });
      }

      // التحقق من نوع المستلم
      if (!['user', 'admin', 'doctor', 'assistant'].includes(recipient_type)) {
        return res.status(400).json({ 
          success: false, 
          message_ar: 'نوع المستلم غير صحيح',
          message_en: 'Invalid recipient type' 
        });
      }

      // التحقق من وجود المستلم
      const recipientTable = recipient_type === 'user' ? 'users' : `${recipient_type}s`;
      const [recipientCheck] = await db.query(
        `SELECT id FROM ${recipientTable} WHERE id = ?`,
        [recipient_id]
      );

      if (recipientCheck.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message_ar: 'المستلم غير موجود',
          message_en: 'Recipient not found' 
        });
      }

      // البحث عن محادثة موجودة بين الطرفين
      const [existingConversation] = await db.query(
        `SELECT c.id, c.uuid, c.created_at
         FROM conversations c
         INNER JOIN conversation_participants cp1 
           ON c.id = cp1.conversation_id 
           AND cp1.participant_id = ? 
           AND cp1.participant_type = ?
         INNER JOIN conversation_participants cp2 
           ON c.id = cp2.conversation_id 
           AND cp2.participant_id = ? 
           AND cp2.participant_type = ?
         GROUP BY c.id
         HAVING COUNT(DISTINCT cp1.id) = 1 AND COUNT(DISTINCT cp2.id) = 1
         LIMIT 1`,
        [userId, entityType, recipient_id, recipient_type]
      );

      // إذا وجدت محادثة موجودة، إرجاعها
      if (existingConversation.length > 0) {
        logger.info('Existing conversation found', { 
          conversationId: existingConversation[0].id,
          userId, 
          entityType,
          recipientId: recipient_id,
          recipientType: recipient_type
        });

        return res.json({
          success: true,
          message_ar: 'المحادثة موجودة بالفعل',
          message_en: 'Conversation already exists',
          conversation: existingConversation[0],
          isNew: false
        });
      }

      // إنشاء محادثة جديدة
      const conversationUuid = uuidv4();
      const [conversationResult] = await db.query(
        `INSERT INTO conversations (uuid, created_at) VALUES (?, NOW())`,
        [conversationUuid]
      );

      const conversationId = conversationResult.insertId;

      // إضافة المرسل كمشارك
      await db.query(
        `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type) 
         VALUES (?, ?, ?)`,
        [conversationId, userId, entityType]
      );

      // إضافة المستلم كمشارك
      await db.query(
        `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type) 
         VALUES (?, ?, ?)`,
        [conversationId, recipient_id, recipient_type]
      );

      logger.info('New conversation created', { 
        conversationId,
        conversationUuid,
        userId, 
        entityType,
        recipientId: recipient_id,
        recipientType: recipient_type
      });

      res.status(201).json({
        success: true,
        message_ar: 'تم إنشاء المحادثة بنجاح',
        message_en: 'Conversation created successfully',
        conversation: {
          id: conversationId,
          uuid: conversationUuid,
          created_at: new Date()
        },
        isNew: true
      });

    } catch (error) {
      logger.error('Create conversation error', { 
        error: error.message, 
        userId: req.user.id 
      });
      res.status(500).json({ 
        success: false, 
        message_ar: 'حدث خطأ في إنشاء المحادثة',
        message_en: 'Failed to create conversation' 
      });
    }
  }

  /**
   * GET /conversations/:id
   * جلب تفاصيل محادثة معينة
   */
  static async getConversationById(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req.user.id;
      const entityType = req.user.entityType;

      // التحقق من أن المستخدم مشارك في المحادثة
      const [participantCheck] = await db.query(
        `SELECT id FROM conversation_participants 
         WHERE conversation_id = ? AND participant_id = ? AND participant_type = ?`,
        [conversationId, userId, entityType]
      );

      if (participantCheck.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message_ar: 'غير مصرح لك بالوصول لهذه المحادثة',
          message_en: 'You are not authorized to access this conversation' 
        });
      }

      // جلب تفاصيل المحادثة
      const [conversation] = await db.query(
        `SELECT id, uuid, last_message_at, created_at 
         FROM conversations 
         WHERE id = ?`,
        [conversationId]
      );

      if (conversation.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message_ar: 'المحادثة غير موجودة',
          message_en: 'Conversation not found' 
        });
      }

      // جلب المشاركين
      const [participants] = await db.query(
        `SELECT 
          cp.participant_id,
          cp.participant_type,
          cp.joined_at,
          CASE 
            WHEN cp.participant_type = 'user' THEN (
              SELECT upt.full_name 
              FROM user_profiles up 
              LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id
              WHERE up.user_id = cp.participant_id 
              AND (upt.language_code = ? OR upt.language_code IS NULL)
              LIMIT 1
            )
            WHEN cp.participant_type = 'doctor' THEN (
              SELECT dpt.full_name 
              FROM doctor_profiles dp 
              LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id
              WHERE dp.doctor_id = cp.participant_id 
              AND (dpt.language_code = ? OR dpt.language_code IS NULL)
              LIMIT 1
            )
            WHEN cp.participant_type = 'admin' THEN (
              SELECT email FROM admins WHERE id = cp.participant_id
            )
            WHEN cp.participant_type = 'assistant' THEN (
              SELECT email FROM assistants WHERE id = cp.participant_id
            )
          END as name,
          CASE 
            WHEN cp.participant_type = 'user' THEN (
              SELECT up.profile_picture_url 
              FROM user_profiles up 
              WHERE up.user_id = cp.participant_id
            )
            WHEN cp.participant_type = 'doctor' THEN (
              SELECT dp.profile_picture_url 
              FROM doctor_profiles dp 
              WHERE dp.doctor_id = cp.participant_id
            )
            ELSE NULL
          END as profile_picture_url
        FROM conversation_participants cp
        WHERE cp.conversation_id = ?`,
        [req.lang || 'ar', req.lang || 'ar', conversationId]
      );

      conversation[0].participants = participants;

      logger.info('Conversation details retrieved', { 
        conversationId, 
        userId, 
        entityType 
      });

      res.json({
        success: true,
        conversation: conversation[0]
      });

    } catch (error) {
      logger.error('Get conversation error', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user.id 
      });
      res.status(500).json({ 
        success: false, 
        message_ar: 'حدث خطأ في جلب تفاصيل المحادثة',
        message_en: 'Failed to retrieve conversation details' 
      });
    }
  }
}

module.exports = ConversationsController;

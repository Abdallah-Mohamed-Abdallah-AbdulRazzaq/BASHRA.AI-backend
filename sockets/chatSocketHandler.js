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
    new winston.transports.File({ filename: 'socket-chat.log' })
  ]
});

/**
 * Chat Socket Handler
 * يدير جميع أحداث Socket.IO الخاصة بالمحادثات
 */
class ChatSocketHandler {
  
  /**
   * تهيئة Socket Handler
   */
  static initialize(io) {
    io.on('connection', (socket) => {
      logger.info('User connected to chat', { 
        socketId: socket.id, 
        userId: socket.userId, 
        entityType: socket.entityType 
      });

      // انضمام المستخدم لغرفته الشخصية
      socket.join(`${socket.entityType}:${socket.userId}`);

      // تسجيل الـ Events
      this.registerEvents(socket, io);
    });
  }

  /**
   * تسجيل جميع الـ Events
   */
  static registerEvents(socket, io) {
    // انضمام لمحادثة
    socket.on('joinConversation', (data) => this.handleJoinConversation(socket, io, data));
    
    // مغادرة محادثة
    socket.on('leaveConversation', (data) => this.handleLeaveConversation(socket, io, data));
    
    // إرسال رسالة
    socket.on('sendMessage', (data) => this.handleSendMessage(socket, io, data));
    
    // بدء الكتابة
    socket.on('typing', (data) => this.handleTyping(socket, io, data));
    
    // إيقاف الكتابة
    socket.on('stopTyping', (data) => this.handleStopTyping(socket, io, data));
    
    // تحديث حالة الرسالة إلى "مقروءة"
    socket.on('markAsRead', (data) => this.handleMarkAsRead(socket, io, data));
    
    // قطع الاتصال
    socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
    
    // معالجة الأخطاء
    socket.on('error', (error) => this.handleError(socket, error));
  }

  /**
   * معالجة الانضمام لمحادثة
   */
  static async handleJoinConversation(socket, io, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return socket.emit('error', { 
          message_ar: 'معرف المحادثة مطلوب',
          message_en: 'Conversation ID is required' 
        });
      }

      // التحقق من أن المستخدم مشارك في المحادثة
      const [participants] = await db.query(
        `SELECT id FROM conversation_participants 
         WHERE conversation_id = ? AND participant_id = ? AND participant_type = ?`,
        [conversationId, socket.userId, socket.entityType]
      );

      if (participants.length === 0) {
        logger.warn('Unauthorized join attempt', {
          conversationId,
          userId: socket.userId,
          entityType: socket.entityType
        });
        
        return socket.emit('error', { 
          message_ar: 'غير مصرح لك بالوصول لهذه المحادثة',
          message_en: 'You are not authorized to access this conversation' 
        });
      }

      // الانضمام للغرفة
      socket.join(`conversation:${conversationId}`);
      
      logger.info('User joined conversation', {
        conversationId,
        userId: socket.userId,
        entityType: socket.entityType,
        socketId: socket.id
      });

      // إخبار المستخدم بنجاح الانضمام
      socket.emit('joinedConversation', {
        success: true,
        conversationId: conversationId
      });

      // إخبار باقي المشاركين أن المستخدم انضم
      socket.to(`conversation:${conversationId}`).emit('userJoined', {
        userId: socket.userId,
        entityType: socket.entityType
      });

    } catch (error) {
      logger.error('Join conversation error', {
        error: error.message,
        conversationId: data.conversationId,
        userId: socket.userId
      });
      
      socket.emit('error', { 
        message_ar: 'حدث خطأ في الانضمام للمحادثة',
        message_en: 'Failed to join conversation' 
      });
    }
  }

  /**
   * معالجة مغادرة محادثة
   */
  static async handleLeaveConversation(socket, io, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return socket.emit('error', { 
          message_ar: 'معرف المحادثة مطلوب',
          message_en: 'Conversation ID is required' 
        });
      }

      // مغادرة الغرفة
      socket.leave(`conversation:${conversationId}`);
      
      logger.info('User left conversation', {
        conversationId,
        userId: socket.userId,
        entityType: socket.entityType,
        socketId: socket.id
      });

      // إخبار المستخدم بنجاح المغادرة
      socket.emit('leftConversation', {
        success: true,
        conversationId: conversationId
      });

      // إخبار باقي المشاركين
      socket.to(`conversation:${conversationId}`).emit('userLeft', {
        userId: socket.userId,
        entityType: socket.entityType
      });

    } catch (error) {
      logger.error('Leave conversation error', {
        error: error.message,
        conversationId: data.conversationId,
        userId: socket.userId
      });
      
      socket.emit('error', { 
        message_ar: 'حدث خطأ في مغادرة المحادثة',
        message_en: 'Failed to leave conversation' 
      });
    }
  }

  /**
   * معالجة إرسال رسالة
   */
  static async handleSendMessage(socket, io, data) {
    try {
      const { conversationId, content, messageType = 'text', fileId = null, replyToMessageId = null } = data;
      
      // التحقق من البيانات المطلوبة
      if (!conversationId || (!content && !fileId)) {
        return socket.emit('error', { 
          message_ar: 'معرف المحادثة والمحتوى مطلوبان',
          message_en: 'Conversation ID and content are required' 
        });
      }

      // التحقق من أن المستخدم مشارك في المحادثة
      const [participants] = await db.query(
        `SELECT id FROM conversation_participants 
         WHERE conversation_id = ? AND participant_id = ? AND participant_type = ?`,
        [conversationId, socket.userId, socket.entityType]
      );

      if (participants.length === 0) {
        return socket.emit('error', { 
          message_ar: 'غير مصرح لك بإرسال رسائل لهذه المحادثة',
          message_en: 'You are not authorized to send messages to this conversation' 
        });
      }

      // إنشاء الرسالة في قاعدة البيانات
      const messageUuid = uuidv4();
      const now = new Date();
      
      const [result] = await db.query(
        `INSERT INTO messages 
         (uuid, conversation_id, sender_id, sender_type, message_type, content, file_id, reply_to_message_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [messageUuid, conversationId, socket.userId, socket.entityType, messageType, content, fileId, replyToMessageId, now]
      );

      const messageId = result.insertId;

      // تحديث last_message_at في المحادثة
      await db.query(
        `UPDATE conversations SET last_message_at = ? WHERE id = ?`,
        [now, conversationId]
      );

      // جلب معلومات المرسل
      let senderName = null;
      if (socket.entityType === 'user') {
        const [userInfo] = await db.query(
          `SELECT upt.full_name 
           FROM user_profiles up 
           LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id
           WHERE up.user_id = ? 
           LIMIT 1`,
          [socket.userId]
        );
        senderName = userInfo.length > 0 ? userInfo[0].full_name : null;
      } else if (socket.entityType === 'doctor') {
        const [doctorInfo] = await db.query(
          `SELECT dpt.full_name 
           FROM doctor_profiles dp 
           LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id
           WHERE dp.doctor_id = ? 
           LIMIT 1`,
          [socket.userId]
        );
        senderName = doctorInfo.length > 0 ? doctorInfo[0].full_name : null;
      } else if (socket.entityType === 'admin') {
        const [adminInfo] = await db.query(`SELECT email FROM admins WHERE id = ?`, [socket.userId]);
        senderName = adminInfo.length > 0 ? adminInfo[0].email : null;
      } else if (socket.entityType === 'assistant') {
        const [assistantInfo] = await db.query(`SELECT email FROM assistants WHERE id = ?`, [socket.userId]);
        senderName = assistantInfo.length > 0 ? assistantInfo[0].email : null;
      }

      // بناء كائن الرسالة
      const message = {
        id: messageId,
        uuid: messageUuid,
        conversationId: conversationId,
        senderId: socket.userId,
        senderType: socket.entityType,
        senderName: senderName,
        messageType: messageType,
        content: content,
        fileId: fileId,
        replyToMessageId: replyToMessageId,
        isRead: false,
        createdAt: now,
        updatedAt: now
      };

      logger.info('Message sent', {
        messageId,
        conversationId,
        senderId: socket.userId,
        senderType: socket.entityType
      });

      // إرسال الرسالة للمرسل (تأكيد)
      socket.emit('messageSent', {
        success: true,
        message: message
      });

      // إرسال الرسالة لباقي المشاركين في الغرفة
      socket.to(`conversation:${conversationId}`).emit('newMessage', message);

      // إرسال إشعار لجميع المشاركين في غرفهم الشخصية (ما عدا المرسل)
      const [allParticipants] = await db.query(
        `SELECT participant_id, participant_type 
         FROM conversation_participants 
         WHERE conversation_id = ? AND NOT (participant_id = ? AND participant_type = ?)`,
        [conversationId, socket.userId, socket.entityType]
      );

      for (const participant of allParticipants) {
        io.to(`${participant.participant_type}:${participant.participant_id}`).emit('messageNotification', {
          conversationId: conversationId,
          message: message
        });
      }

    } catch (error) {
      logger.error('Send message error', {
        error: error.message,
        conversationId: data.conversationId,
        userId: socket.userId
      });
      
      socket.emit('error', { 
        message_ar: 'حدث خطأ في إرسال الرسالة',
        message_en: 'Failed to send message' 
      });
    }
  }

  /**
   * معالجة بدء الكتابة
   */
  static async handleTyping(socket, io, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return;
      }

      // إخبار باقي المشاركين أن المستخدم يكتب
      socket.to(`conversation:${conversationId}`).emit('userTyping', {
        userId: socket.userId,
        entityType: socket.entityType,
        conversationId: conversationId
      });

      logger.debug('User typing', {
        conversationId,
        userId: socket.userId,
        entityType: socket.entityType
      });

    } catch (error) {
      logger.error('Typing error', {
        error: error.message,
        userId: socket.userId
      });
    }
  }

  /**
   * معالجة إيقاف الكتابة
   */
  static async handleStopTyping(socket, io, data) {
    try {
      const { conversationId } = data;
      
      if (!conversationId) {
        return;
      }

      // إخبار باقي المشاركين أن المستخدم توقف عن الكتابة
      socket.to(`conversation:${conversationId}`).emit('userStoppedTyping', {
        userId: socket.userId,
        entityType: socket.entityType,
        conversationId: conversationId
      });

      logger.debug('User stopped typing', {
        conversationId,
        userId: socket.userId,
        entityType: socket.entityType
      });

    } catch (error) {
      logger.error('Stop typing error', {
        error: error.message,
        userId: socket.userId
      });
    }
  }

  /**
   * معالجة تحديث حالة الرسالة إلى "مقروءة"
   */
  static async handleMarkAsRead(socket, io, data) {
    try {
      const { conversationId, messageIds } = data;
      
      if (!conversationId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return socket.emit('error', { 
          message_ar: 'معرف المحادثة ومعرفات الرسائل مطلوبة',
          message_en: 'Conversation ID and message IDs are required' 
        });
      }

      // تحديث حالة الرسائل
      const placeholders = messageIds.map(() => '?').join(',');
      await db.query(
        `UPDATE messages 
         SET is_read = 1, read_at = NOW() 
         WHERE conversation_id = ? 
         AND id IN (${placeholders})
         AND sender_id != ? 
         AND sender_type != ?`,
        [conversationId, ...messageIds, socket.userId, socket.entityType]
      );

      logger.info('Messages marked as read', {
        conversationId,
        messageIds,
        userId: socket.userId,
        entityType: socket.entityType
      });

      // إخبار المرسل أن رسائله تم قراءتها
      socket.to(`conversation:${conversationId}`).emit('messagesRead', {
        conversationId: conversationId,
        messageIds: messageIds,
        readBy: {
          userId: socket.userId,
          entityType: socket.entityType
        }
      });

      socket.emit('markedAsRead', {
        success: true,
        conversationId: conversationId,
        messageIds: messageIds
      });

    } catch (error) {
      logger.error('Mark as read error', {
        error: error.message,
        conversationId: data.conversationId,
        userId: socket.userId
      });
      
      socket.emit('error', { 
        message_ar: 'حدث خطأ في تحديث حالة الرسائل',
        message_en: 'Failed to mark messages as read' 
      });
    }
  }

  /**
   * معالجة قطع الاتصال
   */
  static handleDisconnect(socket, reason) {
    logger.info('User disconnected from chat', { 
      socketId: socket.id, 
      userId: socket.userId, 
      entityType: socket.entityType,
      reason: reason 
    });
  }

  /**
   * معالجة الأخطاء
   */
  static handleError(socket, error) {
    logger.error('Socket error', { 
      socketId: socket.id, 
      userId: socket.userId, 
      entityType: socket.entityType,
      error: error.message || error
    });
  }
}

module.exports = ChatSocketHandler;

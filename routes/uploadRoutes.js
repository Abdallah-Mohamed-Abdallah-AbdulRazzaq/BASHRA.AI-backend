const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/authMiddleware');
const winston = require('winston');

// استخدام نفس logger من app.js
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

/**
 * Get uploaded file (Protected)
 * @route GET /upload/:filename
 * @access Private - يتطلب authentication
 */
router.get('/:filename', authMiddleware.authenticateJWT, async (req, res) => {
  try {
    const filename = req.params.filename;
    const userId = req.user.id;
    const entityType = req.user.entityType;

    // Validation: منع path traversal attacks
    if (filename.includes('..') || 
        filename.includes('/') || 
        filename.includes('\\') ||
        filename.includes('%2e') || 
        filename.includes('%2f') ||
        filename.includes('%5c')) {
      
      logger.warn('Upload: Path traversal attempt detected', {
        filename,
        userId,
        entityType,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        message: 'اسم ملف غير صالح',
        message_en: 'Invalid filename'
      });
    }

    // Validation: التحقق من امتداد الملف المسموح
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', // صور
      '.pdf', '.doc', '.docx', // مستندات
      '.mp4', '.avi', '.mov', // فيديو
      '.mp3', '.wav' // صوت
    ];

    const fileExtension = path.extname(filename).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      logger.warn('Upload: Unauthorized file extension', {
        filename,
        extension: fileExtension,
        userId,
        entityType
      });

      return res.status(403).json({
        success: false,
        message: 'نوع الملف غير مسموح',
        message_en: 'File type not allowed'
      });
    }

    // بناء مسار الملف
    const filePath = path.join(__dirname, '..', 'upload', filename);

    // التحقق من وجود الملف
    try {
      await fs.access(filePath, fs.constants.F_OK);
    } catch (err) {
      logger.warn('Upload: File not found', {
        filename,
        userId,
        entityType,
        path: filePath
      });

      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
        message_en: 'File not found'
      });
    }

    // TODO: إضافة authorization check
    // التحقق من أن المستخدم له صلاحية الوصول للملف
    // مثلاً: التحقق من أن الملف يخصه أو له صلاحية الوصول
    // يمكن تنفيذ هذا عن طريق:
    // 1. حفظ معلومات الملف في database (owner_id, permissions)
    // 2. التحقق من الصلاحيات قبل إرسال الملف
    
    // مثال:
    // const fileInfo = await db.query('SELECT owner_id FROM files WHERE filename = ?', [filename]);
    // if (fileInfo.owner_id !== userId && entityType !== 'Admin') {
    //   return res.status(403).json({ success: false, message: 'Unauthorized' });
    // }

    // Log successful access
    logger.info('Upload: File accessed', {
      filename,
      userId,
      entityType,
      ip: req.ip
    });

    // إرسال الملف
    res.sendFile(filePath, {
      maxAge: '1d', // Cache for 1 day
      etag: true,
      lastModified: true,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    }, (err) => {
      if (err) {
        logger.error('Upload: Error sending file', {
          filename,
          userId,
          error: err.message
        });
        
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'خطأ في إرسال الملف',
            message_en: 'Error sending file'
          });
        }
      }
    });

  } catch (error) {
    logger.error('Upload: Unexpected error', {
      error: error.message,
      stack: error.stack,
      filename: req.params.filename,
      userId: req.user ? req.user.id : 'unknown'
    });

    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      message_en: 'Internal server error'
    });
  }
});

/**
 * Health check for upload service
 * @route GET /upload/health/check
 * @access Public
 */
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    service: 'upload',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

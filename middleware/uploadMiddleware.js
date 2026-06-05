const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Upload Middleware
 * ميدلوير رفع الملفات باستخدام Multer
 */

// Configure multer for memory storage (files stored in memory as Buffer)
// This is used with FileService for centralized file management
const storage = multer.memoryStorage();

// File filter for images only
const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP)'), false);
  }
};

// File filter for documents (images and PDFs)
const documentFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/jpg', 
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP) أو PDF'), false);
  }
};

// Create multer upload instance for profile pictures
const uploadProfilePicture = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
}).single('profile_picture'); // Field name in form

// Middleware wrapper with error handling
const uploadProfilePictureMiddleware = (req, res, next) => {
  uploadProfilePicture(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error
      const language = req.headers['accept-language'] || 'ar';
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت' 
            : 'File size too large. Maximum 5MB allowed'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'اسم حقل الملف غير صحيح. استخدم "profile_picture" كاسم للحقل' 
            : 'Invalid field name. Use "profile_picture" as the field name',
          expectedFieldName: 'profile_picture'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في رفع الملف' 
          : 'Error uploading file',
        error: err.message
      });
    } else if (err) {
      // Other errors (e.g., file filter error)
      const language = req.headers['accept-language'] || 'ar';
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    // Everything went fine
    next();
  });
};

// Create multer upload instance for verification documents (using memory storage for FileService)
const uploadDocument = multer({
  storage: storage, // Use memory storage to work with FileService
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size for documents
  }
}).single('file'); // Field name in form

// Middleware wrapper for document upload with error handling
const uploadDocumentMiddleware = (req, res, next) => {
  uploadDocument(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const language = req.headers['accept-language'] || 'ar';
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' 
            : 'File size too large. Maximum 10MB allowed'
        });
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'اسم حقل الملف غير صحيح. استخدم "file" كاسم للحقل' 
            : 'Invalid field name. Use "file" as the field name',
          expectedFieldName: 'file'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في رفع الملف' 
          : 'Error uploading file',
        error: err.message
      });
    } else if (err) {
      const language = req.headers['accept-language'] || 'ar';
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    
    next();
  });
};

module.exports = {
  uploadProfilePictureMiddleware,
  uploadDocumentMiddleware
};

const multer = require('multer');

/**
 * File Upload Middleware
 * Middleware متقدم لرفع جميع أنواع الملفات
 */

// Configure multer for memory storage
const storage = multer.memoryStorage();

/**
 * File filter based on category
 */
const createFileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedTypes.join(', ')}`), false);
    }
  };
};

/**
 * Predefined file filters for different categories
 */
const FILE_FILTERS = {
  // Images only
  images: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'],
  
  // Documents
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ],
  
  // Medical images (DICOM, etc.)
  medicalImages: [
    'image/jpeg',
    'image/png',
    'application/dicom',
    'image/x-dicom-rle',
    'image/dicom+jpeg'
  ],
  
  // All common file types
  all: [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
};

/**
 * Create upload middleware for specific file category
 */
const createUploadMiddleware = (options = {}) => {
  const {
    fileCategory = 'all',
    maxSize = 10 * 1024 * 1024, // 10MB default
    fieldName = 'file',
    maxFiles = 1
  } = options;
  
  const allowedTypes = FILE_FILTERS[fileCategory] || FILE_FILTERS.all;
  
  const upload = multer({
    storage: storage,
    fileFilter: createFileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxFiles
    }
  });
  
  // Return middleware based on maxFiles
  if (maxFiles === 1) {
    return upload.single(fieldName);
  } else {
    return upload.array(fieldName, maxFiles);
  }
};

/**
 * Middleware wrapper with error handling
 */
const uploadWithErrorHandling = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const language = req.headers['accept-language'] || 'ar';
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'حجم الملف كبير جداً' 
              : 'File size too large',
            error: err.message
          });
        }
        
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'عدد الملفات يتجاوز الحد المسموح' 
              : 'Too many files',
            error: err.message
          });
        }
        
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'اسم حقل الملف غير صحيح' 
              : 'Invalid field name',
            error: err.message
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
};

/**
 * Predefined middleware for common use cases
 */
const uploadMiddleware = {
  // Single image upload (for profile pictures, etc.)
  singleImage: uploadWithErrorHandling(
    createUploadMiddleware({
      fileCategory: 'images',
      maxSize: 5 * 1024 * 1024, // 5MB
      fieldName: 'image'
    })
  ),
  
  // Single document upload
  singleDocument: uploadWithErrorHandling(
    createUploadMiddleware({
      fileCategory: 'documents',
      maxSize: 10 * 1024 * 1024, // 10MB
      fieldName: 'document'
    })
  ),
  
  // Multiple images upload
  multipleImages: uploadWithErrorHandling(
    createUploadMiddleware({
      fileCategory: 'images',
      maxSize: 5 * 1024 * 1024, // 5MB per file
      fieldName: 'images',
      maxFiles: 10
    })
  ),
  
  // Medical image upload
  medicalImage: uploadWithErrorHandling(
    createUploadMiddleware({
      fileCategory: 'medicalImages',
      maxSize: 20 * 1024 * 1024, // 20MB for medical images
      fieldName: 'medicalImage'
    })
  ),
  
  // Any file type
  anyFile: uploadWithErrorHandling(
    createUploadMiddleware({
      fileCategory: 'all',
      maxSize: 10 * 1024 * 1024, // 10MB
      fieldName: 'file'
    })
  )
};

module.exports = {
  createUploadMiddleware,
  uploadWithErrorHandling,
  uploadMiddleware,
  FILE_FILTERS
};

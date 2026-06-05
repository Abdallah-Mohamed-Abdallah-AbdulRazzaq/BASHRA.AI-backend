const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload (for future image upload if needed)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'upload/health-tips/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('يرجى رفع صور فقط'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware to handle file upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت'
      });
    }
  }
  
  if (error.message === 'يرجى رفع صور فقط') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Middleware to validate required fields for health tips
const validateHealthTipFields = (req, res, next) => {
  const { title_ar, description_ar } = req.body;
  
  if (!title_ar || !description_ar) {
    return res.status(400).json({
      success: false,
      message: 'العنوان والوصف باللغة العربية مطلوبان'
    });
  }
  
  next();
};

// Middleware to check if user can modify health tips
const canModifyHealthTips = (req, res, next) => {
  const userRole = req.user.role || req.user.admin_type;
  
  const allowedRoles = [
    'super_admin',
    'system_admin', 
    'clinic_admin'
  ];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية لتعديل النصائح الصحية'
    });
  }
  
  next();
};

// Middleware to check if user can view health tips
const canViewHealthTips = (req, res, next) => {
  const userRole = req.user.role || req.user.admin_type;
  
  const allowedRoles = [
    'super_admin',
    'system_admin', 
    'clinic_admin',
    'doctor',
    'assistant'
  ];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية لعرض النصائح الصحية'
    });
  }
  
  next();
};

// Middleware to log health tips activities
const logHealthTipsActivity = (action) => {
  return (req, res, next) => {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] Health Tips Activity: ${action} by User ID: ${userId} (${userEmail})`);
    
    // Here you can add database logging if needed
    // Example: Save to activity_logs table
    
    next();
  };
};

// Middleware to sanitize input data
const sanitizeHealthTipsData = (req, res, next) => {
  if (req.body.title_ar) {
    req.body.title_ar = req.body.title_ar.trim();
  }
  
  if (req.body.title_en) {
    req.body.title_en = req.body.title_en.trim();
  }
  
  if (req.body.description_ar) {
    req.body.description_ar = req.body.description_ar.trim();
  }
  
  if (req.body.description_en) {
    req.body.description_en = req.body.description_en.trim();
  }
  
  if (req.body.website_link) {
    req.body.website_link = req.body.website_link.trim();
  }
  
  next();
};

module.exports = {
  upload,
  handleUploadError,
  validateHealthTipFields,
  canModifyHealthTips,
  canViewHealthTips,
  logHealthTipsActivity,
  sanitizeHealthTipsData
};
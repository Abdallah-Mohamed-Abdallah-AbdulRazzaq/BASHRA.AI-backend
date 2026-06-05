const multer = require('multer');

/**
 * Form Data Middleware
 * Middleware to handle form-data (without files) and JSON
 * يدعم استقبال البيانات بطريقتين: JSON و form-data
 */

// Create multer instance for form-data without files
const upload = multer();

/**
 * Middleware to parse form-data (no files) or JSON
 * This allows routes to accept both Content-Types
 */
const parseFormData = (req, res, next) => {
  // Check Content-Type header
  const contentType = req.headers['content-type'] || '';
  
  // If it's multipart/form-data, use multer to parse it
  if (contentType.includes('multipart/form-data')) {
    upload.none()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message_ar: 'خطأ في معالجة البيانات',
          message_en: 'Error processing form data',
          error: err.message
        });
      }
      next();
    });
  } 
  // If it's application/x-www-form-urlencoded, express.urlencoded already handled it
  // If it's application/json, express.json already handled it
  else {
    next();
  }
};

module.exports = {
  parseFormData
};

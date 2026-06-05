const { body } = require('express-validator');

// Daily Tips Validations
const validateCreateDailyTip = [
  body('title_ar')
    .notEmpty()
    .withMessage('العنوان باللغة العربية مطلوب')
    .isLength({ min: 3, max: 255 })
    .withMessage('العنوان باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .notEmpty()
    .withMessage('الوصف باللغة العربية مطلوب')
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

const validateUpdateDailyTip = [
  body('title_ar')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('العنوان باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

// Medical Articles Validations
const validateCreateMedicalArticle = [
  body('title_ar')
    .notEmpty()
    .withMessage('العنوان باللغة العربية مطلوب')
    .isLength({ min: 3, max: 255 })
    .withMessage('العنوان باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('sub_title_ar')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان الفرعي باللغة العربية يجب ألا يزيد عن 255 حرف'),
  
  body('sub_title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان الفرعي باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .notEmpty()
    .withMessage('الوصف باللغة العربية مطلوب')
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

const validateUpdateMedicalArticle = [
  body('title_ar')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('العنوان باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('sub_title_ar')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان الفرعي باللغة العربية يجب ألا يزيد عن 255 حرف'),
  
  body('sub_title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('العنوان الفرعي باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('الوصف باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

// Skin Diseases Info Validations
const validateCreateSkinDiseaseInfo = [
  body('title_ar')
    .notEmpty()
    .withMessage('عنوان المرض باللغة العربية مطلوب')
    .isLength({ min: 3, max: 255 })
    .withMessage('عنوان المرض باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('عنوان المرض باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .notEmpty()
    .withMessage('وصف المرض باللغة العربية مطلوب')
    .isLength({ min: 10 })
    .withMessage('وصف المرض باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('وصف المرض باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('website_link')
    .optional()
    .isURL()
    .withMessage('رابط الموقع يجب أن يكون رابط صحيح')
    .isLength({ max: 500 })
    .withMessage('رابط الموقع يجب ألا يزيد عن 500 حرف'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

const validateUpdateSkinDiseaseInfo = [
  body('title_ar')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('عنوان المرض باللغة العربية يجب أن يكون بين 3 و 255 حرف'),
  
  body('title_en')
    .optional()
    .isLength({ max: 255 })
    .withMessage('عنوان المرض باللغة الإنجليزية يجب ألا يزيد عن 255 حرف'),
  
  body('description_ar')
    .optional()
    .isLength({ min: 10 })
    .withMessage('وصف المرض باللغة العربية يجب أن يكون على الأقل 10 أحرف'),
  
  body('description_en')
    .optional()
    .isLength({ min: 10 })
    .withMessage('وصف المرض باللغة الإنجليزية يجب أن يكون على الأقل 10 أحرف إذا تم إدخاله'),
  
  body('website_link')
    .optional()
    .isURL()
    .withMessage('رابط الموقع يجب أن يكون رابط صحيح')
    .isLength({ max: 500 })
    .withMessage('رابط الموقع يجب ألا يزيد عن 500 حرف'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('حقل التفعيل يجب أن يكون true أو false')
];

module.exports = {
  validateCreateDailyTip,
  validateUpdateDailyTip,
  validateCreateMedicalArticle,
  validateUpdateMedicalArticle,
  validateCreateSkinDiseaseInfo,
  validateUpdateSkinDiseaseInfo
};
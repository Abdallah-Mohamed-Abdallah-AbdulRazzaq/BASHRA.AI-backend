const { body } = require('express-validator');

/**
 * Patient Profile Validations
 * التحقق من صحة بيانات ملف المريض
 */

// Validate Create Patient Profile
const validateCreatePatientProfile = [
  body('blood_type')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])
    .withMessage('فصيلة الدم يجب أن تكون واحدة من: A+, A-, B+, B-, AB+, AB-, O+, O-, unknown'),
  
  body('height')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('الطول يجب أن يكون رقم صحيح بين 0 و 999.99'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('الوزن يجب أن يكون رقم صحيح بين 0 و 999.99'),
  
  body('smoking_status')
    .optional()
    .isIn(['never', 'former', 'current', 'unknown'])
    .withMessage('حالة التدخين يجب أن تكون واحدة من: never, former, current, unknown'),
  
  body('alcohol_consumption')
    .optional()
    .isIn(['never', 'rarely', 'occasionally', 'regularly', 'unknown'])
    .withMessage('استهلاك الكحول يجب أن يكون واحد من: never, rarely, occasionally, regularly, unknown'),
  
  body('exercise_frequency')
    .optional()
    .isIn(['never', 'rarely', 'sometimes', 'regularly', 'daily', 'unknown'])
    .withMessage('تكرار التمارين يجب أن يكون واحد من: never, rarely, sometimes, regularly, daily, unknown'),
  
  body('insurance_provider')
    .optional()
    .isLength({ max: 200 })
    .withMessage('اسم شركة التأمين يجب ألا يزيد عن 200 حرف'),
  
  body('insurance_policy_number')
    .optional()
    .isLength({ max: 100 })
    .withMessage('رقم بوليصة التأمين يجب ألا يزيد عن 100 حرف'),
  
  body('preferred_doctor_id')
    .optional()
    .isInt()
    .withMessage('معرف الطبيب المفضل يجب أن يكون رقم صحيح'),

  // Translation fields for Arabic
  body('medical_history_ar')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي بالعربية يجب أن يكون نص'),
  
  body('current_medications_ar')
    .optional()
    .isString()
    .withMessage('الأدوية الحالية بالعربية يجب أن يكون نص'),
  
  body('allergies_ar')
    .optional()
    .isString()
    .withMessage('الحساسية بالعربية يجب أن يكون نص'),
  
  body('chronic_conditions_ar')
    .optional()
    .isString()
    .withMessage('الأمراض المزمنة بالعربية يجب أن يكون نص'),
  
  body('family_medical_history_ar')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي للعائلة بالعربية يجب أن يكون نص'),

  // Translation fields for English
  body('medical_history_en')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي بالإنجليزية يجب أن يكون نص'),
  
  body('current_medications_en')
    .optional()
    .isString()
    .withMessage('الأدوية الحالية بالإنجليزية يجب أن يكون نص'),
  
  body('allergies_en')
    .optional()
    .isString()
    .withMessage('الحساسية بالإنجليزية يجب أن يكون نص'),
  
  body('chronic_conditions_en')
    .optional()
    .isString()
    .withMessage('الأمراض المزمنة بالإنجليزية يجب أن يكون نص'),
  
  body('family_medical_history_en')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي للعائلة بالإنجليزية يجب أن يكون نص')
];

// Validate Update Patient Profile
const validateUpdatePatientProfile = [
  body('blood_type')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])
    .withMessage('فصيلة الدم يجب أن تكون واحدة من: A+, A-, B+, B-, AB+, AB-, O+, O-, unknown'),
  
  body('height')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('الطول يجب أن يكون رقم صحيح بين 0 و 999.99'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('الوزن يجب أن يكون رقم صحيح بين 0 و 999.99'),
  
  body('smoking_status')
    .optional()
    .isIn(['never', 'former', 'current', 'unknown'])
    .withMessage('حالة التدخين يجب أن تكون واحدة من: never, former, current, unknown'),
  
  body('alcohol_consumption')
    .optional()
    .isIn(['never', 'rarely', 'occasionally', 'regularly', 'unknown'])
    .withMessage('استهلاك الكحول يجب أن يكون واحد من: never, rarely, occasionally, regularly, unknown'),
  
  body('exercise_frequency')
    .optional()
    .isIn(['never', 'rarely', 'sometimes', 'regularly', 'daily', 'unknown'])
    .withMessage('تكرار التمارين يجب أن يكون واحد من: never, rarely, sometimes, regularly, daily, unknown'),
  
  body('insurance_provider')
    .optional()
    .isLength({ max: 200 })
    .withMessage('اسم شركة التأمين يجب ألا يزيد عن 200 حرف'),
  
  body('insurance_policy_number')
    .optional()
    .isLength({ max: 100 })
    .withMessage('رقم بوليصة التأمين يجب ألا يزيد عن 100 حرف'),
  
  body('preferred_doctor_id')
    .optional()
    .isInt()
    .withMessage('معرف الطبيب المفضل يجب أن يكون رقم صحيح'),

  // Translation fields for Arabic
  body('medical_history_ar')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي بالعربية يجب أن يكون نص'),
  
  body('current_medications_ar')
    .optional()
    .isString()
    .withMessage('الأدوية الحالية بالعربية يجب أن يكون نص'),
  
  body('allergies_ar')
    .optional()
    .isString()
    .withMessage('الحساسية بالعربية يجب أن يكون نص'),
  
  body('chronic_conditions_ar')
    .optional()
    .isString()
    .withMessage('الأمراض المزمنة بالعربية يجب أن يكون نص'),
  
  body('family_medical_history_ar')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي للعائلة بالعربية يجب أن يكون نص'),

  // Translation fields for English
  body('medical_history_en')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي بالإنجليزية يجب أن يكون نص'),
  
  body('current_medications_en')
    .optional()
    .isString()
    .withMessage('الأدوية الحالية بالإنجليزية يجب أن يكون نص'),
  
  body('allergies_en')
    .optional()
    .isString()
    .withMessage('الحساسية بالإنجليزية يجب أن يكون نص'),
  
  body('chronic_conditions_en')
    .optional()
    .isString()
    .withMessage('الأمراض المزمنة بالإنجليزية يجب أن يكون نص'),
  
  body('family_medical_history_en')
    .optional()
    .isString()
    .withMessage('التاريخ الطبي للعائلة بالإنجليزية يجب أن يكون نص')
];

module.exports = {
  validateCreatePatientProfile,
  validateUpdatePatientProfile
};

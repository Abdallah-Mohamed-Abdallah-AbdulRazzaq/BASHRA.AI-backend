/**
 * Profile Type Configurations
 * تكوينات أنواع الملفات الشخصية
 * 
 * This file contains the database configuration for all user types
 * to ensure consistency across the application.
 */

/**
 * Profile configurations for all user types
 * التكوينات لجميع أنواع المستخدمين
 */
const PROFILE_CONFIGS = {
  user: {
    // جدول الملف الشخصي
    profileTable: 'user_profiles',
    // جدول الترجمة
    translationTable: 'user_profile_translations',
    // اسم العمود الخارجي في جدول الملف الشخصي
    foreignKeyColumn: 'user_id',
    // اسم العمود الخارجي في جدول الترجمة
    translationForeignKey: 'profile_id',
    // جدول الحساب الرئيسي
    accountTable: 'users',
    // الحقول القابلة للترجمة
    translatableFields: [
      'full_name',
      'emergency_contact_name',
      'emergency_contact_relationship'
    ]
  },
  
  doctor: {
    profileTable: 'doctor_profiles',
    translationTable: 'doctor_profile_translations',
    foreignKeyColumn: 'doctor_id',
    translationForeignKey: 'doctor_profile_id',
    accountTable: 'doctors',
    translatableFields: [
      'full_name',
      'specialty',
      'sub_specialty',
      'biography',
      'emergency_contact_name',
      'emergency_contact_relationship'
    ]
  },
  
  admin: {
    profileTable: 'admin_profiles',
    translationTable: 'admin_profile_translations',
    foreignKeyColumn: 'admin_id',
    translationForeignKey: 'profile_id',
    accountTable: 'admins',
    translatableFields: [
      'full_name',
      'job_title',
      'department',
      'emergency_contact_name',
      'emergency_contact_relationship'
    ]
  },
  
  assistant: {
    profileTable: 'assistant_profiles',
    translationTable: 'assistant_profile_translations',
    foreignKeyColumn: 'assistant_id',
    translationForeignKey: 'assistant_profile_id',
    accountTable: 'assistants',
    translatableFields: [
      'full_name',
      'job_title',
      'emergency_contact_name',
      'emergency_contact_relationship'
    ]
  }
};

/**
 * Get profile configuration by user type
 * الحصول على تكوين الملف الشخصي حسب نوع المستخدم
 * @param {String} userType - Type of user (user, doctor, admin, assistant)
 * @returns {Object} Profile configuration
 */
function getProfileConfig(userType) {
  const config = PROFILE_CONFIGS[userType];
  
  if (!config) {
    throw new Error(`Invalid user type: ${userType}. Valid types are: user, doctor, admin, assistant`);
  }
  
  return config;
}

/**
 * Get all profile configurations
 * الحصول على جميع التكوينات
 * @returns {Object} All profile configurations
 */
function getAllProfileConfigs() {
  return PROFILE_CONFIGS;
}

/**
 * Validate if user type is valid
 * التحقق من صحة نوع المستخدم
 * @param {String} userType - Type of user
 * @returns {Boolean}
 */
function isValidUserType(userType) {
  return Object.keys(PROFILE_CONFIGS).includes(userType);
}

/**
 * Get foreign key column name for profile table
 * الحصول على اسم العمود الخارجي لجدول الملف الشخصي
 * @param {String} userType - Type of user
 * @returns {String} Foreign key column name
 */
function getForeignKeyColumn(userType) {
  const config = getProfileConfig(userType);
  return config.foreignKeyColumn;
}

/**
 * Get foreign key column name for translation table
 * الحصول على اسم العمود الخارجي لجدول الترجمة
 * @param {String} userType - Type of user
 * @returns {String} Translation foreign key column name
 */
function getTranslationForeignKey(userType) {
  const config = getProfileConfig(userType);
  return config.translationForeignKey;
}

/**
 * Get translatable fields for a user type
 * الحصول على الحقول القابلة للترجمة
 * @param {String} userType - Type of user
 * @returns {Array} Array of translatable field names
 */
function getTranslatableFields(userType) {
  const config = getProfileConfig(userType);
  return config.translatableFields;
}

module.exports = {
  PROFILE_CONFIGS,
  getProfileConfig,
  getAllProfileConfigs,
  isValidUserType,
  getForeignKeyColumn,
  getTranslationForeignKey,
  getTranslatableFields
};

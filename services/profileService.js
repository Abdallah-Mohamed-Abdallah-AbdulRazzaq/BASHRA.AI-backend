const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const FileService = require('./fileService');

/**
 * Profile Service
 * خدمات مشتركة للملفات الشخصية (Profiles)
 */
class ProfileService {
  
  /**
   * Upload profile picture
   * رفع الصورة الشخصية
   * @param {Object} file - Uploaded file object from multer
   * @param {String} userId - User ID
   * @param {String} profileType - Type of profile (user, doctor, assistant, admin)
   * @param {Number} profileId - Profile ID (optional, for linking)
   * @returns {Object} File record with URL
   */
  static async uploadProfilePicture(file, userId, profileType = 'user', profileId = null) {
    try {
      if (!file) {
        throw new Error('لم يتم رفع أي ملف');
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP)');
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      }

      // Use FileService to upload and register the file
      const fileRecord = await FileService.uploadFile(
        file,
        {
          entityType: profileType, // 'user', 'doctor', 'assistant', 'admin'
          entityId: userId
        },
        {
          fileCategory: 'profile_picture',
          relatedToType: `${profileType}_profile`,
          relatedToId: profileId,
          isPublic: true, // Profile pictures are usually public
          metadata: {
            uploaded_from: 'profile_update',
            profile_type: profileType
          }
        }
      );
      
      return {
        file_url: fileRecord.file_url,
        file_uuid: fileRecord.uuid,
        file_id: fileRecord.id
      };
    } catch (error) {
      throw new Error('خطأ في رفع الصورة الشخصية: ' + error.message);
    }
  }

  /**
   * Delete profile picture
   * حذف الصورة الشخصية
   * @param {String} pictureUrl - Picture URL to delete (can be full URL or relative path)
   */
  static async deleteProfilePicture(pictureUrl) {
    try {
      if (!pictureUrl) return;

      // Extract relative path from full URL if necessary
      let relativePath = pictureUrl;
      
      // If it's a full URL, extract the path part
      if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
        try {
          const url = new URL(pictureUrl);
          relativePath = url.pathname; // e.g., /upload/profiles/user/user_23_123456.png
        } catch (err) {
          console.error('Error parsing URL:', err);
          return;
        }
      }
      
      // Build file path
      const filePath = path.join(__dirname, '..', relativePath);
      
      // Check if file exists and delete
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log('File deleted successfully:', filePath);
      } catch (err) {
        // File doesn't exist, ignore
        console.log('File not found, skipping deletion:', filePath);
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   * التحقق من صحة صيغة التاريخ
   */
  static validateDateFormat(dateString) {
    if (!dateString) return true; // Optional field
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Validate phone number format
   * التحقق من صحة رقم الهاتف
   */
  static validatePhoneNumber(phone) {
    if (!phone) return true; // Optional field
    
    // Simple validation: allow digits, spaces, dashes, parentheses, and + sign
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.length >= 8 && phone.length <= 20;
  }

  /**
   * Validate gender value
   * التحقق من صحة قيمة الجنس
   */
  static validateGender(gender) {
    if (!gender) return true; // Optional field
    
    const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    return validGenders.includes(gender);
  }

  /**
   * Get profile by user ID and type
   * جلب الملف الشخصي حسب معرف المستخدم والنوع
   * @param {Number} userId - User ID
   * @param {String} tableName - Profile table name (user_profiles, doctor_profiles, admin_profiles, assistant_profiles)
   * @param {String} translationTable - Translation table name
   * @param {String} language - Language code
   * @param {String} foreignKeyColumn - Foreign key column name (default: 'user_id')
   *   - For users: 'user_id'
   *   - For doctors: 'doctor_id'
   *   - For admins: 'admin_id'
   *   - For assistants: 'assistant_id'
   * @param {String} translationForeignKey - Foreign key column name in translation table (default: 'profile_id')
   *   - For users: 'profile_id'
   *   - For doctors: 'doctor_profile_id'
   *   - For admins: 'profile_id'
   *   - For assistants: 'assistant_profile_id'
   */
  static async getProfileByUserId(userId, tableName, translationTable, language = 'ar', foreignKeyColumn = 'user_id', translationForeignKey = 'profile_id') {
    try {
      // Ensure language is never undefined
      const validLanguage = language || 'ar';
      
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }
      if (!tableName || !translationTable) {
        throw new Error('Table names are required');
      }

      // Determine translation fields based on translation table type
      let translationFields = `
        t.full_name, 
        t.emergency_contact_name, 
        t.emergency_contact_relationship,
        t.language_code
      `;
      
      // Doctor-specific fields
      if (translationTable === 'doctor_profile_translations') {
        translationFields = `
          t.full_name, 
          t.specialty,
          t.sub_specialty,
          t.biography,
          t.emergency_contact_name, 
          t.emergency_contact_relationship,
          t.language_code
        `;
      }
      
      // Admin-specific fields
      if (translationTable === 'admin_profile_translations') {
        translationFields = `
          t.full_name, 
          t.job_title,
          t.department,
          t.emergency_contact_name, 
          t.emergency_contact_relationship,
          t.language_code
        `;
      }
      
      // Assistant-specific fields
      if (translationTable === 'assistant_profile_translations') {
        translationFields = `
          t.full_name, 
          t.job_title,
          t.emergency_contact_name, 
          t.emergency_contact_relationship,
          t.language_code
        `;
      }

      const [profiles] = await db.execute(
        `SELECT p.*, 
                ${translationFields}
         FROM ${tableName} p
         LEFT JOIN ${translationTable} t ON p.id = t.${translationForeignKey} AND t.language_code = ?
         WHERE p.${foreignKeyColumn} = ?
         LIMIT 1`,
        [validLanguage, userId]
      );

      return profiles[0] || null;
    } catch (error) {
      throw new Error('خطأ في جلب الملف الشخصي: ' + error.message);
    }
  }

  /**
   * Check if profile exists
   * التحقق من وجود الملف الشخصي
   * @param {Number} userId - User ID
   * @param {String} tableName - Profile table name
   * @param {String} foreignKeyColumn - Foreign key column name (default: 'user_id', for doctors use 'doctor_id')
   */
  static async profileExists(userId, tableName, foreignKeyColumn = 'user_id') {
    try {
      const [rows] = await db.execute(
        `SELECT id FROM ${tableName} WHERE ${foreignKeyColumn} = ? LIMIT 1`,
        [userId]
      );

      return rows.length > 0 ? rows[0].id : null;
    } catch (error) {
      throw new Error('خطأ في التحقق من وجود الملف الشخصي: ' + error.message);
    }
  }

  /**
   * Update profile translation
   * تحديث ترجمة الملف الشخصي
   */
  static async updateProfileTranslation(profileId, translationTable, languageCode, translationData) {
    try {
      // Check if translation exists
      const [existing] = await db.execute(
        `SELECT id FROM ${translationTable} WHERE profile_id = ? AND language_code = ?`,
        [profileId, languageCode]
      );

      const fields = [];
      const values = [];

      if (translationData.full_name !== undefined) {
        fields.push('full_name = ?');
        values.push(translationData.full_name);
      }
      if (translationData.emergency_contact_name !== undefined) {
        fields.push('emergency_contact_name = ?');
        values.push(translationData.emergency_contact_name);
      }
      if (translationData.emergency_contact_relationship !== undefined) {
        fields.push('emergency_contact_relationship = ?');
        values.push(translationData.emergency_contact_relationship);
      }

      if (fields.length === 0) {
        return; // Nothing to update
      }

      if (existing.length > 0) {
        // Update existing translation
        values.push(profileId, languageCode);
        await db.execute(
          `UPDATE ${translationTable} SET ${fields.join(', ')} WHERE profile_id = ? AND language_code = ?`,
          values
        );
      } else {
        // Insert new translation
        const insertFields = ['profile_id', 'language_code'];
        const insertValues = [profileId, languageCode];
        const placeholders = ['?', '?'];

        if (translationData.full_name !== undefined) {
          insertFields.push('full_name');
          insertValues.push(translationData.full_name);
          placeholders.push('?');
        }
        if (translationData.emergency_contact_name !== undefined) {
          insertFields.push('emergency_contact_name');
          insertValues.push(translationData.emergency_contact_name);
          placeholders.push('?');
        }
        if (translationData.emergency_contact_relationship !== undefined) {
          insertFields.push('emergency_contact_relationship');
          insertValues.push(translationData.emergency_contact_relationship);
          placeholders.push('?');
        }

        await db.execute(
          `INSERT INTO ${translationTable} (${insertFields.join(', ')}) VALUES (${placeholders.join(', ')})`,
          insertValues
        );
      }
    } catch (error) {
      throw new Error('خطأ في تحديث ترجمة الملف الشخصي: ' + error.message);
    }
  }
}

module.exports = ProfileService;

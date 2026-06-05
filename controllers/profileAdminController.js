const db = require('../config/db');
const ProfileService = require('../services/profileService');
const { filterByLanguage } = require('../utils/langHelper');

/**
 * Profile Admin Controller
 * معالج الملفات الشخصية للمسؤولين
 */
class ProfileAdminController {

  /**
   * Helper function to normalize language code
   * دالة مساعدة لتنظيف كود اللغة
   */
  static normalizeLanguage(langHeader, userPreference) {
    // If language header exists, extract the main language code
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }
    
    // Fall back to user preference or default
    return userPreference || 'ar';
  }

  /**
   * Get admin profile
   * جلب الملف الشخصي للمسؤول
   */
  static async getProfile(req, res) {
    try {
      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get profile with translation
      const profile = await ProfileService.getProfileByUserId(
        adminId,
        'admin_profiles',
        'admin_profile_translations',
        language,
        'admin_id',
        'profile_id'
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Filter by language to remove _ar and _en suffixes
      const filteredProfile = filterByLanguage(profile, language);

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم جلب الملف الشخصي بنجاح' : 'Profile retrieved successfully',
        data: filteredProfile
      });

    } catch (error) {
      console.error('Error in getProfile:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب الملف الشخصي' : 'Error fetching profile',
        error: error.message
      });
    }
  }

  /**
   * Get complete admin data (admin + profile + all translations)
   * جلب بيانات المسؤول الكاملة
   */
  static async getCompleteAdminData(req, res) {
    try {
      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // 1. Get account info
      const [adminAccount] = await db.execute(
        'SELECT id, uuid, email, phone, admin_type, status, is_active, created_at, last_login_at FROM admins WHERE id = ?',
        [adminId]
      );

      if (adminAccount.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المسؤول غير موجود' : 'Admin not found'
        });
      }

      // 2. Get profile info
      const [profile] = await db.execute(
        'SELECT * FROM admin_profiles WHERE admin_id = ?',
        [adminId]
      );

      // 3. Get translations
      let translations = {};
      if (profile.length > 0) {
        const [translationRows] = await db.execute(
          'SELECT * FROM admin_profile_translations WHERE profile_id = ?',
          [profile[0].id]
        );

        // Organize translations by language code
        translationRows.forEach(row => {
          translations[row.language_code] = row;
        });
      }

      res.status(200).json({
        success: true,
        data: {
          account: adminAccount[0],
          profile: profile[0] || null,
          translations: translations
        }
      });

    } catch (error) {
      console.error('Error in getCompleteAdminData:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب البيانات' : 'Error fetching data',
        error: error.message
      });
    }
  }

  /**
   * Update admin profile
   * تحديث الملف الشخصي للمسؤول
   */
  static async updateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(adminId, 'admin_profiles', 'admin_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Extract fields
      const {
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        
        // Translation fields (for current language)
        full_name,
        job_title,
        department,
        emergency_contact_name,
        emergency_contact_relationship,

        // Full translations object (optional, for multi-language update)
        translations
      } = req.body;

      // Validate data
      if (date_of_birth && !ProfileService.validateDateFormat(date_of_birth)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format'
        });
      }

      if (gender && !ProfileService.validateGender(gender)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' ? 'قيمة الجنس غير صحيحة' : 'Invalid gender value'
        });
      }

      // 1. Update Profile Table
      const profileFields = [];
      const profileValues = [];

      if (date_of_birth !== undefined) { profileFields.push('date_of_birth = ?'); profileValues.push(date_of_birth); }
      if (gender !== undefined) { profileFields.push('gender = ?'); profileValues.push(gender); }
      if (nationality !== undefined) { profileFields.push('nationality = ?'); profileValues.push(nationality); }
      if (emergency_contact_phone !== undefined) { profileFields.push('emergency_contact_phone = ?'); profileValues.push(emergency_contact_phone); }
      if (timezone !== undefined) { profileFields.push('timezone = ?'); profileValues.push(timezone); }
      if (language_preference !== undefined) { profileFields.push('language_preference = ?'); profileValues.push(language_preference); }

      if (profileFields.length > 0) {
        profileFields.push('updated_at = CURRENT_TIMESTAMP');
        profileValues.push(profileId);
        
        await connection.execute(
          `UPDATE admin_profiles SET ${profileFields.join(', ')} WHERE id = ?`,
          profileValues
        );
      }

      // 2. Update Translations
      // Handle explicit translations object if provided
      if (translations && typeof translations === 'object') {
        for (const [langCode, transData] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            await ProfileService.updateProfileTranslation(
              profileId,
              'admin_profile_translations',
              langCode,
              transData
            );
          }
        }
      } 
      // Handle flat fields for current language
      else if (full_name || job_title || department || emergency_contact_name || emergency_contact_relationship) {
        const transData = {
          full_name,
          job_title,
          department,
          emergency_contact_name,
          emergency_contact_relationship
        };
        
        await ProfileService.updateProfileTranslation(
          profileId,
          'admin_profile_translations',
          language,
          transData
        );
      }

      await connection.commit();

      // Get updated profile to return
      const updatedProfile = await ProfileService.getProfileByUserId(
        adminId,
        'admin_profiles',
        'admin_profile_translations',
        language,
        'admin_id',
        'profile_id'
      );
      
      const filteredProfile = filterByLanguage(updatedProfile, language);

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully',
        data: filteredProfile
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProfile:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في تحديث الملف الشخصي' : 'Error updating profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Upload profile picture
   * رفع الصورة الشخصية
   */
  static async uploadProfilePicture(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      if (!req.file) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' ? 'لم يتم رفع أي ملف' : 'No file uploaded'
        });
      }

      // Check if profile exists
      const profileId = await ProfileService.profileExists(adminId, 'admin_profiles', 'admin_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile to check for existing picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM admin_profiles WHERE id = ?',
        [profileId]
      );

      // Upload new picture
      const fileRecord = await ProfileService.uploadProfilePicture(
        req.file, 
        adminId, 
        'admin',
        profileId
      );

      // Update profile with new picture URL
      await connection.execute(
        'UPDATE admin_profiles SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fileRecord.file_url, profileId]
      );

      // Delete old picture if exists
      if (currentProfile[0]?.profile_picture_url) {
        await ProfileService.deleteProfilePicture(currentProfile[0].profile_picture_url);
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم رفع الصورة الشخصية بنجاح' 
          : 'Profile picture uploaded successfully',
        data: {
          profile_picture_url: fileRecord.file_url,
          file_uuid: fileRecord.file_uuid,
          file_id: fileRecord.file_id
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in uploadProfilePicture:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في رفع الصورة الشخصية' : 'Error uploading profile picture',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete profile picture
   * حذف الصورة الشخصية
   */
  static async deleteProfilePicture(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(adminId, 'admin_profiles', 'admin_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM admin_profiles WHERE id = ?',
        [profileId]
      );

      if (!currentProfile[0]?.profile_picture_url) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'لا توجد صورة شخصية لحذفها' 
            : 'No profile picture to delete'
        });
      }

      // Delete picture file
      await ProfileService.deleteProfilePicture(currentProfile[0].profile_picture_url);

      // Update profile to remove picture URL
      await connection.execute(
        'UPDATE admin_profiles SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [profileId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف الصورة الشخصية بنجاح' 
          : 'Profile picture deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteProfilePicture:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في حذف الصورة الشخصية' : 'Error deleting profile picture',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Deactivate admin account
   * تعطيل حساب المسؤول
   */
  static async deleteProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check permissions: A regular admin cannot delete themselves in many systems, 
      // but assuming self-deactivation is allowed.
      // Alternatively, we might want to restrict this. For now, allowing self-deactivation.

      // Deactivate admin account
      await connection.execute(
        'UPDATE admins SET is_active = 0, status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [adminId]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تعطيل الحساب بنجاح' 
          : 'Account deactivated successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteProfile:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في تعطيل الحساب' : 'Error deactivating account',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Reactivate admin account
   * إعادة تفعيل حساب المسؤول
   */
  static async reactivateProfile(req, res) {
    // Note: Usually this requires authentication, but if account is inactive, 
    // access might be blocked by middleware. 
    // The checkAccountActive middleware handles allowing access to this endpoint.
    
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const adminId = req.user.id;
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Reactivate admin account
      await connection.execute(
        'UPDATE admins SET is_active = 1, status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [adminId]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم إعادة تفعيل الحساب بنجاح' 
          : 'Account reactivated successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in reactivateProfile:', error);
      const language = ProfileAdminController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في إعادة تفعيل الحساب' : 'Error reactivating account',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = ProfileAdminController;

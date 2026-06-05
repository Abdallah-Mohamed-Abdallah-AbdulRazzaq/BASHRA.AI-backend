const db = require('../config/db');
const ProfileService = require('../services/profileService');
const { filterByLanguage } = require('../utils/langHelper');

/**
 * Profile Assistant Controller
 * معالج الملفات الشخصية للمساعدين
 */
class ProfileAssistantController {

  /**
   * Helper function to normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }
    return userPreference || 'ar';
  }

  /**
   * Get assistant profile
   * جلب الملف الشخصي للمساعد
   */
  static async getProfile(req, res) {
    try {
      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get profile with translation
      const profile = await ProfileService.getProfileByUserId(
        assistantId,
        'assistant_profiles',
        'assistant_profile_translations',
        language,
        'assistant_id',
        'assistant_profile_id'
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Filter by language
      const filteredProfile = filterByLanguage(profile, language);

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم جلب الملف الشخصي بنجاح' : 'Profile retrieved successfully',
        data: filteredProfile
      });

    } catch (error) {
      console.error('Error in getProfile:', error);
      const language = ProfileAssistantController.normalizeLanguage(
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
   * Get complete assistant data
   * جلب بيانات المساعد الكاملة
   */
  static async getCompleteAssistantData(req, res) {
    try {
      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // 1. Get account info
      const [assistantAccount] = await db.execute(
        'SELECT id, uuid, email, phone, status, is_active, created_at, last_login_at FROM assistants WHERE id = ?',
        [assistantId]
      );

      if (assistantAccount.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المساعد غير موجود' : 'Assistant not found'
        });
      }

      // 2. Get profile info
      const [profile] = await db.execute(
        'SELECT * FROM assistant_profiles WHERE assistant_id = ?',
        [assistantId]
      );

      // 3. Get translations
      let translations = {};
      if (profile.length > 0) {
        const [translationRows] = await db.execute(
          'SELECT * FROM assistant_profile_translations WHERE assistant_profile_id = ?',
          [profile[0].id]
        );

        translationRows.forEach(row => {
          translations[row.language_code] = row;
        });
      }

      res.status(200).json({
        success: true,
        data: {
          account: assistantAccount[0],
          profile: profile[0] || null,
          translations: translations
        }
      });

    } catch (error) {
      console.error('Error in getCompleteAssistantData:', error);
      const language = ProfileAssistantController.normalizeLanguage(
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
   * Update assistant profile
   * تحديث الملف الشخصي للمساعد
   */
  static async updateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(assistantId, 'assistant_profiles', 'assistant_id');
      
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
        
        // Translation fields
        full_name,
        job_title,
        emergency_contact_name,
        emergency_contact_relationship,

        translations
      } = req.body;

      // Validate
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
          `UPDATE assistant_profiles SET ${profileFields.join(', ')} WHERE id = ?`,
          profileValues
        );
      }

      // 2. Update Translations
      if (translations && typeof translations === 'object') {
        for (const [langCode, transData] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            await ProfileService.updateProfileTranslation(
              profileId,
              'assistant_profile_translations',
              langCode,
              transData
            );
          }
        }
      } else if (full_name || job_title || emergency_contact_name || emergency_contact_relationship) {
        const transData = {
          full_name,
          job_title,
          emergency_contact_name,
          emergency_contact_relationship
        };
        
        await ProfileService.updateProfileTranslation(
          profileId,
          'assistant_profile_translations',
          language,
          transData
        );
      }

      await connection.commit();

      const updatedProfile = await ProfileService.getProfileByUserId(
        assistantId,
        'assistant_profiles',
        'assistant_profile_translations',
        language,
        'assistant_id',
        'assistant_profile_id'
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
      const language = ProfileAssistantController.normalizeLanguage(
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
   */
  static async uploadProfilePicture(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
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

      const profileId = await ProfileService.profileExists(assistantId, 'assistant_profiles', 'assistant_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM assistant_profiles WHERE id = ?',
        [profileId]
      );

      const fileRecord = await ProfileService.uploadProfilePicture(
        req.file, 
        assistantId, 
        'assistant',
        profileId
      );

      await connection.execute(
        'UPDATE assistant_profiles SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [fileRecord.file_url, profileId]
      );

      if (currentProfile[0]?.profile_picture_url) {
        await ProfileService.deleteProfilePicture(currentProfile[0].profile_picture_url);
      }

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم رفع الصورة الشخصية بنجاح' : 'Profile picture uploaded successfully',
        data: {
          profile_picture_url: fileRecord.file_url,
          file_uuid: fileRecord.file_uuid,
          file_id: fileRecord.file_id
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in uploadProfilePicture:', error);
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
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
   */
  static async deleteProfilePicture(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const profileId = await ProfileService.profileExists(assistantId, 'assistant_profiles', 'assistant_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM assistant_profiles WHERE id = ?',
        [profileId]
      );

      if (!currentProfile[0]?.profile_picture_url) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'لا توجد صورة شخصية لحذفها' : 'No profile picture to delete'
        });
      }

      await ProfileService.deleteProfilePicture(currentProfile[0].profile_picture_url);

      await connection.execute(
        'UPDATE assistant_profiles SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [profileId]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم حذف الصورة الشخصية بنجاح' : 'Profile picture deleted successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteProfilePicture:', error);
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في حذف الصورة الشخصية' : 'Error deleting profile picture',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Deactivate assistant account
   */
  static async deleteProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      await connection.execute(
        'UPDATE assistants SET is_active = 0, status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [assistantId]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم تعطيل الحساب بنجاح' : 'Account deactivated successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteProfile:', error);
      const language = ProfileAssistantController.normalizeLanguage(
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
   * Reactivate assistant account
   */
  static async reactivateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const assistantId = req.user.id;
      const language = ProfileAssistantController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      await connection.execute(
        'UPDATE assistants SET is_active = 1, status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [assistantId]
      );

      await connection.commit();

      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم إعادة تفعيل الحساب بنجاح' : 'Account reactivated successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in reactivateProfile:', error);
      const language = ProfileAssistantController.normalizeLanguage(
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

module.exports = ProfileAssistantController;

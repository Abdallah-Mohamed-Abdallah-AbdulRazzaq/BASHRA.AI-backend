const db = require('../config/db');
const ProfileService = require('../services/profileService');
const { filterByLanguage } = require('../utils/langHelper');

/**
 * Profile User Controller
 * معالج الملفات الشخصية للمستخدمين
 */
class ProfileUserController {

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
   * Get user profile
   * جلب الملف الشخصي للمستخدم
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get profile with translation
      const profile = await ProfileService.getProfileByUserId(
        userId,
        'user_profiles',
        'user_profile_translations',
        language
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Filter by language to remove _ar and _en suffixes
      const filteredProfile = filterByLanguage(profile, language);

      return res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم جلب الملف الشخصي بنجاح' : 'Profile retrieved successfully',
        data: filteredProfile
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب الملف الشخصي' : 'Error retrieving profile',
        error: error.message
      });
    }
  }

  /**
   * Update user profile
   * تحديث الملف الشخصي للمستخدم
   */
  static async updateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      
      const {
        // Basic profile fields (from user_profiles table)
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        
        // Translation fields (from user_profile_translations table)
        // These will be updated for the current language only
        full_name,
        emergency_contact_name,
        emergency_contact_relationship
      } = req.body;

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM user_profiles WHERE user_id = ?',
        [userId]
      );
      
      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profileId = profileRows[0].id;

      // Validate data
      if (date_of_birth && !ProfileService.validateDateFormat(date_of_birth)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'صيغة تاريخ الميلاد غير صحيحة. استخدم YYYY-MM-DD' 
            : 'Invalid date of birth format. Use YYYY-MM-DD'
        });
      }

      if (gender && !ProfileService.validateGender(gender)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'قيمة الجنس غير صحيحة' 
            : 'Invalid gender value'
        });
      }

      if (emergency_contact_phone && !ProfileService.validatePhoneNumber(emergency_contact_phone)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'رقم هاتف جهة الاتصال غير صحيح' 
            : 'Invalid emergency contact phone number'
        });
      }

      // Update user_profiles table
      const profileUpdateFields = [];
      const profileUpdateValues = [];

      if (date_of_birth !== undefined) {
        profileUpdateFields.push('date_of_birth = ?');
        profileUpdateValues.push(date_of_birth);
      }
      if (gender !== undefined) {
        profileUpdateFields.push('gender = ?');
        profileUpdateValues.push(gender);
      }
      if (nationality !== undefined) {
        profileUpdateFields.push('nationality = ?');
        profileUpdateValues.push(nationality);
      }
      if (emergency_contact_phone !== undefined) {
        profileUpdateFields.push('emergency_contact_phone = ?');
        profileUpdateValues.push(emergency_contact_phone);
      }
      if (timezone !== undefined) {
        profileUpdateFields.push('timezone = ?');
        profileUpdateValues.push(timezone);
      }
      if (language_preference !== undefined) {
        profileUpdateFields.push('language_preference = ?');
        profileUpdateValues.push(language_preference);
      }

      // Update user_profiles if there are fields to update
      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE user_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Update translation fields for current language
      if (full_name !== undefined || emergency_contact_name !== undefined || emergency_contact_relationship !== undefined) {
        // Check if translation exists for current language
        const [translationRows] = await connection.execute(
          'SELECT id FROM user_profile_translations WHERE profile_id = ? AND language_code = ?',
          [profileId, language]
        );

        const translationUpdateFields = [];
        const translationUpdateValues = [];

        if (full_name !== undefined) {
          translationUpdateFields.push('full_name = ?');
          translationUpdateValues.push(full_name);
        }
        if (emergency_contact_name !== undefined) {
          translationUpdateFields.push('emergency_contact_name = ?');
          translationUpdateValues.push(emergency_contact_name);
        }
        if (emergency_contact_relationship !== undefined) {
          translationUpdateFields.push('emergency_contact_relationship = ?');
          translationUpdateValues.push(emergency_contact_relationship);
        }

        if (translationRows.length > 0) {
          // Update existing translation
          if (translationUpdateFields.length > 0) {
            translationUpdateValues.push(profileId, language);
            await connection.execute(
              `UPDATE user_profile_translations SET ${translationUpdateFields.join(', ')} 
               WHERE profile_id = ? AND language_code = ?`,
              translationUpdateValues
            );
          }
        } else {
          // Insert new translation
          const insertFields = ['profile_id', 'language_code'];
          const insertValues = [profileId, language];
          const placeholders = ['?', '?'];

          if (full_name !== undefined) {
            insertFields.push('full_name');
            insertValues.push(full_name);
            placeholders.push('?');
          }
          if (emergency_contact_name !== undefined) {
            insertFields.push('emergency_contact_name');
            insertValues.push(emergency_contact_name);
            placeholders.push('?');
          }
          if (emergency_contact_relationship !== undefined) {
            insertFields.push('emergency_contact_relationship');
            insertValues.push(emergency_contact_relationship);
            placeholders.push('?');
          }

          await connection.execute(
            `INSERT INTO user_profile_translations (${insertFields.join(', ')}) 
             VALUES (${placeholders.join(', ')})`,
            insertValues
          );
        }
      }

      await connection.commit();

      // Get updated profile
      const updatedProfile = await ProfileService.getProfileByUserId(
        userId,
        'user_profiles',
        'user_profile_translations',
        language
      );

      // Filter by language
      const filteredProfile = filterByLanguage(updatedProfile, language);

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث الملف الشخصي بنجاح' 
          : 'Profile updated successfully',
        data: filteredProfile
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProfile:', error);
      return res.status(500).json({
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

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if file was uploaded
      if (!req.file) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'الرجاء رفع ملف الصورة' 
            : 'Please upload an image file'
        });
      }

      // Check if profile exists
      const profileId = await ProfileService.profileExists(userId, 'user_profiles');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile to delete old picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM user_profiles WHERE id = ?',
        [profileId]
      );

      // Upload new picture using FileService (registers in files table)
      const fileRecord = await ProfileService.uploadProfilePicture(
        req.file, 
        userId, 
        'user',
        profileId // Pass profileId for linking
      );

      // Update profile with new picture URL
      await connection.execute(
        'UPDATE user_profiles SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
      return res.status(500).json({
        success: false,
        message: 'خطأ في رفع الصورة الشخصية',
        message_en: 'Error uploading profile picture',
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

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(userId, 'user_profiles');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM user_profiles WHERE id = ?',
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
        'UPDATE user_profiles SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
      return res.status(500).json({
        success: false,
        message: 'خطأ في حذف الصورة الشخصية',
        message_en: 'Error deleting profile picture',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete user profile (soft delete by deactivating user)
   * حذف الملف الشخصي للمستخدم
   * Note: We don't actually delete the profile, we deactivate the user account
   */
  static async deleteProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(userId, 'user_profiles');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Deactivate user account instead of deleting (set is_active = 0)
      await connection.execute(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم إلغاء تفعيل الحساب بنجاح. يمكنك إعادة تفعيله في أي وقت' 
          : 'Account deactivated successfully. You can reactivate it anytime'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteProfile:', error);
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في إلغاء تفعيل الحساب' : 'Error deactivating account',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Reactivate user account
   * إعادة تفعيل حساب المستخدم
   */
  static async reactivateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check current account active status
      const [userRows] = await connection.execute(
        'SELECT is_active FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستخدم غير موجود' : 'User not found'
        });
      }

      const isActive = userRows[0].is_active;

      // Only reactivate if account is deactivated (is_active = 0)
      if (isActive === 1 || isActive === true) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'الحساب مفعّل بالفعل' 
            : 'Account is already active'
        });
      }

      // Reactivate user account (set is_active = 1)
      await connection.execute(
        'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [userId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم إعادة تفعيل الحساب بنجاح' 
          : 'Account reactivated successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error in reactivateProfile:', error);
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في إعادة تفعيل الحساب' : 'Error reactivating account',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get basic user data (selected fields only)
   * جلب البيانات الأساسية للمستخدم (حقول محددة فقط)
   */
  static async getBasicUserData(req, res) {
    try {
      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get basic user account data
      const [userRows] = await db.execute(
        `SELECT id, uuid, email, phone, status, is_active FROM users WHERE id = ?`,
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستخدم غير موجود' : 'User not found'
        });
      }

      const userData = userRows[0];

      // Get user profile
      const [profileRows] = await db.execute(
        `SELECT 
          date_of_birth, gender, nationality, profile_picture_url,
          emergency_contact_phone, timezone, language_preference
        FROM user_profiles 
        WHERE user_id = ?`,
        [userId]
      );

      const profileData = profileRows[0] || null;

      // Get profile ID for translations query
      let translationData = {
        full_name: null,
        emergency_contact_name: null,
        emergency_contact_relationship: null
      };

      if (profileData) {
        const [profileIdRows] = await db.execute(
          'SELECT id FROM user_profiles WHERE user_id = ?',
          [userId]
        );
        
        if (profileIdRows.length > 0) {
          const profileId = profileIdRows[0].id;
          
          // Try to get translation for current language
          const [translationRows] = await db.execute(
            `SELECT full_name, emergency_contact_name, emergency_contact_relationship
            FROM user_profile_translations 
            WHERE profile_id = ? AND language_code = ?`,
            [profileId, language]
          );
          
          if (translationRows.length > 0) {
            translationData = translationRows[0];
          } else {
            // If no translation for current language, try to get any translation as fallback
            const [fallbackRows] = await db.execute(
              `SELECT full_name, emergency_contact_name, emergency_contact_relationship
              FROM user_profile_translations 
              WHERE profile_id = ? 
              LIMIT 1`,
              [profileId]
            );
            
            if (fallbackRows.length > 0) {
              translationData = fallbackRows[0];
            }
          }
        }
      }

      // Merge data (always include translation fields even if null)
      const basicData = {
        ...userData,
        ...profileData,
        full_name: translationData?.full_name || null,
        emergency_contact_name: translationData?.emergency_contact_name || null,
        emergency_contact_relationship: translationData?.emergency_contact_relationship || null
      };

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم جلب البيانات الأساسية بنجاح' 
          : 'Basic data retrieved successfully',
        data: basicData
      });

    } catch (error) {
      console.error('Error in getBasicUserData:', error);
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات الأساسية' 
          : 'Error retrieving basic data',
        error: error.message
      });
    }
  }

  /**
   * Get complete user data (account + profile + translations)
   * جلب البيانات الكاملة للمستخدم (الحساب + الملف الشخصي + الترجمات)
   */
  static async getCompleteUserData(req, res) {
    try {
      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get user account data (exclude sensitive fields)
      const [userRows] = await db.execute(
        `SELECT 
          id, uuid, email, phone, 
          email_verified_at, phone_verified_at, 
          status, is_active, last_login_at, last_activity_at,
          is_email_otp, is_phone_otp, is_id_verified,
          created_at, updated_at
        FROM users 
        WHERE id = ?`,
        [userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستخدم غير موجود' : 'User not found'
        });
      }

      const userData = userRows[0];

      // Get user profile
      const [profileRows] = await db.execute(
        `SELECT 
          id, user_id, date_of_birth, gender, nationality,
          profile_picture_url, emergency_contact_phone,
          timezone, language_preference, created_at, updated_at
        FROM user_profiles 
        WHERE user_id = ?`,
        [userId]
      );

      const profileData = profileRows[0] || null;

      // Get all profile translations
      let translationsData = [];
      if (profileData) {
        const [translationRows] = await db.execute(
          `SELECT 
            id, profile_id, language_code, full_name,
            emergency_contact_name, emergency_contact_relationship
          FROM user_profile_translations 
          WHERE profile_id = ?`,
          [profileData.id]
        );
        translationsData = translationRows;
      }

      // Format response
      const completeData = {
        account: userData,
        profile: profileData,
        translations: translationsData.reduce((acc, trans) => {
          acc[trans.language_code] = {
            full_name: trans.full_name,
            emergency_contact_name: trans.emergency_contact_name,
            emergency_contact_relationship: trans.emergency_contact_relationship
          };
          return acc;
        }, {})
      };

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم جلب البيانات الكاملة بنجاح' 
          : 'Complete data retrieved successfully',
        data: completeData
      });

    } catch (error) {
      console.error('Error in getCompleteUserData:', error);
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات الكاملة' 
          : 'Error retrieving complete data',
        error: error.message
      });
    }
  }

  /**
   * Update basic user data (users + profile + translations)
   * تحديث البيانات الأساسية للمستخدم
   */
  static async updateBasicUserData(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const {
        // From users table
        email,
        phone,
        
        // From user_profiles table
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        
        // From user_profile_translations table
        full_name,
        emergency_contact_name,
        emergency_contact_relationship
      } = req.body;

      // Debug logging
      console.log('=== Update Basic User Data ===');
      console.log('User ID:', userId);
      console.log('Language:', language);
      console.log('Request Body:', req.body);
      console.log('=============================');

      // Update users table (email and phone only)
      const userUpdateFields = [];
      const userUpdateValues = [];

      if (email !== undefined) {
        // Check if email already exists for another user
        const [existingEmail] = await connection.execute(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, userId]
        );
        if (existingEmail.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'البريد الإلكتروني مستخدم بالفعل' 
              : 'Email already in use'
          });
        }
        userUpdateFields.push('email = ?');
        userUpdateValues.push(email);
      }

      if (phone !== undefined) {
        // Check if phone already exists for another user
        const [existingPhone] = await connection.execute(
          'SELECT id FROM users WHERE phone = ? AND id != ?',
          [phone, userId]
        );
        if (existingPhone.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'رقم الهاتف مستخدم بالفعل' 
              : 'Phone number already in use'
          });
        }
        userUpdateFields.push('phone = ?');
        userUpdateValues.push(phone);
      }

      // Update users table if there are fields to update
      if (userUpdateFields.length > 0) {
        userUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        userUpdateValues.push(userId);
        await connection.execute(
          `UPDATE users SET ${userUpdateFields.join(', ')} WHERE id = ?`,
          userUpdateValues
        );
      }

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM user_profiles WHERE user_id = ?',
        [userId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profileId = profileRows[0].id;

      // Validate data
      if (date_of_birth && !ProfileService.validateDateFormat(date_of_birth)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'صيغة تاريخ الميلاد غير صحيحة. استخدم YYYY-MM-DD' 
            : 'Invalid date of birth format. Use YYYY-MM-DD'
        });
      }

      if (gender && !ProfileService.validateGender(gender)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'قيمة الجنس غير صحيحة' 
            : 'Invalid gender value'
        });
      }

      if (emergency_contact_phone && !ProfileService.validatePhoneNumber(emergency_contact_phone)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'رقم هاتف جهة الاتصال غير صحيح' 
            : 'Invalid emergency contact phone number'
        });
      }

      // Update user_profiles table
      const profileUpdateFields = [];
      const profileUpdateValues = [];

      if (date_of_birth !== undefined) {
        profileUpdateFields.push('date_of_birth = ?');
        profileUpdateValues.push(date_of_birth);
      }
      if (gender !== undefined) {
        profileUpdateFields.push('gender = ?');
        profileUpdateValues.push(gender);
      }
      if (nationality !== undefined) {
        profileUpdateFields.push('nationality = ?');
        profileUpdateValues.push(nationality);
      }
      if (emergency_contact_phone !== undefined) {
        profileUpdateFields.push('emergency_contact_phone = ?');
        profileUpdateValues.push(emergency_contact_phone);
      }
      if (timezone !== undefined) {
        profileUpdateFields.push('timezone = ?');
        profileUpdateValues.push(timezone);
      }
      if (language_preference !== undefined) {
        profileUpdateFields.push('language_preference = ?');
        profileUpdateValues.push(language_preference);
      }

      // Update user_profiles if there are fields to update
      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE user_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Update translation fields for current language
      if (full_name !== undefined || emergency_contact_name !== undefined || emergency_contact_relationship !== undefined) {
        // Check if translation exists for current language
        const [translationRows] = await connection.execute(
          'SELECT id FROM user_profile_translations WHERE profile_id = ? AND language_code = ?',
          [profileId, language]
        );

        const translationUpdateFields = [];
        const translationUpdateValues = [];

        if (full_name !== undefined) {
          translationUpdateFields.push('full_name = ?');
          translationUpdateValues.push(full_name);
        }
        if (emergency_contact_name !== undefined) {
          translationUpdateFields.push('emergency_contact_name = ?');
          translationUpdateValues.push(emergency_contact_name);
        }
        if (emergency_contact_relationship !== undefined) {
          translationUpdateFields.push('emergency_contact_relationship = ?');
          translationUpdateValues.push(emergency_contact_relationship);
        }

        if (translationRows.length > 0) {
          // Update existing translation
          if (translationUpdateFields.length > 0) {
            translationUpdateValues.push(profileId, language);
            await connection.execute(
              `UPDATE user_profile_translations SET ${translationUpdateFields.join(', ')} 
               WHERE profile_id = ? AND language_code = ?`,
              translationUpdateValues
            );
          }
        } else {
          // Insert new translation
          const insertFields = ['profile_id', 'language_code'];
          const insertValues = [profileId, language];
          const placeholders = ['?', '?'];

          if (full_name !== undefined) {
            insertFields.push('full_name');
            insertValues.push(full_name);
            placeholders.push('?');
          }
          if (emergency_contact_name !== undefined) {
            insertFields.push('emergency_contact_name');
            insertValues.push(emergency_contact_name);
            placeholders.push('?');
          }
          if (emergency_contact_relationship !== undefined) {
            insertFields.push('emergency_contact_relationship');
            insertValues.push(emergency_contact_relationship);
            placeholders.push('?');
          }

          await connection.execute(
            `INSERT INTO user_profile_translations (${insertFields.join(', ')}) 
             VALUES (${placeholders.join(', ')})`,
            insertValues
          );
        }
      }

      await connection.commit();

      // Get updated data
      const [updatedUserRows] = await connection.execute(
        'SELECT id, uuid, email, phone FROM users WHERE id = ?',
        [userId]
      );

      const [updatedProfileRows] = await connection.execute(
        `SELECT 
          date_of_birth, gender, nationality, profile_picture_url,
          emergency_contact_phone, timezone, language_preference
        FROM user_profiles WHERE user_id = ?`,
        [userId]
      );

      const [updatedTranslationRows] = await connection.execute(
        `SELECT full_name, emergency_contact_name, emergency_contact_relationship
         FROM user_profile_translations 
         WHERE profile_id = ? AND language_code = ?`,
        [profileId, language]
      );

      // Ensure translation fields are always included (even if null)
      const translationFields = updatedTranslationRows[0] || {
        full_name: null,
        emergency_contact_name: null,
        emergency_contact_relationship: null
      };

      const updatedData = {
        ...updatedUserRows[0],
        ...updatedProfileRows[0],
        full_name: translationFields.full_name,
        emergency_contact_name: translationFields.emergency_contact_name,
        emergency_contact_relationship: translationFields.emergency_contact_relationship
      };

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث البيانات الأساسية بنجاح' 
          : 'Basic data updated successfully',
        data: updatedData
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateBasicUserData:', error);
      const language = ProfileUserController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث البيانات الأساسية' 
          : 'Error updating basic data',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = ProfileUserController;

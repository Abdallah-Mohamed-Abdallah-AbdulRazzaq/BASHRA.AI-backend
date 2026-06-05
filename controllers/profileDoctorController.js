const db = require('../config/db');
const ProfileService = require('../services/profileService');
const { filterByLanguage } = require('../utils/langHelper');

/**
 * Profile Doctor Controller
 * معالج الملفات الشخصية للأطباء
 */
class ProfileDoctorController {

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
   * Get doctor profile
   * جلب الملف الشخصي للطبيب
   */
  static async getProfile(req, res) {
    try {
      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get profile with translation
      const profile = await ProfileService.getProfileByUserId(
        doctorId,
        'doctor_profiles',
        'doctor_profile_translations',
        language,
        'doctor_id', // Foreign key column name for doctor_profiles
        'doctor_profile_id' // Foreign key column name in translation table
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: profile
      });

    } catch (error) {
      console.error('Error in getProfile:', error);
      const language = ProfileDoctorController.normalizeLanguage(
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
   * Update doctor profile (supports multi-language translations)
   * تحديث الملف الشخصي للطبيب (يدعم الترجمات متعددة اللغات)
   */
  static async updateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Extract profile fields and translation fields
      const {
        years_of_experience,
        medical_school,
        graduation_year,
        board_certifications,
        languages_spoken,
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        translations // { ar: { full_name, specialty, ... }, en: { ... } }
      } = req.body;

      // Update doctor_profiles table
      const profileFields = {};
      if (years_of_experience !== undefined) profileFields.years_of_experience = years_of_experience;
      if (medical_school !== undefined) profileFields.medical_school = medical_school;
      if (graduation_year !== undefined) profileFields.graduation_year = graduation_year;
      if (board_certifications !== undefined) profileFields.board_certifications = JSON.stringify(board_certifications);
      if (languages_spoken !== undefined) profileFields.languages_spoken = JSON.stringify(languages_spoken);
      if (date_of_birth !== undefined) profileFields.date_of_birth = date_of_birth;
      if (gender !== undefined) profileFields.gender = gender;
      if (nationality !== undefined) profileFields.nationality = nationality;
      if (emergency_contact_phone !== undefined) profileFields.emergency_contact_phone = emergency_contact_phone;
      if (timezone !== undefined) profileFields.timezone = timezone;
      if (language_preference !== undefined) profileFields.language_preference = language_preference;

      if (Object.keys(profileFields).length > 0) {
        // Build dynamic UPDATE query
        const updateFields = Object.keys(profileFields).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(profileFields);
        updateValues.push(profileId);
        
        await connection.execute(
          `UPDATE doctor_profiles SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          updateValues
        );
      }

      // Handle translations
      if (translations && typeof translations === 'object') {
        // Update multiple languages
        for (const [langCode, fields] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            // Check if translation exists
            const [existingTranslation] = await connection.execute(
              'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
              [profileId, langCode]
            );

            const translationFields = {};
            if (fields.full_name !== undefined) translationFields.full_name = fields.full_name;
            if (fields.specialty !== undefined) translationFields.specialty = fields.specialty;
            if (fields.sub_specialty !== undefined) translationFields.sub_specialty = fields.sub_specialty;
            if (fields.biography !== undefined) translationFields.biography = fields.biography;
            if (fields.emergency_contact_name !== undefined) translationFields.emergency_contact_name = fields.emergency_contact_name;
            if (fields.emergency_contact_relationship !== undefined) translationFields.emergency_contact_relationship = fields.emergency_contact_relationship;

            if (Object.keys(translationFields).length > 0) {
              if (existingTranslation.length > 0) {
                // Update existing translation
                const updateFields = Object.keys(translationFields).map(key => `${key} = ?`).join(', ');
                const updateValues = Object.values(translationFields);
                updateValues.push(existingTranslation[0].id);
                
                await connection.execute(
                  `UPDATE doctor_profile_translations SET ${updateFields} WHERE id = ?`,
                  updateValues
                );
              } else {
                // Insert new translation
                const insertFields = ['doctor_profile_id', 'language_code', ...Object.keys(translationFields)];
                const insertValues = [profileId, langCode, ...Object.values(translationFields)];
                const placeholders = insertFields.map(() => '?').join(', ');
                
                await connection.execute(
                  `INSERT INTO doctor_profile_translations (${insertFields.join(', ')}) VALUES (${placeholders})`,
                  insertValues
                );
              }
            }
          }
        }
      } else {
        // Update current language only
        const translationFields = {};
        const { full_name, specialty, sub_specialty, biography, emergency_contact_name, emergency_contact_relationship } = req.body;
        
        if (full_name !== undefined) translationFields.full_name = full_name;
        if (specialty !== undefined) translationFields.specialty = specialty;
        if (sub_specialty !== undefined) translationFields.sub_specialty = sub_specialty;
        if (biography !== undefined) translationFields.biography = biography;
        if (emergency_contact_name !== undefined) translationFields.emergency_contact_name = emergency_contact_name;
        if (emergency_contact_relationship !== undefined) translationFields.emergency_contact_relationship = emergency_contact_relationship;

        if (Object.keys(translationFields).length > 0) {
          // Check if translation exists
          const [existingTranslation] = await connection.execute(
            'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
            [profileId, language]
          );

          if (existingTranslation.length > 0) {
            // Update existing translation
            const updateFields = Object.keys(translationFields).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(translationFields);
            updateValues.push(existingTranslation[0].id);
            
            await connection.execute(
              `UPDATE doctor_profile_translations SET ${updateFields} WHERE id = ?`,
              updateValues
            );
          } else {
            // Insert new translation
            const insertFields = ['doctor_profile_id', 'language_code', ...Object.keys(translationFields)];
            const insertValues = [profileId, language, ...Object.values(translationFields)];
            const placeholders = insertFields.map(() => '?').join(', ');
            
            await connection.execute(
              `INSERT INTO doctor_profile_translations (${insertFields.join(', ')}) VALUES (${placeholders})`,
              insertValues
            );
          }
        }
      }

      await connection.commit();

      // Get updated profile
      const updatedProfile = await ProfileService.getProfileByUserId(
        doctorId,
        'doctor_profiles',
        'doctor_profile_translations',
        language,
        'doctor_id', // Foreign key column name for doctor_profiles
        'doctor_profile_id' // Foreign key column name in translation table
      );

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث الملف الشخصي بنجاح' 
          : 'Profile updated successfully',
        data: updatedProfile
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProfile:', error);
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث الملف الشخصي' 
          : 'Error updating profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete doctor profile (soft delete by deactivating doctor account)
   * حذف الملف الشخصي للطبيب (إلغاء تفعيل الحساب)
   */
  static async deleteProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Deactivate doctor account instead of deleting (set is_active = 0)
      await connection.execute(
        'UPDATE doctors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [doctorId]
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
   * Reactivate doctor account
   * إعادة تفعيل حساب الطبيب
   */
  static async reactivateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check current account active status
      const [doctorRows] = await connection.execute(
        'SELECT is_active FROM doctors WHERE id = ?',
        [doctorId]
      );

      if (doctorRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const isActive = doctorRows[0].is_active;

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

      // Reactivate doctor account (set is_active = 1)
      await connection.execute(
        'UPDATE doctors SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [doctorId]
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
      const language = ProfileDoctorController.normalizeLanguage(
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
   * Update basic doctor data (doctors + profile + translations for current language)
   * تحديث البيانات الأساسية للطبيب
   */
  static async updateBasicDoctorData(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const {
        // From doctors table
        email,
        phone,
        
        // From doctor_profiles table
        years_of_experience,
        medical_school,
        graduation_year,
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        
        // From doctor_profile_translations table
        full_name,
        specialty,
        sub_specialty,
        biography,
        emergency_contact_name,
        emergency_contact_relationship
      } = req.body;

      // Update doctors table (email and phone only)
      const doctorUpdateFields = [];
      const doctorUpdateValues = [];

      if (email !== undefined) {
        // Check if email already exists for another doctor
        const [existingEmail] = await connection.execute(
          'SELECT id FROM doctors WHERE email = ? AND id != ?',
          [email, doctorId]
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
        doctorUpdateFields.push('email = ?');
        doctorUpdateValues.push(email);
      }

      if (phone !== undefined) {
        // Check if phone already exists for another doctor
        const [existingPhone] = await connection.execute(
          'SELECT id FROM doctors WHERE phone = ? AND id != ?',
          [phone, doctorId]
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
        doctorUpdateFields.push('phone = ?');
        doctorUpdateValues.push(phone);
      }

      // Update doctors table if there are fields to update
      if (doctorUpdateFields.length > 0) {
        doctorUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        doctorUpdateValues.push(doctorId);
        await connection.execute(
          `UPDATE doctors SET ${doctorUpdateFields.join(', ')} WHERE id = ?`,
          doctorUpdateValues
        );
      }

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM doctor_profiles WHERE doctor_id = ?',
        [doctorId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profileId = profileRows[0].id;

      // Update doctor_profiles table
      const profileUpdateFields = [];
      const profileUpdateValues = [];

      if (years_of_experience !== undefined) {
        profileUpdateFields.push('years_of_experience = ?');
        profileUpdateValues.push(years_of_experience);
      }
      if (medical_school !== undefined) {
        profileUpdateFields.push('medical_school = ?');
        profileUpdateValues.push(medical_school);
      }
      if (graduation_year !== undefined) {
        profileUpdateFields.push('graduation_year = ?');
        profileUpdateValues.push(graduation_year);
      }
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

      // Update doctor_profiles if there are fields to update
      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE doctor_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Update translation fields for current language
      if (full_name !== undefined || specialty !== undefined || sub_specialty !== undefined || 
          biography !== undefined || emergency_contact_name !== undefined || 
          emergency_contact_relationship !== undefined) {
        
        // Check if translation exists for current language
        const [translationRows] = await connection.execute(
          'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
          [profileId, language]
        );

        const translationUpdateFields = [];
        const translationUpdateValues = [];

        if (full_name !== undefined) {
          translationUpdateFields.push('full_name = ?');
          translationUpdateValues.push(full_name);
        }
        if (specialty !== undefined) {
          translationUpdateFields.push('specialty = ?');
          translationUpdateValues.push(specialty);
        }
        if (sub_specialty !== undefined) {
          translationUpdateFields.push('sub_specialty = ?');
          translationUpdateValues.push(sub_specialty);
        }
        if (biography !== undefined) {
          translationUpdateFields.push('biography = ?');
          translationUpdateValues.push(biography);
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
            translationUpdateValues.push(translationRows[0].id);
            await connection.execute(
              `UPDATE doctor_profile_translations SET ${translationUpdateFields.join(', ')} WHERE id = ?`,
              translationUpdateValues
            );
          }
        } else {
          // Insert new translation
          const translationData = {
            full_name: full_name || null,
            specialty: specialty || null,
            sub_specialty: sub_specialty || null,
            biography: biography || null,
            emergency_contact_name: emergency_contact_name || null,
            emergency_contact_relationship: emergency_contact_relationship || null
          };
          
          await connection.execute(
            `INSERT INTO doctor_profile_translations 
            (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography, 
             emergency_contact_name, emergency_contact_relationship)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [profileId, language, translationData.full_name, translationData.specialty, 
             translationData.sub_specialty, translationData.biography,
             translationData.emergency_contact_name, translationData.emergency_contact_relationship]
          );
        }
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث البيانات الأساسية بنجاح' 
          : 'Basic data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateBasicDoctorData:', error);
      const language = ProfileDoctorController.normalizeLanguage(
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

  /**
   * Get basic doctor data (selected fields only)
   * جلب البيانات الأساسية للطبيب
   */
  static async getBasicDoctorData(req, res) {
    try {
      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get basic doctor account data
      const [doctorRows] = await db.execute(
        `SELECT id, uuid, email, phone, status, is_active FROM doctors WHERE id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];

      // Get profile data
      const [profileRows] = await db.execute(
        `SELECT 
          license_number, years_of_experience, medical_school, graduation_year,
          is_verified, approval_status,
          rating_average, rating_count, total_consultations, is_available,
          date_of_birth, gender, nationality, emergency_contact_phone,
          timezone, language_preference
        FROM doctor_profiles 
        WHERE doctor_id = ?`,
        [doctorId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profile = profileRows[0];

      // Get translation for current language
      const [translationRows] = await db.execute(
        `SELECT full_name, specialty, sub_specialty, biography, 
          emergency_contact_name, emergency_contact_relationship
        FROM doctor_profile_translations 
        WHERE doctor_profile_id = (SELECT id FROM doctor_profiles WHERE doctor_id = ?) 
        AND language_code = ?`,
        [doctorId, language]
      );

      const translation = translationRows[0] || {};

      // Combine all data
      const basicData = {
        ...doctor,
        ...profile,
        ...translation
      };

      res.status(200).json({
        success: true,
        data: basicData
      });

    } catch (error) {
      console.error('Error in getBasicDoctorData:', error);
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات الأساسية' 
          : 'Error fetching basic data',
        error: error.message
      });
    }
  }

  /**
   * Get complete doctor data (account + profile + all translations)
   * جلب البيانات الكاملة للطبيب (الحساب + الملف الشخصي + جميع الترجمات)
   */
  static async getCompleteDoctorData(req, res) {
    try {
      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get all doctor account data
      const [doctorRows] = await db.execute(
        `SELECT 
          id, uuid, email, phone, 
          email_verified_at, phone_verified_at, 
          status, is_active, last_login_at, last_activity_at,
          is_email_otp, is_phone_otp, is_id_verified,
          created_at, updated_at
        FROM doctors 
        WHERE id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];

      // Get complete profile data
      const [profileRows] = await db.execute(
        `SELECT * FROM doctor_profiles WHERE doctor_id = ?`,
        [doctorId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profile = profileRows[0];

      // Get all translations
      const [translationsRows] = await db.execute(
        `SELECT * FROM doctor_profile_translations WHERE doctor_profile_id = ?`,
        [profile.id]
      );

      // Format translations as object { ar: {...}, en: {...} }
      const translations = {};
      translationsRows.forEach(row => {
        translations[row.language_code] = {
          full_name: row.full_name,
          specialty: row.specialty,
          sub_specialty: row.sub_specialty,
          biography: row.biography,
          emergency_contact_name: row.emergency_contact_name,
          emergency_contact_relationship: row.emergency_contact_relationship
        };
      });

      res.status(200).json({
        success: true,
        data: {
          account: doctor,
          profile: profile,
          translations: translations
        }
      });

    } catch (error) {
      console.error('Error in getCompleteDoctorData:', error);
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات الكاملة' 
          : 'Error fetching complete data',
        error: error.message
      });
    }
  }

  /**
   * Upload profile picture
   * رفع الصورة الشخصية
   */
  static async uploadProfilePicture(req, res) {
    const connection = await db.getConnection();
    const ProfileService = require('../services/profileService');
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
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
      const profileId = await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile to delete old picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM doctor_profiles WHERE id = ?',
        [profileId]
      );

      // Upload new picture using FileService (registers in files table)
      const fileRecord = await ProfileService.uploadProfilePicture(
        req.file, 
        doctorId, 
        'doctor',
        profileId // Pass profileId for linking
      );

      // Update profile with new picture URL
      await connection.execute(
        'UPDATE doctor_profiles SET profile_picture_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
    const ProfileService = require('../services/profileService');
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = ProfileDoctorController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const profileId = await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      // Get current profile picture
      const [currentProfile] = await connection.execute(
        'SELECT profile_picture_url FROM doctor_profiles WHERE id = ?',
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
        'UPDATE doctor_profiles SET profile_picture_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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
}

module.exports = ProfileDoctorController;

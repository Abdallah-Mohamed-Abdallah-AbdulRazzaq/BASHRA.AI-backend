const db = require('../config/db');
const { validationResult } = require('express-validator');

/**
 * Patient Profile Controller
 * معالج ملفات المرضى
 */
class PatientProfileController {

  /**
   * Helper function to normalize language code
   * دالة مساعدة لتنظيف كود اللغة
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
   * Create patient profile
   * إنشاء ملف مريض جديد
   * @route POST /api/patient-profiles
   */
  static async createPatientProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'خطأ في البيانات المدخلة',
          message_en: 'Validation error',
          errors: errors.array()
        });
      }

      await connection.beginTransaction();

      const userId = req.user.id;
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const {
        blood_type,
        height,
        weight,
        smoking_status,
        alcohol_consumption,
        exercise_frequency,
        insurance_provider,
        insurance_policy_number,
        preferred_doctor_id,
        // Translation fields
        medical_history_ar,
        current_medications_ar,
        allergies_ar,
        chronic_conditions_ar,
        family_medical_history_ar,
        medical_history_en,
        current_medications_en,
        allergies_en,
        chronic_conditions_en,
        family_medical_history_en
      } = req.body;

      // Check if patient profile already exists
      const [existingProfile] = await connection.execute(
        'SELECT id FROM patient_profiles WHERE user_id = ?',
        [userId]
      );

      if (existingProfile.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'ملف المريض موجود بالفعل. استخدم التحديث بدلاً من الإنشاء' 
            : 'Patient profile already exists. Use update instead'
        });
      }

      // Verify preferred doctor exists if provided
      if (preferred_doctor_id) {
        const [doctorCheck] = await connection.execute(
          'SELECT id FROM doctors WHERE id = ?',
          [preferred_doctor_id]
        );
        if (doctorCheck.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'الطبيب المفضل غير موجود' 
              : 'Preferred doctor not found'
          });
        }
      }

      // Insert into patient_profiles table
      const [profileResult] = await connection.execute(
        `INSERT INTO patient_profiles 
        (user_id, blood_type, height, weight, smoking_status, alcohol_consumption, 
         exercise_frequency, insurance_provider, insurance_policy_number, preferred_doctor_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          blood_type || 'unknown',
          height || null,
          weight || null,
          smoking_status || 'unknown',
          alcohol_consumption || 'unknown',
          exercise_frequency || 'unknown',
          insurance_provider || null,
          insurance_policy_number || null,
          preferred_doctor_id || null
        ]
      );

      const patientProfileId = profileResult.insertId;

      // Insert Arabic translation if provided
      if (medical_history_ar || current_medications_ar || allergies_ar || 
          chronic_conditions_ar || family_medical_history_ar) {
        await connection.execute(
          `INSERT INTO patient_profile_translations 
          (patient_profile_id, language_code, medical_history, current_medications, 
           allergies, chronic_conditions, family_medical_history) 
          VALUES (?, 'ar', ?, ?, ?, ?, ?)`,
          [
            patientProfileId,
            medical_history_ar || null,
            current_medications_ar || null,
            allergies_ar || null,
            chronic_conditions_ar || null,
            family_medical_history_ar || null
          ]
        );
      }

      // Insert English translation if provided
      if (medical_history_en || current_medications_en || allergies_en || 
          chronic_conditions_en || family_medical_history_en) {
        await connection.execute(
          `INSERT INTO patient_profile_translations 
          (patient_profile_id, language_code, medical_history, current_medications, 
           allergies, chronic_conditions, family_medical_history) 
          VALUES (?, 'en', ?, ?, ?, ?, ?)`,
          [
            patientProfileId,
            medical_history_en || null,
            current_medications_en || null,
            allergies_en || null,
            chronic_conditions_en || null,
            family_medical_history_en || null
          ]
        );
      }

      await connection.commit();

      // Get the created profile with translations
      const createdProfile = await PatientProfileController.getPatientProfileById(
        patientProfileId, 
        language,
        connection
      );

      return res.status(201).json({
        success: true,
        message: language === 'ar' 
          ? 'تم إنشاء ملف المريض بنجاح' 
          : 'Patient profile created successfully',
        data: createdProfile
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in createPatientProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء ملف المريض',
        message_en: 'Error creating patient profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get patient profile for current user
   * جلب ملف المريض للمستخدم الحالي
   * @route GET /api/patient-profiles
   */
  static async getPatientProfile(req, res) {
    try {
      const userId = req.user.id;
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get patient profile
      const [profileRows] = await db.execute(
        'SELECT id FROM patient_profiles WHERE user_id = ?',
        [userId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'ملف المريض غير موجود' 
            : 'Patient profile not found'
        });
      }

      const patientProfileId = profileRows[0].id;
      const profile = await PatientProfileController.getPatientProfileById(
        patientProfileId, 
        language
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم جلب ملف المريض بنجاح' 
          : 'Patient profile retrieved successfully',
        data: profile
      });

    } catch (error) {
      console.error('Error in getPatientProfile:', error);
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب ملف المريض' 
          : 'Error retrieving patient profile',
        error: error.message
      });
    }
  }

  /**
   * Get complete patient profile with all translations
   * جلب ملف المريض الكامل مع جميع الترجمات
   * @route GET /api/patient-profiles/complete
   */
  static async getCompletePatientProfile(req, res) {
    try {
      const userId = req.user.id;
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get patient profile
      const [profileRows] = await db.execute(
        `SELECT * FROM patient_profiles WHERE user_id = ?`,
        [userId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'ملف المريض غير موجود' 
            : 'Patient profile not found'
        });
      }

      const profile = profileRows[0];

      // Get all translations
      const [translations] = await db.execute(
        `SELECT * FROM patient_profile_translations WHERE patient_profile_id = ?`,
        [profile.id]
      );

      // Format translations
      const translationsData = {};
      translations.forEach(trans => {
        translationsData[trans.language_code] = {
          medical_history: trans.medical_history,
          current_medications: trans.current_medications,
          allergies: trans.allergies,
          chronic_conditions: trans.chronic_conditions,
          family_medical_history: trans.family_medical_history
        };
      });

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم جلب ملف المريض الكامل بنجاح' 
          : 'Complete patient profile retrieved successfully',
        data: {
          profile: profile,
          translations: translationsData
        }
      });

    } catch (error) {
      console.error('Error in getCompletePatientProfile:', error);
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب ملف المريض الكامل' 
          : 'Error retrieving complete patient profile',
        error: error.message
      });
    }
  }

  /**
   * Update patient profile
   * تحديث ملف المريض
   * @route PUT /api/patient-profiles
   */
  static async updatePatientProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'خطأ في البيانات المدخلة',
          message_en: 'Validation error',
          errors: errors.array()
        });
      }

      await connection.beginTransaction();

      const userId = req.user.id;
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const {
        blood_type,
        height,
        weight,
        smoking_status,
        alcohol_consumption,
        exercise_frequency,
        insurance_provider,
        insurance_policy_number,
        preferred_doctor_id,
        // Translation fields
        medical_history_ar,
        current_medications_ar,
        allergies_ar,
        chronic_conditions_ar,
        family_medical_history_ar,
        medical_history_en,
        current_medications_en,
        allergies_en,
        chronic_conditions_en,
        family_medical_history_en
      } = req.body;

      // Check if patient profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM patient_profiles WHERE user_id = ?',
        [userId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'ملف المريض غير موجود' 
            : 'Patient profile not found'
        });
      }

      const patientProfileId = profileRows[0].id;

      // Verify preferred doctor exists if provided
      if (preferred_doctor_id !== undefined && preferred_doctor_id !== null) {
        const [doctorCheck] = await connection.execute(
          'SELECT id FROM doctors WHERE id = ?',
          [preferred_doctor_id]
        );
        if (doctorCheck.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'الطبيب المفضل غير موجود' 
              : 'Preferred doctor not found'
          });
        }
      }

      // Update patient_profiles table
      const updateFields = [];
      const updateValues = [];

      if (blood_type !== undefined) {
        updateFields.push('blood_type = ?');
        updateValues.push(blood_type);
      }
      if (height !== undefined) {
        updateFields.push('height = ?');
        updateValues.push(height);
      }
      if (weight !== undefined) {
        updateFields.push('weight = ?');
        updateValues.push(weight);
      }
      if (smoking_status !== undefined) {
        updateFields.push('smoking_status = ?');
        updateValues.push(smoking_status);
      }
      if (alcohol_consumption !== undefined) {
        updateFields.push('alcohol_consumption = ?');
        updateValues.push(alcohol_consumption);
      }
      if (exercise_frequency !== undefined) {
        updateFields.push('exercise_frequency = ?');
        updateValues.push(exercise_frequency);
      }
      if (insurance_provider !== undefined) {
        updateFields.push('insurance_provider = ?');
        updateValues.push(insurance_provider);
      }
      if (insurance_policy_number !== undefined) {
        updateFields.push('insurance_policy_number = ?');
        updateValues.push(insurance_policy_number);
      }
      if (preferred_doctor_id !== undefined) {
        updateFields.push('preferred_doctor_id = ?');
        updateValues.push(preferred_doctor_id);
      }

      // Update patient_profiles if there are fields to update
      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(patientProfileId);
        await connection.execute(
          `UPDATE patient_profiles SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update Arabic translation
      if (medical_history_ar !== undefined || current_medications_ar !== undefined || 
          allergies_ar !== undefined || chronic_conditions_ar !== undefined || 
          family_medical_history_ar !== undefined) {
        
        const [arTranslation] = await connection.execute(
          'SELECT id FROM patient_profile_translations WHERE patient_profile_id = ? AND language_code = ?',
          [patientProfileId, 'ar']
        );

        const arUpdateFields = [];
        const arUpdateValues = [];

        if (medical_history_ar !== undefined) {
          arUpdateFields.push('medical_history = ?');
          arUpdateValues.push(medical_history_ar);
        }
        if (current_medications_ar !== undefined) {
          arUpdateFields.push('current_medications = ?');
          arUpdateValues.push(current_medications_ar);
        }
        if (allergies_ar !== undefined) {
          arUpdateFields.push('allergies = ?');
          arUpdateValues.push(allergies_ar);
        }
        if (chronic_conditions_ar !== undefined) {
          arUpdateFields.push('chronic_conditions = ?');
          arUpdateValues.push(chronic_conditions_ar);
        }
        if (family_medical_history_ar !== undefined) {
          arUpdateFields.push('family_medical_history = ?');
          arUpdateValues.push(family_medical_history_ar);
        }

        if (arUpdateFields.length > 0) {
          if (arTranslation.length > 0) {
            // Update existing translation
            arUpdateValues.push(patientProfileId);
            await connection.execute(
              `UPDATE patient_profile_translations SET ${arUpdateFields.join(', ')} 
               WHERE patient_profile_id = ? AND language_code = 'ar'`,
              arUpdateValues
            );
          } else {
            // Insert new translation
            await connection.execute(
              `INSERT INTO patient_profile_translations 
              (patient_profile_id, language_code, medical_history, current_medications, 
               allergies, chronic_conditions, family_medical_history) 
              VALUES (?, 'ar', ?, ?, ?, ?, ?)`,
              [
                patientProfileId,
                medical_history_ar || null,
                current_medications_ar || null,
                allergies_ar || null,
                chronic_conditions_ar || null,
                family_medical_history_ar || null
              ]
            );
          }
        }
      }

      // Update English translation
      if (medical_history_en !== undefined || current_medications_en !== undefined || 
          allergies_en !== undefined || chronic_conditions_en !== undefined || 
          family_medical_history_en !== undefined) {
        
        const [enTranslation] = await connection.execute(
          'SELECT id FROM patient_profile_translations WHERE patient_profile_id = ? AND language_code = ?',
          [patientProfileId, 'en']
        );

        const enUpdateFields = [];
        const enUpdateValues = [];

        if (medical_history_en !== undefined) {
          enUpdateFields.push('medical_history = ?');
          enUpdateValues.push(medical_history_en);
        }
        if (current_medications_en !== undefined) {
          enUpdateFields.push('current_medications = ?');
          enUpdateValues.push(current_medications_en);
        }
        if (allergies_en !== undefined) {
          enUpdateFields.push('allergies = ?');
          enUpdateValues.push(allergies_en);
        }
        if (chronic_conditions_en !== undefined) {
          enUpdateFields.push('chronic_conditions = ?');
          enUpdateValues.push(chronic_conditions_en);
        }
        if (family_medical_history_en !== undefined) {
          enUpdateFields.push('family_medical_history = ?');
          enUpdateValues.push(family_medical_history_en);
        }

        if (enUpdateFields.length > 0) {
          if (enTranslation.length > 0) {
            // Update existing translation
            enUpdateValues.push(patientProfileId);
            await connection.execute(
              `UPDATE patient_profile_translations SET ${enUpdateFields.join(', ')} 
               WHERE patient_profile_id = ? AND language_code = 'en'`,
              enUpdateValues
            );
          } else {
            // Insert new translation
            await connection.execute(
              `INSERT INTO patient_profile_translations 
              (patient_profile_id, language_code, medical_history, current_medications, 
               allergies, chronic_conditions, family_medical_history) 
              VALUES (?, 'en', ?, ?, ?, ?, ?)`,
              [
                patientProfileId,
                medical_history_en || null,
                current_medications_en || null,
                allergies_en || null,
                chronic_conditions_en || null,
                family_medical_history_en || null
              ]
            );
          }
        }
      }

      await connection.commit();

      // Get updated profile
      const updatedProfile = await PatientProfileController.getPatientProfileById(
        patientProfileId, 
        language,
        connection
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث ملف المريض بنجاح' 
          : 'Patient profile updated successfully',
        data: updatedProfile
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updatePatientProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في تحديث ملف المريض',
        message_en: 'Error updating patient profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete patient profile
   * حذف ملف المريض
   * @route DELETE /api/patient-profiles
   */
  static async deletePatientProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if patient profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM patient_profiles WHERE user_id = ?',
        [userId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'ملف المريض غير موجود' 
            : 'Patient profile not found'
        });
      }

      const patientProfileId = profileRows[0].id;

      // Delete translations (CASCADE will handle this, but we do it explicitly for clarity)
      await connection.execute(
        'DELETE FROM patient_profile_translations WHERE patient_profile_id = ?',
        [patientProfileId]
      );

      // Delete patient profile
      await connection.execute(
        'DELETE FROM patient_profiles WHERE id = ?',
        [patientProfileId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف ملف المريض بنجاح' 
          : 'Patient profile deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in deletePatientProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في حذف ملف المريض',
        message_en: 'Error deleting patient profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Helper method to get patient profile by ID with translations
   * دالة مساعدة لجلب ملف المريض بواسطة المعرف مع الترجمات
   */
  static async getPatientProfileById(patientProfileId, language, connection = null) {
    const conn = connection || db;

    // Get patient profile
    const [profileRows] = await conn.execute(
      `SELECT pp.*, u.email, u.phone 
       FROM patient_profiles pp
       LEFT JOIN users u ON pp.user_id = u.id
       WHERE pp.id = ?`,
      [patientProfileId]
    );

    if (profileRows.length === 0) {
      return null;
    }

    const profile = profileRows[0];

    // Get translation for requested language
    const [translationRows] = await conn.execute(
      `SELECT medical_history, current_medications, allergies, 
              chronic_conditions, family_medical_history
       FROM patient_profile_translations 
       WHERE patient_profile_id = ? AND language_code = ?`,
      [patientProfileId, language]
    );

    // Merge profile with translation
    const translation = translationRows[0] || {
      medical_history: null,
      current_medications: null,
      allergies: null,
      chronic_conditions: null,
      family_medical_history: null
    };

    return {
      ...profile,
      ...translation
    };
  }

  /**
   * Get all patient profiles (Admin only)
   * جلب جميع ملفات المرضى (للإداريين فقط)
   * @route GET /api/patient-profiles/all
   */
  static async getAllPatientProfiles(req, res) {
    try {
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // Validate pagination parameters
      if (isNaN(page) || isNaN(limit) || isNaN(offset)) {
        return res.status(400).json({
          success: false,
          message: 'معاملات الصفحة غير صحيحة',
          message_en: 'Invalid pagination parameters'
        });
      }

      // Get search parameter
      const search = req.query.search || '';

      // Build search condition
      let searchCondition = '';
      let searchParams = [];
      
      if (search) {
        searchCondition = `WHERE u.email LIKE ? OR u.phone LIKE ? OR upt.full_name LIKE ?`;
        const searchPattern = `%${search}%`;
        searchParams = [searchPattern, searchPattern, searchPattern];
      }

      // Get total count
      const countParams = [language];
      if (search) {
        countParams.push(...searchParams);
      }

      const [countRows] = await db.execute(
        `SELECT COUNT(DISTINCT pp.id) as total 
         FROM patient_profiles pp
         LEFT JOIN users u ON pp.user_id = u.id
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
         ${searchCondition}`,
        countParams
      );
      const total = countRows[0].total;

      // Get patient profiles with pagination
      // Build query dynamically to avoid LIMIT/OFFSET parameter issues
      let fetchQuery = `
        SELECT pp.*, u.email, u.phone, 
               up.date_of_birth, up.gender,
               upt.full_name
        FROM patient_profiles pp
        LEFT JOIN users u ON pp.user_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        ${searchCondition}
        ORDER BY pp.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const queryParams = [language];
      if (search) {
        queryParams.push(...searchParams);
      }

      const [profileRows] = await db.execute(fetchQuery, queryParams);

      // Get translations for all profiles
      const profileIds = profileRows.map(p => p.id);
      let translations = [];
      
      if (profileIds.length > 0) {
        const placeholders = profileIds.map(() => '?').join(',');
        const [translationRows] = await db.execute(
          `SELECT patient_profile_id, medical_history, current_medications, 
                  allergies, chronic_conditions, family_medical_history
           FROM patient_profile_translations 
           WHERE patient_profile_id IN (${placeholders}) AND language_code = ?`,
          [...profileIds, language]
        );
        translations = translationRows;
      }

      // Merge profiles with translations
      const profiles = profileRows.map(profile => {
        const translation = translations.find(t => t.patient_profile_id === profile.id) || {
          medical_history: null,
          current_medications: null,
          allergies: null,
          chronic_conditions: null,
          family_medical_history: null
        };

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          phone: profile.phone,
          full_name: profile.full_name,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
          blood_type: profile.blood_type,
          height: profile.height,
          weight: profile.weight,
          smoking_status: profile.smoking_status,
          alcohol_consumption: profile.alcohol_consumption,
          exercise_frequency: profile.exercise_frequency,
          insurance_provider: profile.insurance_provider,
          insurance_policy_number: profile.insurance_policy_number,
          preferred_doctor_id: profile.preferred_doctor_id,
          medical_history: translation.medical_history,
          current_medications: translation.current_medications,
          allergies: translation.allergies,
          chronic_conditions: translation.chronic_conditions,
          family_medical_history: translation.family_medical_history,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };
      });

      return res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم جلب ملفات المرضى بنجاح' : 'Patient profiles retrieved successfully',
        data: profiles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error getting all patient profiles:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب ملفات المرضى',
        message_en: 'Error retrieving patient profiles',
        error: error.message
      });
    }
  }

  /**
   * Get patient profile by user ID (Doctor, Admin, Assistant)
   * جلب ملف مريض محدد بواسطة معرف المستخدم (للأطباء والإداريين والمساعدين)
   * @route GET /api/patient-profiles/patient/:userId
   */
  static async getPatientProfileByUserId(req, res) {
    try {
      const language = PatientProfileController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { userId } = req.params;

      // Validate userId
      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: language === 'ar' ? 'معرف المستخدم غير صحيح' : 'Invalid user ID'
        });
      }

      // Check if user exists and get profile data
      const [userRows] = await db.execute(
        `SELECT u.id, u.email, u.phone, 
                up.date_of_birth, up.gender,
                upt.full_name
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
         WHERE u.id = ?`,
        [language, userId]
      );

      if (userRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستخدم غير موجود' : 'User not found'
        });
      }

      const user = userRows[0];

      // Get patient profile
      const [profileRows] = await db.execute(
        `SELECT pp.* 
         FROM patient_profiles pp
         WHERE pp.user_id = ?`,
        [userId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'ملف المريض غير موجود' : 'Patient profile not found'
        });
      }

      const profile = profileRows[0];

      // Get translation for requested language
      const [translationRows] = await db.execute(
        `SELECT medical_history, current_medications, allergies, 
                chronic_conditions, family_medical_history
         FROM patient_profile_translations 
         WHERE patient_profile_id = ? AND language_code = ?`,
        [profile.id, language]
      );

      // Merge profile with translation
      const translation = translationRows[0] || {
        medical_history: null,
        current_medications: null,
        allergies: null,
        chronic_conditions: null,
        family_medical_history: null
      };

      const result = {
        id: profile.id,
        user_id: profile.user_id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        date_of_birth: user.date_of_birth,
        gender: user.gender,
        blood_type: profile.blood_type,
        height: profile.height,
        weight: profile.weight,
        smoking_status: profile.smoking_status,
        alcohol_consumption: profile.alcohol_consumption,
        exercise_frequency: profile.exercise_frequency,
        insurance_provider: profile.insurance_provider,
        insurance_policy_number: profile.insurance_policy_number,
        preferred_doctor_id: profile.preferred_doctor_id,
        medical_history: translation.medical_history,
        current_medications: translation.current_medications,
        allergies: translation.allergies,
        chronic_conditions: translation.chronic_conditions,
        family_medical_history: translation.family_medical_history,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

      return res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم جلب ملف المريض بنجاح' : 'Patient profile retrieved successfully',
        data: result
      });

    } catch (error) {
      console.error('Error getting patient profile by user ID:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب ملف المريض',
        message_en: 'Error retrieving patient profile',
        error: error.message
      });
    }
  }
}

module.exports = PatientProfileController;

const db = require('../config/db');
const { logAdminAction, getClientInfo } = require('../middleware/authMiddleware');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'admin-doctor-profile-management.log' })
  ]
});

/**
 * Admin Doctor Profile Management Controller
 * معالج إدارة ملفات الأطباء للأدمن (البيانات الشخصية والمهنية والمستندات)
 */
class AdminDoctorProfileManagementController {

  /**
   * Helper function to normalize language code
   */
  static normalizeLanguage(langHeader, defaultLang = 'ar') {
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }
    return defaultLang;
  }

  /**
   * Get doctor complete profile (personal + professional + documents)
   * جلب الملف الكامل للطبيب (شخصي + مهني + مستندات)
   */
  static async getDoctorCompleteProfile(req, res) {
    const { doctorId } = req.params;
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    try {
      // Get doctor account data
      const [doctorRows] = await db.execute(
        `SELECT id, uuid, email, phone, status, is_active, 
                email_verified_at, phone_verified_at, 
                last_login_at, last_activity_at,
                is_email_otp, is_phone_otp, is_id_verified,
                created_at, updated_at
         FROM doctors WHERE id = ?`,
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
        `SELECT * FROM doctor_profiles WHERE doctor_id = ?`,
        [doctorId]
      );

      const profile = profileRows[0] || null;

      // Get all translations
      let translations = {};
      if (profile) {
        const [translationsRows] = await db.execute(
          `SELECT * FROM doctor_profile_translations WHERE doctor_profile_id = ?`,
          [profile.id]
        );

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
      }

      // Get verification documents
      const [documents] = await db.execute(
        `SELECT id, document_type, file_url, status, rejection_reason,
                uploaded_at, verified_at, verified_by
         FROM doctor_verification_documents 
         WHERE doctor_id = ?
         ORDER BY uploaded_at DESC`,
        [doctorId]
      );

      res.status(200).json({
        success: true,
        data: {
          account: doctor,
          profile: profile,
          translations: translations,
          documents: documents
        }
      });

    } catch (error) {
      logger.error('Get doctor complete profile error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب بيانات الطبيب' 
          : 'Error fetching doctor data',
        error: error.message
      });
    }
  }

  /**
   * Get doctor personal data only
   * جلب البيانات الشخصية فقط
   */
  static async getDoctorPersonalData(req, res) {
    const { doctorId } = req.params;
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    try {
      const [doctorRows] = await db.execute(
        `SELECT id, uuid, email, phone FROM doctors WHERE id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const [profileRows] = await db.execute(
        `SELECT date_of_birth, gender, nationality, emergency_contact_phone,
                timezone, language_preference
         FROM doctor_profiles WHERE doctor_id = ?`,
        [doctorId]
      );

      const profile = profileRows[0] || {};

      const [translationRows] = await db.execute(
        `SELECT language_code, full_name, emergency_contact_name, emergency_contact_relationship
         FROM doctor_profile_translations 
         WHERE doctor_profile_id = (SELECT id FROM doctor_profiles WHERE doctor_id = ?)`,
        [doctorId]
      );

      const translations = {};
      translationRows.forEach(row => {
        translations[row.language_code] = {
          full_name: row.full_name,
          emergency_contact_name: row.emergency_contact_name,
          emergency_contact_relationship: row.emergency_contact_relationship
        };
      });

      res.status(200).json({
        success: true,
        data: {
          ...doctorRows[0],
          ...profile,
          translations
        }
      });

    } catch (error) {
      logger.error('Get doctor personal data error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات الشخصية' 
          : 'Error fetching personal data',
        error: error.message
      });
    }
  }

  /**
   * Get doctor professional data only
   * جلب البيانات المهنية فقط
   */
  static async getDoctorProfessionalData(req, res) {
    const { doctorId } = req.params;
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    try {
      const [profileRows] = await db.execute(
        `SELECT license_number, years_of_experience, medical_school, graduation_year,
                board_certifications, languages_spoken,
                is_verified, verification_date, approval_status,
                rating_average, rating_count, total_consultations, is_available
         FROM doctor_profiles WHERE doctor_id = ?`,
        [doctorId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profile = profileRows[0];

      // Parse JSON fields safely
      if (profile.board_certifications) {
        try {
          if (typeof profile.board_certifications === 'string') {
            profile.board_certifications = JSON.parse(profile.board_certifications);
          }
        } catch (error) {
          console.error('Error parsing board_certifications:', error);
          profile.board_certifications = [];
        }
      } else {
        profile.board_certifications = [];
      }

      if (profile.languages_spoken) {
        try {
          if (typeof profile.languages_spoken === 'string') {
            profile.languages_spoken = JSON.parse(profile.languages_spoken);
          }
        } catch (error) {
          console.error('Error parsing languages_spoken:', error);
          profile.languages_spoken = [];
        }
      } else {
        profile.languages_spoken = [];
      }

      const [translationRows] = await db.execute(
        `SELECT language_code, specialty, sub_specialty, biography
         FROM doctor_profile_translations 
         WHERE doctor_profile_id = (SELECT id FROM doctor_profiles WHERE doctor_id = ?)`,
        [doctorId]
      );

      const translations = {};
      translationRows.forEach(row => {
        translations[row.language_code] = {
          specialty: row.specialty,
          sub_specialty: row.sub_specialty,
          biography: row.biography
        };
      });

      res.status(200).json({
        success: true,
        data: {
          professional_data: profile,
          translations
        }
      });

    } catch (error) {
      logger.error('Get doctor professional data error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات المهنية' 
          : 'Error fetching professional data',
        error: error.message
      });
    }
  }

  /**
   * Get doctor verification documents
   * جلب مستندات التحقق للطبيب
   */
  static async getDoctorDocuments(req, res) {
    const { doctorId } = req.params;
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    try {
      const [documents] = await db.execute(
        `SELECT id, document_type, file_url, status, rejection_reason,
                uploaded_at, verified_at, verified_by
         FROM doctor_verification_documents 
         WHERE doctor_id = ?
         ORDER BY uploaded_at DESC`,
        [doctorId]
      );

      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });

    } catch (error) {
      logger.error('Get doctor documents error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب المستندات' 
          : 'Error fetching documents',
        error: error.message
      });
    }
  }

  /**
   * Update doctor personal data
   * تحديث البيانات الشخصية للطبيب
   */
  static async updateDoctorPersonalData(req, res) {
    const { doctorId } = req.params;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        email,
        phone,
        date_of_birth,
        gender,
        nationality,
        emergency_contact_phone,
        timezone,
        language_preference,
        translations
      } = req.body;

      // Update doctors table
      const doctorUpdateFields = [];
      const doctorUpdateValues = [];

      if (email !== undefined) {
        doctorUpdateFields.push('email = ?');
        doctorUpdateValues.push(email);
      }
      if (phone !== undefined) {
        doctorUpdateFields.push('phone = ?');
        doctorUpdateValues.push(phone);
      }

      if (doctorUpdateFields.length > 0) {
        doctorUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        doctorUpdateValues.push(doctorId);
        await connection.execute(
          `UPDATE doctors SET ${doctorUpdateFields.join(', ')} WHERE id = ?`,
          doctorUpdateValues
        );
      }

      // Update doctor_profiles table
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

      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE doctor_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Update translations
      if (translations && typeof translations === 'object') {
        for (const [langCode, fields] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            const [translationRows] = await connection.execute(
              'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
              [profileId, langCode]
            );

            const translationFields = [];
            const translationValues = [];

            if (fields.full_name !== undefined) {
              translationFields.push('full_name = ?');
              translationValues.push(fields.full_name);
            }
            if (fields.emergency_contact_name !== undefined) {
              translationFields.push('emergency_contact_name = ?');
              translationValues.push(fields.emergency_contact_name);
            }
            if (fields.emergency_contact_relationship !== undefined) {
              translationFields.push('emergency_contact_relationship = ?');
              translationValues.push(fields.emergency_contact_relationship);
            }

            if (translationRows.length > 0) {
              if (translationFields.length > 0) {
                translationValues.push(translationRows[0].id);
                await connection.execute(
                  `UPDATE doctor_profile_translations SET ${translationFields.join(', ')} WHERE id = ?`,
                  translationValues
                );
              }
            } else {
              await connection.execute(
                `INSERT INTO doctor_profile_translations 
                (doctor_profile_id, language_code, full_name, emergency_contact_name, emergency_contact_relationship)
                VALUES (?, ?, ?, ?, ?)`,
                [profileId, langCode, fields.full_name || null, fields.emergency_contact_name || null, fields.emergency_contact_relationship || null]
              );
            }
          }
        }
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_PERSONAL_DATA',
        'doctor',
        doctorId,
        {},
        req.body,
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor personal data updated by admin', {
        doctorId,
        updatedBy: adminId
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث البيانات الشخصية بنجاح' 
          : 'Personal data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update doctor personal data error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث البيانات الشخصية' 
          : 'Error updating personal data',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update doctor professional data
   * تحديث البيانات المهنية للطبيب
   */
  static async updateDoctorProfessionalData(req, res) {
    const { doctorId } = req.params;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const {
        license_number,
        years_of_experience,
        medical_school,
        graduation_year,
        board_certifications,
        languages_spoken,
        translations
      } = req.body;

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

      const profileUpdateFields = [];
      const profileUpdateValues = [];

      if (license_number !== undefined) {
        profileUpdateFields.push('license_number = ?');
        profileUpdateValues.push(license_number);
      }
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
      if (board_certifications !== undefined) {
        profileUpdateFields.push('board_certifications = ?');
        profileUpdateValues.push(JSON.stringify(board_certifications));
      }
      if (languages_spoken !== undefined) {
        profileUpdateFields.push('languages_spoken = ?');
        profileUpdateValues.push(JSON.stringify(languages_spoken));
      }

      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE doctor_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Update translations
      if (translations && typeof translations === 'object') {
        for (const [langCode, fields] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            const [translationRows] = await connection.execute(
              'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
              [profileId, langCode]
            );

            const translationFields = [];
            const translationValues = [];

            if (fields.specialty !== undefined) {
              translationFields.push('specialty = ?');
              translationValues.push(fields.specialty);
            }
            if (fields.sub_specialty !== undefined) {
              translationFields.push('sub_specialty = ?');
              translationValues.push(fields.sub_specialty);
            }
            if (fields.biography !== undefined) {
              translationFields.push('biography = ?');
              translationValues.push(fields.biography);
            }

            if (translationRows.length > 0) {
              if (translationFields.length > 0) {
                translationValues.push(translationRows[0].id);
                await connection.execute(
                  `UPDATE doctor_profile_translations SET ${translationFields.join(', ')} WHERE id = ?`,
                  translationValues
                );
              }
            } else {
              await connection.execute(
                `INSERT INTO doctor_profile_translations 
                (doctor_profile_id, language_code, specialty, sub_specialty, biography)
                VALUES (?, ?, ?, ?, ?)`,
                [profileId, langCode, fields.specialty || null, fields.sub_specialty || null, fields.biography || null]
              );
            }
          }
        }
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_PROFESSIONAL_DATA',
        'doctor',
        doctorId,
        {},
        req.body,
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor professional data updated by admin', {
        doctorId,
        updatedBy: adminId
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث البيانات المهنية بنجاح' 
          : 'Professional data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update doctor professional data error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث البيانات المهنية' 
          : 'Error updating professional data',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Approve/Reject verification document
   * الموافقة/رفض مستند التحقق
   */
  static async updateDocumentStatus(req, res) {
    const { doctorId, documentId } = req.params;
    const { status, rejection_reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'الحالة غير صحيحة. القيم المسموحة: pending, approved, rejected' 
          : 'Invalid status. Allowed values: pending, approved, rejected'
      });
    }

    if (status === 'rejected' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'يجب تحديد سبب الرفض' 
          : 'Rejection reason is required'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if document exists and belongs to doctor
      const [docRows] = await connection.execute(
        'SELECT id, status as old_status FROM doctor_verification_documents WHERE id = ? AND doctor_id = ?',
        [documentId, doctorId]
      );

      if (docRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستند غير موجود' : 'Document not found'
        });
      }

      const oldStatus = docRows[0].old_status;

      // Update document status
      await connection.execute(
        `UPDATE doctor_verification_documents 
         SET status = ?, rejection_reason = ?, verified_at = ?, verified_by = ?
         WHERE id = ?`,
        [
          status,
          status === 'rejected' ? rejection_reason : null,
          status !== 'pending' ? new Date() : null,
          status !== 'pending' ? adminId : null,
          documentId
        ]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_DOCUMENT_STATUS',
        'doctor_verification_document',
        documentId,
        { status: oldStatus },
        { status, rejection_reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor document status updated', {
        doctorId,
        documentId,
        oldStatus,
        newStatus: status,
        updatedBy: adminId
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث حالة المستند بنجاح' 
          : 'Document status updated successfully',
        data: {
          documentId,
          status,
          verified_by: adminId,
          verified_at: status !== 'pending' ? new Date() : null
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update document status error', { error: error.message, documentId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث حالة المستند' 
          : 'Error updating document status',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get documents summary for doctor
   * جلب ملخص المستندات للطبيب
   */
  static async getDocumentsSummary(req, res) {
    const { doctorId } = req.params;
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    try {
      const [summary] = await db.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM doctor_verification_documents 
        WHERE doctor_id = ?`,
        [doctorId]
      );

      res.status(200).json({
        success: true,
        data: summary[0]
      });

    } catch (error) {
      logger.error('Get documents summary error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب ملخص المستندات' 
          : 'Error fetching documents summary',
        error: error.message
      });
    }
  }

  /**
   * Delete doctor profile data (soft delete)
   * حذف بيانات الملف الشخصي (حذف ناعم)
   */
  static async deleteDoctorProfile(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'يجب تحديد سبب الحذف' 
          : 'Deletion reason is required'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Deactivate doctor account
      await connection.execute(
        'UPDATE doctors SET is_active = 0, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['inactive', doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'DELETE_DOCTOR_PROFILE',
        'doctor',
        doctorId,
        {},
        { reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor profile deleted by admin', {
        doctorId,
        deletedBy: adminId,
        reason
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف الملف الشخصي بنجاح' 
          : 'Profile deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Delete doctor profile error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في حذف الملف الشخصي' 
          : 'Error deleting profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Approve doctor profile completely
   * الموافقة الكاملة على ملف الطبيب (تحديث is_verified, verification_date, verified_by, approval_status)
   */
  static async approveDoctorProfile(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id, is_verified, approval_status FROM doctor_profiles WHERE doctor_id = ?',
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
      const oldData = {
        is_verified: profileRows[0].is_verified,
        approval_status: profileRows[0].approval_status
      };

      // Update profile: set is_verified = 1, approval_status = 'approved', verification_date, verified_by
      await connection.execute(
        `UPDATE doctor_profiles 
         SET is_verified = 1, 
             verification_date = CURRENT_TIMESTAMP, 
             verified_by = ?, 
             approval_status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [adminId, profileId]
      );

      // Also update doctor status to active if it's pending_verification
      await connection.execute(
        `UPDATE doctors 
         SET status = CASE 
           WHEN status = 'pending_verification' THEN 'active'
           ELSE status
         END,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'APPROVE_DOCTOR_PROFILE_COMPLETE',
        'doctor_profile',
        profileId,
        oldData,
        { 
          is_verified: true, 
          approval_status: 'approved',
          verification_date: new Date(),
          verified_by: adminId,
          reason 
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor profile approved completely', {
        doctorId,
        profileId,
        approvedBy: adminId,
        reason
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تمت الموافقة على الملف الشخصي بنجاح' 
          : 'Profile approved successfully',
        data: {
          doctorId,
          profileId,
          is_verified: true,
          approval_status: 'approved',
          verification_date: new Date(),
          verified_by: adminId
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Approve doctor profile error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في الموافقة على الملف الشخصي' 
          : 'Error approving profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Reject doctor profile
   * رفض ملف الطبيب (تحديث approval_status إلى rejected)
   */
  static async rejectDoctorProfile(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);
    const language = AdminDoctorProfileManagementController.normalizeLanguage(
      req.headers['accept-language']
    );

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: language === 'ar' 
          ? 'يجب تحديد سبب الرفض' 
          : 'Rejection reason is required'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id, is_verified, approval_status FROM doctor_profiles WHERE doctor_id = ?',
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
      const oldData = {
        is_verified: profileRows[0].is_verified,
        approval_status: profileRows[0].approval_status
      };

      // Update profile: set approval_status = 'rejected'
      await connection.execute(
        `UPDATE doctor_profiles 
         SET approval_status = 'rejected',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [profileId]
      );

      // Also update doctor status to inactive
      await connection.execute(
        `UPDATE doctors 
         SET status = 'inactive',
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'REJECT_DOCTOR_PROFILE',
        'doctor_profile',
        profileId,
        oldData,
        { 
          approval_status: 'rejected',
          reason 
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor profile rejected', {
        doctorId,
        profileId,
        rejectedBy: adminId,
        reason
      });

      res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم رفض الملف الشخصي' 
          : 'Profile rejected',
        data: {
          doctorId,
          profileId,
          approval_status: 'rejected'
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Reject doctor profile error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في رفض الملف الشخصي' 
          : 'Error rejecting profile',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = AdminDoctorProfileManagementController;

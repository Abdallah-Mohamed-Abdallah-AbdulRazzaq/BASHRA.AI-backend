const db = require('../config/db');

/**
 * Admin Medical Records Controller
 * Handles medical records management for admins
 * الإداريين - إدارة السجلات الطبية
 */

class AdminMedicalRecordsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get all medical records
   * جلب جميع السجلات الطبية
   * GET /api/admin/medical-records
   */
  static async getAllMedicalRecords(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
        patient_id,
        doctor_id,
        record_status,
        from_date,
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      const offset = (page - 1) * limit;

      // Build query
      let query = `
        SELECT 
          mr.id,
          mr.uuid,
          mr.appointment_id,
          mr.patient_id,
          mr.doctor_id,
          mr.visit_date,
          mr.next_appointment_recommended,
          mr.follow_up_date,
          mr.record_status,
          mr.created_at,
          upt.full_name as patient_name,
          u.email as patient_email,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          mrt.chief_complaint,
          mrt.diagnosis
        FROM medical_records mr
        LEFT JOIN users u ON mr.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt 
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        WHERE 1=1
      `;
      const params = [lang, lang, lang];

      if (patient_id) {
        query += ' AND mr.patient_id = ?';
        params.push(patient_id);
      }

      if (doctor_id) {
        query += ' AND mr.doctor_id = ?';
        params.push(doctor_id);
      }

      if (record_status) {
        query += ' AND mr.record_status = ?';
        params.push(record_status);
      }

      if (from_date) {
        query += ' AND DATE(mr.visit_date) >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND DATE(mr.visit_date) <= ?';
        params.push(to_date);
      }

      query += ' ORDER BY mr.visit_date DESC';

      // Get total count first
      let countQuery = `
        SELECT COUNT(*) as total
        FROM medical_records mr
        WHERE 1=1
      `;
      const countParams = [];

      if (patient_id) {
        countQuery += ' AND mr.patient_id = ?';
        countParams.push(patient_id);
      }

      if (doctor_id) {
        countQuery += ' AND mr.doctor_id = ?';
        countParams.push(doctor_id);
      }

      if (record_status) {
        countQuery += ' AND mr.record_status = ?';
        countParams.push(record_status);
      }

      if (from_date) {
        countQuery += ' AND DATE(mr.visit_date) >= ?';
        countParams.push(from_date);
      }

      if (to_date) {
        countQuery += ' AND DATE(mr.visit_date) <= ?';
        countParams.push(to_date);
      }

      const [countResult] = await connection.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Add pagination
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      query += ` LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [records] = await connection.execute(query, params);

      res.json({
        success: true,
        count: records.length,
        total: total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: records
      });

    } catch (error) {
      console.error('Error fetching medical records:', error);
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب السجلات الطبية' 
          : 'Error fetching medical records',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single medical record by ID
   * جلب سجل طبي واحد
   * GET /api/admin/medical-records/:id
   */
  static async getMedicalRecordById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Support both ID and UUID
      const idField = isNaN(id) ? 'mr.uuid' : 'mr.id';

      const [records] = await connection.execute(`
        SELECT 
          mr.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          up.date_of_birth as patient_dob,
          up.gender as patient_gender,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          d.phone as doctor_phone
        FROM medical_records mr
        LEFT JOIN users u ON mr.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt 
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${idField} = ?
      `, [lang, lang, id]);

      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'السجل الطبي غير موجود' 
            : 'Medical record not found'
        });
      }

      const record = records[0];

      // Get all translations
      const [translations] = await connection.execute(`
        SELECT 
          language_code,
          chief_complaint,
          history_of_present_illness,
          physical_examination,
          assessment,
          diagnosis,
          differential_diagnosis,
          treatment_plan,
          follow_up_instructions,
          doctor_notes
        FROM medical_record_translations
        WHERE medical_record_id = ?
      `, [record.id]);

      // Format translations as object
      const translationsObj = {};
      translations.forEach(t => {
        translationsObj[t.language_code] = {
          chief_complaint: t.chief_complaint,
          history_of_present_illness: t.history_of_present_illness,
          physical_examination: t.physical_examination,
          assessment: t.assessment,
          diagnosis: t.diagnosis,
          differential_diagnosis: t.differential_diagnosis,
          treatment_plan: t.treatment_plan,
          follow_up_instructions: t.follow_up_instructions,
          doctor_notes: t.doctor_notes
        };
      });

      record.translations = translationsObj;

      res.json({
        success: true,
        data: record
      });

    } catch (error) {
      console.error('Error fetching medical record:', error);
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب السجل الطبي' 
          : 'Error fetching medical record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete medical record (permanent)
   * حذف سجل طبي نهائياً
   * DELETE /api/admin/medical-records/:id
   */
  static async deleteMedicalRecord(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Support both ID and UUID
      const idField = isNaN(id) ? 'uuid' : 'id';

      // Verify record exists
      const [existingRecords] = await connection.execute(`
        SELECT id FROM medical_records WHERE ${idField} = ?
      `, [id]);

      if (existingRecords.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'السجل الطبي غير موجود' 
            : 'Medical record not found'
        });
      }

      // Delete record (translations will be deleted automatically by CASCADE)
      await connection.execute(`
        DELETE FROM medical_records WHERE id = ?
      `, [existingRecords[0].id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم حذف السجل الطبي بنجاح' 
          : 'Medical record deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting medical record:', error);
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في حذف السجل الطبي' 
          : 'Error deleting medical record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get statistics
   * جلب الإحصائيات
   * GET /api/admin/medical-records/statistics
   */
  static async getStatistics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { from_date, to_date, doctor_id } = req.query;

      let query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN record_status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN record_status = 'final' THEN 1 END) as final,
          COUNT(CASE WHEN record_status = 'amended' THEN 1 END) as amended,
          COUNT(CASE WHEN next_appointment_recommended = 1 THEN 1 END) as follow_ups_recommended,
          COUNT(DISTINCT patient_id) as unique_patients,
          COUNT(DISTINCT doctor_id) as unique_doctors
        FROM medical_records
        WHERE 1=1
      `;
      const params = [];

      if (from_date) {
        query += ' AND DATE(visit_date) >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND DATE(visit_date) <= ?';
        params.push(to_date);
      }

      if (doctor_id) {
        query += ' AND doctor_id = ?';
        params.push(doctor_id);
      }

      const [stats] = await connection.execute(query, params);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب الإحصائيات' 
          : 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get patient's complete medical history
   * جلب التاريخ الطبي الكامل للمريض
   * GET /api/admin/medical-records/patient/:patient_id/history
   */
  static async getPatientMedicalHistory(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { patient_id } = req.params;
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Get patient info
      const [patientInfo] = await connection.execute(`
        SELECT 
          u.id,
          u.email,
          u.phone,
          upt.full_name,
          up.date_of_birth,
          up.gender
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt 
          ON up.id = upt.profile_id AND upt.language_code = ?
        WHERE u.id = ?
      `, [lang, patient_id]);

      if (patientInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'المريض غير موجود' 
            : 'Patient not found'
        });
      }

      // Get all medical records
      const [records] = await connection.execute(`
        SELECT 
          mr.id,
          mr.uuid,
          mr.visit_date,
          mr.record_status,
          mr.vital_signs,
          mr.skin_condition_severity,
          mr.treatment_response,
          mr.next_appointment_recommended,
          mr.follow_up_date,
          mrt.chief_complaint,
          mrt.diagnosis,
          mrt.treatment_plan,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email
        FROM medical_records mr
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE mr.patient_id = ?
        ORDER BY mr.visit_date DESC
      `, [lang, lang, patient_id]);

      res.json({
        success: true,
        patient: patientInfo[0],
        records_count: records.length,
        data: records
      });

    } catch (error) {
      console.error('Error fetching patient medical history:', error);
      const lang = AdminMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب التاريخ الطبي' 
          : 'Error fetching medical history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = AdminMedicalRecordsController;

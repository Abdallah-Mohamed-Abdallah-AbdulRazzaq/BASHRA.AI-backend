const db = require('../config/db');

/**
 * Patient Medical Records Controller
 * Handles medical records viewing for patients
 * المرضى - عرض السجلات الطبية
 */

class PatientMedicalRecordsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get patient's own medical records
   * جلب السجلات الطبية الخاصة بالمريض
   * GET /api/patient/medical-records
   */
  static async getMyMedicalRecords(req, res) {
    const connection = await db.getConnection();
    
    try {
      const patientId = req.user.id;
      const lang = PatientMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
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
          mr.visit_date,
          mr.next_appointment_recommended,
          mr.follow_up_date,
          mr.record_status,
          mr.vital_signs,
          mr.skin_condition_severity,
          mr.treatment_response,
          mr.created_at,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          mrt.chief_complaint,
          mrt.diagnosis,
          mrt.treatment_plan
        FROM medical_records mr
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        WHERE mr.patient_id = ? AND mr.record_status = 'final'
      `;
      const params = [lang, lang, patientId];

      if (doctor_id) {
        query += ' AND mr.doctor_id = ?';
        params.push(doctor_id);
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
        WHERE mr.patient_id = ? AND mr.record_status = 'final'
      `;
      const countParams = [patientId];

      if (doctor_id) {
        countQuery += ' AND mr.doctor_id = ?';
        countParams.push(doctor_id);
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
      const lang = PatientMedicalRecordsController.normalizeLanguage(
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
   * GET /api/patient/medical-records/:id
   */
  static async getMedicalRecordById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const patientId = req.user.id;
      const { id } = req.params;
      const lang = PatientMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Support both ID and UUID
      const idField = isNaN(id) ? 'mr.uuid' : 'mr.id';

      const [records] = await connection.execute(`
        SELECT 
          mr.*,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          d.phone as doctor_phone
        FROM medical_records mr
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${idField} = ? AND mr.patient_id = ? AND mr.record_status = 'final'
      `, [lang, id, patientId]);

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
      const lang = PatientMedicalRecordsController.normalizeLanguage(
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
   * Get medical records summary/statistics
   * جلب ملخص السجلات الطبية
   * GET /api/patient/medical-records/summary
   */
  static async getMedicalRecordsSummary(req, res) {
    const connection = await db.getConnection();
    
    try {
      const patientId = req.user.id;
      const lang = PatientMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Get statistics
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT doctor_id) as total_doctors,
          MAX(visit_date) as last_visit_date,
          SUM(CASE WHEN next_appointment_recommended = 1 THEN 1 ELSE 0 END) as follow_ups_recommended
        FROM medical_records
        WHERE patient_id = ? AND record_status = 'final'
      `, [patientId]);

      // Get recent records
      const [recentRecords] = await connection.execute(`
        SELECT 
          mr.id,
          mr.uuid,
          mr.visit_date,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          mrt.diagnosis
        FROM medical_records mr
        LEFT JOIN doctors d ON mr.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt 
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        WHERE mr.patient_id = ? AND mr.record_status = 'final'
        ORDER BY mr.visit_date DESC
        LIMIT 5
      `, [lang, lang, patientId]);

      res.json({
        success: true,
        data: {
          statistics: stats[0],
          recent_records: recentRecords
        }
      });

    } catch (error) {
      console.error('Error fetching medical records summary:', error);
      const lang = PatientMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب ملخص السجلات الطبية' 
          : 'Error fetching medical records summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PatientMedicalRecordsController;

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Doctor Medical Records Controller
 * Handles medical records management for doctors
 * الأطباء - إدارة السجلات الطبية
 */

class DoctorMedicalRecordsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Create medical record
   * إنشاء سجل طبي
   * POST /api/doctor/medical-records
   */
  static async createMedicalRecord(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
        appointment_id,
        patient_id,
        next_appointment_recommended,
        follow_up_date,
        vital_signs,
        skin_condition_severity,
        affected_body_areas,
        treatment_response,
        patient_consent,
        record_status,
        translations
      } = req.body;

      // Validation
      if (!appointment_id || !patient_id) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'معرف الموعد والمريض مطلوبان' 
            : 'Appointment ID and patient ID are required'
        });
      }

      // Verify appointment belongs to this doctor
      const [appointmentRows] = await connection.execute(`
        SELECT id, doctor_id, patient_id, status
        FROM appointments
        WHERE id = ? AND doctor_id = ?
      `, [appointment_id, doctorId]);

      if (appointmentRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'الموعد غير موجود أو لا تملك صلاحية الوصول إليه' 
            : 'Appointment not found or access denied'
        });
      }

      const appointment = appointmentRows[0];
      if (appointment.patient_id !== parseInt(patient_id)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'معرف المريض لا يتطابق مع الموعد' 
            : 'Patient ID does not match appointment'
        });
      }

      // Check if medical record already exists for this appointment
      const [existingRecords] = await connection.execute(`
        SELECT id FROM medical_records WHERE appointment_id = ?
      `, [appointment_id]);

      if (existingRecords.length > 0) {
        return res.status(409).json({
          success: false,
          message: lang === 'ar' 
            ? 'يوجد سجل طبي لهذا الموعد بالفعل' 
            : 'Medical record already exists for this appointment'
        });
      }

      // Create medical record
      const uuid = uuidv4();
      
      // Convert boolean values to integers
      const nextAppointmentRecommended = next_appointment_recommended === true || next_appointment_recommended === 'true' || next_appointment_recommended === 1 ? 1 : 0;
      const patientConsentValue = patient_consent === true || patient_consent === 'true' || patient_consent === 1 ? 1 : 0;
      
      const [result] = await connection.execute(`
        INSERT INTO medical_records (
          uuid, appointment_id, patient_id, doctor_id,
          next_appointment_recommended, follow_up_date,
          vital_signs, skin_condition_severity, affected_body_areas,
          treatment_response, patient_consent, record_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid,
        appointment_id,
        patient_id,
        doctorId,
        nextAppointmentRecommended,
        follow_up_date || null,
        vital_signs ? JSON.stringify(vital_signs) : null,
        skin_condition_severity || 'mild',
        affected_body_areas ? JSON.stringify(affected_body_areas) : null,
        treatment_response || 'unknown',
        patientConsentValue,
        record_status || 'draft'
      ]);

      const medicalRecordId = result.insertId;

      // Insert translations
      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (translationData && typeof translationData === 'object') {
            await connection.execute(`
              INSERT INTO medical_record_translations (
                medical_record_id, language_code,
                chief_complaint, history_of_present_illness,
                physical_examination, assessment, diagnosis,
                differential_diagnosis, treatment_plan,
                follow_up_instructions, doctor_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              medicalRecordId,
              languageCode,
              translationData.chief_complaint || null,
              translationData.history_of_present_illness || null,
              translationData.physical_examination || null,
              translationData.assessment || null,
              translationData.diagnosis || null,
              translationData.differential_diagnosis || null,
              translationData.treatment_plan || null,
              translationData.follow_up_instructions || null,
              translationData.doctor_notes || null
            ]);
          }
        }
      }

      await connection.commit();

      // Fetch created record with translations
      const [createdRecord] = await connection.execute(`
        SELECT 
          mr.*,
          mrt.chief_complaint,
          mrt.diagnosis,
          mrt.treatment_plan
        FROM medical_records mr
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        WHERE mr.id = ?
      `, [lang, medicalRecordId]);

      res.status(201).json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إنشاء السجل الطبي بنجاح' 
          : 'Medical record created successfully',
        data: createdRecord[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating medical record:', error);
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إنشاء السجل الطبي' 
          : 'Error creating medical record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctor's medical records
   * جلب السجلات الطبية للطبيب
   * GET /api/doctor/medical-records
   */
  static async getMyMedicalRecords(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
        patient_id,
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
          mr.visit_date,
          mr.next_appointment_recommended,
          mr.follow_up_date,
          mr.record_status,
          mr.created_at,
          upt.full_name as patient_name,
          u.email as patient_email,
          mrt.chief_complaint,
          mrt.diagnosis
        FROM medical_records mr
        LEFT JOIN users u ON mr.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt 
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN medical_record_translations mrt 
          ON mr.id = mrt.medical_record_id AND mrt.language_code = ?
        WHERE mr.doctor_id = ?
      `;
      const params = [lang, lang, doctorId];

      if (patient_id) {
        query += ' AND mr.patient_id = ?';
        params.push(patient_id);
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
        WHERE mr.doctor_id = ?
      `;
      const countParams = [doctorId];

      if (patient_id) {
        countQuery += ' AND mr.patient_id = ?';
        countParams.push(patient_id);
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
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
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
   * GET /api/doctor/medical-records/:id
   */
  static async getMedicalRecordById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const { id } = req.params;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
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
          up.gender as patient_gender
        FROM medical_records mr
        LEFT JOIN users u ON mr.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt 
          ON up.id = upt.profile_id AND upt.language_code = ?
        WHERE ${idField} = ? AND mr.doctor_id = ?
      `, [lang, id, doctorId]);

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
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
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
   * Update medical record
   * تحديث سجل طبي
   * PUT /api/doctor/medical-records/:id
   */
  static async updateMedicalRecord(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const { id } = req.params;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
        next_appointment_recommended,
        follow_up_date,
        vital_signs,
        skin_condition_severity,
        affected_body_areas,
        treatment_response,
        patient_consent,
        record_status,
        translations
      } = req.body;

      // Support both ID and UUID
      const idField = isNaN(id) ? 'uuid' : 'id';

      // Verify record exists and belongs to this doctor
      const [existingRecords] = await connection.execute(`
        SELECT id FROM medical_records WHERE ${idField} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (existingRecords.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'السجل الطبي غير موجود' 
            : 'Medical record not found'
        });
      }

      const medicalRecordId = existingRecords[0].id;

      // Build update query
      const updates = [];
      const params = [];

      if (next_appointment_recommended !== undefined) {
        updates.push('next_appointment_recommended = ?');
        // Convert boolean to integer
        const nextAppointmentValue = next_appointment_recommended === true || next_appointment_recommended === 'true' || next_appointment_recommended === 1 ? 1 : 0;
        params.push(nextAppointmentValue);
      }

      if (follow_up_date !== undefined) {
        updates.push('follow_up_date = ?');
        params.push(follow_up_date);
      }

      if (vital_signs !== undefined) {
        updates.push('vital_signs = ?');
        params.push(vital_signs ? JSON.stringify(vital_signs) : null);
      }

      if (skin_condition_severity) {
        updates.push('skin_condition_severity = ?');
        params.push(skin_condition_severity);
      }

      if (affected_body_areas !== undefined) {
        updates.push('affected_body_areas = ?');
        params.push(affected_body_areas ? JSON.stringify(affected_body_areas) : null);
      }

      if (treatment_response) {
        updates.push('treatment_response = ?');
        params.push(treatment_response);
      }

      if (patient_consent !== undefined) {
        updates.push('patient_consent = ?');
        // Convert boolean to integer
        const patientConsentValue = patient_consent === true || patient_consent === 'true' || patient_consent === 1 ? 1 : 0;
        params.push(patientConsentValue);
      }

      if (record_status) {
        updates.push('record_status = ?');
        params.push(record_status);
      }

      if (updates.length > 0) {
        params.push(medicalRecordId);
        await connection.execute(`
          UPDATE medical_records 
          SET ${updates.join(', ')}
          WHERE id = ?
        `, params);
      }

      // Update translations
      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (translationData && typeof translationData === 'object') {
            // Check if translation exists
            const [existingTrans] = await connection.execute(`
              SELECT id FROM medical_record_translations 
              WHERE medical_record_id = ? AND language_code = ?
            `, [medicalRecordId, languageCode]);

            if (existingTrans.length > 0) {
              // Update existing translation
              const transUpdates = [];
              const transParams = [];

              if (translationData.chief_complaint !== undefined) {
                transUpdates.push('chief_complaint = ?');
                transParams.push(translationData.chief_complaint);
              }

              if (translationData.history_of_present_illness !== undefined) {
                transUpdates.push('history_of_present_illness = ?');
                transParams.push(translationData.history_of_present_illness);
              }

              if (translationData.physical_examination !== undefined) {
                transUpdates.push('physical_examination = ?');
                transParams.push(translationData.physical_examination);
              }

              if (translationData.assessment !== undefined) {
                transUpdates.push('assessment = ?');
                transParams.push(translationData.assessment);
              }

              if (translationData.diagnosis !== undefined) {
                transUpdates.push('diagnosis = ?');
                transParams.push(translationData.diagnosis);
              }

              if (translationData.differential_diagnosis !== undefined) {
                transUpdates.push('differential_diagnosis = ?');
                transParams.push(translationData.differential_diagnosis);
              }

              if (translationData.treatment_plan !== undefined) {
                transUpdates.push('treatment_plan = ?');
                transParams.push(translationData.treatment_plan);
              }

              if (translationData.follow_up_instructions !== undefined) {
                transUpdates.push('follow_up_instructions = ?');
                transParams.push(translationData.follow_up_instructions);
              }

              if (translationData.doctor_notes !== undefined) {
                transUpdates.push('doctor_notes = ?');
                transParams.push(translationData.doctor_notes);
              }

              if (transUpdates.length > 0) {
                transParams.push(medicalRecordId, languageCode);
                await connection.execute(`
                  UPDATE medical_record_translations 
                  SET ${transUpdates.join(', ')}
                  WHERE medical_record_id = ? AND language_code = ?
                `, transParams);
              }
            } else {
              // Insert new translation
              await connection.execute(`
                INSERT INTO medical_record_translations (
                  medical_record_id, language_code,
                  chief_complaint, history_of_present_illness,
                  physical_examination, assessment, diagnosis,
                  differential_diagnosis, treatment_plan,
                  follow_up_instructions, doctor_notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                medicalRecordId,
                languageCode,
                translationData.chief_complaint || null,
                translationData.history_of_present_illness || null,
                translationData.physical_examination || null,
                translationData.assessment || null,
                translationData.diagnosis || null,
                translationData.differential_diagnosis || null,
                translationData.treatment_plan || null,
                translationData.follow_up_instructions || null,
                translationData.doctor_notes || null
              ]);
            }
          }
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث السجل الطبي بنجاح' 
          : 'Medical record updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating medical record:', error);
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث السجل الطبي' 
          : 'Error updating medical record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete medical record
   * حذف سجل طبي
   * DELETE /api/doctor/medical-records/:id
   */
  static async deleteMedicalRecord(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const { id } = req.params;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Support both ID and UUID
      const idField = isNaN(id) ? 'uuid' : 'id';

      // Verify record exists and belongs to this doctor
      const [existingRecords] = await connection.execute(`
        SELECT id, record_status FROM medical_records 
        WHERE ${idField} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (existingRecords.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'السجل الطبي غير موجود' 
            : 'Medical record not found'
        });
      }

      const record = existingRecords[0];

      // Only allow deletion of draft records
      if (record.record_status !== 'draft') {
        return res.status(403).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن حذف السجلات النهائية أو المعدلة' 
            : 'Cannot delete final or amended records'
        });
      }

      // Delete record (translations will be deleted automatically by CASCADE)
      await connection.execute(`
        DELETE FROM medical_records WHERE id = ?
      `, [record.id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم حذف السجل الطبي بنجاح' 
          : 'Medical record deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting medical record:', error);
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
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
   * Get patient's medical history
   * جلب التاريخ الطبي للمريض
   * GET /api/doctor/medical-records/patient/:patient_id/history
   */
  static async getPatientMedicalHistory(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const { patient_id } = req.params;
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Get all medical records for this patient
      const [records] = await connection.execute(`
        SELECT 
          mr.id,
          mr.uuid,
          mr.visit_date,
          mr.record_status,
          mr.vital_signs,
          mr.skin_condition_severity,
          mr.treatment_response,
          mrt.chief_complaint,
          mrt.diagnosis,
          mrt.treatment_plan,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty
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
        count: records.length,
        data: records
      });

    } catch (error) {
      console.error('Error fetching patient medical history:', error);
      const lang = DoctorMedicalRecordsController.normalizeLanguage(
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

module.exports = DoctorMedicalRecordsController;

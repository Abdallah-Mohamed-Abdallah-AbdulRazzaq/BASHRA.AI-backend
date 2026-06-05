const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Prescriptions Controller
 * Handles CRUD operations for medical prescriptions
 * Doctor access for creation, Patient & Doctor for viewing
 */

class PrescriptionsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get all prescriptions (filtered by user role)
   * GET /api/prescriptions
   */
  static async getAllPrescriptions(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userRole = req.user.role;
      const userId = req.user.id;
      const doctorId = req.user.doctor_id || req.user.id;
      
      const { 
        patient_id, 
        status, 
        medical_record_id,
        page = 1,
        limit = 20
      } = req.query;

      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      
      let query = `
        SELECT 
          p.*,
          upt.full_name as patient_name,
          dpt.full_name as doctor_name
        FROM prescriptions p
        INNER JOIN users u ON p.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON p.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE 1=1
      `;
      const params = [lang, lang];
      // Filter based on role
      if (userRole === 'user') {
        query += ' AND p.patient_id = ?';
        params.push(userId);
      } else if (userRole === 'doctor') {
        query += ' AND p.doctor_id = ?';
        params.push(doctorId);
      }

      // Additional filters
      if (patient_id) {
        query += ' AND p.patient_id = ?';
        params.push(patient_id);
      }

      if (status) {
        query += ' AND p.status = ?';
        params.push(status);
      }

      if (medical_record_id) {
        query += ' AND p.medical_record_id = ?';
        params.push(medical_record_id);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      const offset = (page - 1) * limit;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      query += ` ORDER BY p.prescribed_date DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [prescriptions] = await connection.execute(query, params);

      // Get translations for each prescription
      const formattedPrescriptions = await Promise.all(prescriptions.map(async (prescription) => {
        const [translations] = await connection.execute(
          'SELECT * FROM prescription_translations WHERE prescription_id = ? AND language_code = ?',
          [prescription.id, lang]
        );

        return {
          id: prescription.id,
          uuid: prescription.uuid,
          prescription_number: prescription.prescription_number,
          medical_record_id: prescription.medical_record_id,
          patient_id: prescription.patient_id,
          patient_name: prescription.patient_name,
          doctor_id: prescription.doctor_id,
          doctor_name: prescription.doctor_name,
          medication_name: prescription.medication_name,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
          quantity: prescription.quantity,
          route_of_administration: prescription.route_of_administration,
          refills_allowed: prescription.refills_allowed,
          refills_used: prescription.refills_used,
          is_generic_allowed: prescription.is_generic_allowed,
          status: prescription.status,
          prescribed_date: prescription.prescribed_date,
          expiry_date: prescription.expiry_date,
          filled_date: prescription.filled_date,
          translations: translations[0] || null,
          created_at: prescription.created_at,
          updated_at: prescription.updated_at
        };
      }));

      res.json({
        success: true,
        count: formattedPrescriptions.length,
        total: total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: formattedPrescriptions
      });

    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب الوصفات الطبية' : 'Error fetching prescriptions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single prescription by ID
   * GET /api/prescriptions/:id
   */
  static async getPrescriptionById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = req.headers['accept-language'] || 'ar';

      // Check if ID is UUID or numeric
      const isUUID = id.includes('-');
      let query = `
        SELECT 
          p.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          dpt.full_name as doctor_name,
          d.email as doctor_email
        FROM prescriptions p
        INNER JOIN users u ON p.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON p.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${isUUID ? 'p.uuid' : 'p.id'} = ?
      `;

      // Add role-based filter
      if (userRole === 'user') {
        query += ' AND p.patient_id = ?';
      } else if (userRole === 'doctor') {
        query += ' AND p.doctor_id = ?';
      }

      const params = userRole === 'user' ? [lang, lang, id, userId] : 
                     userRole === 'doctor' ? [lang, lang, id, doctorId] : [lang, lang, id];

      const [prescriptions] = await connection.execute(query, params);

      if (prescriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الوصفة الطبية غير موجودة'
        });
      }

      const prescription = prescriptions[0];

      // Get translations
      const [translations] = await connection.execute(
        'SELECT * FROM prescription_translations WHERE prescription_id = ?',
        [prescription.id]
      );

      const translationsMap = {};
      translations.forEach(t => {
        translationsMap[t.language_code] = {
          instructions: t.instructions,
          indication: t.indication,
          pharmacy_notes: t.pharmacy_notes
        };
      });

      const formattedPrescription = {
        id: prescription.id,
        uuid: prescription.uuid,
        prescription_number: prescription.prescription_number,
        medical_record_id: prescription.medical_record_id,
        patient: {
          id: prescription.patient_id,
          name: prescription.patient_name,
          email: prescription.patient_email,
          phone: prescription.patient_phone
        },
        doctor: {
          id: prescription.doctor_id,
          name: prescription.doctor_name,
          email: prescription.doctor_email
        },
        medication_name: prescription.medication_name,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        quantity: prescription.quantity,
        route_of_administration: prescription.route_of_administration,
        refills_allowed: prescription.refills_allowed,
        refills_used: prescription.refills_used,
        is_generic_allowed: prescription.is_generic_allowed,
        status: prescription.status,
        prescribed_date: prescription.prescribed_date,
        expiry_date: prescription.expiry_date,
        filled_date: prescription.filled_date,
        translations: translationsMap,
        created_at: prescription.created_at,
        updated_at: prescription.updated_at
      };

      res.json({
        success: true,
        data: formattedPrescription
      });

    } catch (error) {
      console.error('Error fetching prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب الوصفة الطبية' : 'Error fetching prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new prescription
   * POST /api/prescriptions
   */
  static async createPrescription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.doctor_id || req.user.id;
      let {
        medical_record_id,
        patient_id,
        medication_name,
        dosage,
        frequency,
        duration,
        quantity,
        route_of_administration,
        refills_allowed = 0,
        is_generic_allowed = true,
        expiry_date,
        translations
      } = req.body;

      // Validation
      if (!medical_record_id || !patient_id || !medication_name || !dosage || !frequency) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'medical_record_id, patient_id, medication_name, dosage, frequency مطلوبة' 
            : 'medical_record_id, patient_id, medication_name, dosage, frequency are required'
        });
      }

      // Verify medical record exists and belongs to patient
      const [medicalRecord] = await connection.execute(
        'SELECT id FROM medical_records WHERE id = ? AND patient_id = ?',
        [medical_record_id, patient_id]
      );

      if (medicalRecord.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'السجل الطبي غير موجود أو لا ينتمي للمريض' 
            : 'Medical record not found or does not belong to patient'
        });
      }

      // Convert types
      if (typeof is_generic_allowed === 'string') {
        is_generic_allowed = is_generic_allowed.toLowerCase() === 'true' || is_generic_allowed === '1';
      }

      refills_allowed = parseInt(refills_allowed) || 0;

      const uuid = uuidv4();
      const prescriptionNumber = `RX-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Insert prescription
      const [result] = await connection.execute(`
        INSERT INTO prescriptions (
          uuid, medical_record_id, patient_id, doctor_id, prescription_number,
          medication_name, dosage, frequency, duration, quantity,
          route_of_administration, refills_allowed, refills_used,
          is_generic_allowed, status, prescribed_date, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', NOW(), ?)
      `, [
        uuid,
        medical_record_id,
        patient_id,
        doctorId,
        prescriptionNumber,
        medication_name,
        dosage,
        frequency,
        duration || null,
        quantity || null,
        route_of_administration || null,
        refills_allowed,
        is_generic_allowed ? 1 : 0,
        expiry_date || null
      ]);

      const prescriptionId = result.insertId;

      // Insert translations if provided
      if (translations) {
        if (typeof translations === 'string') {
          try {
            translations = JSON.parse(translations);
          } catch (e) {
            // Skip translations if invalid JSON
            translations = null;
          }
        }

        if (translations && typeof translations === 'object') {
          for (const [langCode, trans] of Object.entries(translations)) {
            await connection.execute(`
              INSERT INTO prescription_translations (
                prescription_id, language_code, instructions, indication, pharmacy_notes
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              prescriptionId,
              langCode,
              trans.instructions || null,
              trans.indication || null,
              trans.pharmacy_notes || null
            ]);
          }
        }
      }

      await connection.commit();

      // Fetch created prescription
      const [prescription] = await connection.execute(
        'SELECT * FROM prescriptions WHERE id = ?',
        [prescriptionId]
      );

      res.status(201).json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إنشاء الوصفة الطبية بنجاح' 
          : 'Prescription created successfully',
        data: prescription[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إنشاء الوصفة الطبية' 
          : 'Error creating prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update prescription
   * PUT /api/prescriptions/:id
   */
  static async updatePrescription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      let {
        medication_name,
        dosage,
        frequency,
        duration,
        quantity,
        route_of_administration,
        refills_allowed,
        is_generic_allowed,
        status,
        expiry_date
      } = req.body;

      // Check if prescription exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, status FROM prescriptions WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id, status FROM prescriptions WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الوصفة الطبية غير موجودة'
        });
      }

      const prescriptionId = existing[0].id;
      const currentStatus = existing[0].status;

      // Prevent editing filled or cancelled prescriptions
      if (currentStatus === 'filled' || currentStatus === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن تعديل وصفة طبية تم صرفها أو إلغاؤها' 
            : 'Cannot edit filled or cancelled prescription'
        });
      }

      // Convert types
      if (is_generic_allowed !== undefined) {
        if (typeof is_generic_allowed === 'string') {
          is_generic_allowed = is_generic_allowed.toLowerCase() === 'true' || is_generic_allowed === '1';
        } else {
          is_generic_allowed = Boolean(is_generic_allowed);
        }
      }

      if (refills_allowed !== undefined) {
        refills_allowed = parseInt(refills_allowed);
      }

      // Build update query
      const updates = [];
      const values = [];

      if (medication_name !== undefined) {
        updates.push('medication_name = ?');
        values.push(medication_name);
      }
      if (dosage !== undefined) {
        updates.push('dosage = ?');
        values.push(dosage);
      }
      if (frequency !== undefined) {
        updates.push('frequency = ?');
        values.push(frequency);
      }
      if (duration !== undefined) {
        updates.push('duration = ?');
        values.push(duration || null);
      }
      if (quantity !== undefined) {
        updates.push('quantity = ?');
        values.push(quantity || null);
      }
      if (route_of_administration !== undefined) {
        updates.push('route_of_administration = ?');
        values.push(route_of_administration || null);
      }
      if (refills_allowed !== undefined) {
        updates.push('refills_allowed = ?');
        values.push(refills_allowed);
      }
      if (is_generic_allowed !== undefined) {
        updates.push('is_generic_allowed = ?');
        values.push(is_generic_allowed ? 1 : 0);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }
      if (expiry_date !== undefined) {
        updates.push('expiry_date = ?');
        values.push(expiry_date || null);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا توجد بيانات للتحديث' 
            : 'No data to update'
        });
      }

      values.push(prescriptionId);

      await connection.execute(`
        UPDATE prescriptions
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated prescription
      const [prescription] = await connection.execute(
        'SELECT * FROM prescriptions WHERE id = ?',
        [prescriptionId]
      );

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث الوصفة الطبية بنجاح' 
          : 'Prescription updated successfully',
        data: prescription[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث الوصفة الطبية' 
          : 'Error updating prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel prescription
   * PATCH /api/prescriptions/:id/cancel
   */
  static async cancelPrescription(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;

      // Check if prescription exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, status FROM prescriptions WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id, status FROM prescriptions WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'الوصفة الطبية غير موجودة' 
            : 'Prescription not found'
        });
      }

      const prescriptionId = existing[0].id;
      const currentStatus = existing[0].status;

      if (currentStatus === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'الوصفة الطبية ملغاة بالفعل' 
            : 'Prescription already cancelled'
        });
      }

      if (currentStatus === 'filled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن إلغاء وصفة طبية تم صرفها' 
            : 'Cannot cancel filled prescription'
        });
      }

      await connection.execute(
        'UPDATE prescriptions SET status = ? WHERE id = ?',
        ['cancelled', prescriptionId]
      );

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إلغاء الوصفة الطبية بنجاح' 
          : 'Prescription cancelled successfully'
      });

    } catch (error) {
      console.error('Error cancelling prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إلغاء الوصفة الطبية' 
          : 'Error cancelling prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Mark prescription as filled
   * PATCH /api/prescriptions/:id/fill
   */
  static async fillPrescription(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;

      // Check if prescription exists
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, status, refills_allowed, refills_used FROM prescriptions WHERE uuid = ?'
        : 'SELECT id, status, refills_allowed, refills_used FROM prescriptions WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' 
            ? 'الوصفة الطبية غير موجودة' 
            : 'Prescription not found'
        });
      }

      const prescriptionId = existing[0].id;
      const currentStatus = existing[0].status;
      const refillsAllowed = existing[0].refills_allowed;
      const refillsUsed = existing[0].refills_used;

      if (currentStatus === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن صرف وصفة طبية ملغاة' 
            : 'Cannot fill cancelled prescription'
        });
      }

      if (currentStatus === 'expired') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'الوصفة الطبية منتهية الصلاحية' 
            : 'Prescription expired'
        });
      }

      // Check if refills available
      if (refillsUsed >= refillsAllowed && currentStatus === 'filled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا توجد إعادات صرف متاحة' 
            : 'No refills available'
        });
      }

      // Update prescription
      if (currentStatus === 'active') {
        // First fill
        await connection.execute(
          'UPDATE prescriptions SET status = ?, filled_date = NOW(), refills_used = 1 WHERE id = ?',
          ['filled', prescriptionId]
        );
      } else {
        // Refill
        await connection.execute(
          'UPDATE prescriptions SET refills_used = refills_used + 1, filled_date = NOW() WHERE id = ?',
          [prescriptionId]
        );
      }

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم صرف الوصفة الطبية بنجاح' 
          : 'Prescription filled successfully'
      });

    } catch (error) {
      console.error('Error filling prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في صرف الوصفة الطبية' 
          : 'Error filling prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Add/Update prescription translation
   * POST /api/prescriptions/:id/translations
   */
  static async updateTranslation(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, instructions, indication, pharmacy_notes } = req.body;

      if (!language_code) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'language_code مطلوب' 
            : 'language_code is required'
        });
      }

      // Check if prescription exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescriptions WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescriptions WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الوصفة الطبية غير موجودة'
        });
      }

      const prescriptionId = existing[0].id;

      // Check if translation exists
      const [translation] = await connection.execute(
        'SELECT id FROM prescription_translations WHERE prescription_id = ? AND language_code = ?',
        [prescriptionId, language_code]
      );

      if (translation.length > 0) {
        // Update existing translation
        const updates = [];
        const values = [];

        if (instructions !== undefined) {
          updates.push('instructions = ?');
          values.push(instructions || null);
        }
        if (indication !== undefined) {
          updates.push('indication = ?');
          values.push(indication || null);
        }
        if (pharmacy_notes !== undefined) {
          updates.push('pharmacy_notes = ?');
          values.push(pharmacy_notes || null);
        }

        if (updates.length > 0) {
          values.push(translation[0].id);
          await connection.execute(`
            UPDATE prescription_translations
            SET ${updates.join(', ')}
            WHERE id = ?
          `, values);
        }
      } else {
        // Insert new translation
        await connection.execute(`
          INSERT INTO prescription_translations (
            prescription_id, language_code, instructions, indication, pharmacy_notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          prescriptionId,
          language_code,
          instructions || null,
          indication || null,
          pharmacy_notes || null
        ]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث الترجمة بنجاح' 
          : 'Translation updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating translation:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث الترجمة' 
          : 'Error updating translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get prescriptions by medical record
   * GET /api/prescriptions/medical-record/:recordId
   */
  static async getPrescriptionsByMedicalRecord(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { recordId } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;
      const doctorId = req.user.doctor_id || req.user.id;

      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      
      let query = `
        SELECT 
          p.*,
          upt.full_name as patient_name,
          dpt.full_name as doctor_name
        FROM prescriptions p
        INNER JOIN users u ON p.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON p.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE p.medical_record_id = ?
      `;
      const params = [lang, lang, recordId];

      // Add role-based filter
      if (userRole === 'user') {
        query += ' AND p.patient_id = ?';
        params.push(userId);
      } else if (userRole === 'doctor') {
        query += ' AND p.doctor_id = ?';
        params.push(doctorId);
      }

      query += ' ORDER BY p.prescribed_date DESC';

      const [prescriptions] = await connection.execute(query, params);

      res.json({
        success: true,
        count: prescriptions.length,
        data: prescriptions
      });

    } catch (error) {
      console.error('Error fetching prescriptions by medical record:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب الوصفات الطبية' 
          : 'Error fetching prescriptions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PrescriptionsController;

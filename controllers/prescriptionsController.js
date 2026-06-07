const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Prescriptions Controller
 * Handles CRUD operations for medical prescriptions.
 * Doctor access for creation/update/cancel, Patient/Doctor/Admin for viewing.
 */
class PrescriptionsController {
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return String(lang).toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  static getEntityType(req) {
    return req.user?.entityType || req.user?.role || null;
  }

  static getDoctorId(req) {
    return req.user?.doctor_id || req.user?.id;
  }

  static toPositiveInt(value, fallback, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  static parseJSON(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }

  static isValidDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  static async fetchTranslations(connection, prescriptionId, lang = null) {
    if (lang) {
      const [rows] = await connection.execute(
        'SELECT * FROM prescription_translations WHERE prescription_id = ? AND language_code = ?',
        [prescriptionId, lang]
      );
      return rows[0] || null;
    }

    const [rows] = await connection.execute(
      'SELECT * FROM prescription_translations WHERE prescription_id = ?',
      [prescriptionId]
    );

    const map = {};
    for (const row of rows) {
      map[row.language_code] = {
        instructions: row.instructions,
        indication: row.indication,
        pharmacy_notes: row.pharmacy_notes
      };
    }
    return map;
  }

  static formatPrescription(row, translations = null) {
    return {
      id: row.id,
      uuid: row.uuid,
      prescription_number: row.prescription_number,
      medical_record_id: row.medical_record_id,
      patient_id: row.patient_id,
      patient_name: row.patient_name || null,
      patient_email: row.patient_email || null,
      patient_phone: row.patient_phone || null,
      doctor_id: row.doctor_id,
      doctor_name: row.doctor_name || null,
      doctor_email: row.doctor_email || null,
      medication_id: row.medication_id || null,
      medication_name: row.medication_name,
      dosage: row.dosage,
      frequency: row.frequency,
      duration: row.duration,
      quantity: row.quantity,
      route_of_administration: row.route_of_administration,
      refills_allowed: row.refills_allowed,
      refills_used: row.refills_used,
      is_generic_allowed: row.is_generic_allowed,
      status: row.status,
      prescribed_date: row.prescribed_date,
      expiry_date: row.expiry_date,
      filled_date: row.filled_date,
      translations,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * GET /api/prescriptions
   */
  static async getAllPrescriptions(req, res) {
    const connection = await db.getConnection();

    try {
      const entityType = PrescriptionsController.getEntityType(req);
      const userId = req.user.id;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);

      const {
        patient_id,
        doctor_id,
        status,
        medical_record_id,
        page = 1,
        limit = 20
      } = req.query;

      const allowedStatuses = ['active', 'filled', 'expired', 'cancelled', 'replaced'];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? `حالة الوصفة غير صحيحة. القيم المتاحة: ${allowedStatuses.join(', ')}`
            : `Invalid prescription status. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }

      const pageNum = PrescriptionsController.toPositiveInt(page, 1, 1000000);
      const limitNum = PrescriptionsController.toPositiveInt(limit, 20, 100);
      const offsetNum = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE 1=1';
      const whereParams = [];

      if (entityType === 'user') {
        whereClause += ' AND p.patient_id = ?';
        whereParams.push(userId);
      } else if (entityType === 'doctor') {
        whereClause += ' AND p.doctor_id = ?';
        whereParams.push(doctorId);
      }

      if (patient_id) {
        whereClause += ' AND p.patient_id = ?';
        whereParams.push(patient_id);
      }

      if (doctor_id && entityType === 'admin') {
        whereClause += ' AND p.doctor_id = ?';
        whereParams.push(doctor_id);
      }

      if (status) {
        whereClause += ' AND p.status = ?';
        whereParams.push(status);
      }

      if (medical_record_id) {
        whereClause += ' AND p.medical_record_id = ?';
        whereParams.push(medical_record_id);
      }

      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM prescriptions p ${whereClause}`,
        whereParams
      );
      const total = Number(countRows[0]?.total || 0);

      const [prescriptions] = await connection.execute(`
        SELECT
          p.*,
          upt.full_name AS patient_name,
          u.email AS patient_email,
          u.phone AS patient_phone,
          dpt.full_name AS doctor_name,
          d.email AS doctor_email
        FROM prescriptions p
        LEFT JOIN users u ON p.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        ${whereClause}
        ORDER BY p.prescribed_date DESC, p.id DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, lang, ...whereParams]);

      const formattedPrescriptions = await Promise.all(
        prescriptions.map(async (prescription) => {
          const translation = await PrescriptionsController.fetchTranslations(connection, prescription.id, lang);
          return PrescriptionsController.formatPrescription(prescription, translation);
        })
      );

      res.json({
        success: true,
        count: formattedPrescriptions.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
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
   * GET /api/prescriptions/:id
   */
  static async getPrescriptionById(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const entityType = PrescriptionsController.getEntityType(req);
      const userId = req.user.id;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      let whereClause = `WHERE ${isUUID ? 'p.uuid' : 'p.id'} = ?`;
      const whereParams = [id];

      if (entityType === 'user') {
        whereClause += ' AND p.patient_id = ?';
        whereParams.push(userId);
      } else if (entityType === 'doctor') {
        whereClause += ' AND p.doctor_id = ?';
        whereParams.push(doctorId);
      }

      const [prescriptions] = await connection.execute(`
        SELECT
          p.*,
          upt.full_name AS patient_name,
          u.email AS patient_email,
          u.phone AS patient_phone,
          dpt.full_name AS doctor_name,
          d.email AS doctor_email
        FROM prescriptions p
        LEFT JOIN users u ON p.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        ${whereClause}
      `, [lang, lang, ...whereParams]);

      if (prescriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية غير موجودة' : 'Prescription not found'
        });
      }

      const translations = await PrescriptionsController.fetchTranslations(connection, prescriptions[0].id);

      res.json({
        success: true,
        data: PrescriptionsController.formatPrescription(prescriptions[0], translations)
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
   * POST /api/prescriptions
   */
  static async createPrescription(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);

      let {
        medical_record_id,
        patient_id,
        medication_id,
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

      translations = PrescriptionsController.parseJSON(translations, translations);
      refills_allowed = Math.max(Number.parseInt(refills_allowed, 10) || 0, 0);
      is_generic_allowed = PrescriptionsController.parseBoolean(is_generic_allowed, true);

      if (!medical_record_id || !patient_id || (!medication_name && !medication_id) || !dosage || !frequency) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? 'medical_record_id و patient_id و medication_name أو medication_id و dosage و frequency مطلوبة'
            : 'medical_record_id, patient_id, medication_name or medication_id, dosage, and frequency are required'
        });
      }

      if (expiry_date && !PrescriptionsController.isValidDate(expiry_date)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'صيغة تاريخ الانتهاء غير صحيحة' : 'Invalid expiry_date format'
        });
      }

      if (medication_id) {
        const [medicationRows] = await connection.execute(
          'SELECT id, name_ar, name_en FROM medications WHERE id = ? AND is_active = 1',
          [medication_id]
        );

        if (medicationRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: lang === 'ar' ? 'الدواء غير موجود أو غير نشط' : 'Medication not found or inactive'
          });
        }

        if (!medication_name) {
          medication_name = lang === 'en' && medicationRows[0].name_en
            ? medicationRows[0].name_en
            : medicationRows[0].name_ar;
        }
      }

      const [medicalRecord] = await connection.execute(
        `SELECT id, patient_id, doctor_id
         FROM medical_records
         WHERE id = ? AND patient_id = ? AND doctor_id = ?`,
        [medical_record_id, patient_id, doctorId]
      );

      if (medicalRecord.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar'
            ? 'السجل الطبي غير موجود أو لا ينتمي لهذا الطبيب والمريض'
            : 'Medical record not found or does not belong to this doctor and patient'
        });
      }

      const uuid = uuidv4();
      const prescriptionNumber = `RX-${Date.now()}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;

      const [result] = await connection.execute(`
        INSERT INTO prescriptions (
          uuid, medical_record_id, patient_id, doctor_id, medication_id, prescription_number,
          medication_name, dosage, frequency, duration, quantity,
          route_of_administration, refills_allowed, refills_used,
          is_generic_allowed, status, prescribed_date, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'active', NOW(), ?)
      `, [
        uuid,
        medical_record_id,
        patient_id,
        doctorId,
        medication_id || null,
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

      if (translations && typeof translations === 'object') {
        for (const [langCode, trans] of Object.entries(translations)) {
          if (!trans || typeof trans !== 'object') continue;
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

      await connection.commit();

      const [prescription] = await connection.execute(
        'SELECT * FROM prescriptions WHERE id = ?',
        [prescriptionId]
      );

      res.status(201).json({
        success: true,
        message: lang === 'ar' ? 'تم إنشاء الوصفة الطبية بنجاح' : 'Prescription created successfully',
        data: prescription[0]
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error creating prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إنشاء الوصفة الطبية' : 'Error creating prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * PUT /api/prescriptions/:id
   */
  static async updatePrescription(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      let {
        medication_id,
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

      const allowedStatuses = ['active', 'filled', 'expired', 'cancelled', 'replaced'];
      if (status !== undefined && !allowedStatuses.includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? `حالة الوصفة غير صحيحة. القيم المتاحة: ${allowedStatuses.join(', ')}`
            : `Invalid prescription status. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }

      if (expiry_date !== undefined && expiry_date && !PrescriptionsController.isValidDate(expiry_date)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'صيغة تاريخ الانتهاء غير صحيحة' : 'Invalid expiry_date format'
        });
      }

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id, status FROM prescriptions WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`,
        [id, doctorId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية غير موجودة' : 'Prescription not found'
        });
      }

      const prescriptionId = existing[0].id;
      const currentStatus = existing[0].status;

      if (['filled', 'cancelled'].includes(currentStatus)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? 'لا يمكن تعديل وصفة طبية تم صرفها أو إلغاؤها'
            : 'Cannot edit filled or cancelled prescription'
        });
      }

      if (medication_id !== undefined && medication_id !== null && medication_id !== '') {
        const [medicationRows] = await connection.execute(
          'SELECT id, name_ar, name_en FROM medications WHERE id = ? AND is_active = 1',
          [medication_id]
        );

        if (medicationRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: lang === 'ar' ? 'الدواء غير موجود أو غير نشط' : 'Medication not found or inactive'
          });
        }

        if (!medication_name) {
          medication_name = lang === 'en' && medicationRows[0].name_en
            ? medicationRows[0].name_en
            : medicationRows[0].name_ar;
        }
      }

      if (is_generic_allowed !== undefined) {
        is_generic_allowed = PrescriptionsController.parseBoolean(is_generic_allowed, true);
      }

      if (refills_allowed !== undefined) {
        refills_allowed = Math.max(Number.parseInt(refills_allowed, 10) || 0, 0);
      }

      const updates = [];
      const values = [];

      const addUpdate = (field, value) => {
        updates.push(`${field} = ?`);
        values.push(value);
      };

      if (medication_id !== undefined) addUpdate('medication_id', medication_id || null);
      if (medication_name !== undefined) addUpdate('medication_name', medication_name);
      if (dosage !== undefined) addUpdate('dosage', dosage);
      if (frequency !== undefined) addUpdate('frequency', frequency);
      if (duration !== undefined) addUpdate('duration', duration || null);
      if (quantity !== undefined) addUpdate('quantity', quantity || null);
      if (route_of_administration !== undefined) addUpdate('route_of_administration', route_of_administration || null);
      if (refills_allowed !== undefined) addUpdate('refills_allowed', refills_allowed);
      if (is_generic_allowed !== undefined) addUpdate('is_generic_allowed', is_generic_allowed ? 1 : 0);
      if (status !== undefined) addUpdate('status', status);
      if (expiry_date !== undefined) addUpdate('expiry_date', expiry_date || null);

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا توجد بيانات للتحديث' : 'No data to update'
        });
      }

      values.push(prescriptionId);
      await connection.execute(`UPDATE prescriptions SET ${updates.join(', ')} WHERE id = ?`, values);
      await connection.commit();

      const [prescription] = await connection.execute('SELECT * FROM prescriptions WHERE id = ?', [prescriptionId]);

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم تحديث الوصفة الطبية بنجاح' : 'Prescription updated successfully',
        data: prescription[0]
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error updating prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في تحديث الوصفة الطبية' : 'Error updating prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * PATCH /api/prescriptions/:id/cancel
   */
  static async cancelPrescription(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      const [existing] = await connection.execute(
        `SELECT id, status FROM prescriptions WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`,
        [id, doctorId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية غير موجودة' : 'Prescription not found'
        });
      }

      const prescriptionId = existing[0].id;
      const currentStatus = existing[0].status;

      if (currentStatus === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية ملغاة بالفعل' : 'Prescription already cancelled'
        });
      }

      if (currentStatus === 'filled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا يمكن إلغاء وصفة طبية تم صرفها' : 'Cannot cancel filled prescription'
        });
      }

      await connection.execute('UPDATE prescriptions SET status = ? WHERE id = ?', ['cancelled', prescriptionId]);

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم إلغاء الوصفة الطبية بنجاح' : 'Prescription cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إلغاء الوصفة الطبية' : 'Error cancelling prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * PATCH /api/prescriptions/:id/fill
   */
  static async fillPrescription(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      const [existing] = await connection.execute(
        `SELECT id, status, refills_allowed, refills_used, expiry_date FROM prescriptions WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية غير موجودة' : 'Prescription not found'
        });
      }

      const prescription = existing[0];
      const prescriptionId = prescription.id;

      if (prescription.expiry_date) {
        const expiry = new Date(prescription.expiry_date);
        const today = new Date();
        expiry.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (expiry < today && prescription.status !== 'expired') {
          await connection.execute('UPDATE prescriptions SET status = ? WHERE id = ?', ['expired', prescriptionId]);
          prescription.status = 'expired';
        }
      }

      if (prescription.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا يمكن صرف وصفة طبية ملغاة' : 'Cannot fill cancelled prescription'
        });
      }

      if (prescription.status === 'expired') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية منتهية الصلاحية' : 'Prescription expired'
        });
      }

      if (prescription.status === 'active') {
        await connection.execute(
          'UPDATE prescriptions SET status = ?, filled_date = NOW() WHERE id = ?',
          ['filled', prescriptionId]
        );
      } else if (prescription.status === 'filled') {
        const refillsAllowed = Number(prescription.refills_allowed || 0);
        const refillsUsed = Number(prescription.refills_used || 0);
        if (refillsUsed >= refillsAllowed) {
          return res.status(400).json({
            success: false,
            message: lang === 'ar' ? 'لا توجد إعادات صرف متاحة' : 'No refills available'
          });
        }

        await connection.execute(
          'UPDATE prescriptions SET refills_used = refills_used + 1, filled_date = NOW() WHERE id = ?',
          [prescriptionId]
        );
      } else {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا يمكن صرف هذه الوصفة' : 'Cannot fill this prescription'
        });
      }

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم صرف الوصفة الطبية بنجاح' : 'Prescription filled successfully'
      });
    } catch (error) {
      console.error('Error filling prescription:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في صرف الوصفة الطبية' : 'Error filling prescription',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * POST /api/prescriptions/:id/translations
   */
  static async updateTranslation(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, instructions, indication, pharmacy_notes } = req.body;

      if (!language_code || !['ar', 'en'].includes(language_code)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'language_code يجب أن يكون ar أو en' : 'language_code must be ar or en'
        });
      }

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id FROM prescriptions WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`,
        [id, doctorId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الوصفة الطبية غير موجودة' : 'Prescription not found'
        });
      }

      const prescriptionId = existing[0].id;

      await connection.execute(`
        INSERT INTO prescription_translations (
          prescription_id, language_code, instructions, indication, pharmacy_notes
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          instructions = VALUES(instructions),
          indication = VALUES(indication),
          pharmacy_notes = VALUES(pharmacy_notes)
      `, [
        prescriptionId,
        language_code,
        instructions || null,
        indication || null,
        pharmacy_notes || null
      ]);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم تحديث الترجمة بنجاح' : 'Translation updated successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error updating translation:', error);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في تحديث الترجمة' : 'Error updating translation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/prescriptions/medical-record/:recordId
   */
  static async getPrescriptionsByMedicalRecord(req, res) {
    const connection = await db.getConnection();

    try {
      const { recordId } = req.params;
      const entityType = PrescriptionsController.getEntityType(req);
      const userId = req.user.id;
      const doctorId = PrescriptionsController.getDoctorId(req);
      const lang = PrescriptionsController.normalizeLanguage(req.headers['accept-language'], null);

      let whereClause = 'WHERE p.medical_record_id = ?';
      const whereParams = [recordId];

      if (entityType === 'user') {
        whereClause += ' AND p.patient_id = ?';
        whereParams.push(userId);
      } else if (entityType === 'doctor') {
        whereClause += ' AND p.doctor_id = ?';
        whereParams.push(doctorId);
      }

      const [prescriptions] = await connection.execute(`
        SELECT
          p.*,
          upt.full_name AS patient_name,
          dpt.full_name AS doctor_name
        FROM prescriptions p
        LEFT JOIN users u ON p.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON p.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        ${whereClause}
        ORDER BY p.prescribed_date DESC, p.id DESC
      `, [lang, lang, ...whereParams]);

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
        message: lang === 'ar' ? 'خطأ في جلب الوصفات الطبية' : 'Error fetching prescriptions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PrescriptionsController;

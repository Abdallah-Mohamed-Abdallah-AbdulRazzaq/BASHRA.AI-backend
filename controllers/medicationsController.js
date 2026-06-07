const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const safeJSONParse = (data, fallback = []) => {
  if (data === undefined || data === null || data === '') return fallback;
  if (typeof data === 'object') return data;
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === 'string') return JSON.parse(parsed);
      return parsed;
    } catch (_err) {
      return fallback;
    }
  }
  return fallback;
};

class MedicationsController {
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return String(lang).toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  static toPositiveInt(value, fallback, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static parseBoolean(value, fallback = true) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  static formatMedication(med, lang) {
    return {
      id: med.id,
      uuid: med.uuid,
      name: lang === 'en' && med.name_en ? med.name_en : med.name_ar,
      name_ar: med.name_ar,
      name_en: med.name_en,
      scientific_name: med.scientific_name,
      category: med.category,
      form_type: med.form_type,
      available_dosages: safeJSONParse(med.available_dosages),
      indications: med.indications,
      warning_alert: med.warning_alert,
      is_active: med.is_active,
      created_by: med.created_by_doctor_id ? {
        type: 'doctor',
        doctor_id: med.created_by_doctor_id,
        doctor_name: med.creator_doctor_name || null,
        doctor_email: med.creator_doctor_email || null
      } : {
        type: 'admin',
        verified: true
      },
      created_at: med.created_at,
      updated_at: med.updated_at
    };
  }

  /**
   * GET /api/medications
   */
  static async getAllMedications(req, res) {
    const connection = await db.getConnection();

    try {
      const lang = MedicationsController.normalizeLanguage(req.headers['accept-language'], null);
      const {
        is_active,
        category,
        form_type,
        search,
        page = 1,
        limit = 20
      } = req.query;

      const validFormTypes = ['tablet', 'capsule', 'syrup', 'cream', 'ointment', 'injection', 'drops', 'inhaler', 'suppository', 'sachet', 'other'];
      if (form_type && !validFormTypes.includes(form_type)) {
        return res.status(400).json({
          success: false,
          message: `نوع الدواء غير صالح. الأنواع المتاحة: ${validFormTypes.join(', ')}`
        });
      }

      const pageNum = MedicationsController.toPositiveInt(page, 1, 1000000);
      const limitNum = MedicationsController.toPositiveInt(limit, 20, 100);
      const offsetNum = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE 1=1';
      const whereParams = [];

      if (is_active !== undefined) {
        whereClause += ' AND m.is_active = ?';
        whereParams.push(MedicationsController.parseBoolean(is_active, true) ? 1 : 0);
      }

      if (category) {
        whereClause += ' AND m.category = ?';
        whereParams.push(category);
      }

      if (form_type) {
        whereClause += ' AND m.form_type = ?';
        whereParams.push(form_type);
      }

      if (search) {
        whereClause += ' AND (m.name_ar LIKE ? OR m.name_en LIKE ? OR m.scientific_name LIKE ?)';
        const pattern = `%${search}%`;
        whereParams.push(pattern, pattern, pattern);
      }

      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM medications m ${whereClause}`,
        whereParams
      );
      const total = Number(countRows[0]?.total || 0);

      const [medications] = await connection.execute(`
        SELECT
          m.*,
          COALESCE(dpt.full_name, dpt_en.full_name) AS creator_doctor_name,
          d.email AS creator_doctor_email
        FROM medications m
        LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN doctor_profile_translations dpt_en
          ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        ${whereClause}
        ORDER BY m.name_ar ASC, m.id ASC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, ...whereParams]);

      const formattedMedications = medications.map((med) => MedicationsController.formatMedication(med, lang));

      res.json({
        success: true,
        count: formattedMedications.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: formattedMedications
      });
    } catch (error) {
      console.error('Error fetching medications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأدوية',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/medications/:id
   */
  static async getMedicationById(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const lang = MedicationsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      const [medications] = await connection.execute(`
        SELECT
          m.*,
          COALESCE(dpt.full_name, dpt_en.full_name) AS creator_doctor_name,
          d.email AS creator_doctor_email
        FROM medications m
        LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN doctor_profile_translations dpt_en
          ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        WHERE ${isUUID ? 'm.uuid' : 'm.id'} = ?
      `, [lang, id]);

      if (medications.length === 0) {
        return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
      }

      res.json({
        success: true,
        data: MedicationsController.formatMedication(medications[0], lang)
      });
    } catch (error) {
      console.error('Error fetching medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الدواء',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * POST /api/medications
   */
  static async createMedication(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const entityType = req.user.entityType || req.user.role;
      const doctorId = req.user.id;

      let {
        name_ar,
        name_en,
        scientific_name,
        category,
        form_type = 'tablet',
        available_dosages,
        indications,
        warning_alert,
        is_active = true
      } = req.body;

      if (!name_ar || !name_en) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'اسم الدواء بالعربية والإنجليزية مطلوب' });
      }

      const validFormTypes = ['tablet', 'capsule', 'syrup', 'cream', 'ointment', 'injection', 'drops', 'inhaler', 'suppository', 'sachet', 'other'];
      if (!validFormTypes.includes(form_type)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `نوع الدواء غير صالح. الأنواع المتاحة: ${validFormTypes.join(', ')}`
        });
      }

      const [existing] = await connection.execute(
        'SELECT id FROM medications WHERE name_ar = ? OR name_en = ?',
        [name_ar, name_en]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'الدواء موجود بالفعل' });
      }

      is_active = MedicationsController.parseBoolean(is_active, true);
      available_dosages = safeJSONParse(available_dosages, null);

      const uuid = uuidv4();
      const createdByDoctorId = entityType === 'doctor' ? doctorId : null;

      const [result] = await connection.execute(`
        INSERT INTO medications (
          uuid, created_by_doctor_id, name_ar, name_en, scientific_name, category,
          form_type, available_dosages, indications, warning_alert, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid,
        createdByDoctorId,
        name_ar,
        name_en,
        scientific_name || null,
        category || null,
        form_type,
        available_dosages ? JSON.stringify(available_dosages) : null,
        indications || null,
        warning_alert || null,
        is_active ? 1 : 0
      ]);

      await connection.commit();

      const [medication] = await connection.execute('SELECT * FROM medications WHERE id = ?', [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إضافة الدواء بنجاح',
        data: MedicationsController.formatMedication(medication[0], 'ar')
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error creating medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة الدواء',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * PUT /api/medications/:id
   */
  static async updateMedication(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      let {
        name_ar,
        name_en,
        scientific_name,
        category,
        form_type,
        available_dosages,
        indications,
        warning_alert,
        is_active
      } = req.body;

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id FROM medications WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
      }

      const medicationId = existing[0].id;

      const validFormTypes = ['tablet', 'capsule', 'syrup', 'cream', 'ointment', 'injection', 'drops', 'inhaler', 'suppository', 'sachet', 'other'];
      if (form_type !== undefined && !validFormTypes.includes(form_type)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `نوع الدواء غير صالح. الأنواع المتاحة: ${validFormTypes.join(', ')}`
        });
      }

      if (available_dosages !== undefined) {
        available_dosages = safeJSONParse(available_dosages, null);
      }

      if (is_active !== undefined) {
        is_active = MedicationsController.parseBoolean(is_active, true);
      }

      const updates = [];
      const values = [];
      const addUpdate = (field, value) => {
        updates.push(`${field} = ?`);
        values.push(value);
      };

      if (name_ar !== undefined) addUpdate('name_ar', name_ar);
      if (name_en !== undefined) addUpdate('name_en', name_en);
      if (scientific_name !== undefined) addUpdate('scientific_name', scientific_name || null);
      if (category !== undefined) addUpdate('category', category || null);
      if (form_type !== undefined) addUpdate('form_type', form_type);
      if (available_dosages !== undefined) addUpdate('available_dosages', available_dosages ? JSON.stringify(available_dosages) : null);
      if (indications !== undefined) addUpdate('indications', indications || null);
      if (warning_alert !== undefined) addUpdate('warning_alert', warning_alert || null);
      if (is_active !== undefined) addUpdate('is_active', is_active ? 1 : 0);

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'لا توجد بيانات للتحديث' });
      }

      values.push(medicationId);
      await connection.execute(`UPDATE medications SET ${updates.join(', ')} WHERE id = ?`, values);
      await connection.commit();

      const [medication] = await connection.execute('SELECT * FROM medications WHERE id = ?', [medicationId]);

      res.json({
        success: true,
        message: 'تم تحديث الدواء بنجاح',
        data: MedicationsController.formatMedication(medication[0], 'ar')
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error updating medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الدواء',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async deleteMedication(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id FROM medications WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
      }

      const medicationId = existing[0].id;

      const [templateUsage] = await connection.execute(
        'SELECT COUNT(*) AS count FROM prescription_template_items WHERE medication_id = ?',
        [medicationId]
      );

      if (Number(templateUsage[0]?.count || 0) > 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف الدواء لأنه مستخدم في قوالب وصفات طبية',
          templates_count: Number(templateUsage[0].count)
        });
      }

      await connection.execute('DELETE FROM medications WHERE id = ?', [medicationId]);

      res.json({ success: true, message: 'تم حذف الدواء بنجاح' });
    } catch (error) {
      console.error('Error deleting medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الدواء',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async toggleMedicationStatus(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id, is_active FROM medications WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'الدواء غير موجود' });
      }

      const medicationId = existing[0].id;
      const newStatus = existing[0].is_active === 1 ? 0 : 1;

      await connection.execute('UPDATE medications SET is_active = ? WHERE id = ?', [newStatus, medicationId]);

      res.json({
        success: true,
        message: `تم ${newStatus === 1 ? 'تفعيل' : 'إلغاء تفعيل'} الدواء بنجاح`,
        is_active: newStatus === 1
      });
    } catch (error) {
      console.error('Error toggling medication status:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تغيير حالة الدواء',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async getMedicationsByCategory(req, res) {
    const connection = await db.getConnection();

    try {
      const { category } = req.params;
      const lang = MedicationsController.normalizeLanguage(req.headers['accept-language'], null);

      const [medications] = await connection.execute(
        'SELECT * FROM medications WHERE category = ? AND is_active = 1 ORDER BY name_ar ASC, id ASC',
        [category]
      );

      res.json({
        success: true,
        category,
        count: medications.length,
        data: medications.map((med) => MedicationsController.formatMedication(med, lang))
      });
    } catch (error) {
      console.error('Error fetching medications by category:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأدوية',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async getMedicationCategories(req, res) {
    const connection = await db.getConnection();

    try {
      const [categories] = await connection.execute(
        'SELECT DISTINCT category FROM medications WHERE category IS NOT NULL AND is_active = 1 ORDER BY category ASC'
      );

      res.json({
        success: true,
        count: categories.length,
        data: categories.map((category) => category.category)
      });
    } catch (error) {
      console.error('Error fetching medication categories:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تصنيفات الأدوية',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = MedicationsController;

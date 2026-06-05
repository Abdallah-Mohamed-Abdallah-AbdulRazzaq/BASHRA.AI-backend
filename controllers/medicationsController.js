const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Safe JSON parse helper function
 * Handles various JSON parsing scenarios including double-encoded strings
 */
const safeJSONParse = (data) => {
  if (!data) return [];
  
  // If already an array or object, return it
  if (typeof data === 'object') return data;
  
  // If it's a string, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      // If the result is still a string, try parsing again (double-encoded case)
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      console.error('JSON parse error:', e.message, 'Data:', data);
      return [];
    }
  }
  
  return [];
};

/**
 * Medications Controller
 * Handles CRUD operations for medications directory
 * Admin & Doctor access
 */

class MedicationsController {
  /**
   * Get all medications with filtering and search
   * GET /api/medications
   */
  static async getAllMedications(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';
      const { 
        is_active, 
        category, 
        form_type, 
        search,
        page = 1,
        limit = 20
      } = req.query;

      // Convert pagination params to integers
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;

      let query = `
        SELECT 
          m.*,
          COALESCE(dpt.full_name, dpt_en.full_name) as creator_doctor_name,
          d.email as creator_doctor_email
        FROM medications m
        LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        WHERE 1=1
      `;
      const params = [lang];

      // Filter by active status
      if (is_active !== undefined) {
        query += ' AND m.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      // Filter by category
      if (category) {
        query += ' AND m.category = ?';
        params.push(category);
      }

      // Filter by form type
      if (form_type) {
        query += ' AND m.form_type = ?';
        params.push(form_type);
      }

      // Search by name (Arabic or English)
      if (search) {
        query += ' AND (m.name_ar LIKE ? OR m.name_en LIKE ? OR m.scientific_name LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/i, 
        'SELECT COUNT(DISTINCT m.id) as total FROM'
      );
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination - create new params array for main query
      const offset = (pageNum - 1) * limitNum;
      
      // Validate pagination values
      if (isNaN(limitNum) || isNaN(offset) || limitNum <= 0 || offset < 0) {
        return res.status(400).json({
          success: false,
          message: 'قيم الصفحة غير صحيحة'
        });
      }
      
      // Use interpolation for LIMIT and OFFSET since they are validated numbers
      // This avoids the "Incorrect arguments to mysqld_stmt_execute" error with LIMIT parameters
      query += ` ORDER BY m.name_ar ASC LIMIT ${limitNum} OFFSET ${offset}`;
      
      // Use original params for WHERE clause only
      const [medications] = await connection.execute(query, params);

      // Format medications
      const formattedMedications = medications.map(med => ({
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
          doctor_name: med.creator_doctor_name,
          doctor_email: med.creator_doctor_email
        } : {
          type: 'admin',
          verified: true
        },
        created_at: med.created_at,
        updated_at: med.updated_at
      }));

      res.json({
        success: true,
        count: formattedMedications.length,
        total: total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: formattedMedications
      });

    } catch (error) {
      console.error('Error fetching medications:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأدوية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single medication by ID or UUID
   * GET /api/medications/:id
   */
  static async getMedicationById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const lang = req.headers['accept-language'] || 'ar';

      // Check if ID is UUID or numeric
      const isUUID = id.includes('-');
      const query = isUUID 
        ? `SELECT m.*, COALESCE(dpt.full_name, dpt_en.full_name) as creator_doctor_name, d.email as creator_doctor_email
           FROM medications m
           LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
           LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
           LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
           LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
           WHERE m.uuid = ?`
        : `SELECT m.*, COALESCE(dpt.full_name, dpt_en.full_name) as creator_doctor_name, d.email as creator_doctor_email
           FROM medications m
           LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
           LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
           LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
           LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
           WHERE m.id = ?`;

      const [medications] = await connection.execute(query, [id]);

      if (medications.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الدواء غير موجود'
        });
      }

      const med = medications[0];
      const formattedMedication = {
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
          doctor_name: med.creator_doctor_name,
          doctor_email: med.creator_doctor_email
        } : {
          type: 'admin',
          verified: true
        },
        created_at: med.created_at,
        updated_at: med.updated_at
      };

      res.json({
        success: true,
        data: formattedMedication
      });

    } catch (error) {
      console.error('Error fetching medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الدواء',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new medication
   * POST /api/medications
   */
  static async createMedication(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userRole = req.user.entityType; // Changed from req.user.role
      const doctorId = req.user.id; // Changed from req.user.doctor_id || req.user.id

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

      // Validation
      if (!name_ar || !name_en) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'اسم الدواء بالعربية والإنجليزية مطلوب'
        });
      }

      // Check if medication already exists
      const [existing] = await connection.execute(
        'SELECT id FROM medications WHERE name_ar = ? OR name_en = ?',
        [name_ar, name_en]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'الدواء موجود بالفعل'
        });
      }

      // Convert types
      if (typeof is_active === 'string') {
        is_active = is_active.toLowerCase() === 'true' || is_active === '1';
      }

      // Parse available_dosages if string
      if (typeof available_dosages === 'string') {
        try {
          available_dosages = JSON.parse(available_dosages);
        } catch (e) {
          available_dosages = null;
        }
      }

      // Validate form_type
      const validFormTypes = ['tablet', 'capsule', 'syrup', 'cream', 'ointment', 'injection', 'drops', 'inhaler', 'suppository', 'sachet', 'other'];
      if (!validFormTypes.includes(form_type)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `نوع الدواء غير صالح. الأنواع المتاحة: ${validFormTypes.join(', ')}`
        });
      }

      const uuid = uuidv4();
      
      // Determine created_by_doctor_id
      // NULL for Admin, doctor_id for Doctor
      const createdByDoctorId = userRole === 'doctor' ? doctorId : null;

      // Insert medication
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

      // Fetch created medication with doctor info
      const [medication] = await connection.execute(`
        SELECT 
          m.*,
          COALESCE(dpt.full_name, dpt_en.full_name) as creator_doctor_name,
          d.email as creator_doctor_email
        FROM medications m
        LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        WHERE m.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إضافة الدواء بنجاح',
        data: {
          ...medication[0],
          available_dosages: safeJSONParse(medication[0].available_dosages),
          created_by: medication[0].created_by_doctor_id ? {
            type: 'doctor',
            doctor_id: medication[0].created_by_doctor_id,
            doctor_name: medication[0].creator_doctor_name,
            doctor_email: medication[0].creator_doctor_email
          } : {
            type: 'admin',
            verified: true
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة الدواء',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update medication
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

      // Check if medication exists
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM medications WHERE uuid = ?'
        : 'SELECT id FROM medications WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الدواء غير موجود'
        });
      }

      const medicationId = existing[0].id;

      // Convert types
      if (is_active !== undefined) {
        if (typeof is_active === 'string') {
          is_active = is_active.toLowerCase() === 'true' || is_active === '1';
        } else {
          is_active = Boolean(is_active);
        }
      }

      // Parse available_dosages if string
      if (available_dosages !== undefined && typeof available_dosages === 'string') {
        try {
          available_dosages = JSON.parse(available_dosages);
        } catch (e) {
          available_dosages = null;
        }
      }

      // Validate form_type if provided
      if (form_type !== undefined) {
        const validFormTypes = ['tablet', 'capsule', 'syrup', 'cream', 'ointment', 'injection', 'drops', 'inhaler', 'suppository', 'sachet', 'other'];
        if (!validFormTypes.includes(form_type)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `نوع الدواء غير صالح. الأنواع المتاحة: ${validFormTypes.join(', ')}`
          });
        }
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (name_ar !== undefined) {
        updates.push('name_ar = ?');
        values.push(name_ar);
      }
      if (name_en !== undefined) {
        updates.push('name_en = ?');
        values.push(name_en);
      }
      if (scientific_name !== undefined) {
        updates.push('scientific_name = ?');
        values.push(scientific_name || null);
      }
      if (category !== undefined) {
        updates.push('category = ?');
        values.push(category || null);
      }
      if (form_type !== undefined) {
        updates.push('form_type = ?');
        values.push(form_type);
      }
      if (available_dosages !== undefined) {
        updates.push('available_dosages = ?');
        values.push(available_dosages ? JSON.stringify(available_dosages) : null);
      }
      if (indications !== undefined) {
        updates.push('indications = ?');
        values.push(indications || null);
      }
      if (warning_alert !== undefined) {
        updates.push('warning_alert = ?');
        values.push(warning_alert || null);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(medicationId);

      await connection.execute(`
        UPDATE medications
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated medication with doctor info
      const [medication] = await connection.execute(`
        SELECT 
          m.*,
          COALESCE(dpt.full_name, dpt_en.full_name) as creator_doctor_name,
          d.email as creator_doctor_email
        FROM medications m
        LEFT JOIN doctors d ON m.created_by_doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        WHERE m.id = ?
      `, [medicationId]);

      res.json({
        success: true,
        message: 'تم تحديث الدواء بنجاح',
        data: {
          ...medication[0],
          available_dosages: safeJSONParse(medication[0].available_dosages),
          created_by: medication[0].created_by_doctor_id ? {
            type: 'doctor',
            doctor_id: medication[0].created_by_doctor_id,
            doctor_name: medication[0].creator_doctor_name,
            doctor_email: medication[0].creator_doctor_email
          } : {
            type: 'admin',
            verified: true
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الدواء',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete medication
   * DELETE /api/medications/:id
   */
  static async deleteMedication(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;

      // Check if medication exists
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM medications WHERE uuid = ?'
        : 'SELECT id FROM medications WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الدواء غير موجود'
        });
      }

      const medicationId = existing[0].id;

      // Check if medication is used in any template
      const [usage] = await connection.execute(
        'SELECT COUNT(*) as count FROM prescription_template_items WHERE medication_id = ?',
        [medicationId]
      );

      if (usage[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف الدواء لأنه مستخدم في قوالب وصفات طبية',
          templates_count: usage[0].count
        });
      }

      // Delete medication
      await connection.execute(
        'DELETE FROM medications WHERE id = ?',
        [medicationId]
      );

      res.json({
        success: true,
        message: 'تم حذف الدواء بنجاح'
      });

    } catch (error) {
      console.error('Error deleting medication:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الدواء',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Toggle medication active status
   * PATCH /api/medications/:id/toggle-status
   */
  static async toggleMedicationStatus(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;

      // Check if medication exists
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, is_active FROM medications WHERE uuid = ?'
        : 'SELECT id, is_active FROM medications WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الدواء غير موجود'
        });
      }

      const medicationId = existing[0].id;
      const newStatus = existing[0].is_active === 1 ? 0 : 1;

      await connection.execute(
        'UPDATE medications SET is_active = ? WHERE id = ?',
        [newStatus, medicationId]
      );

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
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get medications by category
   * GET /api/medications/category/:category
   */
  static async getMedicationsByCategory(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { category } = req.params;
      const lang = req.headers['accept-language'] || 'ar';

      const [medications] = await connection.execute(
        'SELECT * FROM medications WHERE category = ? AND is_active = 1 ORDER BY name_ar ASC',
        [category]
      );

      const formattedMedications = medications.map(med => ({
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
        warning_alert: med.warning_alert
      }));

      res.json({
        success: true,
        category: category,
        count: formattedMedications.length,
        data: formattedMedications
      });

    } catch (error) {
      console.error('Error fetching medications by category:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأدوية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all medication categories
   * GET /api/medications/categories/list
   */
  static async getMedicationCategories(req, res) {
    const connection = await db.getConnection();
    
    try {
      const [categories] = await connection.execute(
        'SELECT DISTINCT category FROM medications WHERE category IS NOT NULL AND is_active = 1 ORDER BY category ASC'
      );

      res.json({
        success: true,
        count: categories.length,
        data: categories.map(c => c.category)
      });

    } catch (error) {
      console.error('Error fetching medication categories:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تصنيفات الأدوية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = MedicationsController;

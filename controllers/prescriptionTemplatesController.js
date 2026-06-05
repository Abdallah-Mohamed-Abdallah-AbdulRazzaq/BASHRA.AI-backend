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
 * Prescription Templates Controller
 * Handles CRUD operations for prescription templates
 * Doctor only access (each doctor manages their own templates)
 */

class PrescriptionTemplatesController {
  /**
   * Get all templates for logged-in doctor
   * GET /api/prescription-templates
   */
  static async getAllTemplates(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const { include_items } = req.query;

      const [templates] = await connection.execute(
        'SELECT * FROM prescription_templates WHERE doctor_id = ? ORDER BY usage_count DESC, created_at DESC',
        [doctorId]
      );

      // Format templates
      let formattedTemplates = templates.map(template => ({
        id: template.id,
        uuid: template.uuid,
        template_name: template.template_name,
        description: template.description,
        usage_count: template.usage_count,
        created_at: template.created_at,
        updated_at: template.updated_at
      }));

      // Include template items if requested
      if (include_items === 'true' || include_items === '1') {
        for (let template of formattedTemplates) {
          const [items] = await connection.execute(`
            SELECT 
              pti.id,
              pti.default_dosage,
              pti.default_frequency,
              pti.default_duration,
              pti.default_instructions,
              pti.default_quantity,
              m.id as medication_id,
              m.uuid as medication_uuid,
              m.name_ar as medication_name_ar,
              m.name_en as medication_name_en,
              m.scientific_name,
              m.form_type,
              m.available_dosages
            FROM prescription_template_items pti
            INNER JOIN medications m ON pti.medication_id = m.id
            WHERE pti.template_id = ?
            ORDER BY pti.id ASC
          `, [template.id]);

          template.items = items.map(item => ({
            ...item,
            available_dosages: safeJSONParse(item.available_dosages)
          }));
        }
      }

      res.json({
        success: true,
        count: formattedTemplates.length,
        data: formattedTemplates
      });

    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب القوالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single template by ID
   * GET /api/prescription-templates/:id
   */
  static async getTemplateById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;

      // Check if ID is UUID or numeric
      const isUUID = id.includes('-');
      const query = isUUID 
        ? 'SELECT * FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT * FROM prescription_templates WHERE id = ? AND doctor_id = ?';

      const [templates] = await connection.execute(query, [id, doctorId]);

      if (templates.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const template = templates[0];

      // Get template items
      const [items] = await connection.execute(`
        SELECT 
          pti.id,
          pti.default_dosage,
          pti.default_frequency,
          pti.default_duration,
          pti.default_instructions,
          pti.default_quantity,
          m.id as medication_id,
          m.uuid as medication_uuid,
          m.name_ar as medication_name_ar,
          m.name_en as medication_name_en,
          m.scientific_name,
          m.form_type,
          m.available_dosages
        FROM prescription_template_items pti
        INNER JOIN medications m ON pti.medication_id = m.id
        WHERE pti.template_id = ?
        ORDER BY pti.id ASC
      `, [template.id]);

      const formattedTemplate = {
        id: template.id,
        uuid: template.uuid,
        template_name: template.template_name,
        description: template.description,
        usage_count: template.usage_count,
        created_at: template.created_at,
        updated_at: template.updated_at,
        items: items.map(item => ({
          ...item,
          available_dosages: safeJSONParse(item.available_dosages)
        }))
      };

      res.json({
        success: true,
        data: formattedTemplate
      });

    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new template with items
   * POST /api/prescription-templates
   */
  static async createTemplate(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.doctor_id || req.user.id;
      let { template_name, description, items } = req.body;

      // Validation
      if (!template_name) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'اسم القالب مطلوب'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'يجب إضافة دواء واحد على الأقل للقالب'
        });
      }

      // Parse items if string
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'صيغة الأدوية غير صحيحة'
          });
        }
      }

      const uuid = uuidv4();

      // Insert template
      const [result] = await connection.execute(`
        INSERT INTO prescription_templates (
          uuid, doctor_id, template_name, description, usage_count
        ) VALUES (?, ?, ?, ?, 0)
      `, [uuid, doctorId, template_name, description || null]);

      const templateId = result.insertId;

      // Insert template items
      const addedItems = [];
      const errors = [];

      for (const item of items) {
        try {
          const {
            medication_id,
            default_dosage,
            default_frequency,
            default_duration,
            default_instructions,
            default_quantity
          } = item;

          // Validate required fields
          if (!medication_id || !default_dosage || !default_frequency) {
            errors.push({
              medication_id,
              error: 'medication_id, default_dosage, default_frequency مطلوبة'
            });
            continue;
          }

          // Check if medication exists
          const [medication] = await connection.execute(
            'SELECT id FROM medications WHERE id = ? AND is_active = 1',
            [medication_id]
          );

          if (medication.length === 0) {
            errors.push({
              medication_id,
              error: 'الدواء غير موجود أو غير مفعل'
            });
            continue;
          }

          // Insert item
          await connection.execute(`
            INSERT INTO prescription_template_items (
              template_id, medication_id, default_dosage, default_frequency,
              default_duration, default_instructions, default_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            templateId,
            medication_id,
            default_dosage,
            default_frequency,
            default_duration || null,
            default_instructions || null,
            default_quantity || null
          ]);

          addedItems.push({ medication_id });

        } catch (itemError) {
          errors.push({
            medication_id: item.medication_id,
            error: itemError.message
          });
        }
      }

      if (addedItems.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'فشل إضافة جميع الأدوية',
          errors
        });
      }

      await connection.commit();

      // Fetch created template with items
      const [template] = await connection.execute(
        'SELECT * FROM prescription_templates WHERE id = ?',
        [templateId]
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء القالب بنجاح',
        data: template[0],
        added_items: addedItems.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update template (name and description only)
   * PUT /api/prescription-templates/:id
   */
  static async updateTemplate(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const { template_name, description } = req.body;

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Build update query
      const updates = [];
      const values = [];

      if (template_name !== undefined) {
        updates.push('template_name = ?');
        values.push(template_name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(templateId);

      await connection.execute(`
        UPDATE prescription_templates
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated template
      const [template] = await connection.execute(
        'SELECT * FROM prescription_templates WHERE id = ?',
        [templateId]
      );

      res.json({
        success: true,
        message: 'تم تحديث القالب بنجاح',
        data: template[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating template:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete template
   * DELETE /api/prescription-templates/:id
   */
  static async deleteTemplate(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Delete template (will cascade delete items)
      await connection.execute(
        'DELETE FROM prescription_templates WHERE id = ?',
        [templateId]
      );

      res.json({
        success: true,
        message: 'تم حذف القالب بنجاح'
      });

    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Add item to template
   * POST /api/prescription-templates/:id/items
   */
  static async addItemToTemplate(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const {
        medication_id,
        default_dosage,
        default_frequency,
        default_duration,
        default_instructions,
        default_quantity
      } = req.body;

      // Validation
      if (!medication_id || !default_dosage || !default_frequency) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'medication_id, default_dosage, default_frequency مطلوبة'
        });
      }

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Check if medication exists
      const [medication] = await connection.execute(
        'SELECT id FROM medications WHERE id = ? AND is_active = 1',
        [medication_id]
      );

      if (medication.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الدواء غير موجود أو غير مفعل'
        });
      }

      // Check if item already exists
      const [duplicate] = await connection.execute(
        'SELECT id FROM prescription_template_items WHERE template_id = ? AND medication_id = ?',
        [templateId, medication_id]
      );

      if (duplicate.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'الدواء موجود بالفعل في القالب'
        });
      }

      // Insert item
      const [result] = await connection.execute(`
        INSERT INTO prescription_template_items (
          template_id, medication_id, default_dosage, default_frequency,
          default_duration, default_instructions, default_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        templateId,
        medication_id,
        default_dosage,
        default_frequency,
        default_duration || null,
        default_instructions || null,
        default_quantity || null
      ]);

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'تم إضافة الدواء للقالب بنجاح',
        item_id: result.insertId
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error adding item to template:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة الدواء للقالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update template item
   * PUT /api/prescription-templates/:id/items/:itemId
   */
  static async updateTemplateItem(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id, itemId } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const {
        default_dosage,
        default_frequency,
        default_duration,
        default_instructions,
        default_quantity
      } = req.body;

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Check if item exists
      const [item] = await connection.execute(
        'SELECT id FROM prescription_template_items WHERE id = ? AND template_id = ?',
        [itemId, templateId]
      );

      if (item.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العنصر غير موجود في القالب'
        });
      }

      // Build update query
      const updates = [];
      const values = [];

      if (default_dosage !== undefined) {
        updates.push('default_dosage = ?');
        values.push(default_dosage);
      }
      if (default_frequency !== undefined) {
        updates.push('default_frequency = ?');
        values.push(default_frequency);
      }
      if (default_duration !== undefined) {
        updates.push('default_duration = ?');
        values.push(default_duration || null);
      }
      if (default_instructions !== undefined) {
        updates.push('default_instructions = ?');
        values.push(default_instructions || null);
      }
      if (default_quantity !== undefined) {
        updates.push('default_quantity = ?');
        values.push(default_quantity || null);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(itemId);

      await connection.execute(`
        UPDATE prescription_template_items
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      res.json({
        success: true,
        message: 'تم تحديث الدواء في القالب بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating template item:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الدواء في القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete item from template
   * DELETE /api/prescription-templates/:id/items/:itemId
   */
  static async deleteTemplateItem(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id, itemId } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Delete item
      const [result] = await connection.execute(
        'DELETE FROM prescription_template_items WHERE id = ? AND template_id = ?',
        [itemId, templateId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'العنصر غير موجود في القالب'
        });
      }

      res.json({
        success: true,
        message: 'تم حذف الدواء من القالب بنجاح'
      });

    } catch (error) {
      console.error('Error deleting template item:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الدواء من القالب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Increment template usage count
   * PATCH /api/prescription-templates/:id/use
   */
  static async incrementUsageCount(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;

      // Check if template exists and belongs to doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM prescription_templates WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM prescription_templates WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'القالب غير موجود'
        });
      }

      const templateId = existing[0].id;

      // Increment usage count
      await connection.execute(
        'UPDATE prescription_templates SET usage_count = usage_count + 1 WHERE id = ?',
        [templateId]
      );

      res.json({
        success: true,
        message: 'تم تحديث عداد الاستخدام'
      });

    } catch (error) {
      console.error('Error incrementing usage count:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث عداد الاستخدام',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PrescriptionTemplatesController;

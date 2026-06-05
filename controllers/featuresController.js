const db = require('../config/db');

/**
 * Features Controller
 * Handles CRUD operations for subscription features
 * Admin only access
 */

class FeaturesController {
  /**
   * Get all features
   * GET /api/features
   */
  static async getAllFeatures(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';
      const { is_active } = req.query;

      let query = 'SELECT * FROM features';
      const params = [];

      // Filter by active status if provided
      if (is_active !== undefined) {
        query += ' WHERE is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query += ' ORDER BY id ASC';

      const [features] = await connection.execute(query, params);

      // Format response based on language
      const formattedFeatures = features.map(feature => ({
        id: feature.id,
        name: lang === 'en' && feature.name_en ? feature.name_en : feature.name_ar,
        name_ar: feature.name_ar,
        name_en: feature.name_en,
        unit: lang === 'en' && feature.unit_en ? feature.unit_en : feature.unit_ar,
        unit_ar: feature.unit_ar,
        unit_en: feature.unit_en,
        is_active: feature.is_active,
        created_at: feature.created_at,
        updated_at: feature.updated_at
      }));

      res.json({
        success: true,
        count: formattedFeatures.length,
        data: formattedFeatures
      });

    } catch (error) {
      console.error('Error fetching features:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الميزات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single feature by ID
   * GET /api/features/:id
   */
  static async getFeatureById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const featureId = req.params.id;
      const lang = req.headers['accept-language'] || 'ar';

      const [feature] = await connection.execute(
        'SELECT * FROM features WHERE id = ?',
        [featureId]
      );

      if (feature.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      const formattedFeature = {
        id: feature[0].id,
        name: lang === 'en' && feature[0].name_en ? feature[0].name_en : feature[0].name_ar,
        name_ar: feature[0].name_ar,
        name_en: feature[0].name_en,
        unit: lang === 'en' && feature[0].unit_en ? feature[0].unit_en : feature[0].unit_ar,
        unit_ar: feature[0].unit_ar,
        unit_en: feature[0].unit_en,
        is_active: feature[0].is_active,
        created_at: feature[0].created_at,
        updated_at: feature[0].updated_at
      };

      res.json({
        success: true,
        data: formattedFeature
      });

    } catch (error) {
      console.error('Error fetching feature:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new feature
   * POST /api/features
   */
  static async createFeature(req, res) {
    const connection = await db.getConnection();
    
    try {
      let {
        name_ar,
        name_en,
        unit_ar,
        unit_en,
        is_active = true
      } = req.body;

      // Convert is_active to boolean
      if (typeof is_active === 'string') {
        is_active = is_active.toLowerCase() === 'true' || is_active === '1';
      } else {
        is_active = Boolean(is_active);
      }

      // Validation
      if (!name_ar) {
        return res.status(400).json({
          success: false,
          message: 'اسم الميزة بالعربية مطلوب'
        });
      }

      // Check for duplicate name_ar
      const [existing] = await connection.execute(
        'SELECT id FROM features WHERE name_ar = ?',
        [name_ar]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'اسم الميزة موجود مسبقاً'
        });
      }

      // Insert feature
      const [result] = await connection.execute(`
        INSERT INTO features (name_ar, name_en, unit_ar, unit_en, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [
        name_ar,
        name_en || null,
        unit_ar || null,
        unit_en || null,
        is_active ? 1 : 0
      ]);

      // Fetch created feature
      const [feature] = await connection.execute(
        'SELECT * FROM features WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الميزة بنجاح',
        data: feature[0]
      });

    } catch (error) {
      console.error('Error creating feature:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update feature
   * PUT /api/features/:id
   */
  static async updateFeature(req, res) {
    const connection = await db.getConnection();
    
    try {
      const featureId = req.params.id;
      let {
        name_ar,
        name_en,
        unit_ar,
        unit_en,
        is_active
      } = req.body;

      // Convert is_active to boolean if provided
      if (is_active !== undefined) {
        if (typeof is_active === 'string') {
          is_active = is_active.toLowerCase() === 'true' || is_active === '1';
        } else {
          is_active = Boolean(is_active);
        }
      }

      // Check if feature exists
      const [existing] = await connection.execute(
        'SELECT id FROM features WHERE id = ?',
        [featureId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      // Check for duplicate name_ar if updating
      if (name_ar) {
        const [duplicate] = await connection.execute(
          'SELECT id FROM features WHERE name_ar = ? AND id != ?',
          [name_ar, featureId]
        );

        if (duplicate.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'اسم الميزة موجود مسبقاً'
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
        values.push(name_en || null);
      }
      if (unit_ar !== undefined) {
        updates.push('unit_ar = ?');
        values.push(unit_ar || null);
      }
      if (unit_en !== undefined) {
        updates.push('unit_en = ?');
        values.push(unit_en || null);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(featureId);

      await connection.execute(`
        UPDATE features
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      // Fetch updated feature
      const [feature] = await connection.execute(
        'SELECT * FROM features WHERE id = ?',
        [featureId]
      );

      res.json({
        success: true,
        message: 'تم تحديث الميزة بنجاح',
        data: feature[0]
      });

    } catch (error) {
      console.error('Error updating feature:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete feature
   * DELETE /api/features/:id
   */
  static async deleteFeature(req, res) {
    const connection = await db.getConnection();
    
    try {
      const featureId = req.params.id;

      // Check if feature exists
      const [existing] = await connection.execute(
        'SELECT id FROM features WHERE id = ?',
        [featureId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      // Check if feature is used in any package
      const [usage] = await connection.execute(
        'SELECT COUNT(*) as count FROM package_features WHERE feature_id = ?',
        [featureId]
      );

      if (usage[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف الميزة لأنها مستخدمة في باقات',
          packages_count: usage[0].count
        });
      }

      await connection.execute(
        'DELETE FROM features WHERE id = ?',
        [featureId]
      );

      res.json({
        success: true,
        message: 'تم حذف الميزة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting feature:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Toggle feature active status
   * PATCH /api/features/:id/toggle-status
   */
  static async toggleFeatureStatus(req, res) {
    const connection = await db.getConnection();
    
    try {
      const featureId = req.params.id;

      // Check if feature exists
      const [existing] = await connection.execute(
        'SELECT id, is_active FROM features WHERE id = ?',
        [featureId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      const newStatus = existing[0].is_active === 1 ? 0 : 1;

      await connection.execute(
        'UPDATE features SET is_active = ? WHERE id = ?',
        [newStatus, featureId]
      );

      res.json({
        success: true,
        message: `تم ${newStatus === 1 ? 'تفعيل' : 'إلغاء تفعيل'} الميزة بنجاح`,
        is_active: newStatus === 1
      });

    } catch (error) {
      console.error('Error toggling feature status:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تغيير حالة الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = FeaturesController;

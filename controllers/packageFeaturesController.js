const db = require('../config/db');

/**
 * Package Features Controller
 * Handles CRUD operations for package-feature relationships
 * Admin only access
 */

class PackageFeaturesController {
  /**
   * Get all features for a specific package
   * GET /api/package-features/package/:packageId
   */
  static async getPackageFeatures(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageId = req.params.packageId;
      const lang = req.headers['accept-language'] || 'ar';

      // Check if package exists
      const [pkg] = await connection.execute(
        'SELECT id, name_ar, name_en FROM packages WHERE id = ?',
        [packageId]
      );

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      const [features] = await connection.execute(`
        SELECT 
          pf.id,
          pf.package_id,
          pf.feature_id,
          pf.feature_value,
          pf.is_included,
          pf.created_at,
          pf.updated_at,
          f.name_ar as feature_name_ar,
          f.name_en as feature_name_en,
          f.unit_ar as feature_unit_ar,
          f.unit_en as feature_unit_en,
          ${lang === 'en' ? 'f.name_en as feature_name' : 'f.name_ar as feature_name'},
          ${lang === 'en' ? 'f.unit_en as feature_unit' : 'f.unit_ar as feature_unit'}
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        WHERE pf.package_id = ?
        ORDER BY f.id ASC
      `, [packageId]);

      res.json({
        success: true,
        package: {
          id: pkg[0].id,
          name: lang === 'en' && pkg[0].name_en ? pkg[0].name_en : pkg[0].name_ar
        },
        count: features.length,
        data: features
      });

    } catch (error) {
      console.error('Error fetching package features:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب ميزات الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all packages that include a specific feature
   * GET /api/package-features/feature/:featureId
   */
  static async getFeaturePackages(req, res) {
    const connection = await db.getConnection();
    
    try {
      const featureId = req.params.featureId;
      const lang = req.headers['accept-language'] || 'ar';

      // Check if feature exists
      const [feature] = await connection.execute(
        'SELECT id, name_ar, name_en FROM features WHERE id = ?',
        [featureId]
      );

      if (feature.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      const [packages] = await connection.execute(`
        SELECT 
          pf.id,
          pf.package_id,
          pf.feature_id,
          pf.feature_value,
          pf.is_included,
          pf.created_at,
          pf.updated_at,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days,
          ${lang === 'en' ? 'p.name_en as package_name' : 'p.name_ar as package_name'}
        FROM package_features pf
        INNER JOIN packages p ON pf.package_id = p.id
        WHERE pf.feature_id = ?
        ORDER BY p.price ASC
      `, [featureId]);

      res.json({
        success: true,
        feature: {
          id: feature[0].id,
          name: lang === 'en' && feature[0].name_en ? feature[0].name_en : feature[0].name_ar
        },
        count: packages.length,
        data: packages
      });

    } catch (error) {
      console.error('Error fetching feature packages:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الباقات التي تحتوي على الميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Add feature to package
   * POST /api/package-features
   */
  static async addFeatureToPackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      let {
        package_id,
        feature_id,
        feature_value,
        is_included = true
      } = req.body;

      // Convert types
      if (package_id !== undefined && package_id !== null && package_id !== '') {
        package_id = parseInt(package_id);
      }

      if (feature_id !== undefined && feature_id !== null && feature_id !== '') {
        feature_id = parseInt(feature_id);
      }

      if (typeof is_included === 'string') {
        is_included = is_included.toLowerCase() === 'true' || is_included === '1';
      } else {
        is_included = Boolean(is_included);
      }

      // Validation
      if (!package_id || !feature_id || !feature_value) {
        return res.status(400).json({
          success: false,
          message: 'معرف الباقة ومعرف الميزة والقيمة مطلوبة'
        });
      }

      // Check if package exists
      const [pkg] = await connection.execute(
        'SELECT id FROM packages WHERE id = ?',
        [package_id]
      );

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      // Check if feature exists
      const [feature] = await connection.execute(
        'SELECT id FROM features WHERE id = ?',
        [feature_id]
      );

      if (feature.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الميزة غير موجودة'
        });
      }

      // Check if relationship already exists
      const [existing] = await connection.execute(
        'SELECT id FROM package_features WHERE package_id = ? AND feature_id = ?',
        [package_id, feature_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'الميزة موجودة مسبقاً في هذه الباقة'
        });
      }

      // Insert package feature
      const [result] = await connection.execute(`
        INSERT INTO package_features (package_id, feature_id, feature_value, is_included)
        VALUES (?, ?, ?, ?)
      `, [package_id, feature_id, feature_value, is_included ? 1 : 0]);

      // Fetch created relationship
      const [packageFeature] = await connection.execute(`
        SELECT 
          pf.*,
          f.name_ar as feature_name_ar,
          f.name_en as feature_name_en,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        INNER JOIN packages p ON pf.package_id = p.id
        WHERE pf.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إضافة الميزة للباقة بنجاح',
        data: packageFeature[0]
      });

    } catch (error) {
      console.error('Error adding feature to package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة الميزة للباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update package feature
   * PUT /api/package-features/:id
   */
  static async updatePackageFeature(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageFeatureId = req.params.id;
      let {
        feature_value,
        is_included
      } = req.body;

      // Convert is_included to boolean if provided
      if (is_included !== undefined) {
        if (typeof is_included === 'string') {
          is_included = is_included.toLowerCase() === 'true' || is_included === '1';
        } else {
          is_included = Boolean(is_included);
        }
      }

      // Check if package feature exists
      const [existing] = await connection.execute(
        'SELECT id FROM package_features WHERE id = ?',
        [packageFeatureId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العلاقة غير موجودة'
        });
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (feature_value !== undefined) {
        updates.push('feature_value = ?');
        values.push(feature_value);
      }
      if (is_included !== undefined) {
        updates.push('is_included = ?');
        values.push(is_included ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(packageFeatureId);

      await connection.execute(`
        UPDATE package_features
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      // Fetch updated relationship
      const [packageFeature] = await connection.execute(`
        SELECT 
          pf.*,
          f.name_ar as feature_name_ar,
          f.name_en as feature_name_en,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        INNER JOIN packages p ON pf.package_id = p.id
        WHERE pf.id = ?
      `, [packageFeatureId]);

      res.json({
        success: true,
        message: 'تم تحديث الميزة بنجاح',
        data: packageFeature[0]
      });

    } catch (error) {
      console.error('Error updating package feature:', error);
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
   * Delete package feature
   * DELETE /api/package-features/:id
   */
  static async deletePackageFeature(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageFeatureId = req.params.id;

      // Check if package feature exists
      const [existing] = await connection.execute(
        'SELECT id FROM package_features WHERE id = ?',
        [packageFeatureId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العلاقة غير موجودة'
        });
      }

      await connection.execute(
        'DELETE FROM package_features WHERE id = ?',
        [packageFeatureId]
      );

      res.json({
        success: true,
        message: 'تم حذف الميزة من الباقة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting package feature:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الميزة من الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk add features to package
   * POST /api/package-features/bulk
   */
  static async bulkAddFeatures(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      let { package_id, features } = req.body;

      // Convert package_id
      if (package_id !== undefined && package_id !== null && package_id !== '') {
        package_id = parseInt(package_id);
      }

      // Validation
      if (!package_id || !features || !Array.isArray(features) || features.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'معرف الباقة وقائمة الميزات مطلوبة'
        });
      }

      // Check if package exists
      const [pkg] = await connection.execute(
        'SELECT id FROM packages WHERE id = ?',
        [package_id]
      );

      if (pkg.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      const added = [];
      const errors = [];

      for (let feature of features) {
        try {
          let { feature_id, feature_value, is_included = true } = feature;

          // Convert types
          if (feature_id !== undefined && feature_id !== null && feature_id !== '') {
            feature_id = parseInt(feature_id);
          }

          if (typeof is_included === 'string') {
            is_included = is_included.toLowerCase() === 'true' || is_included === '1';
          } else {
            is_included = Boolean(is_included);
          }

          // Check if feature exists
          const [featureExists] = await connection.execute(
            'SELECT id FROM features WHERE id = ?',
            [feature_id]
          );

          if (featureExists.length === 0) {
            errors.push({ feature_id, error: 'الميزة غير موجودة' });
            continue;
          }

          // Check if already exists
          const [existing] = await connection.execute(
            'SELECT id FROM package_features WHERE package_id = ? AND feature_id = ?',
            [package_id, feature_id]
          );

          if (existing.length > 0) {
            errors.push({ feature_id, error: 'الميزة موجودة مسبقاً' });
            continue;
          }

          // Insert
          await connection.execute(`
            INSERT INTO package_features (package_id, feature_id, feature_value, is_included)
            VALUES (?, ?, ?, ?)
          `, [package_id, feature_id, feature_value, is_included ? 1 : 0]);

          added.push({ feature_id, feature_value });

        } catch (err) {
          errors.push({ feature_id: feature.feature_id, error: err.message });
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: `تم إضافة ${added.length} ميزة بنجاح`,
        added_count: added.length,
        errors_count: errors.length,
        added: added,
        errors: errors
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error bulk adding features:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إضافة الميزات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PackageFeaturesController;

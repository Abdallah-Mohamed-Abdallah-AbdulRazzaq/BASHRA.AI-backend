const db = require('../config/db');

/**
 * Packages Controller
 * Handles CRUD operations for subscription packages
 * Admin only access
 */

class PackagesController {
  /**
   * Get all packages with their features
   * GET /api/packages
   */
  static async getAllPackages(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';
      const { is_active, include_features } = req.query;

      let query = 'SELECT * FROM packages';
      const params = [];

      // Filter by active status if provided
      if (is_active !== undefined) {
        query += ' WHERE is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query += ' ORDER BY price ASC';

      const [packages] = await connection.execute(query, params);

      // Format packages
      let formattedPackages = packages.map(pkg => ({
        id: pkg.id,
        name: lang === 'en' && pkg.name_en ? pkg.name_en : pkg.name_ar,
        name_ar: pkg.name_ar,
        name_en: pkg.name_en,
        secondary_name: lang === 'en' && pkg.secondary_name_en ? pkg.secondary_name_en : pkg.secondary_name_ar,
        secondary_name_ar: pkg.secondary_name_ar,
        secondary_name_en: pkg.secondary_name_en,
        duration_days: pkg.duration_days,
        price: parseFloat(pkg.price),
        currency_code: pkg.currency_code,
        is_active: pkg.is_active,
        created_at: pkg.created_at,
        updated_at: pkg.updated_at
      }));

      // Include features if requested
      if (include_features === 'true' || include_features === '1') {
        for (let pkg of formattedPackages) {
          const [features] = await connection.execute(`
            SELECT 
              pf.id as package_feature_id,
              pf.feature_value,
              pf.is_included,
              f.id as feature_id,
              f.name_ar,
              f.name_en,
              f.unit_ar,
              f.unit_en,
              ${lang === 'en' ? 'f.name_en as feature_name' : 'f.name_ar as feature_name'},
              ${lang === 'en' ? 'f.unit_en as feature_unit' : 'f.unit_ar as feature_unit'}
            FROM package_features pf
            INNER JOIN features f ON pf.feature_id = f.id
            WHERE pf.package_id = ?
            ORDER BY f.id ASC
          `, [pkg.id]);

          pkg.features = features;
        }
      }

      res.json({
        success: true,
        count: formattedPackages.length,
        data: formattedPackages
      });

    } catch (error) {
      console.error('Error fetching packages:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الباقات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single package by ID with features
   * GET /api/packages/:id
   */
  static async getPackageById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageId = req.params.id;
      const lang = req.headers['accept-language'] || 'ar';

      const [pkg] = await connection.execute(
        'SELECT * FROM packages WHERE id = ?',
        [packageId]
      );

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      const formattedPackage = {
        id: pkg[0].id,
        name: lang === 'en' && pkg[0].name_en ? pkg[0].name_en : pkg[0].name_ar,
        name_ar: pkg[0].name_ar,
        name_en: pkg[0].name_en,
        secondary_name: lang === 'en' && pkg[0].secondary_name_en ? pkg[0].secondary_name_en : pkg[0].secondary_name_ar,
        secondary_name_ar: pkg[0].secondary_name_ar,
        secondary_name_en: pkg[0].secondary_name_en,
        duration_days: pkg[0].duration_days,
        price: parseFloat(pkg[0].price),
        currency_code: pkg[0].currency_code,
        is_active: pkg[0].is_active,
        created_at: pkg[0].created_at,
        updated_at: pkg[0].updated_at
      };

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
          pf.id as package_feature_id,
          pf.feature_value,
          pf.is_included,
          f.id as feature_id,
          f.name_ar,
          f.name_en,
          f.unit_ar,
          f.unit_en,
          ${lang === 'en' ? 'f.name_en as feature_name' : 'f.name_ar as feature_name'},
          ${lang === 'en' ? 'f.unit_en as feature_unit' : 'f.unit_ar as feature_unit'}
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        WHERE pf.package_id = ?
        ORDER BY f.id ASC
      `, [packageId]);

      formattedPackage.features = features;

      res.json({
        success: true,
        data: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new package
   * POST /api/packages
   */
  static async createPackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      let {
        name_ar,
        name_en,
        secondary_name_ar,
        secondary_name_en,
        duration_days,
        price,
        currency_code,
        is_active = true
      } = req.body;

      // Convert types
      if (duration_days !== undefined && duration_days !== null && duration_days !== '') {
        duration_days = parseInt(duration_days);
      }

      if (price !== undefined && price !== null && price !== '') {
        price = parseFloat(price);
      }

      if (typeof is_active === 'string') {
        is_active = is_active.toLowerCase() === 'true' || is_active === '1';
      } else {
        is_active = Boolean(is_active);
      }

      // Validation
      if (!name_ar || !duration_days || price === undefined) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'اسم الباقة والمدة والسعر مطلوبة'
        });
      }

      if (duration_days <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'مدة الباقة يجب أن تكون أكبر من صفر'
        });
      }

      if (price < 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'السعر يجب أن يكون صفر أو أكبر'
        });
      }

      // Insert package
      const [result] = await connection.execute(`
        INSERT INTO packages (
          name_ar, name_en, secondary_name_ar, secondary_name_en,
          duration_days, price, currency_code, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name_ar,
        name_en || null,
        secondary_name_ar || null,
        secondary_name_en || null,
        duration_days,
        price,
        currency_code || null,
        is_active ? 1 : 0
      ]);

      await connection.commit();

      // Fetch created package
      const [pkg] = await connection.execute(
        'SELECT * FROM packages WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الباقة بنجاح',
        data: pkg[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update package
   * PUT /api/packages/:id
   */
  static async updatePackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const packageId = req.params.id;
      let {
        name_ar,
        name_en,
        secondary_name_ar,
        secondary_name_en,
        duration_days,
        price,
        currency_code,
        is_active
      } = req.body;

      // Convert types
      if (duration_days !== undefined && duration_days !== null && duration_days !== '') {
        duration_days = parseInt(duration_days);
      }

      if (price !== undefined && price !== null && price !== '') {
        price = parseFloat(price);
      }

      if (is_active !== undefined) {
        if (typeof is_active === 'string') {
          is_active = is_active.toLowerCase() === 'true' || is_active === '1';
        } else {
          is_active = Boolean(is_active);
        }
      }

      // Check if package exists
      const [existing] = await connection.execute(
        'SELECT id FROM packages WHERE id = ?',
        [packageId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      // Validation
      if (duration_days !== undefined && duration_days <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'مدة الباقة يجب أن تكون أكبر من صفر'
        });
      }

      if (price !== undefined && price < 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'السعر يجب أن يكون صفر أو أكبر'
        });
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
      if (secondary_name_ar !== undefined) {
        updates.push('secondary_name_ar = ?');
        values.push(secondary_name_ar || null);
      }
      if (secondary_name_en !== undefined) {
        updates.push('secondary_name_en = ?');
        values.push(secondary_name_en || null);
      }
      if (duration_days !== undefined) {
        updates.push('duration_days = ?');
        values.push(duration_days);
      }
      if (price !== undefined) {
        updates.push('price = ?');
        values.push(price);
      }
      if (currency_code !== undefined) {
        updates.push('currency_code = ?');
        values.push(currency_code || null);
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

      values.push(packageId);

      await connection.execute(`
        UPDATE packages
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated package
      const [pkg] = await connection.execute(
        'SELECT * FROM packages WHERE id = ?',
        [packageId]
      );

      res.json({
        success: true,
        message: 'تم تحديث الباقة بنجاح',
        data: pkg[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete package
   * DELETE /api/packages/:id
   */
  static async deletePackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageId = req.params.id;

      // Check if package exists
      const [existing] = await connection.execute(
        'SELECT id FROM packages WHERE id = ?',
        [packageId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      // Check if package is used in any subscription
      const [usage] = await connection.execute(
        'SELECT COUNT(*) as count FROM doctor_subscriptions WHERE package_id = ?',
        [packageId]
      );

      if (usage[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن حذف الباقة لأنها مستخدمة في اشتراكات',
          subscriptions_count: usage[0].count
        });
      }

      // Delete package (will cascade delete package_features)
      await connection.execute(
        'DELETE FROM packages WHERE id = ?',
        [packageId]
      );

      res.json({
        success: true,
        message: 'تم حذف الباقة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Toggle package active status
   * PATCH /api/packages/:id/toggle-status
   */
  static async togglePackageStatus(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageId = req.params.id;

      // Check if package exists
      const [existing] = await connection.execute(
        'SELECT id, is_active FROM packages WHERE id = ?',
        [packageId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      const newStatus = existing[0].is_active === 1 ? 0 : 1;

      await connection.execute(
        'UPDATE packages SET is_active = ? WHERE id = ?',
        [newStatus, packageId]
      );

      res.json({
        success: true,
        message: `تم ${newStatus === 1 ? 'تفعيل' : 'إلغاء تفعيل'} الباقة بنجاح`,
        is_active: newStatus === 1
      });

    } catch (error) {
      console.error('Error toggling package status:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تغيير حالة الباقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PackagesController;

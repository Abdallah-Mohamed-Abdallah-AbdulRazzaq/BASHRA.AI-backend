const db = require('../config/db');

/**
 * Public Packages Controller
 * Handles public read-only operations for packages and features
 * No authentication required
 */

class PublicPackagesController {
  /**
   * Get all active packages with their features
   * GET /api/public/packages
   */
  static async getAllPackages(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      // Get only active packages
      const [packages] = await connection.execute(`
        SELECT * FROM packages 
        WHERE is_active = 1
        ORDER BY price ASC
      `);

      // Format packages with features
      const formattedPackages = await Promise.all(packages.map(async (pkg) => {
        // Get package features
        const [features] = await connection.execute(`
          SELECT 
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
          WHERE pf.package_id = ? AND f.is_active = 1 AND pf.is_included = 1
          ORDER BY f.id ASC
        `, [pkg.id]);

        return {
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
          features: features
        };
      }));

      res.json({
        success: true,
        count: formattedPackages.length,
        data: formattedPackages
      });

    } catch (error) {
      console.error('Error fetching public packages:', error);
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
   * GET /api/public/packages/:id
   */
  static async getPackageById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const packageId = req.params.id;
      const lang = req.headers['accept-language'] || 'ar';

      // Get only active package
      const [pkg] = await connection.execute(
        'SELECT * FROM packages WHERE id = ? AND is_active = 1',
        [packageId]
      );

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة أو غير متاحة'
        });
      }

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
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
        WHERE pf.package_id = ? AND f.is_active = 1 AND pf.is_included = 1
        ORDER BY f.id ASC
      `, [packageId]);

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
        features: features
      };

      res.json({
        success: true,
        data: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching public package:', error);
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
   * Get packages comparison (for pricing page)
   * GET /api/public/packages/comparison
   */
  static async getPackagesComparison(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      // Get all active packages
      const [packages] = await connection.execute(`
        SELECT * FROM packages 
        WHERE is_active = 1
        ORDER BY price ASC
      `);

      // Get all active features
      const [allFeatures] = await connection.execute(`
        SELECT 
          id,
          name_ar,
          name_en,
          unit_ar,
          unit_en,
          ${lang === 'en' ? 'name_en as feature_name' : 'name_ar as feature_name'},
          ${lang === 'en' ? 'unit_en as feature_unit' : 'unit_ar as feature_unit'}
        FROM features
        WHERE is_active = 1
        ORDER BY id ASC
      `);

      // Build comparison matrix
      const comparison = {
        features: allFeatures,
        packages: await Promise.all(packages.map(async (pkg) => {
          // Get package features
          const [packageFeatures] = await connection.execute(`
            SELECT 
              feature_id,
              feature_value,
              is_included
            FROM package_features
            WHERE package_id = ?
          `, [pkg.id]);

          // Create feature map
          const featureMap = {};
          packageFeatures.forEach(pf => {
            featureMap[pf.feature_id] = {
              value: pf.feature_value,
              is_included: pf.is_included
            };
          });

          // Map all features for this package
          const featuresWithValues = allFeatures.map(feature => ({
            feature_id: feature.id,
            feature_name: feature.feature_name,
            feature_unit: feature.feature_unit,
            value: featureMap[feature.id]?.value || 'لا',
            is_included: featureMap[feature.id]?.is_included || 0
          }));

          return {
            id: pkg.id,
            name: lang === 'en' && pkg.name_en ? pkg.name_en : pkg.name_ar,
            name_ar: pkg.name_ar,
            name_en: pkg.name_en,
            secondary_name: lang === 'en' && pkg.secondary_name_en ? pkg.secondary_name_en : pkg.secondary_name_ar,
            duration_days: pkg.duration_days,
            price: parseFloat(pkg.price),
            currency_code: pkg.currency_code,
            features: featuresWithValues
          };
        }))
      };

      res.json({
        success: true,
        data: comparison
      });

    } catch (error) {
      console.error('Error fetching packages comparison:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب مقارنة الباقات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get featured/recommended package
   * GET /api/public/packages/featured
   */
  static async getFeaturedPackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      // Get the most popular package (you can customize this logic)
      // For now, we'll get the mid-priced package
      const [packages] = await connection.execute(`
        SELECT * FROM packages 
        WHERE is_active = 1
        ORDER BY price ASC
      `);

      if (packages.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد باقات متاحة'
        });
      }

      // Get middle package (featured)
      const featuredIndex = Math.floor(packages.length / 2);
      const pkg = packages[featuredIndex];

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
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
        WHERE pf.package_id = ? AND f.is_active = 1 AND pf.is_included = 1
        ORDER BY f.id ASC
      `, [pkg.id]);

      const formattedPackage = {
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
        is_featured: true,
        features: features
      };

      res.json({
        success: true,
        data: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching featured package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الباقة المميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get cheapest package
   * GET /api/public/packages/cheapest
   */
  static async getCheapestPackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      const [pkg] = await connection.execute(`
        SELECT * FROM packages 
        WHERE is_active = 1
        ORDER BY price ASC
        LIMIT 1
      `);

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد باقات متاحة'
        });
      }

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
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
        WHERE pf.package_id = ? AND f.is_active = 1 AND pf.is_included = 1
        ORDER BY f.id ASC
      `, [pkg[0].id]);

      const formattedPackage = {
        id: pkg[0].id,
        name: lang === 'en' && pkg[0].name_en ? pkg[0].name_en : pkg[0].name_ar,
        name_ar: pkg[0].name_ar,
        name_en: pkg[0].name_en,
        secondary_name: lang === 'en' && pkg[0].secondary_name_en ? pkg[0].secondary_name_en : pkg[0].secondary_name_ar,
        duration_days: pkg[0].duration_days,
        price: parseFloat(pkg[0].price),
        currency_code: pkg[0].currency_code,
        features: features
      };

      res.json({
        success: true,
        data: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching cheapest package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب أرخص باقة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get most expensive package
   * GET /api/public/packages/premium
   */
  static async getPremiumPackage(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      const [pkg] = await connection.execute(`
        SELECT * FROM packages 
        WHERE is_active = 1
        ORDER BY price DESC
        LIMIT 1
      `);

      if (pkg.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد باقات متاحة'
        });
      }

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
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
        WHERE pf.package_id = ? AND f.is_active = 1 AND pf.is_included = 1
        ORDER BY f.id ASC
      `, [pkg[0].id]);

      const formattedPackage = {
        id: pkg[0].id,
        name: lang === 'en' && pkg[0].name_en ? pkg[0].name_en : pkg[0].name_ar,
        name_ar: pkg[0].name_ar,
        name_en: pkg[0].name_en,
        secondary_name: lang === 'en' && pkg[0].secondary_name_en ? pkg[0].secondary_name_en : pkg[0].secondary_name_ar,
        duration_days: pkg[0].duration_days,
        price: parseFloat(pkg[0].price),
        currency_code: pkg[0].currency_code,
        features: features
      };

      res.json({
        success: true,
        data: formattedPackage
      });

    } catch (error) {
      console.error('Error fetching premium package:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الباقة المتميزة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all active features
   * GET /api/public/features
   */
  static async getAllFeatures(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';

      const [features] = await connection.execute(`
        SELECT 
          id,
          name_ar,
          name_en,
          unit_ar,
          unit_en,
          ${lang === 'en' ? 'name_en as feature_name' : 'name_ar as feature_name'},
          ${lang === 'en' ? 'unit_en as feature_unit' : 'unit_ar as feature_unit'}
        FROM features
        WHERE is_active = 1
        ORDER BY id ASC
      `);

      res.json({
        success: true,
        count: features.length,
        data: features
      });

    } catch (error) {
      console.error('Error fetching public features:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الميزات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PublicPackagesController;

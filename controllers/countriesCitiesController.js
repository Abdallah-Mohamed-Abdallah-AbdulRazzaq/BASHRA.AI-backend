const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

/**
 * Countries & Cities Controller
 * Handles hierarchical location data (Country > City > Region > District)
 */

class CountriesCitiesController {
  /**
   * Get all locations with optional filtering
   * GET /api/countries-cities
   */
  static async getAll(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { level_type, parent_id, lang = 'ar' } = req.query;

      let query = `
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at,
          updated_at
        FROM countries_cities
        WHERE 1=1
      `;
      const params = [];

      if (level_type) {
        query += ' AND level_type = ?';
        params.push(level_type);
      }

      if (parent_id) {
        query += ' AND parent_id = ?';
        params.push(parent_id);
      }

      query += ' ORDER BY level_type, name_ar';

      const [locations] = await connection.execute(query, params);

      res.json({
        success: true,
        count: locations.length,
        data: locations
      });

    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المواقع',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all countries
   * GET /api/countries-cities/countries
   */
  static async getCountries(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { lang = 'ar' } = req.query;

      const [countries] = await connection.execute(`
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          level_type,
          image,
          created_at
        FROM countries_cities
        WHERE level_type = 'country'
        ORDER BY name_ar
      `);

      res.json({
        success: true,
        count: countries.length,
        data: countries
      });

    } catch (error) {
      console.error('Error fetching countries:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الدول',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get cities by country
   * GET /api/countries-cities/cities/:country_id
   */
  static async getCitiesByCountry(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { country_id } = req.params;
      const { lang = 'ar' } = req.query;

      const [cities] = await connection.execute(`
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at
        FROM countries_cities
        WHERE level_type = 'city' AND parent_id = ?
        ORDER BY name_ar
      `, [country_id]);

      res.json({
        success: true,
        count: cities.length,
        data: cities
      });

    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المدن',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get regions by city
   * GET /api/countries-cities/regions/:city_id
   */
  static async getRegionsByCity(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { city_id } = req.params;
      const { lang = 'ar' } = req.query;

      const [regions] = await connection.execute(`
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at
        FROM countries_cities
        WHERE level_type = 'region' AND parent_id = ?
        ORDER BY name_ar
      `, [city_id]);

      res.json({
        success: true,
        count: regions.length,
        data: regions
      });

    } catch (error) {
      console.error('Error fetching regions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب المناطق',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get districts by region
   * GET /api/countries-cities/districts/:region_id
   */
  static async getDistrictsByRegion(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { region_id } = req.params;
      const { lang = 'ar' } = req.query;

      const [districts] = await connection.execute(`
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at
        FROM countries_cities
        WHERE level_type = 'district' AND parent_id = ?
        ORDER BY name_ar
      `, [region_id]);

      res.json({
        success: true,
        count: districts.length,
        data: districts
      });

    } catch (error) {
      console.error('Error fetching districts:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأحياء',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get full hierarchy for a location
   * GET /api/countries-cities/hierarchy/:id
   */
  static async getHierarchy(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const { lang = 'ar' } = req.query;

      // Get the location
      const [location] = await connection.execute(`
        SELECT * FROM countries_cities WHERE countries_cities_id = ?
      `, [id]);

      if (location.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الموقع غير موجود'
        });
      }

      const hierarchy = [];
      let currentId = id;

      // Build hierarchy from bottom to top
      while (currentId) {
        const [current] = await connection.execute(`
          SELECT 
            countries_cities_id,
            name_ar,
            name_en,
            ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
            parent_id,
            level_type,
            image
          FROM countries_cities
          WHERE countries_cities_id = ?
        `, [currentId]);

        if (current.length === 0) break;

        hierarchy.unshift(current[0]);
        currentId = current[0].parent_id;
      }

      res.json({
        success: true,
        data: {
          full_hierarchy: hierarchy,
          country: hierarchy.find(h => h.level_type === 'country') || null,
          city: hierarchy.find(h => h.level_type === 'city') || null,
          region: hierarchy.find(h => h.level_type === 'region') || null,
          district: hierarchy.find(h => h.level_type === 'district') || null
        }
      });

    } catch (error) {
      console.error('Error fetching hierarchy:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب التسلسل الهرمي',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Search locations
   * GET /api/countries-cities/search
   */
  static async search(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { q, level_type, lang = 'ar' } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال نص البحث'
        });
      }

      let query = `
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at
        FROM countries_cities
        WHERE (name_ar LIKE ? OR name_en LIKE ?)
      `;
      const params = [`%${q}%`, `%${q}%`];

      if (level_type) {
        query += ' AND level_type = ?';
        params.push(level_type);
      }

      query += ' ORDER BY level_type, name_ar LIMIT 50';

      const [results] = await connection.execute(query, params);

      res.json({
        success: true,
        count: results.length,
        data: results
      });

    } catch (error) {
      console.error('Error searching locations:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في البحث',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get location by ID
   * GET /api/countries-cities/:id
   */
  static async getById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const { lang = 'ar' } = req.query;

      const [location] = await connection.execute(`
        SELECT 
          countries_cities_id,
          name_ar,
          name_en,
          ${lang === 'en' ? 'name_en as name' : 'name_ar as name'},
          parent_id,
          level_type,
          image,
          created_at,
          updated_at
        FROM countries_cities
        WHERE countries_cities_id = ?
      `, [id]);

      if (location.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الموقع غير موجود'
        });
      }

      res.json({
        success: true,
        data: location[0]
      });

    } catch (error) {
      console.error('Error fetching location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الموقع',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new location (Admin only)
   * POST /api/countries-cities
   */
  static async create(req, res) {
    const connection = await db.getConnection();
    
    try {
      let { name_ar, name_en, level_type, parent_id } = req.body;
      const imageFile = req.file; // Multer file object

      // Convert form-data strings to proper types
      if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
        parent_id = parseInt(parent_id);
      } else {
        parent_id = null;
      }

      // Validation
      if (!name_ar || !name_en || !level_type) {
        return res.status(400).json({
          success: false,
          message: 'الاسم بالعربية والإنجليزية ونوع المستوى مطلوبة'
        });
      }

      // Validate level_type
      const validLevels = ['country', 'city', 'region', 'district'];
      if (!validLevels.includes(level_type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستوى غير صالح'
        });
      }

      // Validate parent_id for non-country levels
      if (level_type !== 'country' && !parent_id) {
        return res.status(400).json({
          success: false,
          message: 'المعرف الأب مطلوب للمدن والمناطق والأحياء'
        });
      }

      // If parent_id provided, verify it exists
      if (parent_id) {
        const [parent] = await connection.execute(`
          SELECT countries_cities_id FROM countries_cities WHERE countries_cities_id = ?
        `, [parent_id]);

        if (parent.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'الموقع الأب غير موجود'
          });
        }
      }

      // Handle image upload if provided
      let imagePath = null;
      if (imageFile) {
        // Create upload directory for location images
        const uploadDir = path.join(__dirname, '..', 'upload', 'files', 'location-images');
        await fs.mkdir(uploadDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(imageFile.originalname);
        const filename = `location_${timestamp}${ext}`;
        
        // Save file to disk
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, imageFile.buffer);
        
        // Generate full URL for database
        const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
        imagePath = `${baseUrl}/upload/files/location-images/${filename}`;
      }

      const [result] = await connection.execute(`
        INSERT INTO countries_cities (name_ar, name_en, level_type, parent_id, image)
        VALUES (?, ?, ?, ?, ?)
      `, [name_ar, name_en, level_type, parent_id || null, imagePath]);

      const [newLocation] = await connection.execute(`
        SELECT * FROM countries_cities WHERE countries_cities_id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الموقع بنجاح',
        data: newLocation[0]
      });

    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الموقع',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update location (Admin only)
   * PUT /api/countries-cities/:id
   */
  static async update(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      let { name_ar, name_en, parent_id } = req.body;
      const imageFile = req.file; // Multer file object

      // Convert form-data strings to proper types
      if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
        parent_id = parseInt(parent_id);
      } else if (parent_id === '') {
        parent_id = null;
      }

      // Check if location exists
      const [existing] = await connection.execute(`
        SELECT * FROM countries_cities WHERE countries_cities_id = ?
      `, [id]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الموقع غير موجود'
        });
      }

      // Handle image upload if provided
      let imagePath = null;
      if (imageFile) {
        // Delete old image if exists
        const oldImage = existing[0].image;
        if (oldImage) {
          try {
            // Extract filename from URL
            const oldImageUrl = new URL(oldImage);
            const oldImagePath = path.join(__dirname, '..', oldImageUrl.pathname);
            await fs.unlink(oldImagePath);
          } catch (err) {
            console.error('Error deleting old image:', err);
            // Continue even if deletion fails
          }
        }
        
        // Create upload directory for location images
        const uploadDir = path.join(__dirname, '..', 'upload', 'files', 'location-images');
        await fs.mkdir(uploadDir, { recursive: true });
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(imageFile.originalname);
        const filename = `location_${timestamp}${ext}`;
        
        // Save file to disk
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, imageFile.buffer);
        
        // Generate full URL for database
        const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
        imagePath = `${baseUrl}/upload/files/location-images/${filename}`;
      }

      // Build update query
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
      if (parent_id !== undefined) {
        updates.push('parent_id = ?');
        values.push(parent_id);
      }
      if (imagePath !== null) {
        updates.push('image = ?');
        values.push(imagePath);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(id);

      await connection.execute(`
        UPDATE countries_cities
        SET ${updates.join(', ')}
        WHERE countries_cities_id = ?
      `, values);

      const [updated] = await connection.execute(`
        SELECT * FROM countries_cities WHERE countries_cities_id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'تم تحديث الموقع بنجاح',
        data: updated[0]
      });

    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الموقع',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete location (Admin only)
   * DELETE /api/countries-cities/:id
   */
  static async delete(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;

      // Check if location exists
      const [existing] = await connection.execute(`
        SELECT * FROM countries_cities WHERE countries_cities_id = ?
      `, [id]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الموقع غير موجود'
        });
      }

      // Delete image file if exists
      const imageToDelete = existing[0].image;
      if (imageToDelete) {
        try {
          // Extract filename from URL
          const imageUrl = new URL(imageToDelete);
          const imagePath = path.join(__dirname, '..', imageUrl.pathname);
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Error deleting image file:', err);
          // Continue with deletion even if image deletion fails
        }
      }

      // Delete (cascade will delete children)
      await connection.execute(`
        DELETE FROM countries_cities WHERE countries_cities_id = ?
      `, [id]);

      res.json({
        success: true,
        message: 'تم حذف الموقع بنجاح'
      });

    } catch (error) {
      console.error('Error deleting location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الموقع',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = CountriesCitiesController;

const db = require('../config/db');

/**
 * Address Controller
 * Handles all address-related operations for users, doctors, admins, assistants
 */

class AddressController {
  /**
   * Get all addresses for authenticated user
   * GET /api/addresses
   */
  static async getUserAddresses(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role; // 'user', 'doctor', 'admin', 'assistant'
      const lang = req.headers['accept-language'] || 'ar';

      // Map role to addressable_type
      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      if (!addressableType) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستخدم غير صالح'
        });
      }

      const [addresses] = await connection.execute(`
        SELECT 
          a.*,
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_type,
          ad.creator_id,
          ad.creator_type
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE ad.addressable_type = ? AND ad.addressable_id = ?
        ORDER BY a.is_primary DESC, a.created_at DESC
      `, [addressableType, userId]);

      res.json({
        success: true,
        count: addresses.length,
        data: addresses
      });

    } catch (error) {
      console.error('Error fetching user addresses:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العناوين',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get primary address for authenticated user
   * GET /api/addresses/primary
   */
  static async getPrimaryAddress(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role;
      const lang = req.headers['accept-language'] || 'ar';

      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      const [addresses] = await connection.execute(`
        SELECT 
          a.*,
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_type,
          ad.creator_id,
          ad.creator_type
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE ad.addressable_type = ? AND ad.addressable_id = ? AND a.is_primary = 1
        LIMIT 1
      `, [addressableType, userId]);

      if (addresses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا يوجد عنوان رئيسي'
        });
      }

      res.json({
        success: true,
        data: addresses[0]
      });

    } catch (error) {
      console.error('Error fetching primary address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العنوان الرئيسي',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single address by ID
   * GET /api/addresses/:id
   */
  static async getAddressById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const addressId = req.params.id;
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role;
      const lang = req.headers['accept-language'] || 'ar';

      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      const [addresses] = await connection.execute(`
        SELECT 
          a.*,
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_type,
          ad.creator_id,
          ad.creator_type
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.id = ? AND ad.addressable_type = ? AND ad.addressable_id = ?
      `, [addressId, addressableType, userId]);

      if (addresses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العنوان غير موجود أو ليس لديك صلاحية للوصول إليه'
        });
      }

      res.json({
        success: true,
        data: addresses[0]
      });

    } catch (error) {
      console.error('Error fetching address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العنوان',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new address
   * POST /api/addresses
   */
  static async createAddress(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const userId = req.user.id;
      // Use entityType instead of role
      const userType = req.user.entityType || req.user.role;
      
      console.log('User info:', { userId, userType, entityType: req.user.entityType, role: req.user.role });
      
      let {
        address_line1,
        address_line2,
        postal_code,
        countries_cities_id,
        latitude,
        longitude,
        type = 'home',
        is_primary = false
      } = req.body;

      // Convert form-data strings to proper types
      if (countries_cities_id !== undefined && countries_cities_id !== null && countries_cities_id !== '') {
        countries_cities_id = parseInt(countries_cities_id);
      } else {
        countries_cities_id = null;
      }

      if (latitude !== undefined && latitude !== null && latitude !== '') {
        latitude = parseFloat(latitude);
      } else {
        latitude = null;
      }

      if (longitude !== undefined && longitude !== null && longitude !== '') {
        longitude = parseFloat(longitude);
      } else {
        longitude = null;
      }

      // Convert is_primary to boolean
      if (typeof is_primary === 'string') {
        is_primary = is_primary.toLowerCase() === 'true' || is_primary === '1';
      } else {
        is_primary = Boolean(is_primary);
      }

      // Validation
      if (!address_line1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'عنوان السطر الأول مطلوب'
        });
      }

      // Map user role to addressable_type
      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      let addressableType = addressableTypeMap[userType];
      
      // If not found in map, try to capitalize the role directly
      if (!addressableType && userType) {
        addressableType = userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();
      }

      // Validation: ensure addressableType is set
      if (!addressableType) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'نوع المستخدم غير صالح',
          error: `Invalid user role: ${userType}`
        });
      }

      // Debug log
      console.log('Creating address with values:', {
        address_line1,
        address_line2,
        postal_code,
        countries_cities_id,
        latitude,
        longitude,
        type,
        is_primary,
        userType,
        addressableType,
        userId
      });

      // If this is set as primary, unset other primary addresses
      if (is_primary) {
        await connection.execute(`
          UPDATE addresses a
          INNER JOIN addressable ad ON a.id = ad.address_id
          SET a.is_primary = 0
          WHERE ad.addressable_type = ? AND ad.addressable_id = ?
        `, [addressableType, userId]);
      }

      // Prepare values for insertion (ensure no undefined)
      const insertValues = [
        address_line1,
        address_line2 !== undefined && address_line2 !== null && address_line2 !== '' ? address_line2 : null,
        postal_code !== undefined && postal_code !== null && postal_code !== '' ? postal_code : null,
        countries_cities_id,
        latitude,
        longitude,
        type,
        is_primary ? 1 : 0
      ];

      console.log('Insert values:', insertValues);

      // Insert address
      const [result] = await connection.execute(`
        INSERT INTO addresses (
          address_line1, address_line2, postal_code, countries_cities_id,
          latitude, longitude, type, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, insertValues);

      const addressId = result.insertId;

      // Link address to user in addressable table with creator info
      // creator_id & creator_type: تسجيل المستخدم الذي قام بإضافة العنوان
      // في هذه الحالة، المستخدم المسجل هو نفسه من أضاف العنوان لنفسه
      await connection.execute(`
        INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type)
        VALUES (?, ?, ?, ?, ?)
      `, [addressId, addressableType, userId, userId, addressableType]);

      await connection.commit();

      // Fetch the created address
      const [addresses] = await connection.execute(`
        SELECT a.*, 
          cc.name_ar as location_name_ar,
          cc.name_en as location_name_en,
          cc.level_type as location_type,
          ad.creator_id,
          ad.creator_type
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.id = ?
      `, [addressId]);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء العنوان بنجاح',
        data: addresses[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء العنوان',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update address
   * PUT /api/addresses/:id
   */
  static async updateAddress(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const addressId = req.params.id;
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role;

      let {
        address_line1,
        address_line2,
        postal_code,
        countries_cities_id,
        latitude,
        longitude,
        type,
        is_primary
      } = req.body;

      // Convert form-data strings to proper types
      if (countries_cities_id !== undefined && countries_cities_id !== null && countries_cities_id !== '') {
        countries_cities_id = parseInt(countries_cities_id);
      } else if (countries_cities_id === '') {
        countries_cities_id = null;
      }

      if (latitude !== undefined && latitude !== null && latitude !== '') {
        latitude = parseFloat(latitude);
      } else if (latitude === '') {
        latitude = null;
      }

      if (longitude !== undefined && longitude !== null && longitude !== '') {
        longitude = parseFloat(longitude);
      } else if (longitude === '') {
        longitude = null;
      }

      // Convert is_primary to boolean
      if (is_primary !== undefined) {
        if (typeof is_primary === 'string') {
          is_primary = is_primary.toLowerCase() === 'true' || is_primary === '1';
        } else {
          is_primary = Boolean(is_primary);
        }
      }

      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      // Check if address belongs to user
      const [existing] = await connection.execute(`
        SELECT a.id
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        WHERE a.id = ? AND ad.addressable_type = ? AND ad.addressable_id = ?
      `, [addressId, addressableType, userId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العنوان غير موجود أو ليس لديك صلاحية لتعديله'
        });
      }

      // If setting as primary, unset other primary addresses
      if (is_primary) {
        await connection.execute(`
          UPDATE addresses a
          INNER JOIN addressable ad ON a.id = ad.address_id
          SET a.is_primary = 0
          WHERE ad.addressable_type = ? AND ad.addressable_id = ? AND a.id != ?
        `, [addressableType, userId, addressId]);
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (address_line1 !== undefined) {
        updates.push('address_line1 = ?');
        values.push(address_line1);
      }
      if (address_line2 !== undefined) {
        updates.push('address_line2 = ?');
        values.push(address_line2);
      }
      if (postal_code !== undefined) {
        updates.push('postal_code = ?');
        values.push(postal_code);
      }
      if (countries_cities_id !== undefined) {
        updates.push('countries_cities_id = ?');
        values.push(countries_cities_id);
      }
      if (latitude !== undefined) {
        updates.push('latitude = ?');
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push('longitude = ?');
        values.push(longitude);
      }
      if (type !== undefined) {
        updates.push('type = ?');
        values.push(type);
      }
      if (is_primary !== undefined) {
        updates.push('is_primary = ?');
        values.push(is_primary ? 1 : 0);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(addressId);

      await connection.execute(`
        UPDATE addresses
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated address
      const [addresses] = await connection.execute(`
        SELECT a.*, 
          cc.name_ar as location_name_ar,
          cc.name_en as location_name_en,
          cc.level_type as location_type,
          ad.creator_id,
          ad.creator_type
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.id = ?
      `, [addressId]);

      res.json({
        success: true,
        message: 'تم تحديث العنوان بنجاح',
        data: addresses[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث العنوان',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Set address as primary
   * PATCH /api/addresses/:id/set-primary
   */
  static async setPrimaryAddress(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const addressId = req.params.id;
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role;

      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      // Check if address belongs to user
      const [existing] = await connection.execute(`
        SELECT a.id
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        WHERE a.id = ? AND ad.addressable_type = ? AND ad.addressable_id = ?
      `, [addressId, addressableType, userId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العنوان غير موجود أو ليس لديك صلاحية لتعديله'
        });
      }

      // Unset all primary addresses for this user
      await connection.execute(`
        UPDATE addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        SET a.is_primary = 0
        WHERE ad.addressable_type = ? AND ad.addressable_id = ?
      `, [addressableType, userId]);

      // Set this address as primary
      await connection.execute(`
        UPDATE addresses
        SET is_primary = 1
        WHERE id = ?
      `, [addressId]);

      await connection.commit();

      res.json({
        success: true,
        message: 'تم تعيين العنوان كعنوان رئيسي بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error setting primary address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تعيين العنوان الرئيسي',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete address
   * DELETE /api/addresses/:id
   */
  static async deleteAddress(req, res) {
    const connection = await db.getConnection();
    
    try {
      const addressId = req.params.id;
      const userId = req.user.id;
      const userType = req.user.entityType || req.user.role;

      const addressableTypeMap = {
        'user': 'User',
        'doctor': 'Doctor',
        'admin': 'Admin',
        'assistant': 'Assistant'
      };

      const addressableType = addressableTypeMap[userType];

      // Check if address belongs to user
      const [existing] = await connection.execute(`
        SELECT a.id
        FROM addresses a
        INNER JOIN addressable ad ON a.id = ad.address_id
        WHERE a.id = ? AND ad.addressable_type = ? AND ad.addressable_id = ?
      `, [addressId, addressableType, userId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العنوان غير موجود أو ليس لديك صلاحية لحذفه'
        });
      }

      // Delete address (cascade will delete from addressable table)
      await connection.execute(`
        DELETE FROM addresses WHERE id = ?
      `, [addressId]);

      res.json({
        success: true,
        message: 'تم حذف العنوان بنجاح'
      });

    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف العنوان',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = AddressController;

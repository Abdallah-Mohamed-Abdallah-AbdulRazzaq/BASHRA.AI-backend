const db = require('../config/db');

/**
 * Doctors By Location Controller (V2 - Optimized)
 * معالج عرض الأطباء حسب الموقع - نسخة محسنة
 * 
 * Features:
 * - Single JOIN query to avoid N+1 problem
 * - Geographic hierarchy support (parent_id)
 * - GPS-based search with Haversine formula
 * - Professional error handling
 * - Ignores creator_type and creator_id
 * 
 * التحسينات:
 * - استعلام واحد لتجنب مشكلة N+1
 * - دعم الهرمية الجغرافية (البحث في المدينة والمناطق التابعة)
 * - البحث بناءً على GPS باستخدام معادلة Haversine
 * - معالجة احترافية للأخطاء
 * - تجاهل creator_type و creator_id
 */

class DoctorsByLocationController {

  /**
   * Get all child location IDs (recursive)
   * جلب جميع معرفات المواقع الفرعية بشكل متسلسل
   * 
   * @param {number} parentId - معرف الموقع الأب
   * @param {object} connection - اتصال قاعدة البيانات
   * @returns {Promise<Array<number>>} - مصفوفة معرفات المواقع
   */
  static async getAllChildLocationIds(parentId, connection) {
    try {
      const [children] = await connection.execute(
        `SELECT countries_cities_id FROM countries_cities WHERE parent_id = ?`,
        [parentId]
      );

      let allIds = [parentId];
      
      for (const child of children) {
        const childIds = await this.getAllChildLocationIds(
          child.countries_cities_id,
          connection
        );
        allIds = allIds.concat(childIds);
      }

      return allIds;
    } catch (error) {
      console.error('Error getting child location IDs:', error);
      return [parentId];
    }
  }
  
  /**
   * Get doctors by location with hierarchy support
   * عرض الأطباء حسب الموقع مع دعم الهرمية الجغرافية
   * 
   * @route GET /api/doctors-by-location
   * @query {number} countries_cities_id - معرف الموقع (مطلوب)
   * @query {string} level_type - نوع المستوى (country, city, region, district) - اختياري
   * @query {boolean} include_children - تضمين المواقع الفرعية (افتراضي: true)
   * @query {number} page - رقم الصفحة (افتراضي: 1)
   * @query {number} limit - عدد النتائج في الصفحة (افتراضي: 20)
   * @query {string} lang - اللغة (ar/en) - افتراضي: ar
   * @access Public
   */
  static async getDoctorsByLocation(req, res) {
    const connection = await db.getConnection();
    
    try {
      const {
        countries_cities_id,
        level_type,
        include_children = 'true',
        page = 1,
        limit = 20,
        lang = 'ar'
      } = req.query;

      // Validation
      if (!countries_cities_id) {
        return res.status(400).json({
          success: false,
          message: 'معرف الموقع مطلوب (countries_cities_id)',
          message_en: 'Location ID is required (countries_cities_id)'
        });
      }

      // Convert to numbers
      const locationId = parseInt(countries_cities_id);
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;
      const includeChildren = include_children === 'true' || include_children === true;

      // Validate level_type if provided
      const validLevelTypes = ['country', 'city', 'region', 'district'];
      if (level_type && !validLevelTypes.includes(level_type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستوى غير صالح. القيم المسموحة: country, city, region, district',
          message_en: 'Invalid level_type. Allowed values: country, city, region, district'
        });
      }

      // Get all location IDs (including children if requested)
      let locationIds = [locationId];
      if (includeChildren) {
        locationIds = await DoctorsByLocationController.getAllChildLocationIds(locationId, connection);
      }

      // Build the query parameters
      const locationPlaceholders = locationIds.map(() => '?').join(',');
      let queryParams = [...locationIds];
      
      // Build additional WHERE conditions
      let additionalConditions = '';
      if (level_type) {
        additionalConditions += ' AND cc.level_type = ?';
        queryParams.push(level_type);
      }

      // Get total count (Single Query)
      const countQueryParams = [...locationIds];
      if (level_type) countQueryParams.push(level_type);
      
      const [countResult] = await connection.execute(`
        SELECT COUNT(DISTINCT d.id) as total
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.countries_cities_id IN (${locationPlaceholders})
        ${additionalConditions}
        AND d.is_active = 1
        AND d.status = 'active'
      `, countQueryParams);

      const totalDoctors = countResult[0].total;
      const totalPages = Math.ceil(totalDoctors / limitNum);

      // Get doctors with their addresses and profiles (Single Optimized JOIN Query)
      const doctorsQueryParams = [...locationIds];
      if (level_type) doctorsQueryParams.push(level_type);
      
      const doctorsQuery = `
        SELECT 
          d.id as doctor_id,
          d.uuid as doctor_uuid,
          d.email,
          d.phone,
          d.status as doctor_status,
          d.is_active,
          d.created_at as doctor_created_at,
          
          -- Doctor Profile information
          dp.id as profile_id,
          dp.license_number,
          dp.profile_picture_url,
          dp.years_of_experience,
          dp.medical_school,
          dp.graduation_year,
          dp.board_certifications,
          dp.languages_spoken,
          dp.is_verified,
          dp.approval_status,
          dp.rating_average,
          dp.rating_count,
          dp.total_consultations,
          dp.is_available,
          dp.next_available_slot,
          dp.gender,
          dp.nationality,
          
          -- Doctor Profile Translations
          dpt.full_name,
          dpt.specialty,
          dpt.sub_specialty,
          dpt.biography,
          
          -- Address information
          a.id as address_id,
          a.address_line1,
          a.address_line2,
          a.postal_code,
          a.type as address_type,
          a.is_primary,
          a.latitude,
          a.longitude,
          
          -- Location information
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_level,
          cc.countries_cities_id as location_id,
          cc.name_ar as location_name_ar,
          cc.name_en as location_name_en
          
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = '${lang}'
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.countries_cities_id IN (${locationPlaceholders})
        ${additionalConditions}
        AND d.is_active = 1
        AND d.status = 'active'
        ORDER BY a.is_primary DESC, dp.rating_average DESC, d.created_at DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const [doctors] = await connection.execute(doctorsQuery, doctorsQueryParams);

      // Get location hierarchy for context
      let locationInfo = null;
      if (locationId) {
        const [locationData] = await connection.execute(`
          SELECT 
            countries_cities_id,
            ${lang === 'en' ? 'name_en' : 'name_ar'} as name,
            name_ar,
            name_en,
            level_type,
            parent_id
          FROM countries_cities
          WHERE countries_cities_id = ?
        `, [locationId]);
        
        locationInfo = locationData[0] || null;
      }

      // Format response
      res.json({
        success: true,
        message: `تم العثور على ${totalDoctors} طبيب في هذا الموقع`,
        message_en: `Found ${totalDoctors} doctors in this location`,
        data: {
          doctors: doctors,
          location: locationInfo,
          hierarchy_info: {
            searched_location_id: locationId,
            included_location_ids: locationIds,
            include_children: includeChildren
          },
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_doctors: totalDoctors,
            per_page: limitNum,
            has_next: pageNum < totalPages,
            has_prev: pageNum > 1
          },
          filters: {
            countries_cities_id: locationId,
            level_type: level_type || null,
            language: lang
          }
        }
      });

    } catch (error) {
      console.error('Error fetching doctors by location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأطباء حسب الموقع',
        message_en: 'Error fetching doctors by location',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctors count by location with hierarchy support
   * عرض عدد الأطباء حسب الموقع مع دعم الهرمية
   * 
   * @route GET /api/doctors-by-location/count
   * @query {number} countries_cities_id - معرف الموقع (مطلوب)
   * @query {string} level_type - نوع المستوى (اختياري)
   * @query {boolean} include_children - تضمين المواقع الفرعية (افتراضي: true)
   * @access Public
   */
  static async getDoctorsCountByLocation(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { 
        countries_cities_id, 
        level_type,
        include_children = 'true'
      } = req.query;

      if (!countries_cities_id) {
        return res.status(400).json({
          success: false,
          message: 'معرف الموقع مطلوب (countries_cities_id)',
          message_en: 'Location ID is required (countries_cities_id)'
        });
      }

      const locationId = parseInt(countries_cities_id);
      const includeChildren = include_children === 'true' || include_children === true;

      // Get all location IDs (including children if requested)
      let locationIds = [locationId];
      if (includeChildren) {
        locationIds = await DoctorsByLocationController.getAllChildLocationIds(locationId, connection);
      }

      const locationPlaceholders = locationIds.map(() => '?').join(',');
      let queryParams = [...locationIds];
      
      let additionalConditions = '';
      if (level_type) {
        additionalConditions += ' AND cc.level_type = ?';
        queryParams.push(level_type);
      }

      const [result] = await connection.execute(`
        SELECT 
          COUNT(DISTINCT d.id) as total_doctors,
          cc.level_type,
          cc.name_ar as location_name_ar,
          cc.name_en as location_name_en
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.countries_cities_id IN (${locationPlaceholders})
        ${additionalConditions}
        AND d.is_active = 1
        AND d.status = 'active'
        GROUP BY cc.countries_cities_id, cc.level_type, cc.name_ar, cc.name_en
      `, queryParams);

      res.json({
        success: true,
        data: result[0] || {
          total_doctors: 0,
          level_type: level_type || null,
          location_name_ar: null,
          location_name_en: null
        },
        hierarchy_info: {
          searched_location_id: locationId,
          included_location_ids: locationIds,
          include_children: includeChildren
        }
      });

    } catch (error) {
      console.error('Error counting doctors by location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حساب عدد الأطباء',
        message_en: 'Error counting doctors',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctors grouped by location
   * عرض الأطباء مجمعين حسب المواقع
   * 
   * @route GET /api/doctors/grouped-by-location
   * @query {string} level_type - نوع المستوى (country, city, region, district) - مطلوب
   * @query {number} parent_id - معرف الموقع الأب (اختياري)
   * @query {string} lang - اللغة (ar/en) - افتراضي: ar
   * @access Public
   */
  static async getDoctorsGroupedByLocation(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { level_type, parent_id, lang = 'ar' } = req.query;

      if (!level_type) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستوى مطلوب (level_type)',
          message_en: 'Level type is required (level_type)'
        });
      }

      const validLevelTypes = ['country', 'city', 'region', 'district'];
      if (!validLevelTypes.includes(level_type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستوى غير صالح',
          message_en: 'Invalid level_type'
        });
      }

      let whereClause = 'WHERE cc.level_type = ?';
      let queryParams = [level_type];

      if (parent_id) {
        whereClause += ' AND cc.parent_id = ?';
        queryParams.push(parseInt(parent_id));
      }

      const [results] = await connection.execute(`
        SELECT 
          cc.countries_cities_id,
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.name_ar,
          cc.name_en,
          cc.level_type,
          cc.parent_id,
          COUNT(DISTINCT d.id) as doctors_count
        FROM countries_cities cc
        INNER JOIN addresses a ON a.countries_cities_id = cc.countries_cities_id
        INNER JOIN addressable ad ON ad.address_id = a.id AND ad.addressable_type = 'Doctor'
        INNER JOIN doctors d ON d.id = ad.addressable_id
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        ${whereClause}
        AND d.is_active = 1 
        AND d.status = 'active'
        GROUP BY cc.countries_cities_id, cc.name_ar, cc.name_en, cc.level_type, cc.parent_id
        ORDER BY doctors_count DESC, location_name ASC
      `, queryParams);

      res.json({
        success: true,
        message: `تم العثور على ${results.length} موقع يحتوي على أطباء`,
        message_en: `Found ${results.length} locations with doctors`,
        data: {
          locations: results,
          filters: {
            level_type: level_type,
            parent_id: parent_id ? parseInt(parent_id) : null,
            language: lang
          }
        }
      });

    } catch (error) {
      console.error('Error fetching doctors grouped by location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الأطباء المجمعين حسب الموقع',
        message_en: 'Error fetching doctors grouped by location',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Search doctors by location with advanced filters and hierarchy support
   * البحث عن الأطباء حسب الموقع مع فلاتر متقدمة ودعم الهرمية
   * 
   * @route GET /api/doctors-by-location/search
   * @query {number} countries_cities_id - معرف الموقع (مطلوب)
   * @query {string} specialization - التخصص (اختياري)
   * @query {number} min_experience - الحد الأدنى لسنوات الخبرة (اختياري)
   * @query {boolean} include_children - تضمين المواقع الفرعية (افتراضي: true)
   * @query {string} sort_by - ترتيب حسب (experience, name, created_at, rating) - افتراضي: rating
   * @query {string} order - اتجاه الترتيب (asc, desc) - افتراضي: desc
   * @query {number} page - رقم الصفحة (افتراضي: 1)
   * @query {number} limit - عدد النتائج (افتراضي: 20)
   * @query {string} lang - اللغة (ar/en) - افتراضي: ar
   * @access Public
   */
  static async searchDoctorsByLocation(req, res) {
    const connection = await db.getConnection();
    
    try {
      const {
        countries_cities_id,
        specialization,
        min_experience,
        include_children = 'true',
        sort_by = 'rating',
        order = 'desc',
        page = 1,
        limit = 20,
        lang = 'ar'
      } = req.query;

      if (!countries_cities_id) {
        return res.status(400).json({
          success: false,
          message: 'معرف الموقع مطلوب',
          message_en: 'Location ID is required'
        });
      }

      const locationId = parseInt(countries_cities_id);
      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 20, 100);
      const offset = (pageNum - 1) * limitNum;
      const includeChildren = include_children === 'true' || include_children === true;

      // Get all location IDs (including children if requested)
      let locationIds = [locationId];
      if (includeChildren) {
        locationIds = await DoctorsByLocationController.getAllChildLocationIds(locationId, connection);
      }

      const locationPlaceholders = locationIds.map(() => '?').join(',');
      let queryParams = [...locationIds];
      
      // Build additional WHERE conditions
      let additionalConditions = '';
      if (specialization) {
        additionalConditions += ' AND dpt.specialty LIKE ?';
        queryParams.push(`%${specialization}%`);
      }

      if (min_experience) {
        additionalConditions += ' AND dp.years_of_experience >= ?';
        queryParams.push(parseInt(min_experience));
      }

      // Validate sort_by
      const validSortFields = {
        'experience': 'dp.years_of_experience',
        'name': 'dpt.full_name',
        'created_at': 'd.created_at',
        'rating': 'dp.rating_average'
      };
      const sortField = validSortFields[sort_by] || 'd.created_at';
      const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(DISTINCT d.id) as total
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = '${lang}'
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        WHERE a.countries_cities_id IN (${locationPlaceholders})
        ${additionalConditions}
        AND d.is_active = 1
        AND d.status = 'active'
      `, queryParams);

      const totalDoctors = countResult[0].total;
      const totalPages = Math.ceil(totalDoctors / limitNum);

      // Get doctors
      const doctorsQuery = `
        SELECT 
          d.id as doctor_id,
          d.uuid as doctor_uuid,
          d.email,
          d.phone,
          d.status as doctor_status,
          d.is_active,
          
          dp.license_number,
          dp.profile_picture_url,
          dp.years_of_experience,
          dp.rating_average,
          dp.rating_count,
          dp.is_available,
          dp.is_verified,
          dp.approval_status,
          
          dpt.full_name,
          dpt.specialty,
          dpt.sub_specialty,
          dpt.biography,
          
          a.id as address_id,
          a.address_line1,
          a.address_line2,
          a.type as address_type,
          a.is_primary,
          a.latitude,
          a.longitude,
          
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_level,
          cc.countries_cities_id as location_id
          
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = '${lang}'
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.countries_cities_id IN (${locationPlaceholders})
        ${additionalConditions}
        AND d.is_active = 1
        AND d.status = 'active'
        ORDER BY ${sortField} ${sortOrder}, a.is_primary DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `;

      const searchQueryParams = [...queryParams];
      const [doctors] = await connection.execute(doctorsQuery, searchQueryParams);

      res.json({
        success: true,
        message: `تم العثور على ${totalDoctors} طبيب`,
        message_en: `Found ${totalDoctors} doctors`,
        data: {
          doctors: doctors,
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_doctors: totalDoctors,
            per_page: limitNum,
            has_next: pageNum < totalPages,
            has_prev: pageNum > 1
          },
          hierarchy_info: {
            searched_location_id: locationId,
            included_location_ids: locationIds,
            include_children: includeChildren
          },
          filters: {
            countries_cities_id: locationId,
            specialization: specialization || null,
            min_experience: min_experience ? parseInt(min_experience) : null,
            sort_by: sort_by,
            order: order,
            language: lang
          }
        }
      });

    } catch (error) {
      console.error('Error searching doctors by location:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في البحث عن الأطباء',
        message_en: 'Error searching doctors',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctors near location using GPS coordinates (Haversine Formula)
   * البحث عن الأطباء بناءً على الإحداثيات الجغرافية
   * 
   * @route GET /api/doctors-by-location/nearby
   * @query {number} latitude - خط العرض (مطلوب)
   * @query {number} longitude - خط الطول (مطلوب)
   * @query {number} radius - نصف القطر بالكيلومتر (افتراضي: 5)
   * @query {number} page - رقم الصفحة (افتراضي: 1)
   * @query {number} limit - عدد النتائج (افتراضي: 20)
   * @query {string} lang - اللغة (ar/en) - افتراضي: ar
   * @access Public
   */
  static async getDoctorsNearby(req, res) {
    const connection = await db.getConnection();
    
    try {
      const {
        latitude,
        longitude,
        radius = 5,
        page = 1,
        limit = 20,
        lang = 'ar'
      } = req.query;

      // Validation
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'خط العرض وخط الطول مطلوبان (latitude, longitude)',
          message_en: 'Latitude and longitude are required'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radiusKm = parseFloat(radius);
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const offset = (pageNum - 1) * limitNum;

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          success: false,
          message: 'إحداثيات غير صالحة',
          message_en: 'Invalid coordinates'
        });
      }

      // Haversine formula to calculate distance
      // Using LEAST to prevent acos domain errors (when value > 1 or < -1)
      const haversineFormula = `
        (6371 * acos(
          LEAST(1.0, 
            GREATEST(-1.0,
              cos(radians(${lat})) * 
              cos(radians(a.latitude)) * 
              cos(radians(a.longitude) - radians(${lng})) + 
              sin(radians(${lat})) * 
              sin(radians(a.latitude))
            )
          )
        ))
      `;

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(DISTINCT d.id) as total
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        WHERE a.latitude IS NOT NULL 
        AND a.longitude IS NOT NULL
        AND ${haversineFormula} <= ?
        AND d.is_active = 1
        AND d.status = 'active'
      `, [radiusKm]);

      const totalDoctors = countResult[0].total;
      const totalPages = Math.ceil(totalDoctors / limitNum);

      // Get doctors within radius
      const [doctors] = await connection.execute(`
        SELECT 
          d.id as doctor_id,
          d.uuid as doctor_uuid,
          d.email,
          d.phone,
          d.status as doctor_status,
          d.is_active,
          d.created_at as doctor_created_at,
          
          -- Doctor Profile information
          dp.id as profile_id,
          dp.license_number,
          dp.profile_picture_url,
          dp.years_of_experience,
          dp.medical_school,
          dp.graduation_year,
          dp.is_verified,
          dp.approval_status,
          dp.rating_average,
          dp.rating_count,
          dp.total_consultations,
          dp.is_available,
          dp.gender,
          
          -- Doctor Profile Translations
          dpt.full_name,
          dpt.specialty,
          dpt.sub_specialty,
          dpt.biography,
          
          -- Address information
          a.id as address_id,
          a.address_line1,
          a.address_line2,
          a.postal_code,
          a.type as address_type,
          a.is_primary,
          a.latitude,
          a.longitude,
          
          -- Location information
          ${lang === 'en' ? 'cc.name_en' : 'cc.name_ar'} as location_name,
          cc.level_type as location_level,
          cc.countries_cities_id as location_id,
          
          -- Calculate distance
          ${haversineFormula} as distance_km
          
        FROM doctors d
        INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
        LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = '${lang}'
        INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
        INNER JOIN addresses a ON a.id = ad.address_id
        LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
        WHERE a.latitude IS NOT NULL 
        AND a.longitude IS NOT NULL
        AND ${haversineFormula} <= ?
        AND d.is_active = 1
        AND d.status = 'active'
        ORDER BY distance_km ASC, dp.rating_average DESC
        LIMIT ${limitNum} OFFSET ${offset}
      `, [radiusKm]);

      // Format response
      res.json({
        success: true,
        message: `تم العثور على ${totalDoctors} طبيب في نطاق ${radiusKm} كم`,
        message_en: `Found ${totalDoctors} doctors within ${radiusKm} km`,
        data: {
          doctors: doctors,
          search_location: {
            latitude: lat,
            longitude: lng,
            radius_km: radiusKm
          },
          pagination: {
            current_page: pageNum,
            total_pages: totalPages,
            total_doctors: totalDoctors,
            per_page: limitNum,
            has_next: pageNum < totalPages,
            has_prev: pageNum > 1
          },
          filters: {
            language: lang
          }
        }
      });

    } catch (error) {
      console.error('Error fetching nearby doctors:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في البحث عن الأطباء القريبين',
        message_en: 'Error fetching nearby doctors',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = DoctorsByLocationController;

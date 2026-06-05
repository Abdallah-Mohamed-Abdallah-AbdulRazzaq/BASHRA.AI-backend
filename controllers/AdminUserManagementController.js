const db = require('../config/db');
const { validationResult } = require('express-validator');
const { logAdminAction, getClientInfo } = require('../middleware/authMiddleware');
const winston = require('winston');

/**
 * Winston Logger Configuration for Admin User Management
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'admin-user-management.log' })
  ]
});

/**
 * Admin User Management Controller
 * Handles all user management operations for administrators
 * 
 * @class AdminUserManagementController
 */
class AdminUserManagementController {

  /**
   * Normalize language code from header or user preference
   * 
   * @param {string} langHeader - Accept-Language header value
   * @param {string} userPreference - User's language preference
   * @returns {string} Normalized language code ('ar' or 'en')
   */
  static normalizeLanguage(langHeader, userPreference) {
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }
    return userPreference || 'ar';
  }

  /**
   * Validate status transition
   * 
   * @param {string} oldStatus - Current status
   * @param {string} newStatus - New status to set
   * @returns {Object} Validation result { valid: boolean, message: string }
   */
  static validateStatusTransition(oldStatus, newStatus) {
    // Check if status is actually changing
    if (oldStatus === newStatus) {
      return {
        valid: false,
        message: 'New status must be different from current status',
        message_ar: 'يجب أن تكون الحالة الجديدة مختلفة عن الحالة الحالية'
      };
    }

    // All transitions are allowed for now
    // Future: Add specific transition rules if needed
    return { valid: true };
  }


  /**
   * Format user data for API response
   * 
   * @param {Object} userData - Raw user data from database
   * @param {string} language - Language code for response
   * @returns {Object} Formatted user object
   */
  static formatUserResponse(userData, language) {
    return {
      id: userData.id,
      uuid: userData.uuid,
      email: userData.email,
      phone: userData.phone,
      status: userData.status,
      is_active: Boolean(userData.is_active),
      email_verified: userData.email_verified_at !== null,
      phone_verified: userData.phone_verified_at !== null,
      id_verified: Boolean(userData.is_id_verified),
      last_login_at: userData.last_login_at,
      last_activity_at: userData.last_activity_at,
      created_at: userData.created_at,
      profile: userData.full_name ? {
        full_name: userData.full_name,
        date_of_birth: userData.date_of_birth,
        gender: userData.gender,
        nationality: userData.nationality,
        profile_picture_url: userData.profile_picture_url,
        language_preference: userData.language_preference
      } : null
    };
  }

  /**
   * Build dynamic SQL query for user listing with filters
   * 
   * @param {Object} filters - Filter parameters
   * @param {string} language - Language code for translations
   * @returns {Object} { query: string, params: array }
   */
  static buildUserQuery(filters, language) {
    let query = `
      SELECT 
        u.id, u.uuid, u.email, u.phone, u.status, u.is_active,
        u.email_verified_at, u.phone_verified_at, u.is_id_verified,
        u.last_login_at, u.last_activity_at, u.created_at,
        up.date_of_birth, up.gender, up.nationality, 
        up.profile_picture_url, up.language_preference,
        upt.full_name
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id 
        AND upt.language_code = ?
      WHERE 1=1
    `;

    const params = [language];

    // Add status filter
    if (filters.status) {
      query += ' AND u.status = ?';
      params.push(filters.status);
    }

    // Add verified filter
    if (filters.verified !== undefined) {
      if (filters.verified === true || filters.verified === 'true') {
        query += ' AND u.email_verified_at IS NOT NULL';
      } else {
        query += ' AND u.email_verified_at IS NULL';
      }
    }

    // Add search query filter
    if (filters.query) {
      query += ' AND (upt.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const searchTerm = `%${filters.query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add email filter
    if (filters.email) {
      query += ' AND u.email LIKE ?';
      params.push(`%${filters.email}%`);
    }

    // Add phone filter
    if (filters.phone) {
      query += ' AND u.phone LIKE ?';
      params.push(`%${filters.phone}%`);
    }

    // Add UUID filter (exact match)
    if (filters.uuid) {
      query += ' AND u.uuid = ?';
      params.push(filters.uuid);
    }

    query += ' ORDER BY u.created_at DESC';

    return { query, params };
  }


  /**
   * GET /api/admin/users
   * Get all users with pagination and filters
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getAllUsers(req, res) {
    try {
      // Extract and validate query parameters
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const filters = {
        status: req.query.status,
        verified: req.query.verified,
        language
      };

      // Build query
      const { query, params } = AdminUserManagementController.buildUserQuery(filters, language);

      // Get total count
      const countQuery = query.replace(
        /SELECT[\s\S]*?FROM/i,
        'SELECT COUNT(DISTINCT u.id) as total FROM'
      ).replace(/ORDER BY.*$/i, '');
      
      const [countResult] = await db.execute(countQuery, params);
      const totalItems = countResult[0].total;

      // Get paginated results
      const paginatedQuery = query + ' LIMIT ? OFFSET ?';
      const [users] = await db.execute(paginatedQuery, [...params, limit, offset]);

      // Format response
      const formattedUsers = users.map(user => 
        AdminUserManagementController.formatUserResponse(user, language)
      );

      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        success: true,
        message: language === 'ar' ? 'تم استرجاع المستخدمين بنجاح' : 'Users retrieved successfully',
        data: {
          users: formattedUsers,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: totalItems,
            items_per_page: limit,
            has_next: page < totalPages,
            has_previous: page > 1
          }
        }
      });

      logger.info('Users retrieved', {
        admin_id: req.user.id,
        page,
        limit,
        total_items: totalItems,
        filters
      });

    } catch (error) {
      logger.error('Get all users error', { 
        error: error.message, 
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users',
        message_ar: 'فشل في استرجاع المستخدمين'
      });
    }
  }


  /**
   * GET /api/admin/users/:id
   * Get single user complete details
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserById(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          message_ar: 'معرف المستخدم غير صالح'
        });
      }

      const query = `
        SELECT 
          u.id, u.uuid, u.email, u.phone, u.status, u.is_active,
          u.email_verified_at, u.phone_verified_at, u.is_id_verified,
          u.last_login_at, u.last_activity_at, u.login_attempts, u.locked_until,
          u.created_at, u.updated_at,
          up.date_of_birth, up.gender, up.nationality, 
          up.profile_picture_url, up.emergency_contact_phone,
          up.timezone, up.language_preference,
          upt.full_name, upt.emergency_contact_name, 
          upt.emergency_contact_relationship,
          CASE WHEN pp.id IS NOT NULL THEN 1 ELSE 0 END as has_patient_profile
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id 
          AND upt.language_code = ?
        LEFT JOIN patient_profiles pp ON u.id = pp.user_id
        WHERE u.id = ?
      `;

      const [users] = await db.execute(query, [language, userId]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          message_ar: 'المستخدم غير موجود'
        });
      }

      const userData = users[0];

      // Format response
      const response = {
        user: {
          id: userData.id,
          uuid: userData.uuid,
          email: userData.email,
          phone: userData.phone,
          status: userData.status,
          is_active: Boolean(userData.is_active),
          verification: {
            email_verified: userData.email_verified_at !== null,
            email_verified_at: userData.email_verified_at,
            phone_verified: userData.phone_verified_at !== null,
            phone_verified_at: userData.phone_verified_at,
            id_verified: Boolean(userData.is_id_verified)
          },
          activity: {
            last_login_at: userData.last_login_at,
            last_activity_at: userData.last_activity_at,
            login_attempts: userData.login_attempts,
            locked_until: userData.locked_until
          },
          timestamps: {
            created_at: userData.created_at,
            updated_at: userData.updated_at
          }
        },
        profile: userData.full_name ? {
          full_name: userData.full_name,
          date_of_birth: userData.date_of_birth,
          gender: userData.gender,
          nationality: userData.nationality,
          profile_picture_url: userData.profile_picture_url,
          emergency_contact: {
            name: userData.emergency_contact_name,
            phone: userData.emergency_contact_phone,
            relationship: userData.emergency_contact_relationship
          },
          preferences: {
            timezone: userData.timezone,
            language: userData.language_preference
          }
        } : null,
        has_patient_profile: Boolean(userData.has_patient_profile)
      };

      res.json({
        success: true,
        message: language === 'ar' ? 'تم استرجاع بيانات المستخدم بنجاح' : 'User details retrieved successfully',
        data: response
      });

      logger.info('User details retrieved', {
        admin_id: req.user.id,
        user_id: userId
      });

    } catch (error) {
      logger.error('Get user by ID error', { 
        error: error.message, 
        user_id: req.params.id,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user details',
        message_ar: 'فشل في استرجاع بيانات المستخدم'
      });
    }
  }


  /**
   * GET /api/admin/users/status/:status
   * Get users filtered by specific status
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUsersByStatus(req, res) {
    try {
      const { status } = req.params;
      const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          message_ar: `حالة غير صالحة. يجب أن تكون واحدة من: ${validStatuses.join(', ')}`
        });
      }

      // Add status to query and reuse getAllUsers logic
      req.query.status = status;
      return AdminUserManagementController.getAllUsers(req, res);

    } catch (error) {
      logger.error('Get users by status error', { 
        error: error.message, 
        status: req.params.status,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve users by status',
        message_ar: 'فشل في استرجاع المستخدمين حسب الحالة'
      });
    }
  }


  /**
   * GET /api/admin/users/:id/medical
   * Get user medical/patient profile
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserMedicalProfile(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          message_ar: 'معرف المستخدم غير صالح'
        });
      }

      const query = `
        SELECT 
          u.id, u.uuid, u.email, u.phone,
          upt.full_name,
          pp.id as patient_profile_id,
          pp.blood_type, pp.height, pp.weight,
          pp.smoking_status, pp.alcohol_consumption, pp.exercise_frequency,
          pp.insurance_provider, pp.insurance_policy_number,
          pp.preferred_doctor_id, pp.created_at as profile_created_at, 
          pp.updated_at as profile_updated_at,
          ppt.medical_history, ppt.current_medications,
          ppt.allergies, ppt.chronic_conditions, ppt.family_medical_history
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id 
          AND upt.language_code = ?
        LEFT JOIN patient_profiles pp ON u.id = pp.user_id
        LEFT JOIN patient_profile_translations ppt ON pp.id = ppt.patient_profile_id 
          AND ppt.language_code = ?
        WHERE u.id = ?
      `;

      const [results] = await db.execute(query, [language, language, userId]);

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          message_ar: 'المستخدم غير موجود'
        });
      }

      const data = results[0];

      if (!data.patient_profile_id) {
        return res.status(404).json({
          success: false,
          message: 'Medical profile not found for this user',
          message_ar: 'الملف الطبي غير موجود لهذا المستخدم'
        });
      }

      // Format response
      const response = {
        user_info: {
          id: data.id,
          uuid: data.uuid,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone
        },
        medical_profile: {
          physical_measurements: {
            blood_type: data.blood_type,
            height: data.height ? parseFloat(data.height) : null,
            weight: data.weight ? parseFloat(data.weight) : null
          },
          lifestyle: {
            smoking_status: data.smoking_status,
            alcohol_consumption: data.alcohol_consumption,
            exercise_frequency: data.exercise_frequency
          },
          medical_information: {
            medical_history: data.medical_history,
            current_medications: data.current_medications,
            allergies: data.allergies,
            chronic_conditions: data.chronic_conditions,
            family_medical_history: data.family_medical_history
          },
          insurance: {
            provider: data.insurance_provider,
            policy_number: data.insurance_policy_number
          },
          preferred_doctor_id: data.preferred_doctor_id,
          created_at: data.profile_created_at,
          updated_at: data.profile_updated_at
        }
      };

      res.json({
        success: true,
        message: language === 'ar' ? 'تم استرجاع الملف الطبي بنجاح' : 'Medical profile retrieved successfully',
        data: response
      });

      logger.info('Medical profile retrieved', {
        admin_id: req.user.id,
        user_id: userId
      });

    } catch (error) {
      logger.error('Get medical profile error', { 
        error: error.message, 
        user_id: req.params.id,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve medical profile',
        message_ar: 'فشل في استرجاع الملف الطبي'
      });
    }
  }


  /**
   * GET /api/admin/users/search
   * Search users by multiple criteria
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchUsers(req, res) {
    try {
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const filters = {
        query: req.query.query,
        email: req.query.email,
        phone: req.query.phone,
        uuid: req.query.uuid,
        status: req.query.status,
        verified: req.query.verified,
        language
      };

      // Reuse getAllUsers logic with search filters
      return AdminUserManagementController.getAllUsers(req, res);

    } catch (error) {
      logger.error('Search users error', { 
        error: error.message, 
        filters: req.query,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to search users',
        message_ar: 'فشل في البحث عن المستخدمين'
      });
    }
  }


  /**
   * PUT /api/admin/users/:id/status
   * Update user status (Super Admin only)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async updateUserStatus(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userId = parseInt(req.params.id);
      const { status, reason } = req.body;
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          message_ar: 'خطأ في التحقق من البيانات',
          errors: errors.array()
        });
      }

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          message_ar: 'معرف المستخدم غير صالح'
        });
      }

      const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          message_ar: `حالة غير صالحة. يجب أن تكون واحدة من: ${validStatuses.join(', ')}`
        });
      }

      await connection.beginTransaction();

      // Get current user status
      const [users] = await connection.execute(
        'SELECT id, status, is_active, email FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found',
          message_ar: 'المستخدم غير موجود'
        });
      }

      const currentUser = users[0];
      const oldStatus = currentUser.status;

      // Validate status transition
      const validation = AdminUserManagementController.validateStatusTransition(oldStatus, status);
      if (!validation.valid) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: validation.message,
          message_ar: validation.message_ar
        });
      }

      // Determine is_active based on new status
      const isActive = status === 'active' ? 1 : 0;

      // Update user status
      await connection.execute(
        'UPDATE users SET status = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [status, isActive, userId]
      );

      // Prepare admin log data
      const oldValues = {
        status: oldStatus,
        is_active: Boolean(currentUser.is_active)
      };

      const newValues = {
        status: status,
        is_active: Boolean(isActive),
        reason: reason
      };

      // Determine severity
      const severityMap = {
        'active': 'low',
        'inactive': 'medium',
        'suspended': 'high',
        'pending_verification': 'low'
      };
      const severity = severityMap[status] || 'medium';

      // Get client info
      const clientInfo = getClientInfo(req);

      // Insert admin log
      const description = language === 'ar' 
        ? `تم تغيير حالة المستخدم من ${oldStatus} إلى ${status}`
        : `Changed user status from ${oldStatus} to ${status}`;

      await connection.execute(
        `INSERT INTO admin_logs (
          admin_id, action, target_type, target_id,
          description, old_values, new_values,
          ip_address, user_agent, severity, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.user.id,
          'USER_STATUS_CHANGE',
          'User',
          userId,
          description,
          JSON.stringify(oldValues),
          JSON.stringify(newValues),
          clientInfo.ip,
          clientInfo.userAgent,
          severity
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: language === 'ar' ? 'تم تحديث حالة المستخدم بنجاح' : 'User status updated successfully',
        data: {
          user_id: userId,
          old_status: oldStatus,
          new_status: status,
          updated_by: {
            admin_id: req.user.id,
            admin_email: req.user.email
          },
          reason: reason,
          updated_at: new Date().toISOString()
        }
      });

      logger.info('User status updated', {
        admin_id: req.user.id,
        user_id: userId,
        old_status: oldStatus,
        new_status: status,
        reason: reason
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update user status error', { 
        error: error.message, 
        user_id: req.params.id,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
        message_ar: 'فشل في تحديث حالة المستخدم'
      });
    } finally {
      connection.release();
    }
  }


  /**
   * GET /api/admin/users/stats
   * Get user statistics and counts
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserStats(req, res) {
    try {
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get total users
      const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM users');
      const totalUsers = totalResult[0].total;

      // Get count by status
      const [statusResult] = await db.execute(`
        SELECT status, COUNT(*) as count 
        FROM users 
        GROUP BY status
      `);
      
      const byStatus = {
        active: 0,
        inactive: 0,
        suspended: 0,
        pending_verification: 0
      };
      statusResult.forEach(row => {
        byStatus[row.status] = row.count;
      });

      // Get verification statistics
      const [verificationResult] = await db.execute(`
        SELECT 
          COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as email_verified,
          COUNT(CASE WHEN phone_verified_at IS NOT NULL THEN 1 END) as phone_verified,
          COUNT(CASE WHEN is_id_verified = 1 THEN 1 END) as id_verified,
          COUNT(CASE WHEN email_verified_at IS NOT NULL 
            AND phone_verified_at IS NOT NULL 
            AND is_id_verified = 1 THEN 1 END) as fully_verified
        FROM users
      `);

      // Get activity statistics
      const [activityResult] = await db.execute(`
        SELECT 
          COUNT(CASE WHEN last_activity_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7_days,
          COUNT(CASE WHEN last_activity_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as last_30_days,
          COUNT(CASE WHEN last_login_at IS NULL THEN 1 END) as never_logged_in
        FROM users
      `);

      // Get registration statistics
      const [registrationResult] = await db.execute(`
        SELECT 
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as this_month
        FROM users
      `);

      // Get patient profiles count
      const [patientResult] = await db.execute('SELECT COUNT(*) as count FROM patient_profiles');

      const response = {
        total_users: totalUsers,
        by_status: byStatus,
        verification: verificationResult[0],
        activity: activityResult[0],
        registrations: registrationResult[0],
        with_patient_profile: patientResult[0].count,
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        message: language === 'ar' ? 'تم استرجاع الإحصائيات بنجاح' : 'Statistics retrieved successfully',
        data: response
      });

      logger.info('User statistics retrieved', {
        admin_id: req.user.id,
        total_users: totalUsers
      });

    } catch (error) {
      logger.error('Get user stats error', { 
        error: error.message, 
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        message_ar: 'فشل في استرجاع الإحصائيات'
      });
    }
  }


  /**
   * GET /api/admin/users/:id/logs
   * Get admin action logs for a specific user
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getUserLogs(req, res) {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;
      const actionFilter = req.query.action;
      const language = AdminUserManagementController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user ID',
          message_ar: 'معرف المستخدم غير صالح'
        });
      }

      // Build query
      let query = `
        SELECT 
          al.id, al.admin_id, al.action, al.description,
          al.old_values, al.new_values, al.ip_address,
          al.user_agent, al.severity, al.created_at,
          a.email as admin_email
        FROM admin_logs al
        LEFT JOIN admins a ON al.admin_id = a.id
        WHERE al.target_type = 'User' AND al.target_id = ?
      `;

      const params = [userId];

      if (actionFilter) {
        query += ' AND al.action = ?';
        params.push(actionFilter);
      }

      query += ' ORDER BY al.created_at DESC';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM admin_logs
        WHERE target_type = 'User' AND target_id = ?
        ${actionFilter ? 'AND action = ?' : ''}
      `;
      const countParams = actionFilter ? [userId, actionFilter] : [userId];
      const [countResult] = await db.execute(countQuery, countParams);
      const totalItems = countResult[0].total;

      // Get paginated logs
      const paginatedQuery = query + ' LIMIT ? OFFSET ?';
      const [logs] = await db.execute(paginatedQuery, [...params, limit, offset]);

      // Format logs
      const formattedLogs = logs.map(log => ({
        id: log.id,
        admin: {
          id: log.admin_id,
          email: log.admin_email
        },
        action: log.action,
        description: log.description,
        old_values: log.old_values,
        new_values: log.new_values,
        ip_address: log.ip_address,
        severity: log.severity,
        created_at: log.created_at
      }));

      const totalPages = Math.ceil(totalItems / limit);

      res.json({
        success: true,
        message: language === 'ar' ? 'تم استرجاع سجلات الإدارة بنجاح' : 'Admin logs retrieved successfully',
        data: {
          user_id: userId,
          logs: formattedLogs,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: totalItems,
            items_per_page: limit,
            has_next: page < totalPages,
            has_previous: page > 1
          }
        }
      });

      logger.info('User logs retrieved', {
        admin_id: req.user.id,
        user_id: userId,
        total_logs: totalItems
      });

    } catch (error) {
      logger.error('Get user logs error', { 
        error: error.message, 
        user_id: req.params.id,
        admin_id: req.user?.id 
      });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin logs',
        message_ar: 'فشل في استرجاع سجلات الإدارة'
      });
    }
  }
}

module.exports = AdminUserManagementController;

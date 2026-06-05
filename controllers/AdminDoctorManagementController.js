const db = require('../config/db');
const { logAdminAction, getClientInfo } = require('../middleware/authMiddleware');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'admin-doctor-management.log' })
  ]
});

/**
 * Admin Doctor Management Controller
 * معالج إدارة الأطباء للأدمن
 * يتيح للأدمن التحكم في حالة الأطباء والموافقة عليهم
 */
class AdminDoctorManagementController {

  /**
   * Get all doctors with their profiles (for admin review)
   * جلب جميع الأطباء مع ملفاتهم الشخصية للمراجعة
   */
  static async getAllDoctors(req, res) {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      approval_status, 
      is_verified,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';

    try {
      let query = `
        SELECT 
          d.id,
          d.uuid,
          d.email,
          d.phone,
          d.status,
          d.is_active,
          d.email_verified_at,
          d.phone_verified_at,
          d.last_login_at,
          d.created_at,
          dp.id as profile_id,
          dp.license_number,
          dp.years_of_experience,
          dp.is_verified,
          dp.verification_date,
          dp.verified_by,
          dp.approval_status,
          dp.rating_average,
          dp.rating_count,
          dp.total_consultations,
          dp.is_available,
          dpt.full_name,
          dpt.specialty,
          dpt.sub_specialty,
          va.email as verified_by_email
        FROM doctors d
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN admins va ON dp.verified_by = va.id
        WHERE 1=1
      `;
      
      const params = [language];

      // Apply filters
      if (status) {
        query += ' AND d.status = ?';
        params.push(status);
      }

      if (approval_status) {
        query += ' AND dp.approval_status = ?';
        params.push(approval_status);
      }

      if (is_verified !== undefined) {
        query += ' AND dp.is_verified = ?';
        params.push(is_verified === 'true' ? 1 : 0);
      }

      if (search) {
        query += ' AND (d.email LIKE ? OR d.phone LIKE ? OR dpt.full_name LIKE ? OR dp.license_number LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Validate sort_by to prevent SQL injection
      const allowedSortFields = ['created_at', 'email', 'status', 'approval_status', 'is_verified', 'rating_average'];
      const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'created_at';
      const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await db.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // Add sorting and pagination
      query += ` ORDER BY d.${sortField} ${sortDirection} LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [doctors] = await db.query(query, params);

      res.json({
        success: true,
        data: doctors,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: offset + doctors.length < total
        }
      });

    } catch (error) {
      logger.error('Get all doctors error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب بيانات الأطباء',
        message_en: 'Error fetching doctors data'
      });
    }
  }

  /**
   * Get single doctor details (for admin review)
   * جلب تفاصيل طبيب واحد للمراجعة
   */
  static async getDoctorDetails(req, res) {
    const { doctorId } = req.params;
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';

    try {
      // Get doctor account data
      const [doctorRows] = await db.query(
        `SELECT 
          d.*,
          dp.*,
          va.email as verified_by_email,
          va.admin_type as verified_by_admin_type
        FROM doctors d
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN admins va ON dp.verified_by = va.id
        WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message_ar: 'الطبيب غير موجود',
          message_en: 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];

      // Get all translations
      const [translations] = await db.query(
        `SELECT * FROM doctor_profile_translations WHERE doctor_profile_id = ?`,
        [doctor.profile_id || doctor.id]
      );

      // Format translations
      const translationsObj = {};
      translations.forEach(t => {
        translationsObj[t.language_code] = {
          full_name: t.full_name,
          specialty: t.specialty,
          sub_specialty: t.sub_specialty,
          biography: t.biography,
          emergency_contact_name: t.emergency_contact_name,
          emergency_contact_relationship: t.emergency_contact_relationship
        };
      });

      // Remove sensitive data
      delete doctor.password_hash;
      delete doctor.email_otp;
      delete doctor.phone_otp;

      res.json({
        success: true,
        data: {
          ...doctor,
          translations: translationsObj
        }
      });

    } catch (error) {
      logger.error('Get doctor details error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب بيانات الطبيب',
        message_en: 'Error fetching doctor data'
      });
    }
  }

  /**
   * Update doctor status (active, inactive, suspended, pending_verification)
   * تحديث حالة الطبيب
   */
  static async updateDoctorStatus(req, res) {
    const { doctorId } = req.params;
    const { status, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message_ar: 'الحالة غير صحيحة. القيم المسموحة: ' + validStatuses.join(', '),
        message_en: 'Invalid status. Allowed values: ' + validStatuses.join(', ')
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current doctor status
      const [doctorRows] = await connection.query(
        'SELECT id, status, email FROM doctors WHERE id = ?',
        [doctorId]
      );

      if (doctorRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'الطبيب غير موجود',
          message_en: 'Doctor not found'
        });
      }

      const oldStatus = doctorRows[0].status;

      // Update doctor status
      await connection.query(
        'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
        [status, doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_STATUS',
        'doctor',
        doctorId,
        { status: oldStatus },
        { status, reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor status updated', {
        doctorId,
        oldStatus,
        newStatus: status,
        updatedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم تحديث حالة الطبيب بنجاح',
        message_en: 'Doctor status updated successfully',
        data: {
          doctorId,
          oldStatus,
          newStatus: status
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update doctor status error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث حالة الطبيب',
        message_en: 'Error updating doctor status'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Verify doctor profile (set is_verified, verification_date, verified_by)
   * التحقق من ملف الطبيب
   */
  static async verifyDoctorProfile(req, res) {
    const { doctorId } = req.params;
    const { is_verified, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    if (is_verified === undefined || typeof is_verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message_ar: 'يجب تحديد حالة التحقق (true أو false)',
        message_en: 'Verification status must be specified (true or false)'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current profile
      const [profileRows] = await connection.query(
        'SELECT dp.*, d.email FROM doctor_profiles dp JOIN doctors d ON dp.doctor_id = d.id WHERE dp.doctor_id = ?',
        [doctorId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'ملف الطبيب غير موجود',
          message_en: 'Doctor profile not found'
        });
      }

      const oldIsVerified = profileRows[0].is_verified;
      const profileId = profileRows[0].id;

      // Update verification status
      const updateData = {
        is_verified: is_verified ? 1 : 0,
        verified_by: is_verified ? adminId : null,
        verification_date: is_verified ? new Date() : null
      };

      await connection.query(
        `UPDATE doctor_profiles 
         SET is_verified = ?, verified_by = ?, verification_date = ?, updated_at = NOW() 
         WHERE id = ?`,
        [updateData.is_verified, updateData.verified_by, updateData.verification_date, profileId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        is_verified ? 'VERIFY_DOCTOR_PROFILE' : 'UNVERIFY_DOCTOR_PROFILE',
        'doctor_profile',
        profileId,
        { is_verified: oldIsVerified },
        { is_verified: updateData.is_verified, reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor profile verification updated', {
        doctorId,
        profileId,
        oldIsVerified,
        newIsVerified: is_verified,
        verifiedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: is_verified ? 'تم التحقق من ملف الطبيب بنجاح' : 'تم إلغاء التحقق من ملف الطبيب',
        message_en: is_verified ? 'Doctor profile verified successfully' : 'Doctor profile verification removed',
        data: {
          doctorId,
          profileId,
          is_verified,
          verification_date: updateData.verification_date,
          verified_by: adminId
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Verify doctor profile error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث حالة التحقق',
        message_en: 'Error updating verification status'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update doctor approval status (pending, approved, rejected, suspended)
   * تحديث حالة الموافقة على الطبيب
   */
  static async updateDoctorApprovalStatus(req, res) {
    const { doctorId } = req.params;
    const { approval_status, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    const validApprovalStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    
    if (!approval_status || !validApprovalStatuses.includes(approval_status)) {
      return res.status(400).json({
        success: false,
        message_ar: 'حالة الموافقة غير صحيحة. القيم المسموحة: ' + validApprovalStatuses.join(', '),
        message_en: 'Invalid approval status. Allowed values: ' + validApprovalStatuses.join(', ')
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current profile
      const [profileRows] = await connection.query(
        'SELECT dp.*, d.email, d.status as doctor_status FROM doctor_profiles dp JOIN doctors d ON dp.doctor_id = d.id WHERE dp.doctor_id = ?',
        [doctorId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'ملف الطبيب غير موجود',
          message_en: 'Doctor profile not found'
        });
      }

      const oldApprovalStatus = profileRows[0].approval_status;
      const profileId = profileRows[0].id;

      // Update approval status
      await connection.query(
        'UPDATE doctor_profiles SET approval_status = ?, updated_at = NOW() WHERE id = ?',
        [approval_status, profileId]
      );

      // If approved and doctor status is pending_verification, update to active
      if (approval_status === 'approved' && profileRows[0].doctor_status === 'pending_verification') {
        await connection.query(
          'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
          ['active', doctorId]
        );
      }

      // If rejected or suspended, update doctor status accordingly
      if (approval_status === 'rejected' || approval_status === 'suspended') {
        await connection.query(
          'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
          [approval_status === 'rejected' ? 'inactive' : 'suspended', doctorId]
        );
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_APPROVAL_STATUS',
        'doctor_profile',
        profileId,
        { approval_status: oldApprovalStatus },
        { approval_status, reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor approval status updated', {
        doctorId,
        profileId,
        oldApprovalStatus,
        newApprovalStatus: approval_status,
        updatedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم تحديث حالة الموافقة بنجاح',
        message_en: 'Approval status updated successfully',
        data: {
          doctorId,
          profileId,
          oldApprovalStatus,
          newApprovalStatus: approval_status
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update doctor approval status error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث حالة الموافقة',
        message_en: 'Error updating approval status'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Approve doctor (combined action: set approval_status to approved, is_verified to true, status to active)
   * الموافقة على الطبيب (إجراء مجمع)
   */
  static async approveDoctor(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current doctor and profile data
      const [rows] = await connection.query(
        `SELECT d.*, dp.id as profile_id, dp.is_verified, dp.approval_status 
         FROM doctors d 
         LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id 
         WHERE d.id = ?`,
        [doctorId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'الطبيب غير موجود',
          message_en: 'Doctor not found'
        });
      }

      const doctor = rows[0];
      const oldData = {
        status: doctor.status,
        is_verified: doctor.is_verified,
        approval_status: doctor.approval_status
      };

      // Update doctors table
      await connection.query(
        'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
        ['active', doctorId]
      );

      // Update doctor_profiles table
      await connection.query(
        `UPDATE doctor_profiles 
         SET is_verified = 1, 
             verification_date = NOW(), 
             verified_by = ?, 
             approval_status = 'approved',
             updated_at = NOW() 
         WHERE doctor_id = ?`,
        [adminId, doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'APPROVE_DOCTOR',
        'doctor',
        doctorId,
        oldData,
        { 
          status: 'active', 
          is_verified: true, 
          approval_status: 'approved',
          reason 
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor approved', {
        doctorId,
        approvedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تمت الموافقة على الطبيب بنجاح',
        message_en: 'Doctor approved successfully',
        data: {
          doctorId,
          status: 'active',
          is_verified: true,
          approval_status: 'approved',
          verified_by: adminId,
          verification_date: new Date()
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Approve doctor error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في الموافقة على الطبيب',
        message_en: 'Error approving doctor'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Reject doctor (combined action: set approval_status to rejected, status to inactive)
   * رفض الطبيب (إجراء مجمع)
   */
  static async rejectDoctor(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message_ar: 'يجب تحديد سبب الرفض',
        message_en: 'Rejection reason is required'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current doctor and profile data
      const [rows] = await connection.query(
        `SELECT d.*, dp.id as profile_id, dp.is_verified, dp.approval_status 
         FROM doctors d 
         LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id 
         WHERE d.id = ?`,
        [doctorId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'الطبيب غير موجود',
          message_en: 'Doctor not found'
        });
      }

      const doctor = rows[0];
      const oldData = {
        status: doctor.status,
        is_verified: doctor.is_verified,
        approval_status: doctor.approval_status
      };

      // Update doctors table
      await connection.query(
        'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
        ['inactive', doctorId]
      );

      // Update doctor_profiles table
      await connection.query(
        `UPDATE doctor_profiles 
         SET approval_status = 'rejected',
             updated_at = NOW() 
         WHERE doctor_id = ?`,
        [doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'REJECT_DOCTOR',
        'doctor',
        doctorId,
        oldData,
        { 
          status: 'inactive', 
          approval_status: 'rejected',
          reason 
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor rejected', {
        doctorId,
        rejectedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم رفض الطبيب',
        message_en: 'Doctor rejected',
        data: {
          doctorId,
          status: 'inactive',
          approval_status: 'rejected'
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Reject doctor error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في رفض الطبيب',
        message_en: 'Error rejecting doctor'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Suspend doctor (combined action: set approval_status to suspended, status to suspended)
   * تعليق الطبيب (إجراء مجمع)
   */
  static async suspendDoctor(req, res) {
    const { doctorId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message_ar: 'يجب تحديد سبب التعليق',
        message_en: 'Suspension reason is required'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current doctor and profile data
      const [rows] = await connection.query(
        `SELECT d.*, dp.id as profile_id, dp.is_verified, dp.approval_status 
         FROM doctors d 
         LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id 
         WHERE d.id = ?`,
        [doctorId]
      );

      if (rows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'الطبيب غير موجود',
          message_en: 'Doctor not found'
        });
      }

      const doctor = rows[0];
      const oldData = {
        status: doctor.status,
        is_verified: doctor.is_verified,
        approval_status: doctor.approval_status
      };

      // Update doctors table
      await connection.query(
        'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
        ['suspended', doctorId]
      );

      // Update doctor_profiles table
      await connection.query(
        `UPDATE doctor_profiles 
         SET approval_status = 'suspended',
             updated_at = NOW() 
         WHERE doctor_id = ?`,
        [doctorId]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'SUSPEND_DOCTOR',
        'doctor',
        doctorId,
        oldData,
        { 
          status: 'suspended', 
          approval_status: 'suspended',
          reason 
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor suspended', {
        doctorId,
        suspendedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم تعليق الطبيب',
        message_en: 'Doctor suspended',
        data: {
          doctorId,
          status: 'suspended',
          approval_status: 'suspended'
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Suspend doctor error', { error: error.message, doctorId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تعليق الطبيب',
        message_en: 'Error suspending doctor'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get pending doctors (doctors awaiting approval)
   * جلب الأطباء المعلقين (في انتظار الموافقة)
   */
  static async getPendingDoctors(req, res) {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';

    try {
      const [doctors] = await db.query(
        `SELECT 
          d.id,
          d.uuid,
          d.email,
          d.phone,
          d.status,
          d.created_at,
          dp.license_number,
          dp.years_of_experience,
          dp.approval_status,
          dp.is_verified,
          dpt.full_name,
          dpt.specialty,
          dpt.sub_specialty
        FROM doctors d
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE dp.approval_status = 'pending'
        ORDER BY d.created_at ASC
        LIMIT ? OFFSET ?`,
        [language, parseInt(limit), offset]
      );

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total 
         FROM doctors d 
         LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id 
         WHERE dp.approval_status = 'pending'`
      );

      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        data: doctors,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: offset + doctors.length < total
        }
      });

    } catch (error) {
      logger.error('Get pending doctors error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب الأطباء المعلقين',
        message_en: 'Error fetching pending doctors'
      });
    }
  }

  /**
   * Get doctor statistics for admin dashboard
   * جلب إحصائيات الأطباء للوحة التحكم
   */
  static async getDoctorStatistics(req, res) {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_doctors,
          COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_doctors,
          COUNT(CASE WHEN d.status = 'inactive' THEN 1 END) as inactive_doctors,
          COUNT(CASE WHEN d.status = 'suspended' THEN 1 END) as suspended_doctors,
          COUNT(CASE WHEN d.status = 'pending_verification' THEN 1 END) as pending_verification_doctors,
          COUNT(CASE WHEN dp.approval_status = 'pending' THEN 1 END) as pending_approval,
          COUNT(CASE WHEN dp.approval_status = 'approved' THEN 1 END) as approved_doctors,
          COUNT(CASE WHEN dp.approval_status = 'rejected' THEN 1 END) as rejected_doctors,
          COUNT(CASE WHEN dp.is_verified = 1 THEN 1 END) as verified_doctors,
          COUNT(CASE WHEN dp.is_verified = 0 THEN 1 END) as unverified_doctors,
          COUNT(CASE WHEN d.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_doctors_last_week,
          COUNT(CASE WHEN d.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_doctors_last_month
        FROM doctors d
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
      `);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      logger.error('Get doctor statistics error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب الإحصائيات',
        message_en: 'Error fetching statistics'
      });
    }
  }

  /**
   * Bulk update doctors status
   * تحديث حالة مجموعة من الأطباء
   */
  static async bulkUpdateDoctorsStatus(req, res) {
    const { doctorIds, status, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    if (!Array.isArray(doctorIds) || doctorIds.length === 0) {
      return res.status(400).json({
        success: false,
        message_ar: 'يجب تحديد قائمة الأطباء',
        message_en: 'Doctor IDs list is required'
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended', 'pending_verification'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message_ar: 'الحالة غير صحيحة',
        message_en: 'Invalid status'
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Update all doctors
      const placeholders = doctorIds.map(() => '?').join(',');
      await connection.query(
        `UPDATE doctors SET status = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
        [status, ...doctorIds]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'BULK_UPDATE_DOCTORS_STATUS',
        'doctors',
        null,
        { doctorIds },
        { status, reason, count: doctorIds.length },
        clientInfo
      );

      await connection.commit();

      logger.info('Bulk doctors status updated', {
        doctorIds,
        newStatus: status,
        updatedBy: adminId,
        count: doctorIds.length
      });

      res.json({
        success: true,
        message_ar: `تم تحديث حالة ${doctorIds.length} طبيب بنجاح`,
        message_en: `${doctorIds.length} doctors status updated successfully`,
        data: {
          updatedCount: doctorIds.length,
          newStatus: status
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Bulk update doctors status error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث حالة الأطباء',
        message_en: 'Error updating doctors status'
      });
    } finally {
      connection.release();
    }
  }


    /**
     * Update doctor verification status (comprehensive)
     * تحديث حالة التحقق الشاملة للطبيب
     * Updates: is_verified, verification_date, verified_by, approval_status
     */
    static async updateDoctorVerificationStatus(req, res) {
      const { doctorId } = req.params;
      const { is_verified, approval_status, reason } = req.body;
      const adminId = req.user.id;
      const clientInfo = getClientInfo(req);

      // Validation
      if (is_verified === undefined) {
        return res.status(400).json({
          success: false,
          message_ar: 'حالة التحقق مطلوبة (is_verified)',
          message_en: 'Verification status is required (is_verified)'
        });
      }

      const validApprovalStatuses = ['pending', 'approved', 'rejected', 'suspended'];
      if (approval_status && !validApprovalStatuses.includes(approval_status)) {
        return res.status(400).json({
          success: false,
          message_ar: 'حالة الموافقة غير صحيحة. القيم المسموحة: ' + validApprovalStatuses.join(', '),
          message_en: 'Invalid approval status. Allowed values: ' + validApprovalStatuses.join(', ')
        });
      }

      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // Get current profile
        const [profileRows] = await connection.query(
          `SELECT dp.*, d.email, d.status as doctor_status, d.uuid
           FROM doctor_profiles dp
           JOIN doctors d ON dp.doctor_id = d.id
           WHERE dp.doctor_id = ?`,
          [doctorId]
        );

        if (profileRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message_ar: 'ملف الطبيب غير موجود',
            message_en: 'Doctor profile not found'
          });
        }

        const currentProfile = profileRows[0];
        const profileId = currentProfile.id;
        const oldData = {
          is_verified: currentProfile.is_verified,
          verification_date: currentProfile.verification_date,
          verified_by: currentProfile.verified_by,
          approval_status: currentProfile.approval_status
        };

        // Prepare update data
        const updateData = {
          is_verified: is_verified ? 1 : 0,
          verification_date: is_verified ? new Date() : null,
          verified_by: is_verified ? adminId : null
        };

        // If approval_status is provided, update it
        if (approval_status) {
          updateData.approval_status = approval_status;
        } else if (is_verified) {
          // Auto-set approval_status to 'approved' if verified
          updateData.approval_status = 'approved';
        }

        // Update doctor_profiles
        await connection.query(
          `UPDATE doctor_profiles
           SET is_verified = ?,
               verification_date = ?,
               verified_by = ?,
               approval_status = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [
            updateData.is_verified,
            updateData.verification_date,
            updateData.verified_by,
            updateData.approval_status,
            profileId
          ]
        );

        // Update doctor status based on verification and approval
        let newDoctorStatus = currentProfile.doctor_status;

        if (is_verified && updateData.approval_status === 'approved') {
          newDoctorStatus = 'active';
        } else if (updateData.approval_status === 'rejected') {
          newDoctorStatus = 'inactive';
        } else if (updateData.approval_status === 'suspended') {
          newDoctorStatus = 'suspended';
        } else if (!is_verified) {
          newDoctorStatus = 'pending_verification';
        }

        if (newDoctorStatus !== currentProfile.doctor_status) {
          await connection.query(
            'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
            [newDoctorStatus, doctorId]
          );
        }

        // Log admin action
        await logAdminAction(
          adminId,
          'UPDATE_DOCTOR_VERIFICATION_STATUS',
          'doctor_profile',
          profileId,
          oldData,
          { ...updateData, reason, newDoctorStatus },
          clientInfo
        );

        await connection.commit();

        logger.info('Doctor verification status updated', {
          doctorId,
          profileId,
          oldData,
          newData: updateData,
          newDoctorStatus,
          updatedBy: adminId,
          reason
        });

        res.json({
          success: true,
          message_ar: 'تم تحديث حالة التحقق بنجاح',
          message_en: 'Verification status updated successfully',
          data: {
            doctorId,
            doctorUuid: currentProfile.uuid,
            profileId,
            oldData,
            newData: {
              is_verified: updateData.is_verified === 1,
              verification_date: updateData.verification_date,
              verified_by: updateData.verified_by,
              approval_status: updateData.approval_status,
              doctor_status: newDoctorStatus
            }
          }
        });

      } catch (error) {
        await connection.rollback();
        logger.error('Update doctor verification status error', {
          error: error.message,
          stack: error.stack,
          doctorId
        });
        res.status(500).json({
          success: false,
          message_ar: 'خطأ في تحديث حالة التحقق',
          message_en: 'Error updating verification status',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      } finally {
        connection.release();
      }
    }

  /**
   * Update doctor verification status (comprehensive)
   * تحديث حالة التحقق الشاملة للطبيب
   * Updates: is_verified, verification_date, verified_by, approval_status
   */
  static async updateDoctorVerificationStatus(req, res) {
    const { doctorId } = req.params;
    const { is_verified, approval_status, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    // Validation
    if (is_verified === undefined) {
      return res.status(400).json({
        success: false,
        message_ar: 'حالة التحقق مطلوبة (is_verified)',
        message_en: 'Verification status is required (is_verified)'
      });
    }

    const validApprovalStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (approval_status && !validApprovalStatuses.includes(approval_status)) {
      return res.status(400).json({
        success: false,
        message_ar: 'حالة الموافقة غير صحيحة. القيم المسموحة: ' + validApprovalStatuses.join(', '),
        message_en: 'Invalid approval status. Allowed values: ' + validApprovalStatuses.join(', ')
      });
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current profile
      const [profileRows] = await connection.query(
        `SELECT dp.*, d.email, d.status as doctor_status, d.uuid
         FROM doctor_profiles dp 
         JOIN doctors d ON dp.doctor_id = d.id 
         WHERE dp.doctor_id = ?`,
        [doctorId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'ملف الطبيب غير موجود',
          message_en: 'Doctor profile not found'
        });
      }

      const currentProfile = profileRows[0];
      const profileId = currentProfile.id;
      const oldData = {
        is_verified: currentProfile.is_verified,
        verification_date: currentProfile.verification_date,
        verified_by: currentProfile.verified_by,
        approval_status: currentProfile.approval_status
      };

      // Prepare update data
      const updateData = {
        is_verified: is_verified ? 1 : 0,
        verification_date: is_verified ? new Date() : null,
        verified_by: is_verified ? adminId : null
      };

      // If approval_status is provided, update it
      if (approval_status) {
        updateData.approval_status = approval_status;
      } else if (is_verified) {
        // Auto-set approval_status to 'approved' if verified
        updateData.approval_status = 'approved';
      }

      // Update doctor_profiles
      await connection.query(
        `UPDATE doctor_profiles 
         SET is_verified = ?, 
             verification_date = ?, 
             verified_by = ?,
             approval_status = ?,
             updated_at = NOW() 
         WHERE id = ?`,
        [
          updateData.is_verified,
          updateData.verification_date,
          updateData.verified_by,
          updateData.approval_status,
          profileId
        ]
      );

      // Update doctor status based on verification and approval
      let newDoctorStatus = currentProfile.doctor_status;
      
      if (is_verified && updateData.approval_status === 'approved') {
        newDoctorStatus = 'active';
      } else if (updateData.approval_status === 'rejected') {
        newDoctorStatus = 'inactive';
      } else if (updateData.approval_status === 'suspended') {
        newDoctorStatus = 'suspended';
      } else if (!is_verified) {
        newDoctorStatus = 'pending_verification';
      }

      if (newDoctorStatus !== currentProfile.doctor_status) {
        await connection.query(
          'UPDATE doctors SET status = ?, updated_at = NOW() WHERE id = ?',
          [newDoctorStatus, doctorId]
        );
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_DOCTOR_VERIFICATION_STATUS',
        'doctor_profile',
        profileId,
        oldData,
        { ...updateData, reason, newDoctorStatus },
        clientInfo
      );

      await connection.commit();

      logger.info('Doctor verification status updated', {
        doctorId,
        profileId,
        oldData,
        newData: updateData,
        newDoctorStatus,
        updatedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم تحديث حالة التحقق بنجاح',
        message_en: 'Verification status updated successfully',
        data: {
          doctorId,
          doctorUuid: currentProfile.uuid,
          profileId,
          oldData,
          newData: {
            is_verified: updateData.is_verified === 1,
            verification_date: updateData.verification_date,
            verified_by: updateData.verified_by,
            approval_status: updateData.approval_status,
            doctor_status: newDoctorStatus
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update doctor verification status error', { 
        error: error.message, 
        stack: error.stack,
        doctorId 
      });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث حالة التحقق',
        message_en: 'Error updating verification status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

}

module.exports = AdminDoctorManagementController;

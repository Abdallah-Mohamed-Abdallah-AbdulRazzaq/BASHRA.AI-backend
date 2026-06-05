const db = require('../config/db');

/**
 * Doctor Subscriptions Controller
 * Handles subscription management for doctors
 * 
 * Doctor: Can create subscription requests and view their subscriptions
 * Admin: Can approve, modify, and manage all subscriptions
 */

class DoctorSubscriptionsController {
  /**
   * Create subscription request (Doctor)
   * POST /api/doctor-subscriptions/subscribe
   * Access: Doctor only
   */
  static async createSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      let { package_id } = req.body;

      // Convert package_id to integer
      if (package_id !== undefined && package_id !== null && package_id !== '') {
        package_id = parseInt(package_id);
      }

      // Validation
      if (!package_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'معرف الباقة مطلوب'
        });
      }

      // Check if package exists and is active
      const [pkg] = await connection.execute(
        'SELECT id, duration_days, price, is_active FROM packages WHERE id = ?',
        [package_id]
      );

      if (pkg.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الباقة غير موجودة'
        });
      }

      if (pkg[0].is_active === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'الباقة غير متاحة حالياً'
        });
      }

      // Check if doctor has active or pending subscription
      const [activeSubscription] = await connection.execute(`
        SELECT id, subscription_status, end_date 
        FROM doctor_subscriptions 
        WHERE doctor_id = ? AND subscription_status IN ('active', 'pending')
        ORDER BY created_at DESC
        LIMIT 1
      `, [doctorId]);

      if (activeSubscription.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `لديك اشتراك ${activeSubscription[0].subscription_status === 'active' ? 'نشط' : 'قيد المراجعة'} بالفعل`,
          current_subscription: activeSubscription[0]
        });
      }

      // Check if doctor has canceled subscription
      const [canceledSubscription] = await connection.execute(`
        SELECT id, subscription_status 
        FROM doctor_subscriptions 
        WHERE doctor_id = ? AND subscription_status = 'canceled'
        ORDER BY created_at DESC
        LIMIT 1
      `, [doctorId]);

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + pkg[0].duration_days);

      // Format dates for MySQL (YYYY-MM-DD)
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

      let subscriptionId;

      // If there's a canceled subscription, renew it
      if (canceledSubscription.length > 0) {
        subscriptionId = canceledSubscription[0].id;
        
        // Update the canceled subscription to pending with new dates
        await connection.execute(`
          UPDATE doctor_subscriptions 
          SET 
            package_id = ?,
            start_date = ?,
            end_date = ?,
            subscription_status = 'pending',
            approved_by_admin_id = NULL,
            last_modified_by_admin_id = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [package_id, formattedStartDate, formattedEndDate, subscriptionId]);
      } else {
        // Create new subscription with pending status
        const [result] = await connection.execute(`
          INSERT INTO doctor_subscriptions (
            doctor_id, package_id, start_date, end_date, 
            subscription_status, is_trial
          ) VALUES (?, ?, ?, ?, 'pending', 0)
        `, [doctorId, package_id, formattedStartDate, formattedEndDate]);
        
        subscriptionId = result.insertId;
      }

      await connection.commit();

      // Fetch created/updated subscription with package details
      const [subscription] = await connection.execute(`
        SELECT 
          ds.*,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days
        FROM doctor_subscriptions ds
        INNER JOIN packages p ON ds.package_id = p.id
        WHERE ds.id = ?
      `, [subscriptionId]);

      const isRenewal = canceledSubscription.length > 0;

      res.status(201).json({
        success: true,
        message: isRenewal 
          ? 'تم تجديد طلب الاشتراك بنجاح. في انتظار موافقة الإدارة'
          : 'تم إرسال طلب الاشتراك بنجاح. في انتظار موافقة الإدارة',
        is_renewal: isRenewal,
        data: subscription[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating subscription:', error);
      
      // Handle unique constraint violation
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'لديك طلب اشتراك مماثل بالفعل'
        });
      }

      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctor's own subscriptions
   * GET /api/doctor-subscriptions/my-subscriptions
   * Access: Doctor only
   */
  static async getMySubscriptions(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const { status } = req.query;

      let query = `
        SELECT 
          ds.*,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days,
          a1.email as approved_by_name,
          a2.email as last_modified_by_name
        FROM doctor_subscriptions ds
        INNER JOIN packages p ON ds.package_id = p.id
        LEFT JOIN admins a1 ON ds.approved_by_admin_id = a1.id
        LEFT JOIN admins a2 ON ds.last_modified_by_admin_id = a2.id
        WHERE ds.doctor_id = ?
      `;
      const params = [doctorId];

      if (status) {
        query += ' AND ds.subscription_status = ?';
        params.push(status);
      }

      query += ' ORDER BY ds.created_at DESC';

      const [subscriptions] = await connection.execute(query, params);

      res.json({
        success: true,
        count: subscriptions.length,
        data: subscriptions
      });

    } catch (error) {
      console.error('Error fetching doctor subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الاشتراكات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctor's current active subscription
   * GET /api/doctor-subscriptions/current
   * Access: Doctor only
   */
  static async getCurrentSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;

      const [subscription] = await connection.execute(`
        SELECT 
          ds.*,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days
        FROM doctor_subscriptions ds
        INNER JOIN packages p ON ds.package_id = p.id
        WHERE ds.doctor_id = ? AND ds.subscription_status = 'active'
        ORDER BY ds.end_date DESC
        LIMIT 1
      `, [doctorId]);

      if (subscription.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا يوجد اشتراك نشط حالياً'
        });
      }

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
          pf.feature_value,
          pf.is_included,
          f.name_ar as feature_name_ar,
          f.name_en as feature_name_en,
          f.unit_ar,
          f.unit_en
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        WHERE pf.package_id = ? AND pf.is_included = 1
        ORDER BY f.id ASC
      `, [subscription[0].package_id]);

      subscription[0].features = features;

      res.json({
        success: true,
        data: subscription[0]
      });

    } catch (error) {
      console.error('Error fetching current subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الاشتراك الحالي',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel subscription request (Doctor - only pending)
   * DELETE /api/doctor-subscriptions/:id/cancel
   * Access: Doctor only
   */
  static async cancelSubscriptionRequest(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const subscriptionId = req.params.id;

      // Check if subscription exists and belongs to doctor
      const [subscription] = await connection.execute(
        'SELECT id, subscription_status FROM doctor_subscriptions WHERE id = ? AND doctor_id = ?',
        [subscriptionId, doctorId]
      );

      if (subscription.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      // Only pending subscriptions can be canceled by doctor
      if (subscription[0].subscription_status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'يمكن إلغاء الاشتراكات قيد المراجعة فقط'
        });
      }

      // Update status to canceled
      await connection.execute(
        'UPDATE doctor_subscriptions SET subscription_status = ? WHERE id = ?',
        ['canceled', subscriptionId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'تم إلغاء طلب الاشتراك بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error canceling subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إلغاء الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ==================== ADMIN APIS ====================

  /**
   * Get all subscriptions (Admin)
   * GET /api/doctor-subscriptions/admin/all
   * Access: Admin only
   */
  static async getAllSubscriptions(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { status, doctor_id, package_id } = req.query;

      let query = `
        SELECT 
          ds.*,
          COALESCE(dpt_ar.full_name, dpt_en.full_name, dpt_any.full_name) as doctor_name,
          d.email as doctor_email,
          d.phone as doctor_phone,
          COALESCE(dpt_ar.specialty, dpt_en.specialty, dpt_any.specialty) as specialization,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days,
          a1.email as approved_by_name,
          a2.email as last_modified_by_name
        FROM doctor_subscriptions ds
        INNER JOIN doctors d ON ds.doctor_id = d.id
        INNER JOIN packages p ON ds.package_id = p.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt_ar ON dp.id = dpt_ar.doctor_profile_id AND dpt_ar.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        LEFT JOIN doctor_profile_translations dpt_any ON dp.id = dpt_any.doctor_profile_id AND dpt_any.id = (
          SELECT MIN(id) FROM doctor_profile_translations WHERE doctor_profile_id = dp.id
        )
        LEFT JOIN admins a1 ON ds.approved_by_admin_id = a1.id
        LEFT JOIN admins a2 ON ds.last_modified_by_admin_id = a2.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND ds.subscription_status = ?';
        params.push(status);
      }

      if (doctor_id) {
        query += ' AND ds.doctor_id = ?';
        params.push(doctor_id);
      }

      if (package_id) {
        query += ' AND ds.package_id = ?';
        params.push(package_id);
      }

      query += ' ORDER BY ds.created_at DESC';

      const [subscriptions] = await connection.execute(query, params);

      res.json({
        success: true,
        count: subscriptions.length,
        data: subscriptions
      });

    } catch (error) {
      console.error('Error fetching all subscriptions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الاشتراكات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get subscription by ID (Admin)
   * GET /api/doctor-subscriptions/admin/:id
   * Access: Admin only
   */
  static async getSubscriptionById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const subscriptionId = req.params.id;

      const [subscription] = await connection.execute(`
        SELECT 
          ds.*,
          COALESCE(dpt_ar.full_name, dpt_en.full_name, dpt_any.full_name) as doctor_name,
          d.email as doctor_email,
          d.phone as doctor_phone,
          COALESCE(dpt_ar.specialty, dpt_en.specialty, dpt_any.specialty) as specialization,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en,
          p.price,
          p.duration_days,
          a1.email as approved_by_name,
          a2.email as last_modified_by_name
        FROM doctor_subscriptions ds
        INNER JOIN doctors d ON ds.doctor_id = d.id
        INNER JOIN packages p ON ds.package_id = p.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt_ar ON dp.id = dpt_ar.doctor_profile_id AND dpt_ar.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        LEFT JOIN doctor_profile_translations dpt_any ON dp.id = dpt_any.doctor_profile_id AND dpt_any.id = (
          SELECT MIN(id) FROM doctor_profile_translations WHERE doctor_profile_id = dp.id
        )
        LEFT JOIN admins a1 ON ds.approved_by_admin_id = a1.id
        LEFT JOIN admins a2 ON ds.last_modified_by_admin_id = a2.id
        WHERE ds.id = ?
      `, [subscriptionId]);

      if (subscription.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      // Get package features
      const [features] = await connection.execute(`
        SELECT 
          pf.feature_value,
          pf.is_included,
          f.name_ar as feature_name_ar,
          f.name_en as feature_name_en,
          f.unit_ar,
          f.unit_en
        FROM package_features pf
        INNER JOIN features f ON pf.feature_id = f.id
        WHERE pf.package_id = ?
        ORDER BY f.id ASC
      `, [subscription[0].package_id]);

      subscription[0].features = features;

      res.json({
        success: true,
        data: subscription[0]
      });

    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Approve subscription (Admin)
   * PATCH /api/doctor-subscriptions/admin/:id/approve
   * Access: Admin only
   */
  static async approveSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const subscriptionId = req.params.id;

      // Get subscription details
      const [subscription] = await connection.execute(
        'SELECT id, doctor_id, subscription_status FROM doctor_subscriptions WHERE id = ?',
        [subscriptionId]
      );

      if (subscription.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      if (subscription[0].subscription_status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `لا يمكن تفعيل اشتراك بحالة ${subscription[0].subscription_status}`
        });
      }

      const doctorId = subscription[0].doctor_id;

      // Deactivate any current active subscription for this doctor
      await connection.execute(`
        UPDATE doctor_subscriptions 
        SET subscription_status = 'expired'
        WHERE doctor_id = ? AND subscription_status = 'active' AND id != ?
      `, [doctorId, subscriptionId]);

      // Activate the subscription
      await connection.execute(`
        UPDATE doctor_subscriptions 
        SET subscription_status = 'active',
            approved_by_admin_id = ?,
            last_modified_by_admin_id = ?
        WHERE id = ?
      `, [adminId, adminId, subscriptionId]);

      // Update doctor's current_subscription_id
      await connection.execute(
        'UPDATE doctors SET current_subscription_id = ? WHERE id = ?',
        [subscriptionId, doctorId]
      );

      await connection.commit();

      // Fetch updated subscription
      const [updated] = await connection.execute(`
        SELECT 
          ds.*,
          COALESCE(dpt_ar.full_name, dpt_en.full_name, dpt_any.full_name) as doctor_name,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en
        FROM doctor_subscriptions ds
        INNER JOIN doctors d ON ds.doctor_id = d.id
        INNER JOIN packages p ON ds.package_id = p.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt_ar ON dp.id = dpt_ar.doctor_profile_id AND dpt_ar.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        LEFT JOIN doctor_profile_translations dpt_any ON dp.id = dpt_any.doctor_profile_id AND dpt_any.id = (
          SELECT MIN(id) FROM doctor_profile_translations WHERE doctor_profile_id = dp.id
        )
        WHERE ds.id = ?
      `, [subscriptionId]);

      res.json({
        success: true,
        message: 'تم تفعيل الاشتراك بنجاح',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error approving subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تفعيل الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update subscription (Admin)
   * PUT /api/doctor-subscriptions/admin/:id
   * Access: Admin only
   */
  static async updateSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const subscriptionId = req.params.id;
      let {
        subscription_status,
        is_trial,
        start_date,
        end_date
      } = req.body;

      // Check if subscription exists
      const [existing] = await connection.execute(
        'SELECT id, doctor_id FROM doctor_subscriptions WHERE id = ?',
        [subscriptionId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      // Convert is_trial
      if (is_trial !== undefined) {
        if (typeof is_trial === 'string') {
          is_trial = is_trial.toLowerCase() === 'true' || is_trial === '1' ? 1 : 0;
        } else {
          is_trial = is_trial ? 1 : 0;
        }
      }

      // Build update query
      const updates = [];
      const values = [];

      if (subscription_status !== undefined) {
        updates.push('subscription_status = ?');
        values.push(subscription_status);
      }
      if (is_trial !== undefined) {
        updates.push('is_trial = ?');
        values.push(is_trial);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        values.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        values.push(end_date);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      // Always update last_modified_by_admin_id
      updates.push('last_modified_by_admin_id = ?');
      values.push(adminId);
      values.push(subscriptionId);

      await connection.execute(`
        UPDATE doctor_subscriptions
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      // If status changed to active, update doctor's current_subscription_id
      if (subscription_status === 'active') {
        await connection.execute(
          'UPDATE doctors SET current_subscription_id = ? WHERE id = ?',
          [subscriptionId, existing[0].doctor_id]
        );
      }

      await connection.commit();

      // Fetch updated subscription
      const [updated] = await connection.execute(`
        SELECT 
          ds.*,
          COALESCE(dpt_ar.full_name, dpt_en.full_name, dpt_any.full_name) as doctor_name,
          p.name_ar as package_name_ar,
          p.name_en as package_name_en
        FROM doctor_subscriptions ds
        INNER JOIN doctors d ON ds.doctor_id = d.id
        INNER JOIN packages p ON ds.package_id = p.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt_ar ON dp.id = dpt_ar.doctor_profile_id AND dpt_ar.language_code = 'ar'
        LEFT JOIN doctor_profile_translations dpt_en ON dp.id = dpt_en.doctor_profile_id AND dpt_en.language_code = 'en'
        LEFT JOIN doctor_profile_translations dpt_any ON dp.id = dpt_any.doctor_profile_id AND dpt_any.id = (
          SELECT MIN(id) FROM doctor_profile_translations WHERE doctor_profile_id = dp.id
        )
        WHERE ds.id = ?
      `, [subscriptionId]);

      res.json({
        success: true,
        message: 'تم تحديث الاشتراك بنجاح',
        data: updated[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Expire/Cancel subscription (Admin)
   * PATCH /api/doctor-subscriptions/admin/:id/expire
   * Access: Admin only
   */
  static async expireSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const subscriptionId = req.params.id;
      const { reason } = req.body; // Optional cancellation reason

      // Get subscription
      const [subscription] = await connection.execute(
        'SELECT id, doctor_id, subscription_status FROM doctor_subscriptions WHERE id = ?',
        [subscriptionId]
      );

      if (subscription.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      // Update subscription status
      await connection.execute(`
        UPDATE doctor_subscriptions 
        SET subscription_status = 'expired',
            last_modified_by_admin_id = ?
        WHERE id = ?
      `, [adminId, subscriptionId]);

      // If this was the current subscription, clear it from doctor
      await connection.execute(
        'UPDATE doctors SET current_subscription_id = NULL WHERE current_subscription_id = ?',
        [subscriptionId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'تم إنهاء الاشتراك بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error expiring subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنهاء الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete subscription (Admin)
   * DELETE /api/doctor-subscriptions/admin/:id
   * Access: Admin only
   */
  static async deleteSubscription(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const subscriptionId = req.params.id;

      // Check if subscription exists
      const [subscription] = await connection.execute(
        'SELECT id, doctor_id FROM doctor_subscriptions WHERE id = ?',
        [subscriptionId]
      );

      if (subscription.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الاشتراك غير موجود'
        });
      }

      // Clear from doctor if it's current subscription
      await connection.execute(
        'UPDATE doctors SET current_subscription_id = NULL WHERE current_subscription_id = ?',
        [subscriptionId]
      );

      // Delete subscription
      await connection.execute(
        'DELETE FROM doctor_subscriptions WHERE id = ?',
        [subscriptionId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'تم حذف الاشتراك بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting subscription:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الاشتراك',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = DoctorSubscriptionsController;

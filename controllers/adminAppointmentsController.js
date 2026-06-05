const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Admin Appointments Controller
 * Handles appointment management for admins
 * الإداريين - إدارة المواعيد
 */

class AdminAppointmentsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get all appointments (admin view)
   * جلب جميع المواعيد
   * GET /api/admin/appointments
   */
  static async getAllAppointments(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { 
        status, 
        doctor_id,
        patient_id,
        from_date, 
        to_date,
        appointment_type,
        urgency_level,
        payment_status,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT 
          a.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON a.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE 1=1
      `;
      const params = [lang, lang];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (doctor_id) {
        query += ' AND a.doctor_id = ?';
        params.push(doctor_id);
      }

      if (patient_id) {
        query += ' AND a.patient_id = ?';
        params.push(patient_id);
      }

      if (appointment_type) {
        query += ' AND a.appointment_type = ?';
        params.push(appointment_type);
      }

      if (urgency_level) {
        query += ' AND a.urgency_level = ?';
        params.push(urgency_level);
      }

      if (payment_status) {
        query += ' AND a.payment_status = ?';
        params.push(payment_status);
      }

      if (from_date) {
        query += ' AND a.scheduled_date >= ?';
        params.push(from_date);
      }

      if (to_date) {
        query += ' AND a.scheduled_date <= ?';
        params.push(to_date);
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      const offset = (page - 1) * limit;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      query += ` ORDER BY a.scheduled_date DESC, a.actual_start_time DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [appointments] = await connection.execute(query, params);

      // Get translations for each appointment
      const formattedAppointments = await Promise.all(appointments.map(async (apt) => {
        const [translations] = await connection.execute(
          'SELECT * FROM appointment_translations WHERE appointment_id = ? AND language_code = ?',
          [apt.id, lang]
        );

        return {
          ...apt,
          translations: translations[0] || null
        };
      }));

      res.json({
        success: true,
        count: formattedAppointments.length,
        total: total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: formattedAppointments
      });

    } catch (error) {
      console.error('Error fetching appointments:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب المواعيد' 
          : 'Error fetching appointments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single appointment details
   * جلب تفاصيل موعد واحد
   * GET /api/admin/appointments/:id
   */
  static async getAppointmentById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT 
          a.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          up.date_of_birth as patient_dob,
          up.gender as patient_gender,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address,
          creator_u.email as created_by_user_email,
          creator_upt.full_name as created_by_user_name,
          creator_a.email as created_by_admin_email,
          canceller_u.email as cancelled_by_user_email,
          canceller_d.email as cancelled_by_doctor_email,
          canceller_a.email as cancelled_by_admin_email
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON a.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN users creator_u ON a.created_by_user_id = creator_u.id
        LEFT JOIN user_profiles creator_up ON creator_u.id = creator_up.user_id
        LEFT JOIN user_profile_translations creator_upt ON creator_up.id = creator_upt.profile_id AND creator_upt.language_code = ?
        LEFT JOIN admins creator_a ON a.created_by_admin_id = creator_a.id
        LEFT JOIN users canceller_u ON a.cancelled_by_user_id = canceller_u.id
        LEFT JOIN doctors canceller_d ON a.cancelled_by_doctor_id = canceller_d.id
        LEFT JOIN admins canceller_a ON a.cancelled_by_admin_id = canceller_a.id
        WHERE ${isUUID ? 'a.uuid' : 'a.id'} = ?
      `, [lang, lang, lang, id]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      // Get all translations
      const [translations] = await connection.execute(
        'SELECT * FROM appointment_translations WHERE appointment_id = ?',
        [appointment.id]
      );

      const translationsMap = {};
      translations.forEach(t => {
        translationsMap[t.language_code] = {
          chief_complaint: t.chief_complaint,
          symptoms_description: t.symptoms_description,
          cancellation_reason: t.cancellation_reason,
          notes: t.notes
        };
      });

      res.json({
        success: true,
        data: {
          ...appointment,
          translations: translationsMap
        }
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب الموعد' 
          : 'Error fetching appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create appointment (admin creates for patient)
   * إنشاء موعد
   * POST /api/admin/appointments
   */
  static async createAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      let {
        patient_id,
        schedule_id,
        scheduled_date,
        actual_start_time,
        appointment_type = 'consultation',
        urgency_level = 'medium',
        payment_status = 'pending',
        language_code,
        chief_complaint,
        symptoms_description,
        notes
      } = req.body;

      // Validation
      if (!patient_id || !schedule_id || !scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'معرف المريض والجدول والتاريخ والوقت مطلوبة' 
            : 'Patient ID, schedule ID, date, and time are required'
        });
      }

      // Verify patient exists
      const [patientRows] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND is_active = 1',
        [patient_id]
      );

      if (patientRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'المريض غير موجود' : 'Patient not found'
        });
      }

      // Fetch schedule details from doctor_schedules
      const [scheduleRows] = await connection.execute(`
        SELECT 
          ds.doctor_id,
          ds.clinic_id,
          ds.session_duration as duration_minutes,
          ds.session_price as consultation_fee,
          ds.currency_code,
          ds.consultation_type,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.is_active
        FROM doctor_schedules ds
        WHERE ds.id = ?
      `, [schedule_id]);

      if (scheduleRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الجدول غير موجود' : 'Schedule not found'
        });
      }

      const schedule = scheduleRows[0];

      // Check if schedule is active
      if (schedule.is_active !== 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'هذا الجدول غير نشط' : 'This schedule is not active'
        });
      }

      // Verify doctor exists and is available
      const [doctorRows] = await connection.execute(`
        SELECT d.id
        FROM doctors d
        JOIN doctor_profiles dp ON d.id = dp.doctor_id
        WHERE d.id = ? AND d.status = 'active' AND dp.approval_status = 'approved'
      `, [schedule.doctor_id]);

      if (doctorRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب غير متاح' : 'Doctor not available'
        });
      }

      // Validate day of week matches
      const scheduledDateObj = new Date(scheduled_date);
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[scheduledDateObj.getDay()];

      if (dayOfWeek !== schedule.day_of_week) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? `هذا الجدول متاح فقط يوم ${schedule.day_of_week}` 
            : `This schedule is only available on ${schedule.day_of_week}`
        });
      }

      // Validate time is within schedule range
      if (actual_start_time < schedule.start_time || actual_start_time >= schedule.end_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'الوقت المحدد خارج نطاق الجدول' 
            : 'Selected time is outside schedule range'
        });
      }

      // Check for conflicts
      const [conflicts] = await connection.execute(`
        SELECT id
        FROM appointments
        WHERE doctor_id = ? 
          AND scheduled_date = ? 
          AND actual_start_time = ?
          AND status NOT IN ('cancelled', 'no_show')
      `, [schedule.doctor_id, scheduled_date, actual_start_time]);

      if (conflicts.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: lang === 'ar' 
            ? 'هذا الموعد محجوز بالفعل' 
            : 'This time slot is already booked'
        });
      }

      // Create appointment with data from schedule
      const uuid = uuidv4();
      const [result] = await connection.execute(`
        INSERT INTO appointments (
          uuid, patient_id, doctor_id, clinic_id, schedule_id, created_by_admin_id,
          appointment_type, scheduled_date, actual_start_time, duration_minutes,
          status, urgency_level, consultation_fee, currency_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `, [
        uuid,
        patient_id,
        schedule.doctor_id,
        schedule.clinic_id || null,
        schedule_id,
        adminId,
        appointment_type,
        scheduled_date,
        actual_start_time,
        schedule.duration_minutes,
        urgency_level,
        schedule.consultation_fee,
        schedule.currency_code,
        payment_status
      ]);

      const appointmentId = result.insertId;

      // Insert translation if provided
      const translationLang = language_code || lang;
      if (chief_complaint || symptoms_description || notes) {
        await connection.execute(`
          INSERT INTO appointment_translations (
            appointment_id, language_code, chief_complaint, symptoms_description, notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          appointmentId,
          translationLang,
          chief_complaint || null,
          symptoms_description || null,
          notes || null
        ]);
      }

      await connection.commit();

      // Fetch created appointment
      const [appointment] = await connection.execute(
        'SELECT * FROM appointments WHERE id = ?',
        [appointmentId]
      );

      res.status(201).json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إنشاء الموعد بنجاح' 
          : 'Appointment created successfully',
        data: appointment[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إنشاء الموعد' 
          : 'Error creating appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update appointment
   * تحديث موعد
   * PUT /api/admin/appointments/:id
   */
  static async updateAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const {
        scheduled_date,
        actual_start_time,
        duration_minutes,
        appointment_type,
        urgency_level,
        consultation_fee,
        currency_code,
        payment_status,
        status
      } = req.body;

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ?
      `, [id]);

      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      // Build update query
      const updates = [];
      const values = [];

      if (scheduled_date !== undefined) {
        updates.push('scheduled_date = ?');
        values.push(scheduled_date);
      }
      if (actual_start_time !== undefined) {
        updates.push('actual_start_time = ?');
        values.push(actual_start_time);
      }
      if (duration_minutes !== undefined) {
        updates.push('duration_minutes = ?');
        values.push(duration_minutes);
      }
      if (appointment_type !== undefined) {
        updates.push('appointment_type = ?');
        values.push(appointment_type);
      }
      if (urgency_level !== undefined) {
        updates.push('urgency_level = ?');
        values.push(urgency_level);
      }
      if (consultation_fee !== undefined) {
        updates.push('consultation_fee = ?');
        values.push(consultation_fee);
      }
      if (currency_code !== undefined) {
        updates.push('currency_code = ?');
        values.push(currency_code);
      }
      if (payment_status !== undefined) {
        updates.push('payment_status = ?');
        values.push(payment_status);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا توجد بيانات للتحديث' 
            : 'No data to update'
        });
      }

      values.push(appointment.id);

      await connection.execute(`
        UPDATE appointments
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث الموعد بنجاح' 
          : 'Appointment updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث الموعد' 
          : 'Error updating appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel appointment
   * إلغاء موعد
   * PATCH /api/admin/appointments/:id/cancel
   */
  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const adminId = req.user.id;
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      let { cancellation_reason } = req.body;

      // Parse if string
      if (typeof cancellation_reason === 'string') {
        try {
          cancellation_reason = JSON.parse(cancellation_reason);
        } catch (e) {
          // Keep as string
        }
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ?
      `, [id]);

      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      if (appointment.status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'الموعد ملغى بالفعل' : 'Appointment already cancelled'
        });
      }

      // Update appointment
      await connection.execute(`
        UPDATE appointments
        SET status = 'cancelled', cancelled_by_admin_id = ?, cancelled_at = NOW()
        WHERE id = ?
      `, [adminId, appointment.id]);

      // Update translation if cancellation reason provided
      if (cancellation_reason) {
        if (typeof cancellation_reason === 'object') {
          for (const [langCode, reason] of Object.entries(cancellation_reason)) {
            await connection.execute(`
              INSERT INTO appointment_translations (appointment_id, language_code, cancellation_reason)
              VALUES (?, ?, ?)
              ON DUPLICATE KEY UPDATE cancellation_reason = ?
            `, [appointment.id, langCode, reason, reason]);
          }
        } else {
          await connection.execute(`
            INSERT INTO appointment_translations (appointment_id, language_code, cancellation_reason)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cancellation_reason = ?
          `, [appointment.id, lang, cancellation_reason, cancellation_reason]);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إلغاء الموعد بنجاح' 
          : 'Appointment cancelled successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error cancelling appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إلغاء الموعد' 
          : 'Error cancelling appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete appointment (soft delete)
   * حذف موعد
   * DELETE /api/admin/appointments/:id
   */
  static async deleteAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ?
      `, [id]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      // Actually delete (CASCADE will handle translations)
      await connection.execute(
        'DELETE FROM appointments WHERE id = ?',
        [appointments[0].id]
      );

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم حذف الموعد بنجاح' 
          : 'Appointment deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في حذف الموعد' 
          : 'Error deleting appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get appointment statistics
   * إحصائيات المواعيد
   * GET /api/admin/appointments/statistics
   */
  static async getStatistics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { from_date, to_date, doctor_id } = req.query;

      let dateFilter = '';
      const params = [];

      if (doctor_id) {
        dateFilter += ' AND doctor_id = ?';
        params.push(doctor_id);
      }

      if (from_date && to_date) {
        dateFilter += ' AND scheduled_date BETWEEN ? AND ?';
        params.push(from_date, to_date);
      } else if (from_date) {
        dateFilter += ' AND scheduled_date >= ?';
        params.push(from_date);
      } else if (to_date) {
        dateFilter += ' AND scheduled_date <= ?';
        params.push(to_date);
      }

      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
          SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END) as rescheduled,
          SUM(CASE WHEN payment_status = 'paid' THEN consultation_fee ELSE 0 END) as total_revenue,
          SUM(CASE WHEN payment_status = 'pending' THEN consultation_fee ELSE 0 END) as pending_revenue
        FROM appointments
        WHERE 1=1${dateFilter}
      `, params);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب الإحصائيات' 
          : 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = AdminAppointmentsController;

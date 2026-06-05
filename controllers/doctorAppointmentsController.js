const db = require('../config/db');

/**
 * Doctor Appointments Controller
 * Handles appointment management for doctors
 * الأطباء - إدارة المواعيد
 */

class DoctorAppointmentsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get doctor's appointments
   * جلب مواعيد الطبيب
   * GET /api/doctor/appointments
   */
  static async getMyAppointments(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { 
        status, 
        from_date, 
        to_date,
        appointment_type,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT 
          a.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE a.doctor_id = ?
      `;
      const params = [lang, doctorId];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
      }

      if (appointment_type) {
        query += ' AND a.appointment_type = ?';
        params.push(appointment_type);
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
      query += ` ORDER BY a.scheduled_date ASC, a.actual_start_time ASC LIMIT ${limitNum} OFFSET ${offsetNum}`;

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
      const lang = DoctorAppointmentsController.normalizeLanguage(
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
   * GET /api/doctor/appointments/:id
   */
  static async getAppointmentById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
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
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE ${isUUID ? 'a.uuid' : 'a.id'} = ? AND a.doctor_id = ?
      `, [lang, id, doctorId]);

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
      const lang = DoctorAppointmentsController.normalizeLanguage(
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
   * Confirm appointment
   * تأكيد موعد
   * PATCH /api/doctor/appointments/:id/confirm
   */
  static async confirmAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      if (appointment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن تأكيد هذا الموعد' 
            : 'Cannot confirm this appointment'
        });
      }

      await connection.execute(`
        UPDATE appointments
        SET status = 'confirmed'
        WHERE id = ?
      `, [appointment.id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تأكيد الموعد بنجاح' 
          : 'Appointment confirmed successfully'
      });

    } catch (error) {
      console.error('Error confirming appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تأكيد الموعد' 
          : 'Error confirming appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Start appointment (mark as in progress)
   * بدء الموعد
   * PATCH /api/doctor/appointments/:id/start
   */
  static async startAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      if (appointment.status !== 'confirmed' && appointment.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن بدء هذا الموعد' 
            : 'Cannot start this appointment'
        });
      }

      await connection.execute(`
        UPDATE appointments
        SET status = 'in_progress'
        WHERE id = ?
      `, [appointment.id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم بدء الموعد بنجاح' 
          : 'Appointment started successfully'
      });

    } catch (error) {
      console.error('Error starting appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في بدء الموعد' 
          : 'Error starting appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Complete appointment
   * إكمال موعد
   * PATCH /api/doctor/appointments/:id/complete
   */
  static async completeAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      if (appointment.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن إكمال هذا الموعد' 
            : 'Cannot complete this appointment'
        });
      }

      await connection.execute(`
        UPDATE appointments
        SET status = 'completed'
        WHERE id = ?
      `, [appointment.id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إكمال الموعد بنجاح' 
          : 'Appointment completed successfully'
      });

    } catch (error) {
      console.error('Error completing appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إكمال الموعد' 
          : 'Error completing appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Mark appointment as no-show
   * تسجيل عدم حضور
   * PATCH /api/doctor/appointments/:id/no-show
   */
  static async markNoShow(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?
      `, [id, doctorId]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن تسجيل عدم حضور لهذا الموعد' 
            : 'Cannot mark this appointment as no-show'
        });
      }

      await connection.execute(`
        UPDATE appointments
        SET status = 'no_show'
        WHERE id = ?
      `, [appointment.id]);

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تسجيل عدم الحضور بنجاح' 
          : 'Appointment marked as no-show successfully'
      });

    } catch (error) {
      console.error('Error marking no-show:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تسجيل عدم الحضور' 
          : 'Error marking no-show',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Cancel appointment
   * إلغاء موعد
   * PATCH /api/doctor/appointments/:id/cancel
   */
  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
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
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?
      `, [id, doctorId]);

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

      if (appointment.status === 'completed') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن إلغاء موعد مكتمل' 
            : 'Cannot cancel completed appointment'
        });
      }

      // Update appointment
      await connection.execute(`
        UPDATE appointments
        SET status = 'cancelled', cancelled_by_doctor_id = ?, cancelled_at = NOW()
        WHERE id = ?
      `, [doctorId, appointment.id]);

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
      const lang = DoctorAppointmentsController.normalizeLanguage(
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
   * Get today's appointments
   * جلب مواعيد اليوم
   * GET /api/doctor/appointments/today
   */
  static async getTodayAppointments(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const today = new Date().toISOString().split('T')[0];

      const [appointments] = await connection.execute(`
        SELECT 
          a.*,
          upt.full_name as patient_name,
          u.phone as patient_phone,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        INNER JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE a.doctor_id = ? 
          AND a.scheduled_date = ?
          AND a.status NOT IN ('cancelled', 'no_show')
        ORDER BY a.actual_start_time ASC
      `, [lang, doctorId, today]);

      res.json({
        success: true,
        date: today,
        count: appointments.length,
        data: appointments
      });

    } catch (error) {
      console.error('Error fetching today appointments:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب مواعيد اليوم' 
          : 'Error fetching today appointments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get appointment statistics
   * إحصائيات المواعيد
   * GET /api/doctor/appointments/statistics
   */
  static async getStatistics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { from_date, to_date } = req.query;

      let dateFilter = '';
      const params = [doctorId];

      if (from_date && to_date) {
        dateFilter = ' AND scheduled_date BETWEEN ? AND ?';
        params.push(from_date, to_date);
      } else if (from_date) {
        dateFilter = ' AND scheduled_date >= ?';
        params.push(from_date);
      } else if (to_date) {
        dateFilter = ' AND scheduled_date <= ?';
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
          SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END) as rescheduled
        FROM appointments
        WHERE doctor_id = ?${dateFilter}
      `, params);

      res.json({
        success: true,
        data: stats[0]
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(
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

module.exports = DoctorAppointmentsController;

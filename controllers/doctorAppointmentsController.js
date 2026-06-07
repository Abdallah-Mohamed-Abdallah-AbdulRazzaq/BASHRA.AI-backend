const db = require('../config/db');

/**
 * Doctor Appointments Controller
 * Handles appointment management for doctors
 * الأطباء - إدارة المواعيد
 */
class DoctorAppointmentsController {
  static VALID_STATUS = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
  static VALID_APPOINTMENT_TYPES = ['consultation', 'follow_up', 'urgent', 'routine'];

  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  static parsePositiveInt(value, fallback, max = 100) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static getPagination(page, limit) {
    const pageNum = DoctorAppointmentsController.parsePositiveInt(page, 1, 1000000);
    const limitNum = DoctorAppointmentsController.parsePositiveInt(limit, 20, 100);
    return { pageNum, limitNum, offsetNum: (pageNum - 1) * limitNum };
  }

  static isValidDateString(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  static buildDoctorAppointmentWhere(doctorId, filters = {}) {
    let whereClause = 'WHERE a.doctor_id = ?';
    const params = [doctorId];

    if (filters.status) {
      whereClause += ' AND a.status = ?';
      params.push(filters.status);
    }

    if (filters.appointment_type) {
      whereClause += ' AND a.appointment_type = ?';
      params.push(filters.appointment_type);
    }

    if (filters.from_date) {
      whereClause += ' AND a.scheduled_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      whereClause += ' AND a.scheduled_date <= ?';
      params.push(filters.to_date);
    }

    return { whereClause, params };
  }

  static async getAppointmentTranslations(connection, appointmentId, lang = null) {
    if (lang) {
      const [translations] = await connection.execute(
        'SELECT * FROM appointment_translations WHERE appointment_id = ? AND language_code = ?',
        [appointmentId, lang]
      );
      return translations[0] || null;
    }

    const [translations] = await connection.execute(
      'SELECT * FROM appointment_translations WHERE appointment_id = ?',
      [appointmentId]
    );

    const translationsMap = {};
    translations.forEach((t) => {
      translationsMap[t.language_code] = {
        chief_complaint: t.chief_complaint,
        symptoms_description: t.symptoms_description,
        cancellation_reason: t.cancellation_reason,
        notes: t.notes
      };
    });
    return translationsMap;
  }

  /** Get doctor's appointments */
  static async getMyAppointments(req, res) {
    const connection = await db.getConnection();

    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const { status, from_date, to_date, appointment_type, page = 1, limit = 20 } = req.query;

      if (status && !DoctorAppointmentsController.VALID_STATUS.includes(status)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'حالة الموعد غير صحيحة' : 'Invalid appointment status' });
      }

      if (appointment_type && !DoctorAppointmentsController.VALID_APPOINTMENT_TYPES.includes(appointment_type)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'نوع الموعد غير صحيح' : 'Invalid appointment type' });
      }

      if ((from_date && !DoctorAppointmentsController.isValidDateString(from_date)) || (to_date && !DoctorAppointmentsController.isValidDateString(to_date))) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format' });
      }

      const { pageNum, limitNum, offsetNum } = DoctorAppointmentsController.getPagination(page, limit);
      const { whereClause, params: whereParams } = DoctorAppointmentsController.buildDoctorAppointmentWhere(doctorId, { status, appointment_type, from_date, to_date });

      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereClause}
      `, whereParams);
      const total = Number(countResult[0]?.total || 0);

      const [appointments] = await connection.execute(`
        SELECT
          a.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          u.phone as patient_phone,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        ${whereClause}
        ORDER BY a.scheduled_date ASC, a.actual_start_time ASC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, ...whereParams]);

      const formattedAppointments = await Promise.all(appointments.map(async (apt) => ({
        ...apt,
        translations: await DoctorAppointmentsController.getAppointmentTranslations(connection, apt.id, lang)
      })));

      res.json({
        success: true,
        count: formattedAppointments.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: formattedAppointments
      });

    } catch (error) {
      console.error('Error fetching appointments:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب المواعيد' : 'Error fetching appointments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /** Get single appointment details */
  static async getAppointmentById(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE ${isUUID ? 'a.uuid' : 'a.id'} = ? AND a.doctor_id = ?
      `, [lang, id, doctorId]);

      if (appointments.length === 0) {
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      res.json({
        success: true,
        data: {
          ...appointment,
          translations: await DoctorAppointmentsController.getAppointmentTranslations(connection, appointment.id)
        }
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب الموعد' : 'Error fetching appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async confirmAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`, [id, doctorId]);
      if (appointments.length === 0) return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });

      const appointment = appointments[0];
      if (appointment.status !== 'pending') return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن تأكيد هذا الموعد' : 'Cannot confirm this appointment' });

      await connection.execute(`UPDATE appointments SET status = 'confirmed' WHERE id = ?`, [appointment.id]);
      res.json({ success: true, message: lang === 'ar' ? 'تم تأكيد الموعد بنجاح' : 'Appointment confirmed successfully' });
    } catch (error) {
      console.error('Error confirming appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في تأكيد الموعد' : 'Error confirming appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async startAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`, [id, doctorId]);
      if (appointments.length === 0) return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });

      const appointment = appointments[0];
      if (!['pending', 'confirmed'].includes(appointment.status)) return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن بدء هذا الموعد' : 'Cannot start this appointment' });

      await connection.execute(`UPDATE appointments SET status = 'in_progress' WHERE id = ?`, [appointment.id]);
      res.json({ success: true, message: lang === 'ar' ? 'تم بدء الموعد بنجاح' : 'Appointment started successfully' });
    } catch (error) {
      console.error('Error starting appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في بدء الموعد' : 'Error starting appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async completeAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`, [id, doctorId]);
      if (appointments.length === 0) return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });

      const appointment = appointments[0];
      if (appointment.status !== 'in_progress') return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن إكمال هذا الموعد' : 'Cannot complete this appointment' });

      await connection.execute(`UPDATE appointments SET status = 'completed' WHERE id = ?`, [appointment.id]);
      res.json({ success: true, message: lang === 'ar' ? 'تم إكمال الموعد بنجاح' : 'Appointment completed successfully' });
    } catch (error) {
      console.error('Error completing appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في إكمال الموعد' : 'Error completing appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async markNoShow(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`, [id, doctorId]);
      if (appointments.length === 0) return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });

      const appointment = appointments[0];
      if (['completed', 'cancelled'].includes(appointment.status)) return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن تسجيل عدم حضور لهذا الموعد' : 'Cannot mark this appointment as no-show' });

      await connection.execute(`UPDATE appointments SET status = 'no_show' WHERE id = ?`, [appointment.id]);
      res.json({ success: true, message: lang === 'ar' ? 'تم تسجيل عدم الحضور بنجاح' : 'Appointment marked as no-show successfully' });
    } catch (error) {
      console.error('Error marking no-show:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في تسجيل عدم الحضور' : 'Error marking no-show', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      let { cancellation_reason } = req.body;

      if (typeof cancellation_reason === 'string') {
        try { cancellation_reason = JSON.parse(cancellation_reason); } catch (e) { /* keep string */ }
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`, [id, doctorId]);
      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      if (appointment.status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'الموعد ملغى بالفعل' : 'Appointment already cancelled' });
      }
      if (['completed', 'no_show'].includes(appointment.status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن إلغاء هذا الموعد' : 'Cannot cancel this appointment' });
      }

      await connection.execute(`UPDATE appointments SET status = 'cancelled', cancelled_by_doctor_id = ?, cancelled_at = NOW() WHERE id = ?`, [doctorId, appointment.id]);

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
      res.json({ success: true, message: lang === 'ar' ? 'تم إلغاء الموعد بنجاح' : 'Appointment cancelled successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Error cancelling appointment:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في إلغاء الموعد' : 'Error cancelling appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async getTodayAppointments(req, res) {
    const connection = await db.getConnection();
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const today = new Date().toISOString().split('T')[0];

      const [appointments] = await connection.execute(`
        SELECT
          a.*,
          upt.full_name as patient_name,
          u.phone as patient_phone,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE a.doctor_id = ?
          AND a.scheduled_date = ?
          AND a.status NOT IN ('cancelled', 'no_show')
        ORDER BY a.actual_start_time ASC
      `, [lang, doctorId, today]);

      res.json({ success: true, date: today, count: appointments.length, data: appointments });
    } catch (error) {
      console.error('Error fetching today appointments:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب مواعيد اليوم' : 'Error fetching today appointments', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async getStatistics(req, res) {
    const connection = await db.getConnection();
    try {
      const doctorId = req.user.doctor_id || req.user.id;
      const { from_date, to_date } = req.query;
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);

      if ((from_date && !DoctorAppointmentsController.isValidDateString(from_date)) || (to_date && !DoctorAppointmentsController.isValidDateString(to_date))) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format' });
      }

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
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed,
          COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled,
          COALESCE(SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END), 0) as no_show,
          COALESCE(SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END), 0) as rescheduled
        FROM appointments
        WHERE doctor_id = ?${dateFilter}
      `, params);

      res.json({ success: true, data: stats[0] });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      const lang = DoctorAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب الإحصائيات' : 'Error fetching statistics', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }
}

module.exports = DoctorAppointmentsController;

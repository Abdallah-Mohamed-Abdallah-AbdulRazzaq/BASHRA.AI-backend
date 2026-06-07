const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Admin Appointments Controller
 * Handles appointment management for admins
 * الإداريين - إدارة المواعيد
 */
class AdminAppointmentsController {
  static VALID_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  static VALID_STATUS = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
  static VALID_APPOINTMENT_TYPES = ['consultation', 'follow_up', 'urgent', 'routine'];
  static VALID_URGENCY_LEVELS = ['low', 'medium', 'high', 'emergency'];
  static VALID_PAYMENT_STATUS = ['pending', 'paid', 'refunded', 'failed'];

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
    const pageNum = AdminAppointmentsController.parsePositiveInt(page, 1, 1000000);
    const limitNum = AdminAppointmentsController.parsePositiveInt(limit, 20, 100);
    return { pageNum, limitNum, offsetNum: (pageNum - 1) * limitNum };
  }

  static isValidEnum(value, allowedValues) {
    return value === undefined || value === null || value === '' || allowedValues.includes(String(value));
  }

  static isValidDateString(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  static normalizeTime(timeStr) {
    const value = String(timeStr || '').trim();
    const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || '0');

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  static timeToMinutes(timeStr) {
    const normalized = AdminAppointmentsController.normalizeTime(timeStr);
    if (!normalized) return NaN;
    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
  }

  static getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getUTCDay()];
  }

  static validateScheduleSlot(schedule, scheduledDate, actualStartTime, lang) {
    const normalizedTime = AdminAppointmentsController.normalizeTime(actualStartTime);

    if (!AdminAppointmentsController.isValidDateString(scheduledDate) || !normalizedTime) {
      return { valid: false, message: lang === 'ar' ? 'صيغة التاريخ أو الوقت غير صحيحة' : 'Invalid date or time format' };
    }

    const dayOfWeek = AdminAppointmentsController.getDayOfWeek(scheduledDate);
    if (dayOfWeek !== schedule.day_of_week) {
      return {
        valid: false,
        message: lang === 'ar' ? `هذا الجدول متاح فقط يوم ${schedule.day_of_week}` : `This schedule is only available on ${schedule.day_of_week}`
      };
    }

    const startMinutes = AdminAppointmentsController.timeToMinutes(schedule.start_time);
    const endMinutes = AdminAppointmentsController.timeToMinutes(schedule.end_time);
    const slotMinutes = AdminAppointmentsController.timeToMinutes(normalizedTime);
    const duration = Number(schedule.duration_minutes || schedule.session_duration || 30);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || !Number.isFinite(slotMinutes) || duration < 1) {
      return { valid: false, message: lang === 'ar' ? 'بيانات الجدول غير صحيحة' : 'Invalid schedule data' };
    }

    if (slotMinutes < startMinutes || slotMinutes + duration > endMinutes) {
      return { valid: false, message: lang === 'ar' ? 'الوقت المحدد خارج نطاق الجدول' : 'Selected time is outside schedule range' };
    }

    if ((slotMinutes - startMinutes) % duration !== 0) {
      return { valid: false, message: lang === 'ar' ? 'الوقت المحدد لا يطابق مدة الجلسة' : 'Selected time does not match the session duration' };
    }

    return { valid: true, normalizedTime };
  }

  static async hasAppointmentConflict(connection, doctorId, scheduledDate, actualStartTime, durationMinutes, excludeAppointmentId = null) {
    let query = `
      SELECT id
      FROM appointments
      WHERE doctor_id = ?
        AND scheduled_date = ?
        AND status NOT IN ('cancelled', 'no_show')
        AND TIME_TO_SEC(?) < (TIME_TO_SEC(actual_start_time) + (duration_minutes * 60))
        AND (TIME_TO_SEC(?) + (? * 60)) > TIME_TO_SEC(actual_start_time)
    `;
    const params = [doctorId, scheduledDate, actualStartTime, actualStartTime, durationMinutes];

    if (excludeAppointmentId) {
      query += ' AND id != ?';
      params.push(excludeAppointmentId);
    }

    const [conflicts] = await connection.execute(query, params);
    return conflicts.length > 0;
  }

  static async getScheduleForBooking(connection, scheduleId) {
    const [scheduleRows] = await connection.execute(`
      SELECT
        ds.id,
        ds.doctor_id,
        ds.clinic_id,
        ds.session_duration as duration_minutes,
        ds.session_price as consultation_fee,
        ds.currency_code,
        ds.consultation_type,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.is_active,
        d.status as doctor_status,
        d.is_active as doctor_is_active,
        dp.approval_status,
        dp.is_available
      FROM doctor_schedules ds
      INNER JOIN doctors d ON ds.doctor_id = d.id
      INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
      WHERE ds.id = ?
    `, [scheduleId]);

    return scheduleRows[0] || null;
  }

  static buildAdminAppointmentWhere(filters = {}) {
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (filters.status) {
      whereClause += ' AND a.status = ?';
      params.push(filters.status);
    }
    if (filters.doctor_id) {
      whereClause += ' AND a.doctor_id = ?';
      params.push(filters.doctor_id);
    }
    if (filters.patient_id) {
      whereClause += ' AND a.patient_id = ?';
      params.push(filters.patient_id);
    }
    if (filters.appointment_type) {
      whereClause += ' AND a.appointment_type = ?';
      params.push(filters.appointment_type);
    }
    if (filters.urgency_level) {
      whereClause += ' AND a.urgency_level = ?';
      params.push(filters.urgency_level);
    }
    if (filters.payment_status) {
      whereClause += ' AND a.payment_status = ?';
      params.push(filters.payment_status);
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

  /** Get all appointments (admin view) */
  static async getAllAppointments(req, res) {
    const connection = await db.getConnection();

    try {
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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

      if (!AdminAppointmentsController.isValidEnum(status, AdminAppointmentsController.VALID_STATUS)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'حالة الموعد غير صحيحة' : 'Invalid appointment status' });
      }
      if (!AdminAppointmentsController.isValidEnum(appointment_type, AdminAppointmentsController.VALID_APPOINTMENT_TYPES)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'نوع الموعد غير صحيح' : 'Invalid appointment type' });
      }
      if (!AdminAppointmentsController.isValidEnum(urgency_level, AdminAppointmentsController.VALID_URGENCY_LEVELS)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'مستوى الأولوية غير صحيح' : 'Invalid urgency level' });
      }
      if (!AdminAppointmentsController.isValidEnum(payment_status, AdminAppointmentsController.VALID_PAYMENT_STATUS)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'حالة الدفع غير صحيحة' : 'Invalid payment status' });
      }
      if ((from_date && !AdminAppointmentsController.isValidDateString(from_date)) || (to_date && !AdminAppointmentsController.isValidDateString(to_date))) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format' });
      }

      const doctorId = doctor_id ? parseInt(doctor_id, 10) : null;
      const patientId = patient_id ? parseInt(patient_id, 10) : null;
      if ((doctor_id && (!Number.isFinite(doctorId) || doctorId < 1)) || (patient_id && (!Number.isFinite(patientId) || patientId < 1))) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'معرف الطبيب أو المريض غير صحيح' : 'Invalid doctor or patient ID' });
      }

      const filters = {
        status,
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_type,
        urgency_level,
        payment_status,
        from_date,
        to_date
      };

      const { pageNum, limitNum, offsetNum } = AdminAppointmentsController.getPagination(page, limit);
      const { whereClause, params: whereParams } = AdminAppointmentsController.buildAdminAppointmentWhere(filters);

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
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN users u ON a.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        ${whereClause}
        ORDER BY a.scheduled_date DESC, a.actual_start_time DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, lang, ...whereParams]);

      const formattedAppointments = await Promise.all(appointments.map(async (apt) => ({
        ...apt,
        translations: await AdminAppointmentsController.getAppointmentTranslations(connection, apt.id, lang)
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
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب المواعيد' : 'Error fetching appointments', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  /** Get single appointment details */
  static async getAppointmentById(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        INNER JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
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
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      res.json({
        success: true,
        data: {
          ...appointment,
          translations: await AdminAppointmentsController.getAppointmentTranslations(connection, appointment.id)
        }
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب الموعد' : 'Error fetching appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  /** Create appointment */
  static async createAppointment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const adminId = req.user.id;
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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

      const patientId = parseInt(patient_id, 10);
      const scheduleId = parseInt(schedule_id, 10);
      if (!Number.isFinite(patientId) || patientId < 1 || !Number.isFinite(scheduleId) || scheduleId < 1 || !scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'معرف المريض والجدول والتاريخ والوقت مطلوبة' : 'Patient ID, schedule ID, date, and time are required' });
      }

      if (!AdminAppointmentsController.isValidEnum(appointment_type, AdminAppointmentsController.VALID_APPOINTMENT_TYPES)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'نوع الموعد غير صحيح' : 'Invalid appointment type' });
      }
      if (!AdminAppointmentsController.isValidEnum(urgency_level, AdminAppointmentsController.VALID_URGENCY_LEVELS)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'مستوى الأولوية غير صحيح' : 'Invalid urgency level' });
      }
      if (!AdminAppointmentsController.isValidEnum(payment_status, AdminAppointmentsController.VALID_PAYMENT_STATUS)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'حالة الدفع غير صحيحة' : 'Invalid payment status' });
      }

      const [patientRows] = await connection.execute('SELECT id FROM users WHERE id = ? AND is_active = 1', [patientId]);
      if (patientRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'المريض غير موجود' : 'Patient not found' });
      }

      const schedule = await AdminAppointmentsController.getScheduleForBooking(connection, scheduleId);
      if (!schedule) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الجدول غير موجود' : 'Schedule not found' });
      }
      if (schedule.is_active !== 1) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'هذا الجدول غير نشط' : 'This schedule is not active' });
      }
      if (schedule.doctor_status !== 'active' || schedule.doctor_is_active !== 1 || schedule.approval_status !== 'approved' || schedule.is_available === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الطبيب غير متاح' : 'Doctor not available' });
      }

      const slotValidation = AdminAppointmentsController.validateScheduleSlot(schedule, scheduled_date, actual_start_time, lang);
      if (!slotValidation.valid) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: slotValidation.message });
      }
      actual_start_time = slotValidation.normalizedTime;

      const hasConflict = await AdminAppointmentsController.hasAppointmentConflict(connection, schedule.doctor_id, scheduled_date, actual_start_time, schedule.duration_minutes);
      if (hasConflict) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: lang === 'ar' ? 'هذا الموعد محجوز بالفعل' : 'This time slot is already booked' });
      }

      const uuid = uuidv4();
      const [result] = await connection.execute(`
        INSERT INTO appointments (
          uuid, patient_id, doctor_id, clinic_id, schedule_id, created_by_admin_id,
          appointment_type, scheduled_date, actual_start_time, duration_minutes,
          status, urgency_level, consultation_fee, currency_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `, [
        uuid,
        patientId,
        schedule.doctor_id,
        schedule.clinic_id || null,
        scheduleId,
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
      const translationLang = AdminAppointmentsController.normalizeLanguage(language_code, lang);
      if (chief_complaint || symptoms_description || notes) {
        await connection.execute(`
          INSERT INTO appointment_translations (appointment_id, language_code, chief_complaint, symptoms_description, notes)
          VALUES (?, ?, ?, ?, ?)
        `, [appointmentId, translationLang, chief_complaint || null, symptoms_description || null, notes || null]);
      }

      await connection.commit();
      const [appointment] = await connection.execute('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
      res.status(201).json({ success: true, message: lang === 'ar' ? 'تم إنشاء الموعد بنجاح' : 'Appointment created successfully', data: appointment[0] });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في إنشاء الموعد' : 'Error creating appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  /** Update appointment */
  static async updateAppointment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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

      if (!AdminAppointmentsController.isValidEnum(appointment_type, AdminAppointmentsController.VALID_APPOINTMENT_TYPES) ||
          !AdminAppointmentsController.isValidEnum(urgency_level, AdminAppointmentsController.VALID_URGENCY_LEVELS) ||
          !AdminAppointmentsController.isValidEnum(payment_status, AdminAppointmentsController.VALID_PAYMENT_STATUS) ||
          !AdminAppointmentsController.isValidEnum(status, AdminAppointmentsController.VALID_STATUS)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'قيمة غير صحيحة في بيانات التحديث' : 'Invalid update value' });
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, doctor_id, schedule_id, scheduled_date, actual_start_time, duration_minutes, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ?
      `, [id]);

      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      const finalDate = scheduled_date !== undefined ? scheduled_date : appointment.scheduled_date;
      let finalTime = actual_start_time !== undefined ? actual_start_time : appointment.actual_start_time;
      let finalDuration = duration_minutes !== undefined ? parseInt(duration_minutes, 10) : Number(appointment.duration_minutes || 30);

      const shouldValidateSlot = scheduled_date !== undefined || actual_start_time !== undefined || duration_minutes !== undefined;

      if (shouldValidateSlot) {
        if (!appointment.schedule_id) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن تحديث وقت موعد بدون جدول مرتبط' : 'Cannot update appointment time without linked schedule' });
        }

        const schedule = await AdminAppointmentsController.getScheduleForBooking(connection, appointment.schedule_id);
        if (!schedule || schedule.doctor_id !== appointment.doctor_id) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: lang === 'ar' ? 'جدول الموعد غير صالح' : 'Invalid appointment schedule' });
        }

        const slotValidation = AdminAppointmentsController.validateScheduleSlot(schedule, finalDate, finalTime, lang);
        if (!slotValidation.valid) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: slotValidation.message });
        }

        finalTime = slotValidation.normalizedTime;
        finalDuration = duration_minutes !== undefined ? finalDuration : Number(schedule.duration_minutes || appointment.duration_minutes || 30);
        if (!Number.isFinite(finalDuration) || finalDuration < 1) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: lang === 'ar' ? 'مدة الموعد غير صحيحة' : 'Invalid duration' });
        }

        const hasConflict = await AdminAppointmentsController.hasAppointmentConflict(connection, appointment.doctor_id, finalDate, finalTime, finalDuration, appointment.id);
        if (hasConflict) {
          await connection.rollback();
          return res.status(409).json({ success: false, message: lang === 'ar' ? 'هذا الموعد محجوز بالفعل' : 'This time slot is already booked' });
        }
      }

      const updates = [];
      const values = [];

      if (scheduled_date !== undefined) { updates.push('scheduled_date = ?'); values.push(finalDate); }
      if (actual_start_time !== undefined) { updates.push('actual_start_time = ?'); values.push(finalTime); }
      if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); values.push(finalDuration); }
      if (appointment_type !== undefined) { updates.push('appointment_type = ?'); values.push(appointment_type); }
      if (urgency_level !== undefined) { updates.push('urgency_level = ?'); values.push(urgency_level); }
      if (consultation_fee !== undefined) { updates.push('consultation_fee = ?'); values.push(consultation_fee); }
      if (currency_code !== undefined) { updates.push('currency_code = ?'); values.push(currency_code); }
      if (payment_status !== undefined) { updates.push('payment_status = ?'); values.push(payment_status); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا توجد بيانات للتحديث' : 'No data to update' });
      }

      values.push(appointment.id);
      await connection.execute(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, values);
      await connection.commit();

      res.json({ success: true, message: lang === 'ar' ? 'تم تحديث الموعد بنجاح' : 'Appointment updated successfully' });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في تحديث الموعد' : 'Error updating appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const adminId = req.user.id;
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      let { cancellation_reason } = req.body;

      if (typeof cancellation_reason === 'string') {
        try { cancellation_reason = JSON.parse(cancellation_reason); } catch (e) { /* keep string */ }
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`SELECT id, status FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ?`, [id]);
      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      if (appointment.status === 'cancelled') {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'الموعد ملغى بالفعل' : 'Appointment already cancelled' });
      }

      await connection.execute(`UPDATE appointments SET status = 'cancelled', cancelled_by_admin_id = ?, cancelled_at = NOW() WHERE id = ?`, [adminId, appointment.id]);

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
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في إلغاء الموعد' : 'Error cancelling appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async deleteAppointment(req, res) {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`SELECT id FROM appointments WHERE ${isUUID ? 'uuid' : 'id'} = ?`, [id]);
      if (appointments.length === 0) return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });

      await connection.execute('DELETE FROM appointments WHERE id = ?', [appointments[0].id]);
      res.json({ success: true, message: lang === 'ar' ? 'تم حذف الموعد بنجاح' : 'Appointment deleted successfully' });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في حذف الموعد' : 'Error deleting appointment', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }

  static async getStatistics(req, res) {
    const connection = await db.getConnection();
    try {
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const { from_date, to_date, doctor_id } = req.query;

      if ((from_date && !AdminAppointmentsController.isValidDateString(from_date)) || (to_date && !AdminAppointmentsController.isValidDateString(to_date))) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format' });
      }

      const doctorId = doctor_id ? parseInt(doctor_id, 10) : null;
      if (doctor_id && (!Number.isFinite(doctorId) || doctorId < 1)) {
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'معرف الطبيب غير صحيح' : 'Invalid doctor ID' });
      }

      let dateFilter = '';
      const params = [];

      if (doctorId) { dateFilter += ' AND doctor_id = ?'; params.push(doctorId); }
      if (from_date && to_date) { dateFilter += ' AND scheduled_date BETWEEN ? AND ?'; params.push(from_date, to_date); }
      else if (from_date) { dateFilter += ' AND scheduled_date >= ?'; params.push(from_date); }
      else if (to_date) { dateFilter += ' AND scheduled_date <= ?'; params.push(to_date); }

      const [stats] = await connection.execute(`
        SELECT
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
          COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed,
          COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled,
          COALESCE(SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END), 0) as no_show,
          COALESCE(SUM(CASE WHEN status = 'rescheduled' THEN 1 ELSE 0 END), 0) as rescheduled,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN consultation_fee ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN consultation_fee ELSE 0 END), 0) as pending_revenue
        FROM appointments
        WHERE 1=1${dateFilter}
      `, params);

      res.json({ success: true, data: stats[0] });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      const lang = AdminAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({ success: false, message: lang === 'ar' ? 'خطأ في جلب الإحصائيات' : 'Error fetching statistics', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    } finally {
      connection.release();
    }
  }
}

module.exports = AdminAppointmentsController;

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Patient Appointments Controller
 * Handles appointment management for patients (users)
 * المرضى - إدارة المواعيد
 */
class PatientAppointmentsController {
  static VALID_DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  static VALID_STATUS = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
  static VALID_APPOINTMENT_TYPES = ['consultation', 'follow_up', 'urgent', 'routine'];
  static VALID_URGENCY_LEVELS = ['low', 'medium', 'high', 'emergency'];
  static VALID_CONSULTATION_TYPES = ['online', 'in_clinic'];

  /** Helper: Normalize language code */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  static isValidEnum(value, allowedValues) {
    return !value || allowedValues.includes(String(value));
  }

  static parsePositiveInt(value, fallback, max = 100) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static getPagination(page, limit) {
    const pageNum = PatientAppointmentsController.parsePositiveInt(page, 1, 1000000);
    const limitNum = PatientAppointmentsController.parsePositiveInt(limit, 20, 100);
    return {
      pageNum,
      limitNum,
      offsetNum: (pageNum - 1) * limitNum
    };
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

  static getDayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getUTCDay()];
  }

  /** Helper: Convert time string to minutes */
  static timeToMinutes(timeStr) {
    const normalized = PatientAppointmentsController.normalizeTime(timeStr);
    if (!normalized) return NaN;
    const [hours, minutes] = normalized.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /** Helper: Convert minutes to time string */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }

  static buildAppointmentWhere(baseCondition, initialParams, filters = {}) {
    let whereClause = baseCondition;
    const params = [...initialParams];

    if (filters.status) {
      whereClause += ' AND a.status = ?';
      params.push(filters.status);
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

  static validateScheduleSlot(schedule, scheduledDate, actualStartTime, lang) {
    const normalizedTime = PatientAppointmentsController.normalizeTime(actualStartTime);

    if (!PatientAppointmentsController.isValidDateString(scheduledDate) || !normalizedTime) {
      return {
        valid: false,
        message: lang === 'ar' ? 'صيغة التاريخ أو الوقت غير صحيحة' : 'Invalid date or time format'
      };
    }

    const dayOfWeek = PatientAppointmentsController.getDayOfWeek(scheduledDate);
    if (dayOfWeek !== schedule.day_of_week) {
      return {
        valid: false,
        message: lang === 'ar'
          ? `هذا الجدول متاح فقط يوم ${schedule.day_of_week}`
          : `This schedule is only available on ${schedule.day_of_week}`
      };
    }

    const startMinutes = PatientAppointmentsController.timeToMinutes(schedule.start_time);
    const endMinutes = PatientAppointmentsController.timeToMinutes(schedule.end_time);
    const slotMinutes = PatientAppointmentsController.timeToMinutes(normalizedTime);
    const duration = Number(schedule.duration_minutes || schedule.session_duration || 30);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || !Number.isFinite(slotMinutes) || duration < 1) {
      return {
        valid: false,
        message: lang === 'ar' ? 'بيانات الجدول غير صحيحة' : 'Invalid schedule data'
      };
    }

    if (slotMinutes < startMinutes || slotMinutes + duration > endMinutes) {
      return {
        valid: false,
        message: lang === 'ar' ? 'الوقت المحدد خارج نطاق الجدول' : 'Selected time is outside schedule range'
      };
    }

    if ((slotMinutes - startMinutes) % duration !== 0) {
      return {
        valid: false,
        message: lang === 'ar' ? 'الوقت المحدد لا يطابق مدة الجلسة' : 'Selected time does not match the session duration'
      };
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

  /**
   * Get available time slots for a doctor
   * جلب المواعيد المتاحة لطبيب معين
   * GET /api/patient/appointments/available-slots
   */
  static async getAvailableSlots(req, res) {
    const connection = await db.getConnection();

    try {
      const { doctor_id, day_of_week, consultation_type, scheduled_date } = req.query;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);

      if (!doctor_id || !day_of_week) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'معرف الطبيب واليوم مطلوبان' : 'Doctor ID and day of week are required'
        });
      }

      const doctorId = parseInt(doctor_id, 10);
      if (!Number.isFinite(doctorId) || doctorId < 1) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'معرف الطبيب غير صحيح' : 'Invalid doctor ID'
        });
      }

      const normalizedDay = String(day_of_week).toLowerCase();
      if (!PatientAppointmentsController.VALID_DAYS.includes(normalizedDay)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? 'اليوم غير صحيح. استخدم: saturday, sunday, monday, tuesday, wednesday, thursday, friday'
            : 'Invalid day. Use: saturday, sunday, monday, tuesday, wednesday, thursday, friday'
        });
      }

      if (consultation_type && !PatientAppointmentsController.VALID_CONSULTATION_TYPES.includes(consultation_type)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'نوع الاستشارة غير صحيح' : 'Invalid consultation type'
        });
      }

      if (scheduled_date) {
        if (!PatientAppointmentsController.isValidDateString(scheduled_date)) {
          return res.status(400).json({
            success: false,
            message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format'
          });
        }

        const dateDay = PatientAppointmentsController.getDayOfWeek(scheduled_date);
        if (dateDay !== normalizedDay) {
          return res.status(400).json({
            success: false,
            message: lang === 'ar' ? 'التاريخ لا يطابق اليوم المحدد' : 'Scheduled date does not match selected day'
          });
        }
      }

      const [doctorRows] = await connection.execute(`
        SELECT d.id, d.status, d.is_active, dp.approval_status, dp.is_available
        FROM doctors d
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        WHERE d.id = ?
      `, [doctorId]);

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved' || doctor.is_available === 0) {
        return res.status(403).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب غير متاح حالياً' : 'Doctor is not available'
        });
      }

      let scheduleQuery = `
        SELECT
          ds.id,
          ds.start_time,
          ds.end_time,
          ds.session_duration,
          ds.session_price,
          ds.currency_code,
          ds.consultation_type,
          ds.clinic_id,
          c.name as clinic_name
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ?
          AND ds.day_of_week = ?
          AND ds.is_active = 1
      `;
      const scheduleParams = [doctorId, normalizedDay];

      if (consultation_type) {
        scheduleQuery += ' AND ds.consultation_type = ?';
        scheduleParams.push(consultation_type);
      }

      scheduleQuery += ' ORDER BY ds.start_time ASC';
      const [schedules] = await connection.execute(scheduleQuery, scheduleParams);

      if (schedules.length === 0) {
        return res.json({
          success: true,
          message: lang === 'ar' ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No available slots for this day',
          day_of_week: normalizedDay,
          data: []
        });
      }

      let bookedRows = [];
      if (scheduled_date) {
        const [rows] = await connection.execute(`
          SELECT actual_start_time, duration_minutes
          FROM appointments
          WHERE doctor_id = ?
            AND scheduled_date = ?
            AND status NOT IN ('cancelled', 'no_show')
        `, [doctorId, scheduled_date]);
        bookedRows = rows;
      }

      const isSlotBooked = (slotTime, duration) => {
        if (!scheduled_date) return false;
        const slotStart = PatientAppointmentsController.timeToMinutes(slotTime);
        const slotEnd = slotStart + Number(duration || 30);

        return bookedRows.some((booked) => {
          const bookedStart = PatientAppointmentsController.timeToMinutes(booked.actual_start_time);
          const bookedEnd = bookedStart + Number(booked.duration_minutes || 30);
          return slotStart < bookedEnd && slotEnd > bookedStart;
        });
      };

      const availableSlots = [];

      for (const schedule of schedules) {
        const startMinutes = PatientAppointmentsController.timeToMinutes(schedule.start_time);
        const endMinutes = PatientAppointmentsController.timeToMinutes(schedule.end_time);
        const duration = Number(schedule.session_duration || 30);

        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || duration < 1) continue;

        for (let currentMinutes = startMinutes; currentMinutes + duration <= endMinutes; currentMinutes += duration) {
          const slotTime = PatientAppointmentsController.minutesToTime(currentMinutes);
          if (isSlotBooked(slotTime, duration)) continue;

          availableSlots.push({
            schedule_id: schedule.id,
            time: slotTime,
            duration,
            price: schedule.session_price,
            currency_code: schedule.currency_code,
            consultation_type: schedule.consultation_type,
            clinic_id: schedule.clinic_id,
            clinic_name: schedule.clinic_name
          });
        }
      }

      res.json({
        success: true,
        day_of_week: normalizedDay,
        scheduled_date: scheduled_date || null,
        total_slots: availableSlots.length,
        data: availableSlots
      });

    } catch (error) {
      console.error('Error fetching available slots:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب المواعيد المتاحة' : 'Error fetching available slots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /** Book a new appointment */
  static async bookAppointment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);

      let {
        schedule_id,
        scheduled_date,
        actual_start_time,
        appointment_type = 'consultation',
        urgency_level = 'medium',
        language_code,
        chief_complaint,
        symptoms_description,
        notes
      } = req.body;

      const scheduleId = parseInt(schedule_id, 10);
      if (!Number.isFinite(scheduleId) || scheduleId < 1 || !scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'معرف الجدول والتاريخ والوقت مطلوبة' : 'Schedule ID, date, and time are required'
        });
      }

      if (!PatientAppointmentsController.isValidEnum(appointment_type, PatientAppointmentsController.VALID_APPOINTMENT_TYPES)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'نوع الموعد غير صحيح' : 'Invalid appointment type'
        });
      }

      if (!PatientAppointmentsController.isValidEnum(urgency_level, PatientAppointmentsController.VALID_URGENCY_LEVELS)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'مستوى الأولوية غير صحيح' : 'Invalid urgency level'
        });
      }

      const schedule = await PatientAppointmentsController.getScheduleForBooking(connection, scheduleId);
      if (!schedule) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الجدول غير موجود' : 'Schedule not found'
        });
      }

      if (schedule.is_active !== 1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'هذا الجدول غير نشط' : 'This schedule is not active'
        });
      }

      if (schedule.doctor_status !== 'active' || schedule.doctor_is_active !== 1 || schedule.approval_status !== 'approved' || schedule.is_available === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب غير متاح' : 'Doctor not available'
        });
      }

      const slotValidation = PatientAppointmentsController.validateScheduleSlot(schedule, scheduled_date, actual_start_time, lang);
      if (!slotValidation.valid) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: slotValidation.message });
      }

      actual_start_time = slotValidation.normalizedTime;

      const hasConflict = await PatientAppointmentsController.hasAppointmentConflict(
        connection,
        schedule.doctor_id,
        scheduled_date,
        actual_start_time,
        schedule.duration_minutes
      );

      if (hasConflict) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: lang === 'ar' ? 'هذا الموعد محجوز بالفعل' : 'This time slot is already booked'
        });
      }

      const uuid = uuidv4();
      const [result] = await connection.execute(`
        INSERT INTO appointments (
          uuid, patient_id, doctor_id, clinic_id, schedule_id, created_by_user_id,
          appointment_type, scheduled_date, actual_start_time, duration_minutes,
          status, urgency_level, consultation_fee, currency_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'pending')
      `, [
        uuid,
        patientId,
        schedule.doctor_id,
        schedule.clinic_id || null,
        scheduleId,
        patientId,
        appointment_type,
        scheduled_date,
        actual_start_time,
        schedule.duration_minutes,
        urgency_level,
        schedule.consultation_fee,
        schedule.currency_code
      ]);

      const appointmentId = result.insertId;
      const translationLang = PatientAppointmentsController.normalizeLanguage(language_code, lang);

      if (chief_complaint || symptoms_description || notes) {
        await connection.execute(`
          INSERT INTO appointment_translations (
            appointment_id, language_code, chief_complaint, symptoms_description, notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [appointmentId, translationLang, chief_complaint || null, symptoms_description || null, notes || null]);
      }

      await connection.commit();

      const [appointment] = await connection.execute(`
        SELECT
          a.*,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          c.name as clinic_name,
          c.address_line_1 as clinic_address,
          at.chief_complaint,
          at.symptoms_description,
          at.notes
        FROM appointments a
        INNER JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN appointment_translations at ON a.id = at.appointment_id AND at.language_code = ?
        WHERE a.id = ?
      `, [lang, lang, appointmentId]);

      res.status(201).json({
        success: true,
        message: lang === 'ar' ? 'تم حجز الموعد بنجاح' : 'Appointment booked successfully',
        data: appointment[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error booking appointment:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في حجز الموعد' : 'Error booking appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /** Get patient's appointments */
  static async getMyAppointments(req, res) {
    const connection = await db.getConnection();

    try {
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;

      if (status && !PatientAppointmentsController.VALID_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'حالة الموعد غير صحيحة' : 'Invalid appointment status'
        });
      }

      if ((from_date && !PatientAppointmentsController.isValidDateString(from_date)) || (to_date && !PatientAppointmentsController.isValidDateString(to_date))) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'صيغة التاريخ غير صحيحة' : 'Invalid date format'
        });
      }

      const { pageNum, limitNum, offsetNum } = PatientAppointmentsController.getPagination(page, limit);
      const { whereClause, params: whereParams } = PatientAppointmentsController.buildAppointmentWhere('WHERE a.patient_id = ?', [patientId], { status, from_date, to_date });

      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM appointments a
        ${whereClause}
      `, whereParams);
      const total = Number(countResult[0]?.total || 0);

      const [appointments] = await connection.execute(`
        SELECT
          a.*,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM appointments a
        INNER JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        ${whereClause}
        ORDER BY a.scheduled_date DESC, a.actual_start_time DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, ...whereParams]);

      const formattedAppointments = await Promise.all(appointments.map(async (apt) => ({
        ...apt,
        translations: await PatientAppointmentsController.getAppointmentTranslations(connection, apt.id, lang)
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
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
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
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = id.includes('-');

      const [appointments] = await connection.execute(`
        SELECT
          a.*,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          d.email as doctor_email,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM appointments a
        INNER JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE ${isUUID ? 'a.uuid' : 'a.id'} = ? AND a.patient_id = ?
      `, [lang, id, patientId]);

      if (appointments.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found'
        });
      }

      const appointment = appointments[0];
      res.json({
        success: true,
        data: {
          ...appointment,
          translations: await PatientAppointmentsController.getAppointmentTranslations(connection, appointment.id)
        }
      });

    } catch (error) {
      console.error('Error fetching appointment:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب الموعد' : 'Error fetching appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /** Cancel appointment */
  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      let { cancellation_reason } = req.body;

      if (typeof cancellation_reason === 'string') {
        try {
          cancellation_reason = JSON.parse(cancellation_reason);
        } catch (e) {
          // Keep as plain string
        }
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND patient_id = ?
      `, [id, patientId]);

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
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'الموعد ملغى بالفعل' : 'Appointment already cancelled' });
      }

      if (['completed', 'no_show'].includes(appointment.status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا يمكن إلغاء هذا الموعد' : 'Cannot cancel this appointment'
        });
      }

      await connection.execute(`
        UPDATE appointments
        SET status = 'cancelled', cancelled_by_user_id = ?, cancelled_at = NOW()
        WHERE id = ?
      `, [patientId, appointment.id]);

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
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إلغاء الموعد' : 'Error cancelling appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /** Reschedule appointment */
  static async rescheduleAppointment(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      let { scheduled_date, actual_start_time } = req.body;

      if (!scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'التاريخ والوقت الجديد مطلوبان' : 'New date and time are required'
        });
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, doctor_id, schedule_id, status
        FROM appointments
        WHERE ${isUUID ? 'uuid' : 'id'} = ? AND patient_id = ?
      `, [id, patientId]);

      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: lang === 'ar' ? 'الموعد غير موجود' : 'Appointment not found' });
      }

      const appointment = appointments[0];
      if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن إعادة جدولة هذا الموعد' : 'Cannot reschedule this appointment' });
      }

      if (!appointment.schedule_id) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'لا يمكن إعادة جدولة موعد بدون جدول مرتبط' : 'Cannot reschedule appointment without linked schedule' });
      }

      const schedule = await PatientAppointmentsController.getScheduleForBooking(connection, appointment.schedule_id);
      if (!schedule || schedule.doctor_id !== appointment.doctor_id) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: lang === 'ar' ? 'جدول الموعد غير صالح' : 'Invalid appointment schedule' });
      }

      const slotValidation = PatientAppointmentsController.validateScheduleSlot(schedule, scheduled_date, actual_start_time, lang);
      if (!slotValidation.valid) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: slotValidation.message });
      }
      actual_start_time = slotValidation.normalizedTime;

      const hasConflict = await PatientAppointmentsController.hasAppointmentConflict(
        connection,
        appointment.doctor_id,
        scheduled_date,
        actual_start_time,
        schedule.duration_minutes,
        appointment.id
      );

      if (hasConflict) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: lang === 'ar' ? 'الموعد الجديد محجوز بالفعل' : 'New time slot is already booked' });
      }

      await connection.execute(`
        UPDATE appointments
        SET scheduled_date = ?, actual_start_time = ?, duration_minutes = ?, status = 'rescheduled'
        WHERE id = ?
      `, [scheduled_date, actual_start_time, schedule.duration_minutes, appointment.id]);

      await connection.commit();
      res.json({ success: true, message: lang === 'ar' ? 'تم إعادة جدولة الموعد بنجاح' : 'Appointment rescheduled successfully' });

    } catch (error) {
      await connection.rollback();
      console.error('Error rescheduling appointment:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إعادة جدولة الموعد' : 'Error rescheduling appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = PatientAppointmentsController;

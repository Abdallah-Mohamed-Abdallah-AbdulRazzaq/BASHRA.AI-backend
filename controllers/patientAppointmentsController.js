const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Patient Appointments Controller
 * Handles appointment management for patients (users)
 * المرضى - إدارة المواعيد
 */

class PatientAppointmentsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Get available time slots for a doctor
   * جلب المواعيد المتاحة لطبيب معين
   * GET /api/patient/appointments/available-slots
   */
  static async getAvailableSlots(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { doctor_id, day_of_week, consultation_type } = req.query;
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Validation
      if (!doctor_id || !day_of_week) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'معرف الطبيب واليوم مطلوبان' 
            : 'Doctor ID and day of week are required'
        });
      }

      // Validate day_of_week
      const validDays = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const normalizedDay = day_of_week.toLowerCase();
      if (!validDays.includes(normalizedDay)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'اليوم غير صحيح. استخدم: saturday, sunday, monday, tuesday, wednesday, thursday, friday' 
            : 'Invalid day. Use: saturday, sunday, monday, tuesday, wednesday, thursday, friday'
        });
      }

      // Verify doctor exists and is available
      const [doctorRows] = await connection.execute(`
        SELECT d.id, d.status, d.is_active, dp.approval_status, dp.is_available
        FROM doctors d
        JOIN doctor_profiles dp ON d.id = dp.doctor_id
        WHERE d.id = ?
      `, [doctor_id]);

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: lang === 'ar' 
            ? 'الطبيب غير متاح حالياً' 
            : 'Doctor is not available'
        });
      }

      // Get doctor schedules for this day
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
      const scheduleParams = [doctor_id, normalizedDay];

      if (consultation_type) {
        scheduleQuery += ' AND ds.consultation_type = ?';
        scheduleParams.push(consultation_type);
      }

      const [schedules] = await connection.execute(scheduleQuery, scheduleParams);

      if (schedules.length === 0) {
        return res.json({
          success: true,
          message: lang === 'ar' 
            ? 'لا توجد مواعيد متاحة في هذا اليوم' 
            : 'No available slots for this day',
          day_of_week: normalizedDay,
          data: []
        });
      }

      // Generate available slots
      const availableSlots = [];

      for (const schedule of schedules) {
        const startTime = schedule.start_time;
        const endTime = schedule.end_time;
        const duration = schedule.session_duration;

        // Convert time strings to minutes
        const startMinutes = PatientAppointmentsController.timeToMinutes(startTime);
        const endMinutes = PatientAppointmentsController.timeToMinutes(endTime);

        // Generate slots
        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += duration) {
          const slotTime = PatientAppointmentsController.minutesToTime(currentMinutes);
          
          // All slots are available (no date-specific booking check)
          availableSlots.push({
            time: slotTime,
            duration: duration,
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
        total_slots: availableSlots.length,
        data: availableSlots
      });

    } catch (error) {
      console.error('Error fetching available slots:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب المواعيد المتاحة' 
          : 'Error fetching available slots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Book a new appointment
   * حجز موعد جديد
   * POST /api/patient/appointments
   */
  static async bookAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

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

      // Validation
      if (!schedule_id || !scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'معرف الجدول والتاريخ والوقت مطلوبة' 
            : 'Schedule ID, date, and time are required'
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
        SELECT d.id, d.status, d.is_active, dp.approval_status
        FROM doctors d
        JOIN doctor_profiles dp ON d.id = dp.doctor_id
        WHERE d.id = ?
      `, [schedule.doctor_id]);

      if (doctorRows.length === 0 || doctorRows[0].status !== 'active' || doctorRows[0].approval_status !== 'approved') {
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
          uuid, patient_id, doctor_id, clinic_id, schedule_id, created_by_user_id,
          appointment_type, scheduled_date, actual_start_time, duration_minutes,
          status, urgency_level, consultation_fee, currency_code, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 'pending')
      `, [
        uuid,
        patientId,
        schedule.doctor_id,
        schedule.clinic_id || null,
        schedule_id,
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

      // Insert translation with patient's language
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

      // Fetch created appointment with details
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
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        LEFT JOIN appointment_translations at ON a.id = at.appointment_id AND at.language_code = ?
        WHERE a.id = ?
      `, [lang, lang, appointmentId]);

      res.status(201).json({
        success: true,
        message: lang === 'ar' 
          ? 'تم حجز الموعد بنجاح' 
          : 'Appointment booked successfully',
        data: appointment[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error booking appointment:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في حجز الموعد' 
          : 'Error booking appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get patient's appointments
   * جلب مواعيد المريض
   * GET /api/patient/appointments
   */
  static async getMyAppointments(req, res) {
    const connection = await db.getConnection();
    
    try {
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { 
        status, 
        from_date, 
        to_date,
        page = 1,
        limit = 20
      } = req.query;

      let query = `
        SELECT 
          a.*,
          dpt.full_name as doctor_name,
          dpt.specialty as doctor_specialty,
          c.name as clinic_name
        FROM appointments a
        INNER JOIN doctors d ON a.doctor_id = d.id
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        LEFT JOIN clinics c ON a.clinic_id = c.id
        WHERE a.patient_id = ?
      `;
      const params = [lang, patientId];

      if (status) {
        query += ' AND a.status = ?';
        params.push(status);
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
      const lang = PatientAppointmentsController.normalizeLanguage(
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
   * GET /api/patient/appointments/:id
   */
  static async getAppointmentById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

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
        INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
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
      const lang = PatientAppointmentsController.normalizeLanguage(
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
   * Cancel appointment
   * إلغاء موعد
   * PATCH /api/patient/appointments/:id/cancel
   */
  static async cancelAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(
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
        SELECT id, status, scheduled_date, actual_start_time
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
        SET status = 'cancelled', cancelled_by_user_id = ?, cancelled_at = NOW()
        WHERE id = ?
      `, [patientId, appointment.id]);

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
      const lang = PatientAppointmentsController.normalizeLanguage(
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
   * Reschedule appointment
   * إعادة جدولة موعد
   * PATCH /api/patient/appointments/:id/reschedule
   */
  static async rescheduleAppointment(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { scheduled_date, actual_start_time } = req.body;

      if (!scheduled_date || !actual_start_time) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'التاريخ والوقت الجديد مطلوبان' 
            : 'New date and time are required'
        });
      }

      const isUUID = id.includes('-');
      const [appointments] = await connection.execute(`
        SELECT id, doctor_id, status
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

      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن إعادة جدولة هذا الموعد' 
            : 'Cannot reschedule this appointment'
        });
      }

      // Check for conflicts
      const [conflicts] = await connection.execute(`
        SELECT id
        FROM appointments
        WHERE doctor_id = ? 
          AND scheduled_date = ? 
          AND actual_start_time = ?
          AND id != ?
          AND status NOT IN ('cancelled', 'no_show')
      `, [appointment.doctor_id, scheduled_date, actual_start_time, appointment.id]);

      if (conflicts.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: lang === 'ar' 
            ? 'الموعد الجديد محجوز بالفعل' 
            : 'New time slot is already booked'
        });
      }

      // Update appointment
      await connection.execute(`
        UPDATE appointments
        SET scheduled_date = ?, actual_start_time = ?, status = 'rescheduled'
        WHERE id = ?
      `, [scheduled_date, actual_start_time, appointment.id]);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إعادة جدولة الموعد بنجاح' 
          : 'Appointment rescheduled successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error rescheduling appointment:', error);
      const lang = PatientAppointmentsController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إعادة جدولة الموعد' 
          : 'Error rescheduling appointment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Helper: Convert time string to minutes
   */
  static timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Convert minutes to time string
   */
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }
}

module.exports = PatientAppointmentsController;

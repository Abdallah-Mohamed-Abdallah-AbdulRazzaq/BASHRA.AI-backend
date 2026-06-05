const db = require('../config/db');

/**
 * Doctor Schedules Controller
 * معالج جداول مواعيد الأطباء
 * 
 * يدير أوقات عمل الأطباء (أونلاين وفي العيادات)
 */
class DoctorSchedulesController {

  /**
   * Helper function to normalize language code
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
   * Create a new schedule for doctor
   * إنشاء جدول مواعيد جديد للطبيب
   * @route POST /api/doctor-schedules
   */
  static async createSchedule(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const {
        clinic_id,
        day_of_week,
        start_time,
        end_time,
        session_price,
        currency_code,
        session_duration,
        consultation_type
      } = req.body;

      // Validation
      if (!day_of_week || !start_time || !end_time || !session_price || !session_duration || !consultation_type) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'جميع الحقول المطلوبة يجب أن تكون موجودة' 
            : 'All required fields must be provided'
        });
      }

      // Validate consultation_type
      if (!['online', 'in_clinic'].includes(consultation_type)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'نوع الاستشارة يجب أن يكون online أو in_clinic' 
            : 'Consultation type must be online or in_clinic'
        });
      }

      // If in_clinic, clinic_id is required
      if (consultation_type === 'in_clinic' && !clinic_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'رقم العيادة مطلوب للكشف في العيادة' 
            : 'Clinic ID is required for in-clinic consultation'
        });
      }

      // If online, clinic_id must be null
      if (consultation_type === 'online' && clinic_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'الكشف الأونلاين لا يحتاج إلى رقم عيادة' 
            : 'Online consultation should not have clinic ID'
        });
      }

      // Verify clinic belongs to doctor if clinic_id is provided
      if (clinic_id) {
        const [clinicRows] = await connection.execute(
          'SELECT id FROM clinics WHERE id = ? AND doctor_id = ?',
          [clinic_id, doctorId]
        );

        if (clinicRows.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: language === 'ar' 
              ? 'العيادة غير موجودة أو لا تنتمي لك' 
              : 'Clinic not found or does not belong to you'
          });
        }
      }

      // Check for overlapping schedules
      const [overlapping] = await connection.execute(
        `SELECT id FROM doctor_schedules 
         WHERE doctor_id = ? 
         AND day_of_week = ? 
         AND clinic_id <=> ?
         AND is_active = 1
         AND (
           (start_time <= ? AND end_time > ?) OR
           (start_time < ? AND end_time >= ?) OR
           (start_time >= ? AND end_time <= ?)
         )`,
        [doctorId, day_of_week, clinic_id === undefined ? null : clinic_id, start_time, start_time, end_time, end_time, start_time, end_time]
      );

      if (overlapping.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'يوجد تعارض في المواعيد المحددة' 
            : 'Schedule conflict detected'
        });
      }

      // Insert schedule
      const [result] = await connection.execute(
        `INSERT INTO doctor_schedules 
        (doctor_id, clinic_id, day_of_week, start_time, end_time, session_price, currency_code, session_duration, consultation_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [doctorId, clinic_id === undefined ? null : clinic_id, day_of_week, start_time, end_time, session_price, currency_code || null, session_duration, consultation_type]
      );

      await connection.commit();

      // Get created schedule
      const [scheduleRows] = await connection.execute(
        'SELECT * FROM doctor_schedules WHERE id = ?',
        [result.insertId]
      );

      return res.status(201).json({
        success: true,
        message: language === 'ar' 
          ? 'تم إنشاء الجدول بنجاح' 
          : 'Schedule created successfully',
        data: scheduleRows[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in createSchedule:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في إنشاء الجدول' 
          : 'Error creating schedule',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all schedules for current doctor
   * جلب جميع جداول المواعيد للطبيب الحالي
   * @route GET /api/doctor-schedules
   */
  static async getDoctorSchedules(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { consultation_type, is_active, day_of_week } = req.query;

      let query = `
        SELECT 
          ds.*,
          c.name as clinic_name,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ?
      `;
      const params = [doctorId];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      if (is_active !== undefined) {
        query += ' AND ds.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      if (day_of_week) {
        query += ' AND ds.day_of_week = ?';
        params.push(day_of_week);
      }

      query += ' ORDER BY FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      return res.status(200).json({
        success: true,
        count: schedules.length,
        data: schedules
      });

    } catch (error) {
      console.error('Error in getDoctorSchedules:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب الجداول' 
          : 'Error fetching schedules',
        error: error.message
      });
    }
  }

  /**
   * Get single schedule by ID
   * جلب جدول مواعيد واحد
   * @route GET /api/doctor-schedules/:id
   */
  static async getScheduleById(req, res) {
    try {
      const doctorId = req.user.id;
      const scheduleId = req.params.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const [schedules] = await db.execute(
        `SELECT 
          ds.*,
          c.name as clinic_name,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.id = ? AND ds.doctor_id = ?`,
        [scheduleId, doctorId]
      );

      if (schedules.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الجدول غير موجود' 
            : 'Schedule not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: schedules[0]
      });

    } catch (error) {
      console.error('Error in getScheduleById:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب الجدول' 
          : 'Error fetching schedule',
        error: error.message
      });
    }
  }

  /**
   * Update schedule
   * تحديث جدول المواعيد
   * @route PUT /api/doctor-schedules/:id
   */
  static async updateSchedule(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const scheduleId = req.params.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if schedule exists and belongs to doctor
      const [existingSchedule] = await connection.execute(
        'SELECT * FROM doctor_schedules WHERE id = ? AND doctor_id = ?',
        [scheduleId, doctorId]
      );

      if (existingSchedule.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الجدول غير موجود' 
            : 'Schedule not found'
        });
      }

      const {
        clinic_id,
        day_of_week,
        start_time,
        end_time,
        session_price,
        currency_code,
        session_duration,
        consultation_type,
        is_active
      } = req.body;

      const updateFields = [];
      const updateValues = [];

      if (clinic_id !== undefined) {
        // Verify clinic belongs to doctor if clinic_id is provided
        if (clinic_id) {
          const [clinicRows] = await connection.execute(
            'SELECT id FROM clinics WHERE id = ? AND doctor_id = ?',
            [clinic_id, doctorId]
          );

          if (clinicRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
              success: false,
              message: language === 'ar' 
                ? 'العيادة غير موجودة أو لا تنتمي لك' 
                : 'Clinic not found or does not belong to you'
            });
          }
        }
        updateFields.push('clinic_id = ?');
        updateValues.push(clinic_id || null);
      }

      if (day_of_week !== undefined) {
        updateFields.push('day_of_week = ?');
        updateValues.push(day_of_week);
      }

      if (start_time !== undefined) {
        updateFields.push('start_time = ?');
        updateValues.push(start_time);
      }

      if (end_time !== undefined) {
        updateFields.push('end_time = ?');
        updateValues.push(end_time);
      }

      if (session_price !== undefined) {
        updateFields.push('session_price = ?');
        updateValues.push(session_price);
      }

      if (currency_code !== undefined) {
        updateFields.push('currency_code = ?');
        updateValues.push(currency_code || null);
      }

      if (session_duration !== undefined) {
        updateFields.push('session_duration = ?');
        updateValues.push(session_duration);
      }

      if (consultation_type !== undefined) {
        if (!['online', 'in_clinic'].includes(consultation_type)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'نوع الاستشارة يجب أن يكون online أو in_clinic' 
              : 'Consultation type must be online or in_clinic'
          });
        }
        updateFields.push('consultation_type = ?');
        updateValues.push(consultation_type);
      }

      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active ? 1 : 0);
      }

      if (updateFields.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'لا توجد حقول للتحديث' 
            : 'No fields to update'
        });
      }

      // Check for overlapping schedules (excluding current schedule)
      const checkDay = day_of_week || existingSchedule[0].day_of_week;
      const checkStart = start_time || existingSchedule[0].start_time;
      const checkEnd = end_time || existingSchedule[0].end_time;
      const checkClinic = clinic_id !== undefined ? clinic_id : existingSchedule[0].clinic_id;

      const [overlapping] = await connection.execute(
        `SELECT id FROM doctor_schedules 
         WHERE doctor_id = ? 
         AND id != ?
         AND day_of_week = ? 
         AND clinic_id <=> ?
         AND is_active = 1
         AND (
           (start_time <= ? AND end_time > ?) OR
           (start_time < ? AND end_time >= ?) OR
           (start_time >= ? AND end_time <= ?)
         )`,
        [doctorId, scheduleId, checkDay, checkClinic, checkStart, checkStart, checkEnd, checkEnd, checkStart, checkEnd]
      );

      if (overlapping.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'يوجد تعارض في المواعيد المحددة' 
            : 'Schedule conflict detected'
        });
      }

      // Update schedule
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(scheduleId);

      await connection.execute(
        `UPDATE doctor_schedules SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      await connection.commit();

      // Get updated schedule
      const [updatedSchedule] = await connection.execute(
        `SELECT 
          ds.*,
          c.name as clinic_name,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.id = ?`,
        [scheduleId]
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث الجدول بنجاح' 
          : 'Schedule updated successfully',
        data: updatedSchedule[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateSchedule:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث الجدول' 
          : 'Error updating schedule',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete schedule (soft delete by setting is_active = 0)
   * حذف جدول المواعيد (حذف ناعم)
   * @route DELETE /api/doctor-schedules/:id
   */
  static async deleteSchedule(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const scheduleId = req.params.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if schedule exists and belongs to doctor
      const [existingSchedule] = await connection.execute(
        'SELECT id FROM doctor_schedules WHERE id = ? AND doctor_id = ?',
        [scheduleId, doctorId]
      );

      if (existingSchedule.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الجدول غير موجود' 
            : 'Schedule not found'
        });
      }

      // Soft delete by setting is_active = 0
      await connection.execute(
        'UPDATE doctor_schedules SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [scheduleId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف الجدول بنجاح' 
          : 'Schedule deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteSchedule:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في حذف الجدول' 
          : 'Error deleting schedule',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Permanently delete schedule
   * حذف جدول المواعيد نهائياً
   * @route DELETE /api/doctor-schedules/:id/permanent
   */
  static async permanentDeleteSchedule(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const scheduleId = req.params.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if schedule exists and belongs to doctor
      const [existingSchedule] = await connection.execute(
        'SELECT id FROM doctor_schedules WHERE id = ? AND doctor_id = ?',
        [scheduleId, doctorId]
      );

      if (existingSchedule.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الجدول غير موجود' 
            : 'Schedule not found'
        });
      }

      // Permanently delete
      await connection.execute(
        'DELETE FROM doctor_schedules WHERE id = ?',
        [scheduleId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف الجدول نهائياً' 
          : 'Schedule permanently deleted'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in permanentDeleteSchedule:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في حذف الجدول نهائياً' 
          : 'Error permanently deleting schedule',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get public schedules for a specific doctor (for users to view)
   * جلب جداول المواعيد العامة لطبيب معين (للمستخدمين)
   * @route GET /api/public/doctor-schedules/:doctorId
   */
  static async getPublicDoctorSchedules(req, res) {
    try {
      const doctorId = req.params.doctorId;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { consultation_type, day_of_week } = req.query;

      // Verify doctor exists and is active
      const [doctorRows] = await db.execute(
        `SELECT d.id, d.status, d.is_active, dp.approval_status, dp.is_available
         FROM doctors d
         JOIN doctor_profiles dp ON d.id = dp.doctor_id
         WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الطبيب غير موجود' 
            : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];

      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: language === 'ar' 
            ? 'الطبيب غير متاح حالياً' 
            : 'Doctor is not available'
        });
      }

      let query = `
        SELECT 
          ds.id,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.session_price,
          ds.currency_code,
          ds.session_duration,
          ds.consultation_type,
          c.id as clinic_id,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address,
          c.latitude as clinic_latitude,
          c.longitude as clinic_longitude,
          cc.countries_cities_id,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          cc.level_type as region_level
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE ds.doctor_id = ? AND ds.is_active = 1
      `;
      const params = [doctorId];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      if (day_of_week) {
        query += ' AND ds.day_of_week = ?';
        params.push(day_of_week);
      }

      query += ' ORDER BY FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Format the response with detailed address information
      const formattedSchedules = schedules.map(schedule => {
        const result = {
          id: schedule.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          session_price: schedule.session_price,
          currency_code: schedule.currency_code,
          session_duration: schedule.session_duration,
          consultation_type: schedule.consultation_type
        };

        // Add clinic details if in_clinic
        if (schedule.consultation_type === 'in_clinic' && schedule.clinic_id) {
          result.clinic = {
            id: schedule.clinic_id,
            name: schedule.clinic_name,
            phone: schedule.clinic_phone,
            address: schedule.clinic_address,
            latitude: schedule.clinic_latitude,
            longitude: schedule.clinic_longitude
          };

          // Add location details if available
          if (schedule.countries_cities_id) {
            result.location = {
              region_id: schedule.countries_cities_id,
              region_name: language === 'ar' ? schedule.region_name_ar : schedule.region_name_en,
              region_type: schedule.region_level
            };
          }
        } else {
          result.clinic = null;
          result.location = null;
        }

        return result;
      });

      return res.status(200).json({
        success: true,
        count: formattedSchedules.length,
        data: formattedSchedules
      });

    } catch (error) {
      console.error('Error in getPublicDoctorSchedules:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب جداول المواعيد' 
          : 'Error fetching schedules',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get public schedules grouped by day
   * جلب جداول المواعيد العامة مجمعة حسب اليوم
   * @route GET /api/public/doctor-schedules/:doctorId/grouped/by-day
   */
  static async getPublicSchedulesGroupedByDay(req, res) {
    try {
      const doctorId = req.params.doctorId;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { consultation_type } = req.query;

      // Verify doctor exists and is active
      const [doctorRows] = await db.execute(
        `SELECT d.id, d.status, d.is_active, dp.approval_status
         FROM doctors d
         JOIN doctor_profiles dp ON d.id = dp.doctor_id
         WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير متاح حالياً' : 'Doctor is not available'
        });
      }

      let query = `
        SELECT 
          ds.id,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.session_price,
          ds.currency_code,
          ds.session_duration,
          ds.consultation_type,
          c.id as clinic_id,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ? AND ds.is_active = 1
      `;
      const params = [doctorId];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      query += ' ORDER BY FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Group by day
      const groupedByDay = schedules.reduce((acc, schedule) => {
        const day = schedule.day_of_week;
        if (!acc[day]) {
          acc[day] = [];
        }
        
        const scheduleData = {
          id: schedule.id,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          session_price: schedule.session_price,
          currency_code: schedule.currency_code,
          session_duration: schedule.session_duration,
          consultation_type: schedule.consultation_type
        };

        if (schedule.consultation_type === 'in_clinic' && schedule.clinic_id) {
          scheduleData.clinic = {
            id: schedule.clinic_id,
            name: schedule.clinic_name,
            phone: schedule.clinic_phone,
            address: schedule.clinic_address
          };
        }

        acc[day].push(scheduleData);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: groupedByDay
      });

    } catch (error) {
      console.error('Error in getPublicSchedulesGroupedByDay:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب جداول المواعيد' : 'Error fetching schedules',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get public schedules grouped by type
   * جلب جداول المواعيد العامة مجمعة حسب النوع
   * @route GET /api/public/doctor-schedules/:doctorId/grouped/by-type
   */
  static async getPublicSchedulesGroupedByType(req, res) {
    try {
      const doctorId = req.params.doctorId;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Verify doctor exists and is active
      const [doctorRows] = await db.execute(
        `SELECT d.id, d.status, d.is_active, dp.approval_status
         FROM doctors d
         JOIN doctor_profiles dp ON d.id = dp.doctor_id
         WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير متاح حالياً' : 'Doctor is not available'
        });
      }

      const query = `
        SELECT 
          ds.id,
          ds.day_of_week,
          ds.start_time,
          ds.end_time,
          ds.session_price,
          ds.currency_code,
          ds.session_duration,
          ds.consultation_type,
          c.id as clinic_id,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ? AND ds.is_active = 1
        ORDER BY ds.consultation_type, FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time
      `;

      const [schedules] = await db.execute(query, [doctorId]);

      // Group by consultation type
      const groupedByType = {
        online: [],
        in_clinic: []
      };

      schedules.forEach(schedule => {
        const scheduleData = {
          id: schedule.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          session_price: schedule.session_price,
          currency_code: schedule.currency_code,
          session_duration: schedule.session_duration
        };

        if (schedule.consultation_type === 'in_clinic' && schedule.clinic_id) {
          scheduleData.clinic = {
            id: schedule.clinic_id,
            name: schedule.clinic_name,
            phone: schedule.clinic_phone,
            address: schedule.clinic_address
          };
        }

        groupedByType[schedule.consultation_type].push(scheduleData);
      });

      return res.status(200).json({
        success: true,
        data: groupedByType,
        count: {
          online: groupedByType.online.length,
          in_clinic: groupedByType.in_clinic.length,
          total: schedules.length
        }
      });

    } catch (error) {
      console.error('Error in getPublicSchedulesGroupedByType:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب جداول المواعيد' : 'Error fetching schedules',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get public available slots for a specific day
   * جلب الأوقات المتاحة العامة ليوم معين
   * @route GET /api/public/doctor-schedules/:doctorId/available-slots/:day
   */
  static async getPublicAvailableSlots(req, res) {
    try {
      const doctorId = req.params.doctorId;
      const day = req.params.day;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      const { consultation_type } = req.query;

      // Verify doctor exists and is active
      const [doctorRows] = await db.execute(
        `SELECT d.id, d.status, d.is_active, dp.approval_status
         FROM doctors d
         JOIN doctor_profiles dp ON d.id = dp.doctor_id
         WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير متاح حالياً' : 'Doctor is not available'
        });
      }

      let query = `
        SELECT 
          ds.id,
          ds.start_time,
          ds.end_time,
          ds.session_price,
          ds.currency_code,
          ds.session_duration,
          ds.consultation_type,
          c.id as clinic_id,
          c.name as clinic_name,
          c.phone_number as clinic_phone,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ? 
        AND ds.day_of_week = ? 
        AND ds.is_active = 1
      `;
      const params = [doctorId, day];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      query += ' ORDER BY ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Generate time slots for each schedule
      const slotsWithSchedules = schedules.map(schedule => {
        const slots = [];
        const startTime = new Date(`2000-01-01T${schedule.start_time}`);
        const endTime = new Date(`2000-01-01T${schedule.end_time}`);
        const duration = schedule.session_duration;

        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);
          if (slotEnd <= endTime) {
            slots.push({
              start: currentTime.toTimeString().slice(0, 5),
              end: slotEnd.toTimeString().slice(0, 5),
              price: schedule.session_price,
              duration: duration
            });
          }
          currentTime = slotEnd;
        }

        const result = {
          schedule_id: schedule.id,
          consultation_type: schedule.consultation_type,
          currency_code: schedule.currency_code,
          total_slots: slots.length,
          slots: slots
        };

        if (schedule.consultation_type === 'in_clinic' && schedule.clinic_id) {
          result.clinic = {
            id: schedule.clinic_id,
            name: schedule.clinic_name,
            phone: schedule.clinic_phone,
            address: schedule.clinic_address
          };
        }

        return result;
      });

      return res.status(200).json({
        success: true,
        day: day,
        data: slotsWithSchedules
      });

    } catch (error) {
      console.error('Error in getPublicAvailableSlots:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب الأوقات المتاحة' : 'Error fetching available slots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get public weekly summary
   * جلب ملخص أسبوعي عام
   * @route GET /api/public/doctor-schedules/:doctorId/summary/weekly
   */
  static async getPublicWeeklySummary(req, res) {
    try {
      const doctorId = req.params.doctorId;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );

      // Verify doctor exists and is active
      const [doctorRows] = await db.execute(
        `SELECT d.id, d.status, d.is_active, dp.approval_status
         FROM doctors d
         JOIN doctor_profiles dp ON d.id = dp.doctor_id
         WHERE d.id = ?`,
        [doctorId]
      );

      if (doctorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'
        });
      }

      const doctor = doctorRows[0];
      if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: language === 'ar' ? 'الطبيب غير متاح حالياً' : 'Doctor is not available'
        });
      }

      const [schedules] = await db.execute(
        `SELECT 
          day_of_week,
          consultation_type,
          COUNT(*) as schedule_count,
          MIN(start_time) as earliest_start,
          MAX(end_time) as latest_end,
          MIN(session_price) as min_price,
          MAX(session_price) as max_price,
          AVG(session_price) as avg_price
        FROM doctor_schedules
        WHERE doctor_id = ? AND is_active = 1
        GROUP BY day_of_week, consultation_type
        ORDER BY FIELD(day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday")`,
        [doctorId]
      );

      // Calculate total weekly stats
      const totalStats = {
        total_schedules: 0,
        online_schedules: 0,
        in_clinic_schedules: 0,
        working_days: new Set(),
        price_range: {
          min: null,
          max: null,
          avg: 0
        }
      };

      let totalPrice = 0;
      schedules.forEach(schedule => {
        totalStats.total_schedules += schedule.schedule_count;
        totalStats.working_days.add(schedule.day_of_week);
        totalPrice += parseFloat(schedule.avg_price) * schedule.schedule_count;
        
        if (totalStats.price_range.min === null || schedule.min_price < totalStats.price_range.min) {
          totalStats.price_range.min = parseFloat(schedule.min_price);
        }
        if (totalStats.price_range.max === null || schedule.max_price > totalStats.price_range.max) {
          totalStats.price_range.max = parseFloat(schedule.max_price);
        }
        
        if (schedule.consultation_type === 'online') {
          totalStats.online_schedules += schedule.schedule_count;
        } else {
          totalStats.in_clinic_schedules += schedule.schedule_count;
        }
      });

      if (totalStats.total_schedules > 0) {
        totalStats.price_range.avg = Math.round((totalPrice / totalStats.total_schedules) * 100) / 100;
      }

      return res.status(200).json({
        success: true,
        data: {
          daily_breakdown: schedules,
          weekly_summary: {
            total_schedules: totalStats.total_schedules,
            working_days_count: totalStats.working_days.size,
            online_schedules: totalStats.online_schedules,
            in_clinic_schedules: totalStats.in_clinic_schedules,
            price_range: totalStats.price_range
          }
        }
      });

    } catch (error) {
      console.error('Error in getPublicWeeklySummary:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        null
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' ? 'خطأ في جلب الملخص' : 'Error fetching summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get schedules grouped by day
   * جلب الجداول مجمعة حسب اليوم
   * @route GET /api/doctor-schedules/grouped/by-day
   */
  static async getSchedulesGroupedByDay(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { consultation_type, is_active } = req.query;

      let query = `
        SELECT
          ds.*,
          c.name as clinic_name,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ?
      `;
      const params = [doctorId];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      if (is_active !== undefined) {
        query += ' AND ds.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query += ' ORDER BY FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Group by day
      const groupedByDay = schedules.reduce((acc, schedule) => {
        const day = schedule.day_of_week;
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(schedule);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: groupedByDay
      });

    } catch (error) {
      console.error('Error in getSchedulesGroupedByDay:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في جلب الجداول'
          : 'Error fetching schedules',
        error: error.message
      });
    }
  }

  /**
   * Get schedules grouped by consultation type
   * جلب الجداول مجمعة حسب نوع الكشف
   * @route GET /api/doctor-schedules/grouped/by-type
   */
  static async getSchedulesGroupedByType(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { is_active } = req.query;

      let query = `
        SELECT
          ds.*,
          c.name as clinic_name,
          c.address_line_1 as clinic_address
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ?
      `;
      const params = [doctorId];

      if (is_active !== undefined) {
        query += ' AND ds.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query += ' ORDER BY ds.consultation_type, FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Group by consultation type
      const groupedByType = {
        online: schedules.filter(s => s.consultation_type === 'online'),
        in_clinic: schedules.filter(s => s.consultation_type === 'in_clinic')
      };

      return res.status(200).json({
        success: true,
        data: groupedByType,
        count: {
          online: groupedByType.online.length,
          in_clinic: groupedByType.in_clinic.length,
          total: schedules.length
        }
      });

    } catch (error) {
      console.error('Error in getSchedulesGroupedByType:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في جلب الجداول'
          : 'Error fetching schedules',
        error: error.message
      });
    }
  }

  /**
   * Get schedules grouped by clinic
   * جلب الجداول مجمعة حسب العيادة
   * @route GET /api/doctor-schedules/grouped/by-clinic
   */
  static async getSchedulesGroupedByClinic(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { is_active } = req.query;

      let query = `
        SELECT
          ds.*,
          c.id as clinic_id,
          c.name as clinic_name,
          c.address_line_1 as clinic_address,
          c.phone_number as clinic_phone
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ? AND ds.consultation_type = 'in_clinic'
      `;
      const params = [doctorId];

      if (is_active !== undefined) {
        query += ' AND ds.is_active = ?';
        params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
      }

      query += ' ORDER BY c.name, FIELD(ds.day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"), ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Group by clinic
      const groupedByClinic = schedules.reduce((acc, schedule) => {
        const clinicId = schedule.clinic_id || 'online';
        if (!acc[clinicId]) {
          acc[clinicId] = {
            clinic_info: schedule.clinic_id ? {
              id: schedule.clinic_id,
              name: schedule.clinic_name,
              address: schedule.clinic_address,
              phone: schedule.clinic_phone
            } : null,
            schedules: []
          };
        }
        acc[clinicId].schedules.push({
          id: schedule.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          session_price: schedule.session_price,
          currency_code: schedule.currency_code,
          session_duration: schedule.session_duration,
          is_active: schedule.is_active
        });
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: groupedByClinic
      });

    } catch (error) {
      console.error('Error in getSchedulesGroupedByClinic:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في جلب الجداول'
          : 'Error fetching schedules',
        error: error.message
      });
    }
  }

  /**
   * Get weekly schedule summary
   * جلب ملخص الجدول الأسبوعي
   * @route GET /api/doctor-schedules/summary/weekly
   */
  static async getWeeklySummary(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const [schedules] = await db.execute(
        `SELECT
          day_of_week,
          consultation_type,
          COUNT(*) as schedule_count,
          MIN(start_time) as earliest_start,
          MAX(end_time) as latest_end,
          SUM(TIMESTAMPDIFF(MINUTE, start_time, end_time)) as total_minutes,
          AVG(session_price) as avg_price
        FROM doctor_schedules
        WHERE doctor_id = ? AND is_active = 1
        GROUP BY day_of_week, consultation_type
        ORDER BY FIELD(day_of_week, "saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday")`,
        [doctorId]
      );

      // Calculate total weekly stats
      const totalStats = {
        total_schedules: 0,
        total_hours: 0,
        online_schedules: 0,
        in_clinic_schedules: 0,
        working_days: new Set()
      };

      schedules.forEach(schedule => {
        totalStats.total_schedules += schedule.schedule_count;
        totalStats.total_hours += schedule.total_minutes / 60;
        totalStats.working_days.add(schedule.day_of_week);

        if (schedule.consultation_type === 'online') {
          totalStats.online_schedules += schedule.schedule_count;
        } else {
          totalStats.in_clinic_schedules += schedule.schedule_count;
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          daily_breakdown: schedules,
          weekly_summary: {
            total_schedules: totalStats.total_schedules,
            total_working_hours: Math.round(totalStats.total_hours * 100) / 100,
            working_days_count: totalStats.working_days.size,
            online_schedules: totalStats.online_schedules,
            in_clinic_schedules: totalStats.in_clinic_schedules
          }
        }
      });

    } catch (error) {
      console.error('Error in getWeeklySummary:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في جلب الملخص'
          : 'Error fetching summary',
        error: error.message
      });
    }
  }

  /**
   * Get available time slots for a specific day
   * جلب الأوقات المتاحة ليوم معين
   * @route GET /api/doctor-schedules/available-slots/:day
   */
  static async getAvailableSlots(req, res) {
    try {
      const doctorId = req.user.id;
      const day = req.params.day;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { consultation_type } = req.query;

      let query = `
        SELECT
          ds.id,
          ds.start_time,
          ds.end_time,
          ds.session_price,
          ds.currency_code,
          ds.session_duration,
          ds.consultation_type,
          c.name as clinic_name
        FROM doctor_schedules ds
        LEFT JOIN clinics c ON ds.clinic_id = c.id
        WHERE ds.doctor_id = ?
        AND ds.day_of_week = ?
        AND ds.is_active = 1
      `;
      const params = [doctorId, day];

      if (consultation_type) {
        query += ' AND ds.consultation_type = ?';
        params.push(consultation_type);
      }

      query += ' ORDER BY ds.start_time';

      const [schedules] = await db.execute(query, params);

      // Generate time slots for each schedule
      const slotsWithSchedules = schedules.map(schedule => {
        const slots = [];
        const startTime = new Date(`2000-01-01T${schedule.start_time}`);
        const endTime = new Date(`2000-01-01T${schedule.end_time}`);
        const duration = schedule.session_duration;

        let currentTime = new Date(startTime);
        while (currentTime < endTime) {
          const slotEnd = new Date(currentTime.getTime() + duration * 60000);
          if (slotEnd <= endTime) {
            slots.push({
              start: currentTime.toTimeString().slice(0, 5),
              end: slotEnd.toTimeString().slice(0, 5),
              price: schedule.session_price,
              duration: duration
            });
          }
          currentTime = slotEnd;
        }

        return {
          schedule_id: schedule.id,
          consultation_type: schedule.consultation_type,
          currency_code: schedule.currency_code,
          clinic_name: schedule.clinic_name,
          total_slots: slots.length,
          slots: slots
        };
      });

      return res.status(200).json({
        success: true,
        day: day,
        data: slotsWithSchedules
      });

    } catch (error) {
      console.error('Error in getAvailableSlots:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في جلب الأوقات المتاحة'
          : 'Error fetching available slots',
        error: error.message
      });
    }
  }

  /**
   * Bulk create schedules
   * إنشاء جداول متعددة دفعة واحدة
   * @route POST /api/doctor-schedules/bulk
   */
  static async bulkCreateSchedules(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { schedules } = req.body;

      if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar'
            ? 'يجب إرسال مصفوفة من الجداول'
            : 'Schedules array is required'
        });
      }

      const createdSchedules = [];
      const errors = [];

      for (let i = 0; i < schedules.length; i++) {
        const schedule = schedules[i];

        try {
          // Validate required fields
          if (!schedule.day_of_week || !schedule.start_time || !schedule.end_time ||
              !schedule.session_price || !schedule.session_duration || !schedule.consultation_type) {
            errors.push({
              index: i,
              error: language === 'ar' ? 'حقول مطلوبة ناقصة' : 'Missing required fields'
            });
            continue;
          }

          // Validate consultation_type
          if (!['online', 'in_clinic'].includes(schedule.consultation_type)) {
            errors.push({
              index: i,
              error: language === 'ar' ? 'نوع الاستشارة غير صحيح' : 'Invalid consultation type'
            });
            continue;
          }

          // Check clinic requirements
          if (schedule.consultation_type === 'in_clinic' && !schedule.clinic_id) {
            errors.push({
              index: i,
              error: language === 'ar' ? 'رقم العيادة مطلوب' : 'Clinic ID required'
            });
            continue;
          }

          if (schedule.consultation_type === 'online' && schedule.clinic_id) {
            errors.push({
              index: i,
              error: language === 'ar' ? 'الكشف الأونلاين لا يحتاج عيادة' : 'Online consultation should not have clinic'
            });
            continue;
          }

          // Verify clinic ownership if needed
          if (schedule.clinic_id) {
            const [clinicRows] = await connection.execute(
              'SELECT id FROM clinics WHERE id = ? AND doctor_id = ?',
              [schedule.clinic_id, doctorId]
            );

            if (clinicRows.length === 0) {
              errors.push({
                index: i,
                error: language === 'ar' ? 'العيادة غير موجودة' : 'Clinic not found'
              });
              continue;
            }
          }

          // Check for overlapping
          const clinicId = schedule.clinic_id === undefined ? null : schedule.clinic_id;
          const [overlapping] = await connection.execute(
            `SELECT id FROM doctor_schedules
             WHERE doctor_id = ?
             AND day_of_week = ?
             AND clinic_id <=> ?
             AND is_active = 1
             AND (
               (start_time <= ? AND end_time > ?) OR
               (start_time < ? AND end_time >= ?) OR
               (start_time >= ? AND end_time <= ?)
             )`,
            [doctorId, schedule.day_of_week, clinicId, schedule.start_time, schedule.start_time,
             schedule.end_time, schedule.end_time, schedule.start_time, schedule.end_time]
          );

          if (overlapping.length > 0) {
            errors.push({
              index: i,
              error: language === 'ar' ? 'تعارض في المواعيد' : 'Schedule conflict'
            });
            continue;
          }

          // Insert schedule
          const [result] = await connection.execute(
            `INSERT INTO doctor_schedules
            (doctor_id, clinic_id, day_of_week, start_time, end_time, session_price, currency_code, session_duration, consultation_type, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [doctorId, clinicId, schedule.day_of_week, schedule.start_time, schedule.end_time,
             schedule.session_price, schedule.currency_code || null, schedule.session_duration, schedule.consultation_type]
          );

          createdSchedules.push({
            index: i,
            id: result.insertId
          });

        } catch (error) {
          errors.push({
            index: i,
            error: error.message
          });
        }
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: language === 'ar'
          ? `تم إنشاء ${createdSchedules.length} جدول بنجاح`
          : `${createdSchedules.length} schedules created successfully`,
        data: {
          created: createdSchedules,
          errors: errors,
          summary: {
            total: schedules.length,
            success: createdSchedules.length,
            failed: errors.length
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in bulkCreateSchedules:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في إنشاء الجداول'
          : 'Error creating schedules',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Toggle schedule active status
   * تبديل حالة تفعيل الجدول
   * @route PATCH /api/doctor-schedules/:id/toggle
   */
  static async toggleScheduleStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const scheduleId = req.params.id;
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get current status
      const [schedules] = await connection.execute(
        'SELECT is_active FROM doctor_schedules WHERE id = ? AND doctor_id = ?',
        [scheduleId, doctorId]
      );

      if (schedules.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar'
            ? 'الجدول غير موجود'
            : 'Schedule not found'
        });
      }

      const newStatus = schedules[0].is_active === 1 ? 0 : 1;

      // Update status
      await connection.execute(
        'UPDATE doctor_schedules SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newStatus, scheduleId]
      );

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? (newStatus === 1 ? 'تم تفعيل الجدول' : 'تم تعطيل الجدول')
          : (newStatus === 1 ? 'Schedule activated' : 'Schedule deactivated'),
        data: {
          id: scheduleId,
          is_active: newStatus
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in toggleScheduleStatus:', error);
      const language = DoctorSchedulesController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'خطأ في تبديل حالة الجدول'
          : 'Error toggling schedule status',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

}

module.exports = DoctorSchedulesController;

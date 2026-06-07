const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class RatingsController {
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return String(lang).toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  static getEntityType(req) {
    return req.user?.entityType || req.user?.role || null;
  }

  static getDoctorId(req) {
    return req.user?.doctor_id || req.user?.id;
  }

  static toPositiveInt(value, fallback, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  static parseJSON(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (_err) {
      return fallback;
    }
  }

  static async updateDoctorRatingStats(connection, doctorId) {
    const [stats] = await connection.execute(`
      SELECT
        COALESCE(AVG(rating), 0) AS avg_rating,
        COUNT(*) AS total_ratings
      FROM ratings
      WHERE doctor_id = ? AND status = 'active'
    `, [doctorId]);

    const avgRating = Number.parseFloat(stats[0]?.avg_rating || 0).toFixed(2);
    const totalRatings = Number(stats[0]?.total_ratings || 0);

    await connection.execute(`
      UPDATE doctor_profiles
      SET rating_average = ?, rating_count = ?
      WHERE doctor_id = ?
    `, [avgRating, totalRatings, doctorId]);

    return { avgRating, totalRatings };
  }

  static formatRating(row, lang, translations = null) {
    const anonymous = row.is_anonymous === 1 || row.is_anonymous === true;
    return {
      ...row,
      categories: RatingsController.parseJSON(row.categories, row.categories),
      patient_name: anonymous ? (lang === 'ar' ? 'مجهول' : 'Anonymous') : row.patient_name,
      patient_email: anonymous ? null : row.patient_email,
      translations
    };
  }

  static async fetchTranslations(connection, ratingId, lang = null) {
    if (lang) {
      const [rows] = await connection.execute(
        'SELECT * FROM rating_translations WHERE rating_id = ? AND language_code = ?',
        [ratingId, lang]
      );
      return rows[0] || null;
    }

    const [rows] = await connection.execute(
      'SELECT * FROM rating_translations WHERE rating_id = ?',
      [ratingId]
    );

    const map = {};
    for (const row of rows) {
      map[row.language_code] = {
        review_title: row.review_title,
        review_comment: row.review_comment,
        flagged_reason: row.flagged_reason,
        response_from_doctor: row.response_from_doctor
      };
    }
    return map;
  }

  /**
   * POST /api/ratings
   */
  static async createRating(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      let {
        appointment_id,
        doctor_id,
        rating,
        categories,
        would_recommend,
        is_anonymous = false,
        translations
      } = req.body;

      categories = RatingsController.parseJSON(categories, categories);
      translations = RatingsController.parseJSON(translations, translations);
      rating = Number(rating);

      if (!appointment_id || !doctor_id || !rating) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'appointment_id و doctor_id و rating مطلوبة' : 'appointment_id, doctor_id, rating are required'
        });
      }

      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'التقييم يجب أن يكون بين 1 و 5' : 'Rating must be between 1 and 5'
        });
      }

      const [appointments] = await connection.execute(`
        SELECT id, doctor_id, patient_id, status
        FROM appointments
        WHERE id = ? AND patient_id = ?
      `, [appointment_id, patientId]);

      if (appointments.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar'
            ? 'الموعد غير موجود أو لا تملك صلاحية الوصول إليه'
            : 'Appointment not found or access denied'
        });
      }

      const appointment = appointments[0];
      if (Number(appointment.doctor_id) !== Number(doctor_id)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'الطبيب لا يطابق طبيب الموعد' : 'Doctor does not match appointment doctor'
        });
      }

      if (appointment.status !== 'completed') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'لا يمكن تقييم موعد لم يكتمل بعد' : 'Cannot rate incomplete appointment'
        });
      }

      const [existingRating] = await connection.execute(
        'SELECT id FROM ratings WHERE appointment_id = ?',
        [appointment_id]
      );

      if (existingRating.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: lang === 'ar' ? 'تم تقييم هذا الموعد بالفعل' : 'Appointment already rated'
        });
      }

      const uuid = uuidv4();
      const isAnonymous = RatingsController.parseBoolean(is_anonymous, false) ? 1 : 0;
      const wouldRecommend = RatingsController.parseBoolean(would_recommend, false) ? 1 : 0;

      const [result] = await connection.execute(`
        INSERT INTO ratings (
          uuid, appointment_id, patient_id, doctor_id, rating,
          categories, would_recommend, is_anonymous, is_verified, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active')
      `, [
        uuid,
        appointment_id,
        patientId,
        doctor_id,
        rating,
        categories ? JSON.stringify(categories) : null,
        wouldRecommend,
        isAnonymous
      ]);

      const ratingId = result.insertId;

      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (!translationData || typeof translationData !== 'object') continue;
          await connection.execute(`
            INSERT INTO rating_translations (
              rating_id, language_code, review_title, review_comment
            ) VALUES (?, ?, ?, ?)
          `, [
            ratingId,
            languageCode,
            translationData.review_title || null,
            translationData.review_comment || null
          ]);
        }
      }

      await RatingsController.updateDoctorRatingStats(connection, doctor_id);
      await connection.commit();

      const [createdRating] = await connection.execute('SELECT * FROM ratings WHERE id = ?', [ratingId]);

      res.status(201).json({
        success: true,
        message: lang === 'ar' ? 'تم إنشاء التقييم بنجاح' : 'Rating created successfully',
        data: createdRating[0]
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error creating rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إنشاء التقييم' : 'Error creating rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/ratings
   */
  static async getAllRatings(req, res) {
    const connection = await db.getConnection();

    try {
      const entityType = RatingsController.getEntityType(req);
      const userId = req.user.id;
      const currentDoctorId = RatingsController.getDoctorId(req);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const {
        doctor_id,
        patient_id,
        status,
        min_rating,
        max_rating,
        page = 1,
        limit = 20
      } = req.query;

      const allowedStatuses = ['active', 'hidden', 'removed'];
      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar'
            ? `حالة التقييم غير صحيحة. القيم المتاحة: ${allowedStatuses.join(', ')}`
            : `Invalid rating status. Allowed values: ${allowedStatuses.join(', ')}`
        });
      }

      const minRating = min_rating !== undefined ? Number(min_rating) : null;
      const maxRating = max_rating !== undefined ? Number(max_rating) : null;
      if ((minRating !== null && (!Number.isFinite(minRating) || minRating < 1 || minRating > 5)) ||
          (maxRating !== null && (!Number.isFinite(maxRating) || maxRating < 1 || maxRating > 5))) {
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'نطاق التقييم يجب أن يكون بين 1 و 5' : 'Rating range must be between 1 and 5'
        });
      }

      const pageNum = RatingsController.toPositiveInt(page, 1, 1000000);
      const limitNum = RatingsController.toPositiveInt(limit, 20, 100);
      const offsetNum = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE 1=1';
      const whereParams = [];

      if (entityType === 'user') {
        whereClause += ' AND r.patient_id = ?';
        whereParams.push(userId);
      } else if (entityType === 'doctor') {
        whereClause += ' AND r.doctor_id = ?';
        whereParams.push(currentDoctorId);
      }

      if (doctor_id) {
        whereClause += ' AND r.doctor_id = ?';
        whereParams.push(doctor_id);
      }

      if (patient_id && entityType === 'admin') {
        whereClause += ' AND r.patient_id = ?';
        whereParams.push(patient_id);
      }

      if (status) {
        whereClause += ' AND r.status = ?';
        whereParams.push(status);
      }

      if (minRating !== null) {
        whereClause += ' AND r.rating >= ?';
        whereParams.push(minRating);
      }

      if (maxRating !== null) {
        whereClause += ' AND r.rating <= ?';
        whereParams.push(maxRating);
      }

      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS total FROM ratings r ${whereClause}`,
        whereParams
      );
      const total = Number(countRows[0]?.total || 0);

      const [ratings] = await connection.execute(`
        SELECT
          r.*,
          upt.full_name AS patient_name,
          u.email AS patient_email,
          dpt.full_name AS doctor_name,
          d.email AS doctor_email
        FROM ratings r
        LEFT JOIN users u ON r.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        ${whereClause}
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [lang, lang, ...whereParams]);

      const formattedRatings = await Promise.all(
        ratings.map(async (rating) => {
          const translation = await RatingsController.fetchTranslations(connection, rating.id, lang);
          return RatingsController.formatRating(rating, lang, translation);
        })
      );

      res.json({
        success: true,
        count: formattedRatings.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: formattedRatings
      });
    } catch (error) {
      console.error('Error fetching ratings:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب التقييمات' : 'Error fetching ratings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * GET /api/ratings/:id
   */
  static async getRatingById(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const entityType = RatingsController.getEntityType(req);
      const userId = req.user.id;
      const currentDoctorId = RatingsController.getDoctorId(req);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      let whereClause = `WHERE ${isUUID ? 'r.uuid' : 'r.id'} = ?`;
      const whereParams = [id];

      if (entityType === 'user') {
        whereClause += ' AND r.patient_id = ?';
        whereParams.push(userId);
      } else if (entityType === 'doctor') {
        whereClause += ' AND r.doctor_id = ?';
        whereParams.push(currentDoctorId);
      }

      const [ratings] = await connection.execute(`
        SELECT
          r.*,
          upt.full_name AS patient_name,
          u.email AS patient_email,
          dpt.full_name AS doctor_name,
          d.email AS doctor_email
        FROM ratings r
        LEFT JOIN users u ON r.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt
          ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt
          ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        ${whereClause}
      `, [lang, lang, ...whereParams]);

      if (ratings.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const translations = await RatingsController.fetchTranslations(connection, ratings[0].id);

      res.json({
        success: true,
        data: RatingsController.formatRating(ratings[0], lang, translations)
      });
    } catch (error) {
      console.error('Error fetching rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب التقييم' : 'Error fetching rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async updateRating(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      let { rating, categories, would_recommend, is_anonymous, translations } = req.body;

      categories = RatingsController.parseJSON(categories, categories);
      translations = RatingsController.parseJSON(translations, translations);

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id, doctor_id FROM ratings WHERE ${isUUID ? 'uuid' : 'id'} = ? AND patient_id = ?`,
        [id, patientId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;
      const updates = [];
      const values = [];

      if (rating !== undefined) {
        rating = Number(rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: lang === 'ar' ? 'التقييم يجب أن يكون بين 1 و 5' : 'Rating must be between 1 and 5'
          });
        }
        updates.push('rating = ?');
        values.push(rating);
      }

      if (categories !== undefined) {
        updates.push('categories = ?');
        values.push(categories ? JSON.stringify(categories) : null);
      }

      if (would_recommend !== undefined) {
        updates.push('would_recommend = ?');
        values.push(RatingsController.parseBoolean(would_recommend, false) ? 1 : 0);
      }

      if (is_anonymous !== undefined) {
        updates.push('is_anonymous = ?');
        values.push(RatingsController.parseBoolean(is_anonymous, false) ? 1 : 0);
      }

      if (updates.length > 0) {
        values.push(ratingId);
        await connection.execute(`UPDATE ratings SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (!translationData || typeof translationData !== 'object') continue;
          await connection.execute(`
            INSERT INTO rating_translations (
              rating_id, language_code, review_title, review_comment
            ) VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              review_title = VALUES(review_title),
              review_comment = VALUES(review_comment)
          `, [
            ratingId,
            languageCode,
            translationData.review_title || null,
            translationData.review_comment || null
          ]);
        }
      }

      if (rating !== undefined) {
        await RatingsController.updateDoctorRatingStats(connection, doctorId);
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم تحديث التقييم بنجاح' : 'Rating updated successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error updating rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في تحديث التقييم' : 'Error updating rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async deleteRating(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const isUUID = String(id).includes('-');

      const [existing] = await connection.execute(
        `SELECT id, doctor_id FROM ratings WHERE ${isUUID ? 'uuid' : 'id'} = ? AND patient_id = ?`,
        [id, patientId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;

      await connection.execute('DELETE FROM ratings WHERE id = ?', [ratingId]);
      await RatingsController.updateDoctorRatingStats(connection, doctorId);
      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم حذف التقييم بنجاح' : 'Rating deleted successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error deleting rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في حذف التقييم' : 'Error deleting rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async respondToRating(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = RatingsController.getDoctorId(req);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, response } = req.body;

      if (!language_code || !['ar', 'en'].includes(language_code) || !response) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'language_code و response مطلوبان' : 'language_code and response are required'
        });
      }

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id FROM ratings WHERE ${isUUID ? 'uuid' : 'id'} = ? AND doctor_id = ?`,
        [id, doctorId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;

      await connection.execute(`
        INSERT INTO rating_translations (
          rating_id, language_code, response_from_doctor
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE response_from_doctor = VALUES(response_from_doctor)
      `, [ratingId, language_code, response]);

      await connection.execute('UPDATE ratings SET doctor_responded_at = NOW() WHERE id = ?', [ratingId]);
      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم إضافة الرد بنجاح' : 'Response added successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error responding to rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في إضافة الرد' : 'Error adding response',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async flagRating(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const adminId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, reason } = req.body;
      const reasonLang = language_code || lang;

      if (!reason || !String(reason).trim()) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'سبب الإبلاغ مطلوب' : 'Reason is required'
        });
      }

      if (!['ar', 'en'].includes(reasonLang)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'language_code يجب أن يكون ar أو en' : 'language_code must be ar or en'
        });
      }

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id FROM ratings WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;

      await connection.execute(`
        UPDATE ratings
        SET is_flagged = 1, flagged_by_admin_id = ?, flagged_at = NOW()
        WHERE id = ?
      `, [adminId, ratingId]);

      await connection.execute(`
        INSERT INTO rating_translations (
          rating_id, language_code, flagged_reason
        ) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE flagged_reason = VALUES(flagged_reason)
      `, [ratingId, reasonLang, String(reason).trim()]);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم الإبلاغ عن التقييم بنجاح' : 'Rating flagged successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error flagging rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في الإبلاغ عن التقييم' : 'Error flagging rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async updateRatingStatus(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const { status } = req.body;

      if (!status || !['active', 'hidden', 'removed'].includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'الحالة يجب أن تكون: active, hidden, أو removed' : 'Status must be: active, hidden, or removed'
        });
      }

      const isUUID = String(id).includes('-');
      const [existing] = await connection.execute(
        `SELECT id, doctor_id FROM ratings WHERE ${isUUID ? 'uuid' : 'id'} = ?`,
        [id]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;

      await connection.execute('UPDATE ratings SET status = ? WHERE id = ?', [status, ratingId]);
      await RatingsController.updateDoctorRatingStats(connection, doctorId);
      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' ? 'تم تحديث حالة التقييم بنجاح' : 'Rating status updated successfully'
      });
    } catch (error) {
      try { await connection.rollback(); } catch (_rollbackError) {}
      console.error('Error updating rating status:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في تحديث حالة التقييم' : 'Error updating rating status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  static async getDoctorRatingStats(req, res) {
    const connection = await db.getConnection();

    try {
      const { doctor_id } = req.params;
      const [stats] = await connection.execute(`
        SELECT
          COUNT(*) AS total_ratings,
          COALESCE(AVG(rating), 0) AS average_rating,
          COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS five_star,
          COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS four_star,
          COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS three_star,
          COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS two_star,
          COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS one_star,
          COALESCE(SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END), 0) AS would_recommend_count
        FROM ratings
        WHERE doctor_id = ? AND status = 'active'
      `, [doctor_id]);

      const row = stats[0] || {};
      const totalRatings = Number(row.total_ratings || 0);
      const wouldRecommendCount = Number(row.would_recommend_count || 0);

      res.json({
        success: true,
        data: {
          total_ratings: totalRatings,
          average_rating: Number.parseFloat(row.average_rating || 0).toFixed(2),
          rating_distribution: {
            five_star: Number(row.five_star || 0),
            four_star: Number(row.four_star || 0),
            three_star: Number(row.three_star || 0),
            two_star: Number(row.two_star || 0),
            one_star: Number(row.one_star || 0)
          },
          would_recommend_count: wouldRecommendCount,
          would_recommend_percentage: totalRatings > 0
            ? ((wouldRecommendCount / totalRatings) * 100).toFixed(1)
            : 0
        }
      });
    } catch (error) {
      console.error('Error fetching doctor rating stats:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' ? 'خطأ في جلب إحصائيات التقييمات' : 'Error fetching rating statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = RatingsController;

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Ratings Controller
 * Handles CRUD operations for doctor ratings and reviews
 * Patient: Create, Update (own), View
 * Doctor: View (own ratings), Respond
 * Admin: View all, Flag, Remove
 */

class RatingsController {
  /**
   * Helper: Normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    const lang = langHeader || userPreference || 'ar';
    return lang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  /**
   * Helper: Update doctor rating average and count
   */
  static async updateDoctorRatingStats(connection, doctorId) {
    try {
      // Calculate average and count for active ratings only
      const [stats] = await connection.execute(`
        SELECT 
          COALESCE(AVG(rating), 0) as avg_rating,
          COUNT(*) as total_ratings
        FROM ratings
        WHERE doctor_id = ? AND status = 'active'
      `, [doctorId]);

      const avgRating = parseFloat(stats[0].avg_rating).toFixed(2);
      const totalRatings = stats[0].total_ratings;

      // Update doctor profile
      await connection.execute(`
        UPDATE doctor_profiles
        SET rating_average = ?, rating_count = ?
        WHERE doctor_id = ?
      `, [avgRating, totalRatings, doctorId]);

      return { avgRating, totalRatings };
    } catch (error) {
      console.error('Error updating doctor rating stats:', error);
      throw error;
    }
  }

  /**
   * Create rating (Patient only)
   * POST /api/ratings
   */
  static async createRating(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);

      const {
        appointment_id,
        doctor_id,
        rating,
        categories,
        would_recommend,
        is_anonymous = false,
        translations
      } = req.body;

      // Validation
      if (!appointment_id || !doctor_id || !rating) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'appointment_id, doctor_id, rating مطلوبة' 
            : 'appointment_id, doctor_id, rating are required'
        });
      }

      // Validate rating value (1-5)
      if (rating < 1 || rating > 5) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'التقييم يجب أن يكون بين 1 و 5' 
            : 'Rating must be between 1 and 5'
        });
      }

      // Verify appointment exists and belongs to patient
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
      
      // Verify appointment is completed
      if (appointment.status !== 'completed') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'لا يمكن تقييم موعد لم يكتمل بعد' 
            : 'Cannot rate incomplete appointment'
        });
      }

      // Check if rating already exists for this appointment
      const [existingRating] = await connection.execute(`
        SELECT id FROM ratings WHERE appointment_id = ?
      `, [appointment_id]);

      if (existingRating.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: lang === 'ar' 
            ? 'تم تقييم هذا الموعد بالفعل' 
            : 'Appointment already rated'
        });
      }

      // Create rating
      const uuid = uuidv4();
      const isAnonymous = is_anonymous === true || is_anonymous === 'true' || is_anonymous === 1 ? 1 : 0;
      const wouldRecommend = would_recommend === true || would_recommend === 'true' || would_recommend === 1 ? 1 : 0;

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

      // Insert translations if provided
      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (translationData && typeof translationData === 'object') {
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
      }

      // Update doctor rating stats
      await RatingsController.updateDoctorRatingStats(connection, doctor_id);

      await connection.commit();

      // Fetch created rating
      const [createdRating] = await connection.execute(`
        SELECT * FROM ratings WHERE id = ?
      `, [ratingId]);

      res.status(201).json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إنشاء التقييم بنجاح' 
          : 'Rating created successfully',
        data: createdRating[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إنشاء التقييم' 
          : 'Error creating rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all ratings (filtered by user role)
   * GET /api/ratings
   */
  static async getAllRatings(req, res) {
    const connection = await db.getConnection();
    
    try {
      const userRole = req.user.role;
      const userId = req.user.id;
      const doctorId = req.user.doctor_id || req.user.id;
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

      let query = `
        SELECT 
          r.*,
          upt.full_name as patient_name,
          dpt.full_name as doctor_name
        FROM ratings r
        LEFT JOIN users u ON r.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE 1=1
      `;
      const params = [lang, lang];

      // Filter based on role
      if (userRole === 'user') {
        query += ' AND r.patient_id = ?';
        params.push(userId);
      } else if (userRole === 'doctor') {
        query += ' AND r.doctor_id = ?';
        params.push(doctorId);
      }

      // Additional filters
      if (doctor_id) {
        query += ' AND r.doctor_id = ?';
        params.push(doctor_id);
      }

      if (patient_id && userRole === 'admin') {
        query += ' AND r.patient_id = ?';
        params.push(patient_id);
      }

      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }

      if (min_rating) {
        query += ' AND r.rating >= ?';
        params.push(parseInt(min_rating));
      }

      if (max_rating) {
        query += ' AND r.rating <= ?';
        params.push(parseInt(max_rating));
      }

      // Get total count
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
      const [countResult] = await connection.execute(countQuery, params);
      const total = countResult[0].total;

      // Add pagination
      const offset = (page - 1) * limit;
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      query += ` ORDER BY r.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [ratings] = await connection.execute(query, params);

      // Get translations for each rating
      const formattedRatings = await Promise.all(ratings.map(async (rating) => {
        const [translations] = await connection.execute(
          'SELECT * FROM rating_translations WHERE rating_id = ? AND language_code = ?',
          [rating.id, lang]
        );

        return {
          ...rating,
          patient_name: rating.is_anonymous ? (lang === 'ar' ? 'مجهول' : 'Anonymous') : rating.patient_name,
          translations: translations[0] || null
        };
      }));

      res.json({
        success: true,
        count: formattedRatings.length,
        total: total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
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
   * Get single rating by ID
   * GET /api/ratings/:id
   */
  static async getRatingById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { id } = req.params;
      const userRole = req.user.role;
      const userId = req.user.id;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);

      const isUUID = id.includes('-');
      let query = `
        SELECT 
          r.*,
          upt.full_name as patient_name,
          u.email as patient_email,
          dpt.full_name as doctor_name,
          d.email as doctor_email
        FROM ratings r
        LEFT JOIN users u ON r.patient_id = u.id
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
        LEFT JOIN doctors d ON r.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${isUUID ? 'r.uuid' : 'r.id'} = ?
      `;

      // Add role-based filter
      if (userRole === 'user') {
        query += ' AND r.patient_id = ?';
      } else if (userRole === 'doctor') {
        query += ' AND r.doctor_id = ?';
      }

      const queryParams = userRole === 'user' ? [lang, lang, id, userId] : 
                          userRole === 'doctor' ? [lang, lang, id, doctorId] : [lang, lang, id];

      const [ratings] = await connection.execute(query, queryParams);

      if (ratings.length === 0) {
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const rating = ratings[0];

      // Get all translations
      const [translations] = await connection.execute(`
        SELECT * FROM rating_translations WHERE rating_id = ?
      `, [rating.id]);

      const translationsMap = {};
      translations.forEach(t => {
        translationsMap[t.language_code] = {
          review_title: t.review_title,
          review_comment: t.review_comment,
          flagged_reason: t.flagged_reason,
          response_from_doctor: t.response_from_doctor
        };
      });

      const formattedRating = {
        ...rating,
        patient_name: rating.is_anonymous ? (lang === 'ar' ? 'مجهول' : 'Anonymous') : rating.patient_name,
        patient_email: rating.is_anonymous ? null : rating.patient_email,
        translations: translationsMap
      };

      res.json({
        success: true,
        data: formattedRating
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

  /**
   * Update rating (Patient only - own ratings)
   * PUT /api/ratings/:id
   */
  static async updateRating(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);

      const {
        rating,
        categories,
        would_recommend,
        is_anonymous,
        translations
      } = req.body;

      // Check if rating exists and belongs to patient
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, doctor_id FROM ratings WHERE uuid = ? AND patient_id = ?'
        : 'SELECT id, doctor_id FROM ratings WHERE id = ? AND patient_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, patientId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;

      // Build update query
      const updates = [];
      const values = [];

      if (rating !== undefined) {
        if (rating < 1 || rating > 5) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: lang === 'ar' 
              ? 'التقييم يجب أن يكون بين 1 و 5' 
              : 'Rating must be between 1 and 5'
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
        const wouldRecommendValue = would_recommend === true || would_recommend === 'true' || would_recommend === 1 ? 1 : 0;
        values.push(wouldRecommendValue);
      }

      if (is_anonymous !== undefined) {
        updates.push('is_anonymous = ?');
        const isAnonymousValue = is_anonymous === true || is_anonymous === 'true' || is_anonymous === 1 ? 1 : 0;
        values.push(isAnonymousValue);
      }

      if (updates.length > 0) {
        values.push(ratingId);
        await connection.execute(`
          UPDATE ratings
          SET ${updates.join(', ')}
          WHERE id = ?
        `, values);
      }

      // Update translations
      if (translations && typeof translations === 'object') {
        for (const [languageCode, translationData] of Object.entries(translations)) {
          if (translationData && typeof translationData === 'object') {
            const [existingTrans] = await connection.execute(`
              SELECT id FROM rating_translations 
              WHERE rating_id = ? AND language_code = ?
            `, [ratingId, languageCode]);

            if (existingTrans.length > 0) {
              const transUpdates = [];
              const transParams = [];

              if (translationData.review_title !== undefined) {
                transUpdates.push('review_title = ?');
                transParams.push(translationData.review_title);
              }

              if (translationData.review_comment !== undefined) {
                transUpdates.push('review_comment = ?');
                transParams.push(translationData.review_comment);
              }

              if (transUpdates.length > 0) {
                transParams.push(ratingId, languageCode);
                await connection.execute(`
                  UPDATE rating_translations 
                  SET ${transUpdates.join(', ')}
                  WHERE rating_id = ? AND language_code = ?
                `, transParams);
              }
            } else {
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
        }
      }

      // Update doctor rating stats if rating value changed
      if (rating !== undefined) {
        await RatingsController.updateDoctorRatingStats(connection, doctorId);
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث التقييم بنجاح' 
          : 'Rating updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث التقييم' 
          : 'Error updating rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete rating (Patient only - own ratings)
   * DELETE /api/ratings/:id
   */
  static async deleteRating(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const patientId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);

      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, doctor_id FROM ratings WHERE uuid = ? AND patient_id = ?'
        : 'SELECT id, doctor_id FROM ratings WHERE id = ? AND patient_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, patientId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;

      // Delete rating (translations will be deleted automatically by CASCADE)
      await connection.execute('DELETE FROM ratings WHERE id = ?', [ratingId]);

      // Update doctor rating stats
      await RatingsController.updateDoctorRatingStats(connection, doctorId);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم حذف التقييم بنجاح' 
          : 'Rating deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error deleting rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في حذف التقييم' 
          : 'Error deleting rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Doctor responds to rating
   * POST /api/ratings/:id/respond
   */
  static async respondToRating(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const doctorId = req.user.doctor_id || req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, response } = req.body;

      if (!language_code || !response) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' 
            ? 'language_code و response مطلوبان' 
            : 'language_code and response are required'
        });
      }

      // Check if rating exists and belongs to this doctor
      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM ratings WHERE uuid = ? AND doctor_id = ?'
        : 'SELECT id FROM ratings WHERE id = ? AND doctor_id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;

      // Check if translation exists
      const [translation] = await connection.execute(`
        SELECT id FROM rating_translations 
        WHERE rating_id = ? AND language_code = ?
      `, [ratingId, language_code]);

      if (translation.length > 0) {
        // Update existing translation
        await connection.execute(`
          UPDATE rating_translations 
          SET response_from_doctor = ?
          WHERE rating_id = ? AND language_code = ?
        `, [response, ratingId, language_code]);
      } else {
        // Insert new translation with response
        await connection.execute(`
          INSERT INTO rating_translations (
            rating_id, language_code, response_from_doctor
          ) VALUES (?, ?, ?)
        `, [ratingId, language_code, response]);
      }

      // Update doctor_responded_at timestamp
      await connection.execute(`
        UPDATE ratings 
        SET doctor_responded_at = NOW()
        WHERE id = ?
      `, [ratingId]);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم إضافة الرد بنجاح' 
          : 'Response added successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error responding to rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في إضافة الرد' 
          : 'Error adding response',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Flag rating (Admin only)
   * PATCH /api/ratings/:id/flag
   */
  static async flagRating(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const adminId = req.user.id;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      const { language_code, reason } = req.body;

      if (!reason) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: lang === 'ar' ? 'سبب الإبلاغ مطلوب' : 'Reason is required'
        });
      }

      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id FROM ratings WHERE uuid = ?'
        : 'SELECT id FROM ratings WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;

      // Update rating as flagged
      await connection.execute(`
        UPDATE ratings 
        SET is_flagged = 1, flagged_by_admin_id = ?, flagged_at = NOW()
        WHERE id = ?
      `, [adminId, ratingId]);

      // Add flagged reason to translation
      if (language_code) {
        const [translation] = await connection.execute(`
          SELECT id FROM rating_translations 
          WHERE rating_id = ? AND language_code = ?
        `, [ratingId, language_code]);

        if (translation.length > 0) {
          await connection.execute(`
            UPDATE rating_translations 
            SET flagged_reason = ?
            WHERE rating_id = ? AND language_code = ?
          `, [reason, ratingId, language_code]);
        } else {
          await connection.execute(`
            INSERT INTO rating_translations (
              rating_id, language_code, flagged_reason
            ) VALUES (?, ?, ?)
          `, [ratingId, language_code, reason]);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم الإبلاغ عن التقييم بنجاح' 
          : 'Rating flagged successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error flagging rating:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في الإبلاغ عن التقييم' 
          : 'Error flagging rating',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update rating status (Admin only)
   * PATCH /api/ratings/:id/status
   */
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
          message: lang === 'ar' 
            ? 'الحالة يجب أن تكون: active, hidden, أو removed' 
            : 'Status must be: active, hidden, or removed'
        });
      }

      const isUUID = id.includes('-');
      const checkQuery = isUUID 
        ? 'SELECT id, doctor_id FROM ratings WHERE uuid = ?'
        : 'SELECT id, doctor_id FROM ratings WHERE id = ?';
      
      const [existing] = await connection.execute(checkQuery, [id]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: lang === 'ar' ? 'التقييم غير موجود' : 'Rating not found'
        });
      }

      const ratingId = existing[0].id;
      const doctorId = existing[0].doctor_id;

      // Update status
      await connection.execute(`
        UPDATE ratings 
        SET status = ?
        WHERE id = ?
      `, [status, ratingId]);

      // Update doctor rating stats (recalculate based on active ratings only)
      await RatingsController.updateDoctorRatingStats(connection, doctorId);

      await connection.commit();

      res.json({
        success: true,
        message: lang === 'ar' 
          ? 'تم تحديث حالة التقييم بنجاح' 
          : 'Rating status updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating rating status:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في تحديث حالة التقييم' 
          : 'Error updating rating status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get doctor rating statistics
   * GET /api/ratings/doctor/:doctor_id/stats
   */
  static async getDoctorRatingStats(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { doctor_id } = req.params;
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);

      // Get overall stats
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_ratings,
          AVG(rating) as average_rating,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star,
          SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as would_recommend_count
        FROM ratings
        WHERE doctor_id = ? AND status = 'active'
      `, [doctor_id]);

      res.json({
        success: true,
        data: {
          total_ratings: stats[0].total_ratings,
          average_rating: parseFloat(stats[0].average_rating || 0).toFixed(2),
          rating_distribution: {
            five_star: stats[0].five_star,
            four_star: stats[0].four_star,
            three_star: stats[0].three_star,
            two_star: stats[0].two_star,
            one_star: stats[0].one_star
          },
          would_recommend_count: stats[0].would_recommend_count,
          would_recommend_percentage: stats[0].total_ratings > 0 
            ? ((stats[0].would_recommend_count / stats[0].total_ratings) * 100).toFixed(1)
            : 0
        }
      });

    } catch (error) {
      console.error('Error fetching doctor rating stats:', error);
      const lang = RatingsController.normalizeLanguage(req.headers['accept-language'], null);
      res.status(500).json({
        success: false,
        message: lang === 'ar' 
          ? 'خطأ في جلب إحصائيات التقييمات' 
          : 'Error fetching rating statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = RatingsController;

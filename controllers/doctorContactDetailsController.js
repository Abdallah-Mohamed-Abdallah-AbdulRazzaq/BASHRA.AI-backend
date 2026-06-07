const db = require('../config/db');

/**
 * Doctor Contact Details Controller
 * Handles contact information for doctors
 * 
 * Doctor: Can CREATE, READ, UPDATE, DELETE their own contact details
 * Admin: Can READ all doctors' contact details
 */

class DoctorContactDetailsController {
  /**
   * Get doctor's own contact details
   * GET /api/doctor-contact-details/my-details
   * Access: Doctor only
   */
  static async getMyContactDetails(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;

      const [details] = await connection.execute(
        'SELECT * FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      if (details.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لم يتم إضافة معلومات التواصل بعد'
        });
      }

      res.json({
        success: true,
        data: details[0]
      });

    } catch (error) {
      console.error('Error fetching doctor contact details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب معلومات التواصل',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create or update doctor's contact details
   * POST /api/doctor-contact-details
   * Access: Doctor only
   */
  static async createOrUpdateContactDetails(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      let {
        whatsapp_number,
        additional_phone,
        personal_email,
        contact_notes
      } = req.body;

      // Convert empty strings to null
      whatsapp_number = whatsapp_number && whatsapp_number.trim() !== '' ? whatsapp_number.trim() : null;
      additional_phone = additional_phone && additional_phone.trim() !== '' ? additional_phone.trim() : null;
      personal_email = personal_email && personal_email.trim() !== '' ? personal_email.trim() : null;
      contact_notes = contact_notes && contact_notes.trim() !== '' ? contact_notes.trim() : null;

      // Validation: at least one contact method is required
      if (!whatsapp_number && !additional_phone && !personal_email) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'يجب إدخال وسيلة تواصل واحدة على الأقل'
        });
      }

      // Email validation if provided
      if (personal_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(personal_email)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'البريد الإلكتروني غير صالح'
          });
        }
      }

      // Check if details already exist
      const [existing] = await connection.execute(
        'SELECT id FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      let result;
      if (existing.length > 0) {
        // Update existing details
        await connection.execute(`
          UPDATE doctor_contact_details
          SET whatsapp_number = ?,
              additional_phone = ?,
              personal_email = ?,
              contact_notes = ?
          WHERE doctor_id = ?
        `, [whatsapp_number, additional_phone, personal_email, contact_notes, doctorId]);

        result = { id: existing[0].id };
      } else {
        // Insert new details
        const [insertResult] = await connection.execute(`
          INSERT INTO doctor_contact_details (
            doctor_id, whatsapp_number, additional_phone, personal_email, contact_notes
          ) VALUES (?, ?, ?, ?, ?)
        `, [doctorId, whatsapp_number, additional_phone, personal_email, contact_notes]);

        result = { insertId: insertResult.insertId };
      }

      await connection.commit();

      // Fetch the created/updated details
      const [details] = await connection.execute(
        'SELECT * FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      res.status(existing.length > 0 ? 200 : 201).json({
        success: true,
        message: existing.length > 0 ? 'تم تحديث معلومات التواصل بنجاح' : 'تم إضافة معلومات التواصل بنجاح',
        data: details[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating/updating doctor contact details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حفظ معلومات التواصل',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update doctor's contact details (partial update)
   * PUT /api/doctor-contact-details
   * Access: Doctor only
   */
  static async updateContactDetails(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      let {
        whatsapp_number,
        additional_phone,
        personal_email,
        contact_notes
      } = req.body;

      // Check if details exist
      const [existing] = await connection.execute(
        'SELECT id FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'لم يتم إضافة معلومات التواصل بعد. استخدم POST لإنشاء معلومات جديدة'
        });
      }

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (whatsapp_number !== undefined) {
        updates.push('whatsapp_number = ?');
        values.push(whatsapp_number && whatsapp_number.trim() !== '' ? whatsapp_number.trim() : null);
      }
      if (additional_phone !== undefined) {
        updates.push('additional_phone = ?');
        values.push(additional_phone && additional_phone.trim() !== '' ? additional_phone.trim() : null);
      }
      if (personal_email !== undefined) {
        // Email validation if provided
        if (personal_email && personal_email.trim() !== '') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(personal_email.trim())) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: 'البريد الإلكتروني غير صالح'
            });
          }
          updates.push('personal_email = ?');
          values.push(personal_email.trim());
        } else {
          updates.push('personal_email = ?');
          values.push(null);
        }
      }
      if (contact_notes !== undefined) {
        updates.push('contact_notes = ?');
        values.push(contact_notes && contact_notes.trim() !== '' ? contact_notes.trim() : null);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(doctorId);

      await connection.execute(`
        UPDATE doctor_contact_details
        SET ${updates.join(', ')}
        WHERE doctor_id = ?
      `, values);

      await connection.commit();

      // Fetch updated details
      const [details] = await connection.execute(
        'SELECT * FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      res.json({
        success: true,
        message: 'تم تحديث معلومات التواصل بنجاح',
        data: details[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating doctor contact details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث معلومات التواصل',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete doctor's contact details
   * DELETE /api/doctor-contact-details
   * Access: Doctor only
   */
  static async deleteContactDetails(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;

      // Check if details exist
      const [existing] = await connection.execute(
        'SELECT id FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد معلومات تواصل لحذفها'
        });
      }

      await connection.execute(
        'DELETE FROM doctor_contact_details WHERE doctor_id = ?',
        [doctorId]
      );

      res.json({
        success: true,
        message: 'تم حذف معلومات التواصل بنجاح'
      });

    } catch (error) {
      console.error('Error deleting doctor contact details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف معلومات التواصل',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all doctors' contact details (Admin only)
   * GET /api/doctor-contact-details/all
   * Access: Admin only
   */
  static async getAllContactDetails(req, res) {
    const connection = await db.getConnection();

    try {
      const rawDoctorId = req.query.doctor_id;
      const rawPage = Number(req.query.page);
      const rawLimit = Number(req.query.limit);

      const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
      const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
      const offset = (page - 1) * limit;

      const requestedLanguage = String(req.headers['accept-language'] || 'ar')
        .split(',')[0]
        .split('-')[0]
        .trim()
        .toLowerCase();

      const language = ['ar', 'en'].includes(requestedLanguage) ? requestedLanguage : 'ar';

      let whereClause = '';
      const whereParams = [];

      if (rawDoctorId !== undefined && rawDoctorId !== '') {
        const doctorId = Number(rawDoctorId);

        if (!Number.isInteger(doctorId) || doctorId <= 0) {
          return res.status(400).json({
            success: false,
            message: language === 'ar'
              ? 'معرف الطبيب غير صحيح'
              : 'Invalid doctor_id'
          });
        }

        whereClause = 'WHERE dcd.doctor_id = ?';
        whereParams.push(doctorId);
      }

      const [countRows] = await connection.execute(
        `
          SELECT COUNT(*) AS total
          FROM doctor_contact_details dcd
          INNER JOIN doctors d ON dcd.doctor_id = d.id
          ${whereClause}
        `,
        whereParams
      );

      const total = Number(countRows[0]?.total || 0);
      const totalPages = Math.ceil(total / limit);

      const [details] = await connection.execute(
        `
          SELECT
            dcd.*,
            d.email AS doctor_email,
            d.phone AS doctor_phone,
            dp.license_number,
            dp.profile_picture_url,
            COALESCE(dpt_lang.full_name, dpt_ar.full_name, dpt_en.full_name) AS doctor_name,
            COALESCE(dpt_lang.specialty, dpt_ar.specialty, dpt_en.specialty) AS doctor_specialty
          FROM doctor_contact_details dcd
          INNER JOIN doctors d ON dcd.doctor_id = d.id
          LEFT JOIN doctor_profiles dp ON dp.doctor_id = d.id
          LEFT JOIN doctor_profile_translations dpt_lang
            ON dpt_lang.doctor_profile_id = dp.id
            AND dpt_lang.language_code = ?
          LEFT JOIN doctor_profile_translations dpt_ar
            ON dpt_ar.doctor_profile_id = dp.id
            AND dpt_ar.language_code = 'ar'
          LEFT JOIN doctor_profile_translations dpt_en
            ON dpt_en.doctor_profile_id = dp.id
            AND dpt_en.language_code = 'en'
          ${whereClause}
          ORDER BY dcd.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        [language, ...whereParams]
      );

      return res.json({
        success: true,
        count: details.length,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        },
        data: details
      });

    } catch (error) {
      console.error('Error fetching all contact details:', error);

      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب معلومات التواصل',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get specific doctor's contact details by doctor ID (Admin only)
   * GET /api/doctor-contact-details/doctor/:doctorId
   * Access: Admin only
   */
  static async getContactDetailsByDoctorId(req, res) {
    const connection = await db.getConnection();

    try {
      const doctorId = Number(req.params.doctorId);

      const requestedLanguage = String(req.headers['accept-language'] || 'ar')
        .split(',')[0]
        .split('-')[0]
        .trim()
        .toLowerCase();

      const language = ['ar', 'en'].includes(requestedLanguage) ? requestedLanguage : 'ar';

      if (!Number.isInteger(doctorId) || doctorId <= 0) {
        return res.status(400).json({
          success: false,
          message: language === 'ar'
            ? 'معرف الطبيب غير صحيح'
            : 'Invalid doctor ID'
        });
      }

      const [details] = await connection.execute(
        `
          SELECT
            dcd.*,
            d.email AS doctor_email,
            d.phone AS doctor_phone,
            dp.license_number,
            dp.profile_picture_url,
            COALESCE(dpt_lang.full_name, dpt_ar.full_name, dpt_en.full_name) AS doctor_name,
            COALESCE(dpt_lang.specialty, dpt_ar.specialty, dpt_en.specialty) AS doctor_specialty
          FROM doctor_contact_details dcd
          INNER JOIN doctors d ON dcd.doctor_id = d.id
          LEFT JOIN doctor_profiles dp ON dp.doctor_id = d.id
          LEFT JOIN doctor_profile_translations dpt_lang
            ON dpt_lang.doctor_profile_id = dp.id
            AND dpt_lang.language_code = ?
          LEFT JOIN doctor_profile_translations dpt_ar
            ON dpt_ar.doctor_profile_id = dp.id
            AND dpt_ar.language_code = 'ar'
          LEFT JOIN doctor_profile_translations dpt_en
            ON dpt_en.doctor_profile_id = dp.id
            AND dpt_en.language_code = 'en'
          WHERE dcd.doctor_id = ?
          LIMIT 1
        `,
        [language, doctorId]
      );

      if (details.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar'
            ? 'لم يتم العثور على معلومات تواصل لهذا الطبيب'
            : 'No contact details found for this doctor'
        });
      }

      return res.json({
        success: true,
        data: details[0]
      });

    } catch (error) {
      console.error('Error fetching doctor contact details:', error);

      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب معلومات التواصل',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = DoctorContactDetailsController;

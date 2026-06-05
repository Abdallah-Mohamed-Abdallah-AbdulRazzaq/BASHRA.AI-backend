const db = require('../config/db');
const ProfileService = require('../services/profileService');

/**
 * Doctor Professional Data Controller
 * معالج البيانات المهنية للأطباء
 */
class DoctorProfessionalController {

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
   * Get professional data for doctor
   * جلب البيانات المهنية للطبيب
   */
  static async getProfessionalData(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorProfessionalController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Get professional data from doctor_profiles
      const [profileRows] = await db.execute(
        `SELECT 
          license_number, years_of_experience, medical_school, graduation_year,
          board_certifications, languages_spoken,
          is_verified, verification_date, approval_status,
          rating_average, rating_count, total_consultations, is_available
        FROM doctor_profiles 
        WHERE doctor_id = ?`,
        [doctorId]
      );

      if (profileRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profile = profileRows[0];

      // Parse JSON fields safely
      if (profile.board_certifications) {
        try {
          // Check if it's already an object/array
          if (typeof profile.board_certifications === 'string') {
            profile.board_certifications = JSON.parse(profile.board_certifications);
          }
        } catch (error) {
          console.error('Error parsing board_certifications:', error);
          profile.board_certifications = [];
        }
      } else {
        profile.board_certifications = [];
      }

      if (profile.languages_spoken) {
        try {
          // Check if it's already an object/array
          if (typeof profile.languages_spoken === 'string') {
            profile.languages_spoken = JSON.parse(profile.languages_spoken);
          }
        } catch (error) {
          console.error('Error parsing languages_spoken:', error);
          profile.languages_spoken = [];
        }
      } else {
        profile.languages_spoken = [];
      }

      // Get professional translations
      const [translationRows] = await db.execute(
        `SELECT language_code, specialty, sub_specialty, biography
        FROM doctor_profile_translations 
        WHERE doctor_profile_id = (SELECT id FROM doctor_profiles WHERE doctor_id = ?)`,
        [doctorId]
      );

      // Format translations
      const translations = {};
      translationRows.forEach(row => {
        translations[row.language_code] = {
          specialty: row.specialty,
          sub_specialty: row.sub_specialty,
          biography: row.biography
        };
      });

      res.status(200).json({
        success: true,
        data: {
          professional_data: profile,
          translations: translations
        }
      });

    } catch (error) {
      console.error('Error in getProfessionalData:', error);
      const language = DoctorProfessionalController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب البيانات المهنية' 
          : 'Error fetching professional data',
        error: error.message
      });
    }
  }

  /**
   * Update professional data for doctor
   * تحديث البيانات المهنية للطبيب
   */
  static async updateProfessionalData(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = DoctorProfessionalController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if profile exists
      const [profileRows] = await connection.execute(
        'SELECT id FROM doctor_profiles WHERE doctor_id = ?',
        [doctorId]
      );

      if (profileRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }

      const profileId = profileRows[0].id;

      const {
        license_number,
        years_of_experience,
        medical_school,
        graduation_year,
        board_certifications,
        languages_spoken,
        translations // { ar: { specialty, sub_specialty, biography }, en: { ... } }
      } = req.body;

      // Update doctor_profiles table
      const profileUpdateFields = [];
      const profileUpdateValues = [];

      if (license_number !== undefined) {
        // Check if license_number already exists for another doctor
        const [existingLicense] = await connection.execute(
          'SELECT id FROM doctor_profiles WHERE license_number = ? AND doctor_id != ?',
          [license_number, doctorId]
        );
        if (existingLicense.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: language === 'ar' 
              ? 'رقم الترخيص مستخدم بالفعل' 
              : 'License number already in use'
          });
        }
        profileUpdateFields.push('license_number = ?');
        profileUpdateValues.push(license_number);
      }

      if (years_of_experience !== undefined) {
        profileUpdateFields.push('years_of_experience = ?');
        profileUpdateValues.push(years_of_experience);
      }
      if (medical_school !== undefined) {
        profileUpdateFields.push('medical_school = ?');
        profileUpdateValues.push(medical_school);
      }
      if (graduation_year !== undefined) {
        profileUpdateFields.push('graduation_year = ?');
        profileUpdateValues.push(graduation_year);
      }
      if (board_certifications !== undefined) {
        profileUpdateFields.push('board_certifications = ?');
        profileUpdateValues.push(JSON.stringify(board_certifications));
      }
      if (languages_spoken !== undefined) {
        profileUpdateFields.push('languages_spoken = ?');
        profileUpdateValues.push(JSON.stringify(languages_spoken));
      }

      // Update doctor_profiles if there are fields to update
      if (profileUpdateFields.length > 0) {
        profileUpdateFields.push('updated_at = CURRENT_TIMESTAMP');
        profileUpdateValues.push(profileId);
        await connection.execute(
          `UPDATE doctor_profiles SET ${profileUpdateFields.join(', ')} WHERE id = ?`,
          profileUpdateValues
        );
      }

      // Handle translations
      if (translations && typeof translations === 'object') {
        for (const [langCode, fields] of Object.entries(translations)) {
          if (['ar', 'en'].includes(langCode)) {
            // Check if translation exists
            const [translationRows] = await connection.execute(
              'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
              [profileId, langCode]
            );

            const translationFields = [];
            const translationValues = [];

            if (fields.specialty !== undefined) {
              translationFields.push('specialty = ?');
              translationValues.push(fields.specialty);
            }
            if (fields.sub_specialty !== undefined) {
              translationFields.push('sub_specialty = ?');
              translationValues.push(fields.sub_specialty);
            }
            if (fields.biography !== undefined) {
              translationFields.push('biography = ?');
              translationValues.push(fields.biography);
            }

            if (translationRows.length > 0) {
              // Update existing translation
              if (translationFields.length > 0) {
                translationValues.push(translationRows[0].id);
                await connection.execute(
                  `UPDATE doctor_profile_translations SET ${translationFields.join(', ')} WHERE id = ?`,
                  translationValues
                );
              }
            } else {
              // Insert new translation
              await connection.execute(
                `INSERT INTO doctor_profile_translations 
                (doctor_profile_id, language_code, specialty, sub_specialty, biography)
                VALUES (?, ?, ?, ?, ?)`,
                [profileId, langCode, fields.specialty || null, fields.sub_specialty || null, fields.biography || null]
              );
            }
          }
        }
      } else {
        // Update current language only
        const { specialty, sub_specialty, biography } = req.body;
        
        if (specialty !== undefined || sub_specialty !== undefined || biography !== undefined) {
          const [translationRows] = await connection.execute(
            'SELECT id FROM doctor_profile_translations WHERE doctor_profile_id = ? AND language_code = ?',
            [profileId, language]
          );

          const translationFields = [];
          const translationValues = [];

          if (specialty !== undefined) {
            translationFields.push('specialty = ?');
            translationValues.push(specialty);
          }
          if (sub_specialty !== undefined) {
            translationFields.push('sub_specialty = ?');
            translationValues.push(sub_specialty);
          }
          if (biography !== undefined) {
            translationFields.push('biography = ?');
            translationValues.push(biography);
          }

          if (translationRows.length > 0) {
            // Update existing translation
            if (translationFields.length > 0) {
              translationValues.push(translationRows[0].id);
              await connection.execute(
                `UPDATE doctor_profile_translations SET ${translationFields.join(', ')} WHERE id = ?`,
                translationValues
              );
            }
          } else {
            // Insert new translation
            await connection.execute(
              `INSERT INTO doctor_profile_translations 
              (doctor_profile_id, language_code, specialty, sub_specialty, biography)
              VALUES (?, ?, ?, ?, ?)`,
              [profileId, language, specialty || null, sub_specialty || null, biography || null]
            );
          }
        }
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث البيانات المهنية بنجاح' 
          : 'Professional data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProfessionalData:', error);
      const language = DoctorProfessionalController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث البيانات المهنية' 
          : 'Error updating professional data',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = DoctorProfessionalController;

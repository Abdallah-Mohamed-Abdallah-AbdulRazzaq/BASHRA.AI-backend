const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Clinics Controller
 * Handles all clinic-related operations for doctors
 */

// Helper function to save clinic image
const saveClinicImage = async (file, clinicId) => {
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const filename = `clinic_${clinicId}_${uuidv4()}_${timestamp}${ext}`;
  
  const uploadDir = path.join(__dirname, '..', 'upload', 'files', 'clinic-images');
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, file.buffer);
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
  return {
    filename,
    path: `/upload/files/clinic-images/${filename}`,
    url: `${baseUrl}/upload/files/clinic-images/${filename}`
  };
};

// Helper function to delete clinic image from disk
const deleteClinicImageFile = async (imagePath) => {
  try {
    const fullPath = path.join(__dirname, '..', imagePath);
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting clinic image file:', error);
    return false;
  }
};

class ClinicsController {
  /**
   * Get all clinics for authenticated doctor
   * GET /api/clinics
   */
  static async getDoctorClinics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const lang = req.headers['accept-language'] || 'ar';

      const [clinics] = await connection.execute(`
        SELECT 
          c.*,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'}
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.doctor_id = ?
        ORDER BY c.is_main_branch DESC, c.created_at DESC
      `, [doctorId]);

      res.json({
        success: true,
        count: clinics.length,
        data: clinics
      });

    } catch (error) {
      console.error('Error fetching clinics:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get main clinic for authenticated doctor
   * GET /api/clinics/main
   */
  static async getMainClinic(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.user.id;
      const lang = req.headers['accept-language'] || 'ar';

      const [clinic] = await connection.execute(`
        SELECT 
          c.*,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'}
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.doctor_id = ? AND c.is_main_branch = 1
        LIMIT 1
      `, [doctorId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'لا توجد عيادة رئيسية'
        });
      }

      res.json({
        success: true,
        data: clinic[0]
      });

    } catch (error) {
      console.error('Error fetching main clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادة الرئيسية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single clinic by ID
   * GET /api/clinics/:id
   */
  static async getClinicById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const clinicId = req.params.id;
      const doctorId = req.user.id;
      const lang = req.headers['accept-language'] || 'ar';

      const [clinic] = await connection.execute(`
        SELECT 
          c.*,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'}
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.id = ? AND c.doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية للوصول إليها'
        });
      }

      res.json({
        success: true,
        data: clinic[0]
      });

    } catch (error) {
      console.error('Error fetching clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Create new clinic
   * POST /api/clinics
   */
  static async createClinic(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      
      let {
        name,
        address_line_1,
        region_id,
        latitude,
        longitude,
        phone_number,
        is_main_branch = false,
        status = 'active'
      } = req.body;

      // Convert form-data strings to proper types
      if (region_id !== undefined && region_id !== null && region_id !== '') {
        region_id = parseInt(region_id);
      } else {
        region_id = null;
      }

      if (latitude !== undefined && latitude !== null && latitude !== '') {
        latitude = parseFloat(latitude);
      } else {
        latitude = null;
      }

      if (longitude !== undefined && longitude !== null && longitude !== '') {
        longitude = parseFloat(longitude);
      } else {
        longitude = null;
      }

      // Convert is_main_branch to boolean
      if (typeof is_main_branch === 'string') {
        is_main_branch = is_main_branch.toLowerCase() === 'true' || is_main_branch === '1';
      } else {
        is_main_branch = Boolean(is_main_branch);
      }

      // Validation
      if (!name || !address_line_1) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'اسم العيادة والعنوان مطلوبان'
        });
      }

      // Validate status
      const validStatuses = ['active', 'inactive', 'under_maintenance'];
      if (!validStatuses.includes(status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'حالة العيادة غير صالحة'
        });
      }

      // If this is set as main branch, unset other main branches
      if (is_main_branch) {
        await connection.execute(`
          UPDATE clinics
          SET is_main_branch = 0
          WHERE doctor_id = ?
        `, [doctorId]);
      }

      // Insert clinic
      const [result] = await connection.execute(`
        INSERT INTO clinics (
          doctor_id, name, address_line_1, region_id,
          latitude, longitude, phone_number, is_main_branch, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        doctorId,
        name,
        address_line_1,
        region_id,
        latitude,
        longitude,
        phone_number || null,
        is_main_branch ? 1 : 0,
        status
      ]);

      await connection.commit();

      // Fetch created clinic
      const [clinic] = await connection.execute(`
        SELECT 
          c.*,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.id = ?
      `, [result.insertId]);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء العيادة بنجاح',
        data: clinic[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error creating clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في إنشاء العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update clinic
   * PUT /api/clinics/:id
   */
  static async updateClinic(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const clinicId = req.params.id;
      const doctorId = req.user.id;

      let {
        name,
        address_line_1,
        region_id,
        latitude,
        longitude,
        phone_number,
        is_main_branch,
        status
      } = req.body;

      // Convert form-data strings to proper types
      if (region_id !== undefined && region_id !== null && region_id !== '') {
        region_id = parseInt(region_id);
      } else if (region_id === '') {
        region_id = null;
      }

      if (latitude !== undefined && latitude !== null && latitude !== '') {
        latitude = parseFloat(latitude);
      } else if (latitude === '') {
        latitude = null;
      }

      if (longitude !== undefined && longitude !== null && longitude !== '') {
        longitude = parseFloat(longitude);
      } else if (longitude === '') {
        longitude = null;
      }

      // Convert is_main_branch to boolean
      if (is_main_branch !== undefined) {
        if (typeof is_main_branch === 'string') {
          is_main_branch = is_main_branch.toLowerCase() === 'true' || is_main_branch === '1';
        } else {
          is_main_branch = Boolean(is_main_branch);
        }
      }

      // Check if clinic belongs to doctor
      const [existing] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية لتعديلها'
        });
      }

      // Validate status if provided
      if (status !== undefined) {
        const validStatuses = ['active', 'inactive', 'under_maintenance'];
        if (!validStatuses.includes(status)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'حالة العيادة غير صالحة'
          });
        }
      }

      // If setting as main branch, unset other main branches
      if (is_main_branch) {
        await connection.execute(`
          UPDATE clinics
          SET is_main_branch = 0
          WHERE doctor_id = ? AND id != ?
        `, [doctorId, clinicId]);
      }

      // Build update query dynamically
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (address_line_1 !== undefined) {
        updates.push('address_line_1 = ?');
        values.push(address_line_1);
      }
      if (region_id !== undefined) {
        updates.push('region_id = ?');
        values.push(region_id);
      }
      if (latitude !== undefined) {
        updates.push('latitude = ?');
        values.push(latitude);
      }
      if (longitude !== undefined) {
        updates.push('longitude = ?');
        values.push(longitude);
      }
      if (phone_number !== undefined) {
        updates.push('phone_number = ?');
        values.push(phone_number || null);
      }
      if (is_main_branch !== undefined) {
        updates.push('is_main_branch = ?');
        values.push(is_main_branch ? 1 : 0);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لا توجد بيانات للتحديث'
        });
      }

      values.push(clinicId);

      await connection.execute(`
        UPDATE clinics
        SET ${updates.join(', ')}
        WHERE id = ?
      `, values);

      await connection.commit();

      // Fetch updated clinic
      const [clinic] = await connection.execute(`
        SELECT 
          c.*,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.id = ?
      `, [clinicId]);

      res.json({
        success: true,
        message: 'تم تحديث العيادة بنجاح',
        data: clinic[0]
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error updating clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Set clinic as main branch
   * PATCH /api/clinics/:id/set-main
   */
  static async setMainClinic(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const clinicId = req.params.id;
      const doctorId = req.user.id;

      // Check if clinic belongs to doctor
      const [existing] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Unset all main branches for this doctor
      await connection.execute(`
        UPDATE clinics
        SET is_main_branch = 0
        WHERE doctor_id = ?
      `, [doctorId]);

      // Set this clinic as main
      await connection.execute(`
        UPDATE clinics
        SET is_main_branch = 1
        WHERE id = ?
      `, [clinicId]);

      await connection.commit();

      res.json({
        success: true,
        message: 'تم تعيين العيادة كفرع رئيسي بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error setting main clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تعيين العيادة الرئيسية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete clinic
   * DELETE /api/clinics/:id
   */
  static async deleteClinic(req, res) {
    const connection = await db.getConnection();
    
    try {
      const clinicId = req.params.id;
      const doctorId = req.user.id;

      // Check if clinic belongs to doctor
      const [existing] = await connection.execute(`
        SELECT id, is_main_branch FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية لحذفها'
        });
      }

      // Prevent deleting main branch if there are other clinics
      if (existing[0].is_main_branch === 1) {
        const [otherClinics] = await connection.execute(`
          SELECT COUNT(*) as count FROM clinics WHERE doctor_id = ? AND id != ?
        `, [doctorId, clinicId]);

        if (otherClinics[0].count > 0) {
          return res.status(400).json({
            success: false,
            message: 'لا يمكن حذف الفرع الرئيسي. قم بتعيين فرع آخر كرئيسي أولاً'
          });
        }
      }

      // Delete clinic images from disk first
      const [clinicImages] = await connection.execute(`
        SELECT image_path FROM clinic_images WHERE clinic_id = ?
      `, [clinicId]);

      for (const img of clinicImages) {
        await deleteClinicImageFile(img.image_path);
      }

      await connection.execute(`
        DELETE FROM clinics WHERE id = ?
      `, [clinicId]);

      res.json({
        success: true,
        message: 'تم حذف العيادة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ============================================
  // Clinic Images Management
  // ============================================

  /**
   * Get all images for a clinic
   * GET /api/clinics/:id/images
   */
  static async getClinicImages(req, res) {
    const connection = await db.getConnection();
    
    try {
      const clinicId = req.params.id;
      const doctorId = req.user.id;

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
      const [images] = await connection.execute(`
        SELECT 
          id,
          clinic_id,
          image_path,
          CONCAT(?, image_path) as image_url,
          is_main,
          sort_order,
          created_at
        FROM clinic_images 
        WHERE clinic_id = ?
        ORDER BY is_main DESC, sort_order ASC, created_at DESC
      `, [baseUrl, clinicId]);

      res.json({
        success: true,
        count: images.length,
        data: images
      });

    } catch (error) {
      console.error('Error fetching clinic images:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب صور العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Upload images for a clinic
   * POST /api/clinics/:id/images
   */
  static async uploadClinicImages(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const clinicId = req.params.id;
      const doctorId = req.user.id;
      const { is_main = false } = req.body;

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي صور'
        });
      }

      // ✅ Check current number of images for this clinic
      const [currentImages] = await connection.execute(`
        SELECT COUNT(*) as count FROM clinic_images WHERE clinic_id = ?
      `, [clinicId]);

      const currentCount = currentImages[0].count;
      const maxImagesPerClinic = 5;
      const availableSlots = maxImagesPerClinic - currentCount;

      // ✅ Check if adding new images would exceed the limit
      if (availableSlots <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `لقد وصلت للحد الأقصى من الصور (${maxImagesPerClinic} صور). يرجى حذف بعض الصور أولاً.`,
          current_count: currentCount,
          max_allowed: maxImagesPerClinic
        });
      }

      // ✅ Limit the number of files to upload based on available slots
      const filesToUpload = req.files.slice(0, availableSlots);
      const skippedFiles = req.files.length - filesToUpload.length;

      if (skippedFiles > 0) {
        console.warn(`Skipping ${skippedFiles} file(s) due to limit. Only ${availableSlots} slot(s) available.`);
      }

      const uploadedImages = [];
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      // Get current max sort_order
      const [maxOrder] = await connection.execute(`
        SELECT COALESCE(MAX(sort_order), 0) as max_order FROM clinic_images WHERE clinic_id = ?
      `, [clinicId]);
      let sortOrder = maxOrder[0].max_order;

      // Convert is_main to boolean
      let setAsMain = false;
      if (typeof is_main === 'string') {
        setAsMain = is_main.toLowerCase() === 'true' || is_main === '1';
      } else {
        setAsMain = Boolean(is_main);
      }

      // If setting as main, unset other main images
      if (setAsMain) {
        await connection.execute(`
          UPDATE clinic_images SET is_main = 0 WHERE clinic_id = ?
        `, [clinicId]);
      }

      // Process each uploaded file (limited to available slots)
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const savedImage = await saveClinicImage(file, clinicId);
        sortOrder++;

        // Only first image can be main if is_main is true
        const isMainImage = setAsMain && i === 0 ? 1 : 0;

        const [result] = await connection.execute(`
          INSERT INTO clinic_images (clinic_id, image_path, is_main, sort_order)
          VALUES (?, ?, ?, ?)
        `, [clinicId, savedImage.path, isMainImage, sortOrder]);

        uploadedImages.push({
          id: result.insertId,
          clinic_id: parseInt(clinicId),
          image_path: savedImage.path,
          image_url: savedImage.url,
          is_main: isMainImage,
          sort_order: sortOrder
        });
      }

      await connection.commit();

      const responseMessage = skippedFiles > 0
        ? `تم رفع ${uploadedImages.length} صورة بنجاح. تم تجاهل ${skippedFiles} صورة بسبب الوصول للحد الأقصى (${maxImagesPerClinic} صور).`
        : `تم رفع ${uploadedImages.length} صورة بنجاح`;

      res.status(201).json({
        success: true,
        message: responseMessage,
        count: uploadedImages.length,
        skipped: skippedFiles,
        total_images: currentCount + uploadedImages.length,
        max_allowed: maxImagesPerClinic,
        remaining_slots: maxImagesPerClinic - (currentCount + uploadedImages.length),
        data: uploadedImages
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error uploading clinic images:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في رفع صور العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Set image as main cover
   * PATCH /api/clinics/:clinicId/images/:imageId/set-main
   */
  static async setMainImage(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const { clinicId, imageId } = req.params;
      const doctorId = req.user.id;

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Check if image exists and belongs to this clinic
      const [image] = await connection.execute(`
        SELECT id FROM clinic_images WHERE id = ? AND clinic_id = ?
      `, [imageId, clinicId]);

      if (image.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'الصورة غير موجودة'
        });
      }

      // Unset all main images for this clinic
      await connection.execute(`
        UPDATE clinic_images SET is_main = 0 WHERE clinic_id = ?
      `, [clinicId]);

      // Set this image as main
      await connection.execute(`
        UPDATE clinic_images SET is_main = 1 WHERE id = ?
      `, [imageId]);

      await connection.commit();

      res.json({
        success: true,
        message: 'تم تعيين الصورة كصورة رئيسية بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error setting main image:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تعيين الصورة الرئيسية',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Update image sort order
   * PATCH /api/clinics/:clinicId/images/:imageId/order
   */
  static async updateImageOrder(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { clinicId, imageId } = req.params;
      const doctorId = req.user.id;
      let { sort_order } = req.body;

      // Convert to number
      sort_order = parseInt(sort_order);
      if (isNaN(sort_order) || sort_order < 0) {
        return res.status(400).json({
          success: false,
          message: 'ترتيب الصورة غير صالح'
        });
      }

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Check if image exists
      const [image] = await connection.execute(`
        SELECT id FROM clinic_images WHERE id = ? AND clinic_id = ?
      `, [imageId, clinicId]);

      if (image.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الصورة غير موجودة'
        });
      }

      await connection.execute(`
        UPDATE clinic_images SET sort_order = ? WHERE id = ?
      `, [sort_order, imageId]);

      res.json({
        success: true,
        message: 'تم تحديث ترتيب الصورة بنجاح'
      });

    } catch (error) {
      console.error('Error updating image order:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث ترتيب الصورة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete clinic image
   * DELETE /api/clinics/:clinicId/images/:imageId
   */
  static async deleteClinicImage(req, res) {
    const connection = await db.getConnection();
    
    try {
      const { clinicId, imageId } = req.params;
      const doctorId = req.user.id;

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Get image info
      const [image] = await connection.execute(`
        SELECT id, image_path, is_main FROM clinic_images WHERE id = ? AND clinic_id = ?
      `, [imageId, clinicId]);

      if (image.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'الصورة غير موجودة'
        });
      }

      // Delete from disk
      await deleteClinicImageFile(image[0].image_path);

      // Delete from database
      await connection.execute(`
        DELETE FROM clinic_images WHERE id = ?
      `, [imageId]);

      // If deleted image was main, set another image as main
      if (image[0].is_main === 1) {
        await connection.execute(`
          UPDATE clinic_images 
          SET is_main = 1 
          WHERE clinic_id = ? 
          ORDER BY sort_order ASC, created_at ASC 
          LIMIT 1
        `, [clinicId]);
      }

      res.json({
        success: true,
        message: 'تم حذف الصورة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting clinic image:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الصورة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk reorder images
   * PUT /api/clinics/:id/images/reorder
   */
  static async reorderImages(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const clinicId = req.params.id;
      const doctorId = req.user.id;
      const { image_orders } = req.body;

      // Validate input
      if (!Array.isArray(image_orders) || image_orders.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'يجب إرسال مصفوفة ترتيب الصور'
        });
      }

      // Check if clinic belongs to doctor
      const [clinic] = await connection.execute(`
        SELECT id FROM clinics WHERE id = ? AND doctor_id = ?
      `, [clinicId, doctorId]);

      if (clinic.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة أو ليس لديك صلاحية'
        });
      }

      // Update each image order
      for (const item of image_orders) {
        if (item.id && typeof item.sort_order === 'number') {
          await connection.execute(`
            UPDATE clinic_images 
            SET sort_order = ? 
            WHERE id = ? AND clinic_id = ?
          `, [item.sort_order, item.id, clinicId]);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'تم تحديث ترتيب الصور بنجاح'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error reordering images:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في تحديث ترتيب الصور',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ============================================
  // Public APIs (No Authentication Required)
  // ============================================

  /**
   * Get all public clinics with filters
   * GET /api/public/clinics
   */
  static async getPublicClinics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';
      const {
        doctor_id,
        region_id,
        status = 'active',
        page = 1,
        limit = 20
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      let whereConditions = ['c.status = ?'];
      let params = [status];

      if (doctor_id) {
        whereConditions.push('c.doctor_id = ?');
        params.push(parseInt(doctor_id));
      }

      if (region_id) {
        whereConditions.push('c.region_id = ?');
        params.push(parseInt(region_id));
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total FROM clinics c WHERE ${whereClause}
      `, params);

      // Get clinics with main image
      const [clinics] = await connection.query(`
        SELECT 
          c.id,
          c.doctor_id,
          c.name,
          c.address_line_1,
          c.region_id,
          c.latitude,
          c.longitude,
          c.phone_number,
          c.is_main_branch,
          c.status,
          c.created_at,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'},
          dpt.full_name as doctor_name,
          dpt.specialty as specialization,
          (SELECT ci.image_path 
           FROM clinic_images ci 
           WHERE ci.clinic_id = c.id AND ci.is_main = 1 
           LIMIT 1) as main_image_path,
          (SELECT COUNT(*) FROM clinic_images ci WHERE ci.clinic_id = c.id) as images_count
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${whereClause}
        ORDER BY c.is_main_branch DESC, c.created_at DESC
        LIMIT ? OFFSET ?
      `, [lang, ...params, parseInt(limit), offset]);

      // Add full URL to main_image_path
      const clinicsWithUrls = clinics.map(clinic => ({
        ...clinic,
        main_image_url: clinic.main_image_path ? `${baseUrl}${clinic.main_image_path}` : null
      }));

      res.json({
        success: true,
        count: clinicsWithUrls.length,
        total: countResult[0].total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
        data: clinicsWithUrls
      });

    } catch (error) {
      console.error('Error fetching public clinics:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single public clinic by ID with all images
   * GET /api/public/clinics/:id
   */
  static async getPublicClinicById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const clinicId = req.params.id;
      const lang = req.headers['accept-language'] || 'ar';
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      const [clinic] = await connection.execute(`
        SELECT 
          c.id,
          c.doctor_id,
          c.name,
          c.address_line_1,
          c.region_id,
          c.latitude,
          c.longitude,
          c.phone_number,
          c.is_main_branch,
          c.status,
          c.created_at,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'},
          dpt.full_name as doctor_name,
          dpt.specialty as specialization,
          dp.profile_picture_url as doctor_profile_picture
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE c.id = ? AND c.status = 'active'
      `, [lang, clinicId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة'
        });
      }

      // Get all images for this clinic
      const [images] = await connection.execute(`
        SELECT 
          id,
          image_path,
          CONCAT(?, image_path) as image_url,
          is_main,
          sort_order
        FROM clinic_images 
        WHERE clinic_id = ?
        ORDER BY is_main DESC, sort_order ASC
      `, [baseUrl, clinicId]);

      const clinicData = clinic[0];
      clinicData.images = images;
      clinicData.main_image_url = images.find(img => img.is_main === 1)?.image_url || null;

      res.json({
        success: true,
        data: clinicData
      });

    } catch (error) {
      console.error('Error fetching public clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get clinics by doctor (public)
   * GET /api/public/clinics/doctor/:doctorId
   */
  static async getClinicsByDoctor(req, res) {
    const connection = await db.getConnection();
    
    try {
      const doctorId = req.params.doctorId;
      const lang = req.headers['accept-language'] || 'ar';
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      const [clinics] = await connection.execute(`
        SELECT 
          c.id,
          c.doctor_id,
          c.name,
          c.address_line_1,
          c.region_id,
          c.latitude,
          c.longitude,
          c.phone_number,
          c.is_main_branch,
          c.status,
          c.created_at,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'},
          (SELECT CONCAT(?, ci.image_path) 
           FROM clinic_images ci 
           WHERE ci.clinic_id = c.id AND ci.is_main = 1 
           LIMIT 1) as main_image_url,
          (SELECT COUNT(*) FROM clinic_images ci WHERE ci.clinic_id = c.id) as images_count
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        WHERE c.doctor_id = ? AND c.status = 'active'
        ORDER BY c.is_main_branch DESC, c.created_at DESC
      `, [baseUrl, doctorId]);

      res.json({
        success: true,
        count: clinics.length,
        data: clinics
      });

    } catch (error) {
      console.error('Error fetching clinics by doctor:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب عيادات الطبيب',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  // ============================================
  // User APIs (Authenticated Users)
  // ============================================

  /**
   * Get clinics for authenticated user (with more details)
   * GET /api/user/clinics
   */
  static async getUserClinics(req, res) {
    const connection = await db.getConnection();
    
    try {
      const lang = req.headers['accept-language'] || 'ar';
      const {
        doctor_id,
        region_id,
        page = 1,
        limit = 20,
        search
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      let whereConditions = ["c.status = 'active'"];
      let params = [];

      if (doctor_id) {
        whereConditions.push('c.doctor_id = ?');
        params.push(parseInt(doctor_id));
      }

      if (region_id) {
        whereConditions.push('c.region_id = ?');
        params.push(parseInt(region_id));
      }

      if (search) {
        whereConditions.push('(c.name LIKE ? OR c.address_line_1 LIKE ? OR dpt.full_name LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total 
        FROM clinics c
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${whereClause}
      `, [lang, ...params]);

      // Get clinics
      const [clinics] = await connection.query(`
        SELECT 
          c.id,
          c.doctor_id,
          c.name,
          c.address_line_1,
          c.region_id,
          c.latitude,
          c.longitude,
          c.phone_number,
          c.is_main_branch,
          c.status,
          c.created_at,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'},
          dpt.full_name as doctor_name,
          dpt.specialty as specialization,
          dp.profile_picture_url as doctor_profile_picture,
          dp.rating_average as doctor_rating,
          (SELECT ci.image_path 
           FROM clinic_images ci 
           WHERE ci.clinic_id = c.id AND ci.is_main = 1 
           LIMIT 1) as main_image_path,
          (SELECT COUNT(*) FROM clinic_images ci WHERE ci.clinic_id = c.id) as images_count
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE ${whereClause}
        ORDER BY c.is_main_branch DESC, c.created_at DESC
        LIMIT ? OFFSET ?
      `, [lang, ...params, parseInt(limit), offset]);

      // Add full URL to main_image_path
      const clinicsWithUrls = clinics.map(clinic => ({
        ...clinic,
        main_image_url: clinic.main_image_path ? `${baseUrl}${clinic.main_image_path}` : null
      }));

      res.json({
        success: true,
        count: clinicsWithUrls.length,
        total: countResult[0].total,
        page: parseInt(page),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit)),
        data: clinicsWithUrls
      });

    } catch (error) {
      console.error('Error fetching user clinics:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادات',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get single clinic details for user
   * GET /api/user/clinics/:id
   */
  static async getUserClinicById(req, res) {
    const connection = await db.getConnection();
    
    try {
      const clinicId = req.params.id;
      const lang = req.headers['accept-language'] || 'ar';
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';

      const [clinic] = await connection.execute(`
        SELECT 
          c.id,
          c.doctor_id,
          c.name,
          c.address_line_1,
          c.region_id,
          c.latitude,
          c.longitude,
          c.phone_number,
          c.is_main_branch,
          c.status,
          c.created_at,
          cc.name_ar as region_name_ar,
          cc.name_en as region_name_en,
          ${lang === 'en' ? 'cc.name_en as region_name' : 'cc.name_ar as region_name'},
          dpt.full_name as doctor_name,
          dpt.specialty as specialization,
          dp.profile_picture_url as doctor_profile_picture,
          dp.rating_average as doctor_rating,
          dpt.biography as doctor_bio
        FROM clinics c
        LEFT JOIN countries_cities cc ON c.region_id = cc.countries_cities_id
        LEFT JOIN doctors d ON c.doctor_id = d.id
        LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
        LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
        WHERE c.id = ? AND c.status = 'active'
      `, [lang, clinicId]);

      if (clinic.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'العيادة غير موجودة'
        });
      }

      // Get all images
      const [images] = await connection.execute(`
        SELECT 
          id,
          image_path,
          CONCAT(?, image_path) as image_url,
          is_main,
          sort_order
        FROM clinic_images 
        WHERE clinic_id = ?
        ORDER BY is_main DESC, sort_order ASC
      `, [baseUrl, clinicId]);

      const clinicData = clinic[0];
      clinicData.images = images;
      clinicData.main_image_url = images.find(img => img.is_main === 1)?.image_url || null;

      res.json({
        success: true,
        data: clinicData
      });

    } catch (error) {
      console.error('Error fetching user clinic:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب العيادة',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = ClinicsController;

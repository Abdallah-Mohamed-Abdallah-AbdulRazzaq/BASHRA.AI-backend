const db = require('../config/db');
const { validationResult } = require('express-validator');
const { filterByLanguage, getLocalizedMessage } = require('../utils/langHelper');

// Helper function to safely parse integer with fallback
const safeParseInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Get all skin diseases info
const getAllSkinDiseasesInfo = async (req, res) => {
  try {
    const page = safeParseInt(req.query.page, 1);
    const limit = safeParseInt(req.query.limit, 10);
    const offset = (page - 1) * limit;
    const isActive = req.query.is_active;
    const lang = req.lang; // Language is set by langDetector middleware

    if (limit <= 0 || page <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معاملات الصفحة والحد الأقصى يجب أن تكون أرقام موجبة'
      });
    }

    // Validate limit and offset are integers
    if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
      return res.status(400).json({
        success: false,
        message: 'قيمة limit و offset يجب أن تكون أرقام صحيحة'
      });
    }

    let query, params = [];
    
    if (isActive !== undefined) {
      const activeValue = isActive === 'true' ? 1 : 0;
      query = `SELECT * FROM skin_diseases_info WHERE is_active = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      params = [activeValue];
    } else {
      query = `SELECT * FROM skin_diseases_info ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const [diseases] = await db.execute(query, params);

    // Filter data based on language
    const filteredDiseases = filterByLanguage(diseases, lang);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM skin_diseases_info';
    let countParams = [];

    if (isActive !== undefined) {
      countQuery += ' WHERE is_active = ?';
      countParams.push(isActive === 'true' ? 1 : 0);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      success: true,
      data: filteredDiseases,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: getLocalizedMessage('تم جلب معلومات الأمراض الجلدية بنجاح', 'Skin diseases information retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting skin diseases info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات الأمراض الجلدية',
      error: error.message
    });
  }
};

// Get skin disease info by ID
const getSkinDiseaseInfoById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.lang; // Language is set by langDetector middleware

    // Validate ID parameter
    const diseaseId = safeParseInt(id, null);
    if (diseaseId === null || diseaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المرض الجلدي غير صحيح'
      });
    }

    const query = 'SELECT * FROM skin_diseases_info WHERE id = ?';

    const [diseases] = await db.execute(query, [diseaseId]);

    if (diseases.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'معلومات المرض الجلدي غير موجودة'
      });
    }

    // Filter data based on language
    const filteredDisease = filterByLanguage(diseases[0], lang);

    res.status(200).json({
      success: true,
      data: filteredDisease,
      message: getLocalizedMessage('تم جلب معلومات المرض الجلدي بنجاح', 'Skin disease information retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting skin disease info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات المرض الجلدي',
      error: error.message
    });
  }
};

// Create new skin disease info
const createSkinDiseaseInfo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: errors.array()
      });
    }

    const {
      title_ar,
      title_en,
      description_ar,
      description_en,
      website_link,
      is_active = true
    } = req.body;

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // تأكيد إن القيمة تتحول صح إلى 0 أو 1
    const activeValue =
      is_active === true ||
      is_active === 'true' ||
      is_active === 1 ||
      is_active === '1'
        ? 1
        : 0;

    const query = `
      INSERT INTO skin_diseases_info 
      (title_ar, title_en, description_ar, description_en, website_link, created_by, updated_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      title_ar,
      title_en,
      description_ar,
      description_en,
      website_link,
      adminId,
      adminId,
      activeValue
    ]);

    // Get the created info
    const [createdInfo] = await db.execute(
      'SELECT * FROM skin_diseases_info WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdInfo[0],
      message: 'تم إنشاء معلومات المرض الجلدي بنجاح'
    });
  } catch (error) {
    console.error('Error creating skin disease info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء معلومات المرض الجلدي',
      error: error.message
    });
  }
};


// Update skin disease info
const updateSkinDiseaseInfo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const diseaseId = safeParseInt(id, null);
    if (diseaseId === null || diseaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المرض الجلدي غير صحيح'
      });
    }

    const {
      title_ar,
      title_en,
      description_ar,
      description_en,
      website_link,
      is_active
    } = req.body;

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // Check if info exists
    const [existingInfo] = await db.execute(
      'SELECT id FROM skin_diseases_info WHERE id = ?',
      [diseaseId]
    );

    if (existingInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'معلومات المرض الجلدي غير موجودة'
      });
    }

    // تحويل is_active لقيمة رقمية ثابتة (0 أو 1)
    const activeValue =
      is_active === true ||
      is_active === 'true' ||
      is_active === 1 ||
      is_active === '1'
        ? 1
        : 0;

    const query = `
      UPDATE skin_diseases_info 
      SET title_ar = ?, title_en = ?, description_ar = ?, description_en = ?, 
          website_link = ?, updated_by = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.execute(query, [
      title_ar,
      title_en,
      description_ar,
      description_en,
      website_link,
      adminId,
      activeValue,
      diseaseId
    ]);

    // Get updated info
    const [updatedInfo] = await db.execute(
      'SELECT * FROM skin_diseases_info WHERE id = ?',
      [diseaseId]
    );

    res.status(200).json({
      success: true,
      data: updatedInfo[0],
      message: 'تم تحديث معلومات المرض الجلدي بنجاح'
    });
  } catch (error) {
    console.error('Error updating skin disease info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث معلومات المرض الجلدي',
      error: error.message
    });
  }
};


// Delete skin disease info
const deleteSkinDiseaseInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const diseaseId = safeParseInt(id, null);
    if (diseaseId === null || diseaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المرض الجلدي غير صحيح'
      });
    }

    // Check if info exists
    const [existingInfo] = await db.execute(
      'SELECT id FROM skin_diseases_info WHERE id = ?',
      [diseaseId]
    );

    if (existingInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'معلومات المرض الجلدي غير موجودة'
      });
    }

    await db.execute('DELETE FROM skin_diseases_info WHERE id = ?', [diseaseId]);

    res.status(200).json({
      success: true,
      message: 'تم حذف معلومات المرض الجلدي بنجاح'
    });
  } catch (error) {
    console.error('Error deleting skin disease info:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف معلومات المرض الجلدي',
      error: error.message
    });
  }
};

// Toggle active status
const toggleSkinDiseaseInfoStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const diseaseId = safeParseInt(id, null);
    if (diseaseId === null || diseaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المرض الجلدي غير صحيح'
      });
    }

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // Check if info exists and get current status
    const [existingInfo] = await db.execute(
      'SELECT id, is_active FROM skin_diseases_info WHERE id = ?',
      [diseaseId]
    );

    if (existingInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'معلومات المرض الجلدي غير موجودة'
      });
    }

    const newStatus = !existingInfo[0].is_active;
    const newStatusValue = newStatus ? 1 : 0;

    await db.execute(
      'UPDATE skin_diseases_info SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatusValue, adminId, diseaseId]
    );

    res.status(200).json({
      success: true,
      message: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} معلومات المرض الجلدي بنجاح`
    });
  } catch (error) {
    console.error('Error toggling skin disease info status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة معلومات المرض الجلدي',
      error: error.message
    });
  }
};

module.exports = {
  getAllSkinDiseasesInfo,
  getSkinDiseaseInfoById,
  createSkinDiseaseInfo,
  updateSkinDiseaseInfo,
  deleteSkinDiseaseInfo,
  toggleSkinDiseaseInfoStatus
};
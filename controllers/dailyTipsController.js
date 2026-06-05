const db = require('../config/db');
const { validationResult } = require('express-validator');
const { filterByLanguage, getLocalizedMessage } = require('../utils/langHelper');

// Helper function to safely parse integer with fallback
const safeParseInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Get all daily tips
const getAllDailyTips = async (req, res) => {
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
      query = `SELECT * FROM daily_tips WHERE is_active = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      params = [activeValue];
    } else {
      query = `SELECT * FROM daily_tips ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const [tips] = await db.execute(query, params);

    // Filter data based on language
    const filteredTips = filterByLanguage(tips, lang);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM daily_tips';
    let countParams = [];

    if (isActive !== undefined) {
      countQuery += ' WHERE is_active = ?';
      countParams.push(isActive === 'true' ? 1 : 0);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      success: true,
      data: filteredTips,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: getLocalizedMessage('تم جلب النصائح اليومية بنجاح', 'Daily tips retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting daily tips:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النصائح اليومية',
      error: error.message
    });
  }
};

// Get daily tip by ID
const getDailyTipById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.lang; // Language is set by langDetector middleware

    // Validate ID parameter
    const tipId = safeParseInt(id, null);
    if (tipId === null || tipId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف النصيحة غير صحيح'
      });
    }

    const query = 'SELECT * FROM daily_tips WHERE id = ?';

    const [tips] = await db.execute(query, [tipId]);

    if (tips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'النصيحة اليومية غير موجودة'
      });
    }

    // Filter data based on language
    const filteredTip = filterByLanguage(tips[0], lang);

    res.status(200).json({
      success: true,
      data: filteredTip,
      message: getLocalizedMessage('تم جلب النصيحة اليومية بنجاح', 'Daily tip retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting daily tip:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب النصيحة اليومية',
      error: error.message
    });
  }
};

// Create new daily tip
const createDailyTip = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'خطأ في البيانات المدخلة',
        errors: errors.array(),
      });
    }

    const {
      title_ar,
      title_en,
      description_ar,
      description_en,
      is_active = true,
    } = req.body;

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح',
      });
    }

    // تحويل آمن لقيمة is_active
    const activeValue =
      is_active === true ||
      is_active === 1 ||
      is_active === "1" ||
      is_active === "true"
        ? 1
        : 0;

    const query = `
      INSERT INTO daily_tips 
      (title_ar, title_en, description_ar, description_en, created_by, updated_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      title_ar,
      title_en,
      description_ar,
      description_en,
      adminId,
      adminId,
      activeValue,
    ]);

    // Get the created tip
    const [createdTip] = await db.execute(
      'SELECT * FROM daily_tips WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdTip[0],
      message: 'تم إنشاء النصيحة اليومية بنجاح',
    });
  } catch (error) {
    console.error('Error creating daily tip:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء النصيحة اليومية',
      error: error.message,
    });
  }
};


// Update daily tip
const updateDailyTip = async (req, res) => {
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
    const tipId = safeParseInt(id, null);
    if (tipId === null || tipId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف النصيحة غير صحيح'
      });
    }

    const {
      title_ar,
      title_en,
      description_ar,
      description_en,
      is_active
    } = req.body;

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // Check if tip exists
    const [existingTip] = await db.execute(
      'SELECT id FROM daily_tips WHERE id = ?',
      [tipId]
    );

    if (existingTip.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'النصيحة اليومية غير موجودة'
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
      UPDATE daily_tips 
      SET title_ar = ?, title_en = ?, description_ar = ?, description_en = ?, 
          updated_by = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.execute(query, [
      title_ar,
      title_en,
      description_ar,
      description_en,
      adminId,
      activeValue,
      tipId
    ]);

    // Get updated tip
    const [updatedTip] = await db.execute(
      'SELECT * FROM daily_tips WHERE id = ?',
      [tipId]
    );

    res.status(200).json({
      success: true,
      data: updatedTip[0],
      message: 'تم تحديث النصيحة اليومية بنجاح'
    });
  } catch (error) {
    console.error('Error updating daily tip:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث النصيحة اليومية',
      error: error.message
    });
  }
};


// Delete daily tip
const deleteDailyTip = async (req, res) => {
  try {
    const { id } = req.params;
    const tipId = safeParseInt(id, null);
    if (tipId === null || tipId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف النصيحة غير صحيح'
      });
    }

    // Check if tip exists
    const [existingTip] = await db.execute(
      'SELECT id FROM daily_tips WHERE id = ?',
      [tipId]
    );

    if (existingTip.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'النصيحة اليومية غير موجودة'
      });
    }

    await db.execute('DELETE FROM daily_tips WHERE id = ?', [tipId]);

    res.status(200).json({
      success: true,
      message: 'تم حذف النصيحة اليومية بنجاح'
    });
  } catch (error) {
    console.error('Error deleting daily tip:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف النصيحة اليومية',
      error: error.message
    });
  }
};

// Toggle active status
const toggleDailyTipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const tipId = safeParseInt(id, null);
    if (tipId === null || tipId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف النصيحة غير صحيح'
      });
    }

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // Check if tip exists and get current status
    const [existingTip] = await db.execute(
      'SELECT id, is_active FROM daily_tips WHERE id = ?',
      [tipId]
    );

    if (existingTip.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'النصيحة اليومية غير موجودة'
      });
    }

    const newStatus = !existingTip[0].is_active;
    const newStatusValue = newStatus ? 1 : 0;

    await db.execute(
      'UPDATE daily_tips SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatusValue, adminId, tipId]
    );

    res.status(200).json({
      success: true,
      message: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} النصيحة اليومية بنجاح`
    });
  } catch (error) {
    console.error('Error toggling daily tip status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة النصيحة اليومية',
      error: error.message
    });
  }
};

// Get latest daily tip
const getLatestDailyTip = async (req, res) => {
  try {
    const lang = req.lang; // Language is set by langDetector middleware

    const query = `
      SELECT dt.*, a1.email as created_by_email, a2.email as updated_by_email 
      FROM daily_tips dt 
      LEFT JOIN admins a1 ON dt.created_by = a1.id 
      LEFT JOIN admins a2 ON dt.updated_by = a2.id 
      WHERE dt.is_active = 1
      ORDER BY dt.created_at DESC 
      LIMIT 1
    `;

    const [tip] = await db.execute(query, []);

    if (tip.length === 0) {
      return res.status(404).json({
        success: false,
        message: getLocalizedMessage('لا توجد نصائح يومية مسجلة', 'No daily tips found', lang)
      });
    }

    // Filter data based on language
    const filteredTip = filterByLanguage(tip[0], lang);

    res.status(200).json({
      success: true,
      data: filteredTip,
      message: getLocalizedMessage('تم جلب آخر نصيحة يومية بنجاح', 'Latest daily tip retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error fetching latest daily tip:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم أثناء جلب آخر نصيحة يومية',
      error: error.message
    });
  }
};

module.exports = {
  getAllDailyTips,
  getDailyTipById,
  createDailyTip,
  updateDailyTip,
  deleteDailyTip,
  toggleDailyTipStatus,
  getLatestDailyTip
};
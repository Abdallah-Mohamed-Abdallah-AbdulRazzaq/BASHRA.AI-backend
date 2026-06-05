const db = require('../config/db');
const { validationResult } = require('express-validator');
const { filterByLanguage, getLocalizedMessage } = require('../utils/langHelper');

// Helper function to safely parse integer with fallback
const safeParseInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// Get all medical articles
const getAllMedicalArticles = async (req, res) => {
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
      query = `SELECT * FROM medical_articles WHERE is_active = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      params = [activeValue];
    } else {
      query = `SELECT * FROM medical_articles ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const [articles] = await db.execute(query, params);

    // Filter data based on language
    const filteredArticles = filterByLanguage(articles, lang);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM medical_articles';
    let countParams = [];

    if (isActive !== undefined) {
      countQuery += ' WHERE is_active = ?';
      countParams.push(isActive === 'true' ? 1 : 0);
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.status(200).json({
      success: true,
      data: filteredArticles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      message: getLocalizedMessage('تم جلب المقالات الطبية بنجاح', 'Medical articles retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting medical articles:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المقالات الطبية',
      error: error.message
    });
  }
};

// Get medical article by ID
const getMedicalArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.lang; // Language is set by langDetector middleware

    // Validate ID parameter
    const articleId = safeParseInt(id, null);
    if (articleId === null || articleId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقال غير صحيح'
      });
    }

    const query = 'SELECT * FROM medical_articles WHERE id = ?';

    const [articles] = await db.execute(query, [articleId]);

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المقال الطبي غير موجود'
      });
    }

    // Filter data based on language
    const filteredArticle = filterByLanguage(articles[0], lang);

    res.status(200).json({
      success: true,
      data: filteredArticle,
      message: getLocalizedMessage('تم جلب المقال الطبي بنجاح', 'Medical article retrieved successfully', lang)
    });
  } catch (error) {
    console.error('Error getting medical article:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المقال الطبي',
      error: error.message
    });
  }
};

// Create new medical article
const createMedicalArticle = async (req, res) => {
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
      sub_title_ar,
      sub_title_en,
      description_ar,
      description_en,
      is_active = true
    } = req.body;

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // تحويل القيمة لتكون دايمًا رقم صحيح 0 أو 1
    const activeValue =
      is_active === true ||
      is_active === 'true' ||
      is_active === 1 ||
      is_active === '1'
        ? 1
        : 0;

    const query = `
      INSERT INTO medical_articles 
      (title_ar, title_en, sub_title_ar, sub_title_en, description_ar, description_en, created_by, updated_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      title_ar,
      title_en,
      sub_title_ar,
      sub_title_en,
      description_ar,
      description_en,
      adminId,
      adminId,
      activeValue
    ]);

    // Get the created article
    const [createdArticle] = await db.execute(
      'SELECT * FROM medical_articles WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: createdArticle[0],
      message: 'تم إنشاء المقال الطبي بنجاح'
    });
  } catch (error) {
    console.error('Error creating medical article:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء المقال الطبي',
      error: error.message
    });
  }
};


// Update medical article
const updateMedicalArticle = async (req, res) => {
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
    const articleId = safeParseInt(id, null);
    if (articleId === null || articleId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقال غير صحيح'
      });
    }

    const {
      title_ar,
      title_en,
      sub_title_ar,
      sub_title_en,
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

    // Check if article exists
    const [existingArticle] = await db.execute(
      'SELECT id FROM medical_articles WHERE id = ?',
      [articleId]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المقال الطبي غير موجود'
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
      UPDATE medical_articles 
      SET title_ar = ?, title_en = ?, sub_title_ar = ?, sub_title_en = ?, 
          description_ar = ?, description_en = ?, updated_by = ?, is_active = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.execute(query, [
      title_ar,
      title_en,
      sub_title_ar,
      sub_title_en,
      description_ar,
      description_en,
      adminId,
      activeValue,
      articleId
    ]);

    // Get updated article
    const [updatedArticle] = await db.execute(
      'SELECT * FROM medical_articles WHERE id = ?',
      [articleId]
    );

    res.status(200).json({
      success: true,
      data: updatedArticle[0],
      message: 'تم تحديث المقال الطبي بنجاح'
    });
  } catch (error) {
    console.error('Error updating medical article:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المقال الطبي',
      error: error.message
    });
  }
};


// Delete medical article
const deleteMedicalArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const articleId = safeParseInt(id, null);
    if (articleId === null || articleId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقال غير صحيح'
      });
    }

    // Check if article exists
    const [existingArticle] = await db.execute(
      'SELECT id FROM medical_articles WHERE id = ?',
      [articleId]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المقال الطبي غير موجود'
      });
    }

    await db.execute('DELETE FROM medical_articles WHERE id = ?', [articleId]);

    res.status(200).json({
      success: true,
      message: 'تم حذف المقال الطبي بنجاح'
    });
  } catch (error) {
    console.error('Error deleting medical article:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المقال الطبي',
      error: error.message
    });
  }
};

// Toggle active status
const toggleMedicalArticleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const articleId = safeParseInt(id, null);
    if (articleId === null || articleId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف المقال غير صحيح'
      });
    }

    const adminId = parseInt(req.user.id, 10);
    if (isNaN(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'معرف المدير غير صحيح'
      });
    }

    // Check if article exists and get current status
    const [existingArticle] = await db.execute(
      'SELECT id, is_active FROM medical_articles WHERE id = ?',
      [articleId]
    );

    if (existingArticle.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'المقال الطبي غير موجود'
      });
    }

    const newStatus = !existingArticle[0].is_active;
    const newStatusValue = newStatus ? 1 : 0;

    await db.execute(
      'UPDATE medical_articles SET is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatusValue, adminId, articleId]
    );

    res.status(200).json({
      success: true,
      message: `تم ${newStatus ? 'تفعيل' : 'إلغاء تفعيل'} المقال الطبي بنجاح`
    });
  } catch (error) {
    console.error('Error toggling medical article status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تغيير حالة المقال الطبي',
      error: error.message
    });
  }
};

module.exports = {
  getAllMedicalArticles,
  getMedicalArticleById,
  createMedicalArticle,
  updateMedicalArticle,
  deleteMedicalArticle,
  toggleMedicalArticleStatus
};
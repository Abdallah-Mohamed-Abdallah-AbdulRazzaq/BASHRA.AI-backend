const express = require('express');
const router = express.Router();
const HealthTipsService = require('../services/HealthTipsService');

// Import middleware
const {
  authenticateJWT,
  authorizeAnyAdmin,
  authorizeDoctorOrAssistant,
  authorizeUserOrDoctorOrAssistant
} = require('../middleware/authMiddleware');

const { parseFormData } = require('../middleware/formDataMiddleware');

const {
  logHealthTipsActivity,
  sanitizeHealthTipsData
} = require('../middleware/healthTipsMiddleware');

// ================================
// Advanced Routes
// ================================

// Get health tips statistics (dashboard)
router.get('/statistics', 
  authenticateJWT, 
  authorizeAnyAdmin,
  logHealthTipsActivity('VIEW_STATISTICS'), 
  async (req, res) => {
    try {
      const stats = await HealthTipsService.getHealthTipsStatistics();
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'تم جلب الإحصائيات بنجاح'
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Search across all health tips content
router.get('/search', 
  authenticateJWT,
  authorizeUserOrDoctorOrAssistant,
  logHealthTipsActivity('SEARCH_CONTENT'),
  async (req, res) => {
    try {
      const { q: searchTerm, page = 1, limit = 20 } = req.query;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'يجب أن يكون مصطلح البحث على الأقل حرفين'
        });
      }

      const offset = (page - 1) * limit;
      const results = await HealthTipsService.searchHealthTips(
        searchTerm.trim(), 
        parseInt(limit), 
        parseInt(offset)
      );

      res.status(200).json({
        success: true,
        data: results.results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.total,
          pages: Math.ceil(results.total / limit)
        },
        breakdown: results.breakdown,
        search_term: searchTerm,
        message: `تم العثور على ${results.total} نتيجة`
      });
    } catch (error) {
      console.error('Error searching health tips:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get recent health tips (mixed content)
router.get('/recent', 
  authenticateJWT,
  authorizeUserOrDoctorOrAssistant,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const recentTips = await HealthTipsService.getRecentHealthTips(parseInt(limit));

      res.status(200).json({
        success: true,
        data: recentTips,
        message: 'تم جلب النصائح الحديثة بنجاح'
      });
    } catch (error) {
      console.error('Error getting recent tips:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Get health tips by specific admin
router.get('/by-admin/:adminId', 
  authenticateJWT, 
  authorizeAnyAdmin,
  async (req, res) => {
    try {
      const { adminId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const result = await HealthTipsService.getHealthTipsByAdmin(
        parseInt(adminId), 
        parseInt(limit), 
        parseInt(offset)
      );

      res.status(200).json({
        success: true,
        data: result.content,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          pages: Math.ceil(result.total / limit)
        },
        breakdown: result.breakdown,
        message: 'تم جلب محتوى الأدمن بنجاح'
      });
    } catch (error) {
      console.error('Error getting admin content:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Bulk update status
router.patch('/bulk-status', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  logHealthTipsActivity('BULK_UPDATE_STATUS'),
  async (req, res) => {
    try {
      const { ids, type, status } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'يجب تحديد معرفات صحيحة'
        });
      }

      if (!['daily_tip', 'medical_article', 'skin_disease'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المحتوى غير صحيح'
        });
      }

      if (typeof status !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'حالة التفعيل يجب أن تكون true أو false'
        });
      }

      const adminId = req.user.id;
      const affectedRows = await HealthTipsService.bulkUpdateStatus(ids, type, status, adminId);

      res.status(200).json({
        success: true,
        message: `تم تحديث ${affectedRows} عنصر بنجاح`,
        affected_rows: affectedRows
      });
    } catch (error) {
      console.error('Error bulk updating status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Export health tips data
router.get('/export', 
  authenticateJWT, 
  authorizeAnyAdmin,
  logHealthTipsActivity('EXPORT_DATA'),
  async (req, res) => {
    try {
      const { type = 'all', is_active, format = 'json' } = req.query;
      
      const data = await HealthTipsService.getHealthTipsForExport(
        type, 
        is_active !== undefined ? (is_active === 'true') : null
      );

      if (format === 'json') {
        res.status(200).json({
          success: true,
          data: data,
          export_info: {
            type,
            is_active,
            exported_at: new Date().toISOString(),
            exported_by: req.user.email
          },
          message: 'تم تصدير البيانات بنجاح'
        });
      } else {
        // Future: CSV export functionality can be added here
        res.status(400).json({
          success: false,
          message: 'صيغة التصدير غير مدعومة حالياً'
        });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Validate health tip data (utility endpoint)
router.post('/validate', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  sanitizeHealthTipsData,
  async (req, res) => {
    try {
      const { data, type } = req.body;
      
      if (!data || !type) {
        return res.status(400).json({
          success: false,
          message: 'البيانات ونوع المحتوى مطلوبان'
        });
      }

      const errors = HealthTipsService.validateHealthTipData(data, type);

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'البيانات غير صحيحة',
          errors: errors
        });
      }

      res.status(200).json({
        success: true,
        message: 'البيانات صحيحة'
      });
    } catch (error) {
      console.error('Error validating data:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من البيانات'
      });
    }
  }
);

module.exports = router;
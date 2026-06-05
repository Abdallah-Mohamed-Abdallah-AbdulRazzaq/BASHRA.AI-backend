const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAllDailyTips,
  getDailyTipById,
  createDailyTip,
  updateDailyTip,
  deleteDailyTip,
  toggleDailyTipStatus,
  getLatestDailyTip
} = require('../controllers/dailyTipsController');

const {
  getAllMedicalArticles,
  getMedicalArticleById,
  createMedicalArticle,
  updateMedicalArticle,
  deleteMedicalArticle,
  toggleMedicalArticleStatus
} = require('../controllers/medicalArticlesController');

const {
  getAllSkinDiseasesInfo,
  getSkinDiseaseInfoById,
  createSkinDiseaseInfo,
  updateSkinDiseaseInfo,
  deleteSkinDiseaseInfo,
  toggleSkinDiseaseInfoStatus
} = require('../controllers/skinDiseasesController');

// Import validations
const {
  validateCreateDailyTip,
  validateUpdateDailyTip,
  validateCreateMedicalArticle,
  validateUpdateMedicalArticle,
  validateCreateSkinDiseaseInfo,
  validateUpdateSkinDiseaseInfo
} = require('../validations/healthTipsValidation');

const { parseFormData } = require('../middleware/formDataMiddleware');

// Import middleware (تأكد من صحة المسارات)
const {
  authenticateJWT,
  authorizeAnyAdmin,
  authorizeDoctorOrAssistant,
  authorizeUserOrDoctorOrAssistant
} = require('../middleware/authMiddleware');

// ================================
// Daily Tips Routes
// ================================

// Get all daily tips (accessible by any authenticated user with permission)
router.get('/daily-tips', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getAllDailyTips
);

// Get all active daily tips only
router.get('/daily-tips/active', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  (req, res, next) => {
    req.query.is_active = 'true';
    next();
  },
  getAllDailyTips
);

// Get latest daily tip
router.get('/daily-tips/latest', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getLatestDailyTip
);

// Get daily tip by ID
router.get('/daily-tips/:id', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getDailyTipById
);

// Create daily tip (admin only)
router.post('/daily-tips', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateCreateDailyTip, 
  createDailyTip
);

// Update daily tip (admin only)
router.put('/daily-tips/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateUpdateDailyTip, 
  updateDailyTip
);

// Delete daily tip (admin only)
router.delete('/daily-tips/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  deleteDailyTip
);

// Toggle daily tip status (admin only)
router.patch('/daily-tips/:id/toggle-status', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  toggleDailyTipStatus
);

// ================================
// Medical Articles Routes
// ================================

// Get all medical articles
router.get('/medical-articles', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getAllMedicalArticles
);

// Get all active medical articles only
router.get('/medical-articles/active', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  (req, res, next) => {
    req.query.is_active = 'true';
    next();
  },
  getAllMedicalArticles
);

// Get medical article by ID
router.get('/medical-articles/:id', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getMedicalArticleById
);

// Create medical article (admin only)
router.post('/medical-articles', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateCreateMedicalArticle, 
  createMedicalArticle
);

// Update medical article (admin only)
router.put('/medical-articles/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateUpdateMedicalArticle, 
  updateMedicalArticle
);

// Delete medical article (admin only)
router.delete('/medical-articles/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  deleteMedicalArticle
);

// Toggle medical article status (admin only)
router.patch('/medical-articles/:id/toggle-status', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  toggleMedicalArticleStatus
);

// ================================
// Skin Diseases Info Routes
// ================================

// Get all skin diseases info
router.get('/skin-diseases', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getAllSkinDiseasesInfo
);

// Get all active skin diseases info only
router.get('/skin-diseases/active', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  (req, res, next) => {
    req.query.is_active = 'true';
    next();
  },
  getAllSkinDiseasesInfo
);

// Get skin disease info by ID
router.get('/skin-diseases/:id', 
  // authenticateJWT, 
  // authorizeUserOrDoctorOrAssistant, 
  getSkinDiseaseInfoById
);

// Create skin disease info (admin only)
router.post('/skin-diseases', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateCreateSkinDiseaseInfo, 
  createSkinDiseaseInfo
);

// Update skin disease info (admin only)
router.put('/skin-diseases/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  parseFormData,
  validateUpdateSkinDiseaseInfo, 
  updateSkinDiseaseInfo
);

// Delete skin disease info (admin only)
router.delete('/skin-diseases/:id', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  deleteSkinDiseaseInfo
);

// Toggle skin disease info status (admin only)
router.patch('/skin-diseases/:id/toggle-status', 
  authenticateJWT, 
  authorizeAnyAdmin, 
  toggleSkinDiseaseInfoStatus
);

module.exports = router;
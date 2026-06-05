const express = require('express');
const router = express.Router();
const PatientMedicalRecordsController = require('../controllers/patientMedicalRecordsController');
const { authenticateJWT, authorizeUser } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Patient Medical Records Routes
 * مسارات السجلات الطبية للمرضى
 * Base: /api/patient/medical-records
 */

// All routes require authentication and user authorization
router.use(authenticateJWT, authorizeUser, checkAccountActive, parseFormData);

/**
 * @route   GET /api/patient/medical-records/summary
 * @desc    Get medical records summary and statistics
 * @access  Private (Patient only)
 */
router.get('/summary', PatientMedicalRecordsController.getMedicalRecordsSummary);

/**
 * @route   GET /api/patient/medical-records
 * @desc    Get patient's own medical records (final only)
 * @access  Private (Patient only)
 * @query   doctor_id (optional) - Filter by doctor
 * @query   from_date (optional) - YYYY-MM-DD
 * @query   to_date (optional) - YYYY-MM-DD
 * @query   page (optional) - Page number (default: 1)
 * @query   limit (optional) - Records per page (default: 20)
 */
router.get('/', PatientMedicalRecordsController.getMyMedicalRecords);

/**
 * @route   GET /api/patient/medical-records/:id
 * @desc    Get single medical record details (final only)
 * @access  Private (Patient only)
 * @param   id - Medical record ID or UUID
 */
router.get('/:id', PatientMedicalRecordsController.getMedicalRecordById);

module.exports = router;

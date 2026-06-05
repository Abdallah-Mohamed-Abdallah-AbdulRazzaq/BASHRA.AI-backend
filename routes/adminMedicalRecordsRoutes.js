const express = require('express');
const router = express.Router();
const AdminMedicalRecordsController = require('../controllers/adminMedicalRecordsController');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Admin Medical Records Routes
 * مسارات السجلات الطبية للإداريين
 * Base: /api/admin/medical-records
 */

// All routes require authentication and admin authorization
router.use(authenticateJWT, authorizeAdmin, parseFormData);

/**
 * @route   GET /api/admin/medical-records/statistics
 * @desc    Get medical records statistics
 * @access  Private (Admin only)
 * @query   from_date (optional) - YYYY-MM-DD
 * @query   to_date (optional) - YYYY-MM-DD
 * @query   doctor_id (optional) - Filter by doctor
 */
router.get('/statistics', AdminMedicalRecordsController.getStatistics);

/**
 * @route   GET /api/admin/medical-records/patient/:patient_id/history
 * @desc    Get patient's complete medical history
 * @access  Private (Admin only)
 * @param   patient_id - Patient ID
 */
router.get('/patient/:patient_id/history', AdminMedicalRecordsController.getPatientMedicalHistory);

/**
 * @route   GET /api/admin/medical-records
 * @desc    Get all medical records
 * @access  Private (Admin only)
 * @query   patient_id (optional) - Filter by patient
 * @query   doctor_id (optional) - Filter by doctor
 * @query   record_status (optional) - draft|final|amended
 * @query   from_date (optional) - YYYY-MM-DD
 * @query   to_date (optional) - YYYY-MM-DD
 * @query   page (optional) - Page number (default: 1)
 * @query   limit (optional) - Records per page (default: 20)
 */
router.get('/', AdminMedicalRecordsController.getAllMedicalRecords);

/**
 * @route   GET /api/admin/medical-records/:id
 * @desc    Get single medical record details
 * @access  Private (Admin only)
 * @param   id - Medical record ID or UUID
 */
router.get('/:id', AdminMedicalRecordsController.getMedicalRecordById);

/**
 * @route   DELETE /api/admin/medical-records/:id
 * @desc    Delete medical record permanently
 * @access  Private (Admin only)
 * @param   id - Medical record ID or UUID
 */
router.delete('/:id', AdminMedicalRecordsController.deleteMedicalRecord);

module.exports = router;

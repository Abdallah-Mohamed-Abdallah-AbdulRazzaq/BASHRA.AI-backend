const express = require('express');
const router = express.Router();
const DoctorMedicalRecordsController = require('../controllers/doctorMedicalRecordsController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Medical Records Routes
 * مسارات السجلات الطبية للأطباء
 * Base: /api/doctor/medical-records
 */

// All routes require authentication and doctor authorization
router.use(authenticateJWT, authorizeDoctor, checkAccountActive, parseFormData);

/**
 * @route   POST /api/doctor/medical-records
 * @desc    Create medical record
 * @access  Private (Doctor only)
 * @body    appointment_id (required) - Appointment ID
 * @body    patient_id (required) - Patient ID
 * @body    next_appointment_recommended (optional) - Boolean
 * @body    follow_up_date (optional) - YYYY-MM-DD
 * @body    vital_signs (optional) - JSON object
 * @body    skin_condition_severity (optional) - mild|moderate|severe
 * @body    affected_body_areas (optional) - JSON array
 * @body    treatment_response (optional) - excellent|good|fair|poor|unknown
 * @body    patient_consent (optional) - Boolean
 * @body    record_status (optional) - draft|final|amended
 * @body    translations (optional) - Object with language codes as keys
 */
router.post('/', DoctorMedicalRecordsController.createMedicalRecord);

/**
 * @route   GET /api/doctor/medical-records
 * @desc    Get doctor's medical records
 * @access  Private (Doctor only)
 * @query   patient_id (optional) - Filter by patient
 * @query   record_status (optional) - draft|final|amended
 * @query   from_date (optional) - YYYY-MM-DD
 * @query   to_date (optional) - YYYY-MM-DD
 * @query   page (optional) - Page number (default: 1)
 * @query   limit (optional) - Records per page (default: 20)
 */
router.get('/', DoctorMedicalRecordsController.getMyMedicalRecords);

/**
 * @route   GET /api/doctor/medical-records/patient/:patient_id/history
 * @desc    Get patient's medical history
 * @access  Private (Doctor only)
 * @param   patient_id - Patient ID
 */
router.get('/patient/:patient_id/history', DoctorMedicalRecordsController.getPatientMedicalHistory);

/**
 * @route   GET /api/doctor/medical-records/:id
 * @desc    Get single medical record details
 * @access  Private (Doctor only)
 * @param   id - Medical record ID or UUID
 */
router.get('/:id', DoctorMedicalRecordsController.getMedicalRecordById);

/**
 * @route   PUT /api/doctor/medical-records/:id
 * @desc    Update medical record
 * @access  Private (Doctor only)
 * @param   id - Medical record ID or UUID
 * @body    next_appointment_recommended (optional) - Boolean
 * @body    follow_up_date (optional) - YYYY-MM-DD
 * @body    vital_signs (optional) - JSON object
 * @body    skin_condition_severity (optional) - mild|moderate|severe
 * @body    affected_body_areas (optional) - JSON array
 * @body    treatment_response (optional) - excellent|good|fair|poor|unknown
 * @body    patient_consent (optional) - Boolean
 * @body    record_status (optional) - draft|final|amended
 * @body    translations (optional) - Object with language codes as keys
 */
router.put('/:id', DoctorMedicalRecordsController.updateMedicalRecord);

/**
 * @route   DELETE /api/doctor/medical-records/:id
 * @desc    Delete medical record (draft only)
 * @access  Private (Doctor only)
 * @param   id - Medical record ID or UUID
 */
router.delete('/:id', DoctorMedicalRecordsController.deleteMedicalRecord);

module.exports = router;

const express = require('express');
const router = express.Router();
const PatientProfileController = require('../controllers/patientProfileController');
const { 
  authenticateJWT, 
  authorizeUser,
  authorizeAnyAdmin,
  authorizeDoctorOrAssistant,
  authorizeRole
} = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  validateCreatePatientProfile, 
  validateUpdatePatientProfile 
} = require('../validations/patientProfileValidation');

/**
 * Patient Profile Routes
 * مسارات ملفات المرضى
 * Base path: /api/patient-profiles
 * 
 * Note: Patient profiles are linked to users (patients)
 * ملاحظة: ملفات المرضى مرتبطة بالمستخدمين (المرضى)
 */

// Routes for Admin, Doctor, Assistant (must be before user routes)
/**
 * @route   GET /api/patient-profiles/all
 * @desc    Get all patient profiles with pagination and search (Admin only)
 * @access  Private (Admin only)
 * @query   page: number, limit: number, search: string
 */
router.get(
  '/all',
  authenticateJWT,
  authorizeAnyAdmin,
  checkAccountActive,
  PatientProfileController.getAllPatientProfiles
);

/**
 * @route   GET /api/patient-profiles/patient/:userId
 * @desc    Get patient profile by user ID (Doctor, Admin, Assistant)
 * @access  Private (Doctor, Admin, Assistant)
 * @params  userId: number
 */
router.get(
  '/patient/:userId',
  authenticateJWT,
  authorizeRole(['admin', 'doctor', 'assistant']),
  checkAccountActive,
  PatientProfileController.getPatientProfileByUserId
);

// All routes below require authentication and user role
router.use(authenticateJWT);
router.use(authorizeUser);
router.use(checkAccountActive);

/**
 * @route   POST /api/patient-profiles
 * @desc    Create patient profile for current user
 * @access  Private (User only)
 * @body    {
 *            blood_type: "A+|A-|B+|B-|AB+|AB-|O+|O-|unknown",
 *            height: number,
 *            weight: number,
 *            smoking_status: "never|former|current|unknown",
 *            alcohol_consumption: "never|rarely|occasionally|regularly|unknown",
 *            exercise_frequency: "never|rarely|sometimes|regularly|daily|unknown",
 *            insurance_provider: "string",
 *            insurance_policy_number: "string",
 *            preferred_doctor_id: number,
 *            medical_history_ar: "string",
 *            current_medications_ar: "string",
 *            allergies_ar: "string",
 *            chronic_conditions_ar: "string",
 *            family_medical_history_ar: "string",
 *            medical_history_en: "string",
 *            current_medications_en: "string",
 *            allergies_en: "string",
 *            chronic_conditions_en: "string",
 *            family_medical_history_en: "string"
 *          }
 */
router.post(
  '/',
  parseFormData,
  validateCreatePatientProfile,
  PatientProfileController.createPatientProfile
);

/**
 * @route   GET /api/patient-profiles
 * @desc    Get patient profile for current user (with translation for current language)
 * @access  Private (User only)
 * @headers Accept-Language: ar|en
 */
router.get(
  '/',
  parseFormData,
  PatientProfileController.getPatientProfile
);

/**
 * @route   GET /api/patient-profiles/complete
 * @desc    Get complete patient profile with all translations
 * @access  Private (User only)
 */
router.get(
  '/complete',
  PatientProfileController.getCompletePatientProfile
);

/**
 * @route   PUT /api/patient-profiles
 * @desc    Update patient profile for current user
 * @access  Private (User only)
 * @body    {
 *            blood_type: "A+|A-|B+|B-|AB+|AB-|O+|O-|unknown",
 *            height: number,
 *            weight: number,
 *            smoking_status: "never|former|current|unknown",
 *            alcohol_consumption: "never|rarely|occasionally|regularly|unknown",
 *            exercise_frequency: "never|rarely|sometimes|regularly|daily|unknown",
 *            insurance_provider: "string",
 *            insurance_policy_number: "string",
 *            preferred_doctor_id: number,
 *            medical_history_ar: "string",
 *            current_medications_ar: "string",
 *            allergies_ar: "string",
 *            chronic_conditions_ar: "string",
 *            family_medical_history_ar: "string",
 *            medical_history_en: "string",
 *            current_medications_en: "string",
 *            allergies_en: "string",
 *            chronic_conditions_en: "string",
 *            family_medical_history_en: "string"
 *          }
 */
router.put(
  '/',
  parseFormData,
  validateUpdatePatientProfile,
  PatientProfileController.updatePatientProfile
);

/**
 * @route   DELETE /api/patient-profiles
 * @desc    Delete patient profile for current user
 * @access  Private (User only)
 */
router.delete(
  '/',
  PatientProfileController.deletePatientProfile
);

module.exports = router;

const express = require('express');
const router = express.Router();
const ProfileDoctorController = require('../controllers/profileDoctorController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { uploadProfilePictureMiddleware } = require('../middleware/uploadMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Profile Doctor Routes
 * مسارات الملفات الشخصية للأطباء
 * Base path: /api/profile-doctor
 */

// All routes require authentication
router.use(authenticateJWT, authorizeDoctor);

// Check if account is active (allows /reactivate even if is_active = 0)
router.use(checkAccountActive);

/**
 * @route   GET /api/profile-doctor
 * @desc    Get current doctor profile
 * @access  Private (Doctor only)
 */
router.get('/', parseFormData, ProfileDoctorController.getProfile);

/**
 * @route   GET /api/profile-doctor/basic
 * @desc    Get basic doctor data (selected fields only from doctors, doctor_profiles, and doctor_profile_translations)
 * @access  Private (Doctor only)
 */
router.get('/basic', ProfileDoctorController.getBasicDoctorData);

/**
 * @route   PUT /api/profile-doctor/basic
 * @desc    Update basic doctor data (email, phone, profile fields, and translations for current language)
 * @access  Private (Doctor only)
 * @body    {
 *            email: "string",
 *            phone: "string",
 *            years_of_experience: number,
 *            medical_school: "string",
 *            graduation_year: number,
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            full_name: "string",
 *            specialty: "string",
 *            sub_specialty: "string",
 *            biography: "string",
 *            emergency_contact_name: "string",
 *            emergency_contact_relationship: "string"
 *          }
 */
router.put('/basic', parseFormData, ProfileDoctorController.updateBasicDoctorData);

/**
 * @route   GET /api/profile-doctor/complete
 * @desc    Get complete doctor data (account + profile + all translations)
 * @access  Private (Doctor only)
 */
router.get('/complete', ProfileDoctorController.getCompleteDoctorData);

/**
 * @route   PUT /api/profile-doctor
 * @desc    Update current doctor profile
 * @access  Private (Doctor only)
 * @body    {
 *            years_of_experience: number,
 *            medical_school: "string",
 *            graduation_year: number,
 *            board_certifications: ["string"],
 *            languages_spoken: ["string"],
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            full_name: "string",
 *            specialty: "string",
 *            sub_specialty: "string",
 *            biography: "string",
 *            emergency_contact_name: "string",
 *            emergency_contact_relationship: "string"
 *          }
 *          OR (for multi-language updates):
 *          {
 *            years_of_experience: number,
 *            ...other profile fields...,
 *            translations: {
 *              ar: {
 *                full_name: "string",
 *                specialty: "string",
 *                sub_specialty: "string",
 *                biography: "string",
 *                emergency_contact_name: "string",
 *                emergency_contact_relationship: "string"
 *              },
 *              en: {
 *                full_name: "string",
 *                specialty: "string",
 *                sub_specialty: "string",
 *                biography: "string",
 *                emergency_contact_name: "string",
 *                emergency_contact_relationship: "string"
 *              }
 *            }
 *          }
 */
router.put('/', parseFormData, ProfileDoctorController.updateProfile);

/**
 * @route   POST /api/profile-doctor/picture
 * @desc    Upload profile picture
 * @access  Private (Doctor only)
 * @body    FormData with field name: profile_picture
 */
router.post('/picture', uploadProfilePictureMiddleware, ProfileDoctorController.uploadProfilePicture);

/**
 * @route   DELETE /api/profile-doctor/picture
 * @desc    Delete profile picture
 * @access  Private (Doctor only)
 */
router.delete('/picture', ProfileDoctorController.deleteProfilePicture);

/**
 * @route   DELETE /api/profile-doctor
 * @desc    Deactivate doctor account
 * @access  Private (Doctor only)
 */
router.delete('/', ProfileDoctorController.deleteProfile);

/**
 * @route   PATCH /api/profile-doctor/reactivate
 * @desc    Reactivate deactivated doctor account
 * @access  Private (Doctor only)
 */
router.patch('/reactivate', ProfileDoctorController.reactivateProfile);

module.exports = router;

const express = require('express');
const router = express.Router();
const ProfileAdminController = require('../controllers/profileAdminController');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { uploadProfilePictureMiddleware } = require('../middleware/uploadMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Profile Admin Routes
 * مسارات الملفات الشخصية للمسؤولين
 * Base path: /api/profile-admin
 */

// All routes require authentication and admin role
router.use(authenticateJWT, authorizeAdmin);

// Check if account is active (allows /reactivate even if is_active = 0)
router.use(checkAccountActive);

/**
 * @route   GET /api/profile-admin
 * @desc    Get current admin profile
 * @access  Private (Admin only)
 */
router.get('/', parseFormData, ProfileAdminController.getProfile);

/**
 * @route   GET /api/profile-admin/complete
 * @desc    Get complete admin data (account + profile + all translations)
 * @access  Private (Admin only)
 */
router.get('/complete', ProfileAdminController.getCompleteAdminData);

/**
 * @route   PUT /api/profile-admin
 * @desc    Update current admin profile
 * @access  Private (Admin only)
 * @body    {
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            full_name: "string",
 *            job_title: "string",
 *            department: "string",
 *            emergency_contact_name: "string",
 *            emergency_contact_relationship: "string",
 *            translations: { ar: {...}, en: {...} }
 *          }
 */
router.put('/', parseFormData, ProfileAdminController.updateProfile);

/**
 * @route   POST /api/profile-admin/picture
 * @desc    Upload profile picture
 * @access  Private (Admin only)
 * @body    FormData with field name: profile_picture
 */
router.post('/picture', uploadProfilePictureMiddleware, ProfileAdminController.uploadProfilePicture);

/**
 * @route   DELETE /api/profile-admin/picture
 * @desc    Delete profile picture
 * @access  Private (Admin only)
 */
router.delete('/picture', ProfileAdminController.deleteProfilePicture);

/**
 * @route   DELETE /api/profile-admin
 * @desc    Deactivate admin account
 * @access  Private (Admin only)
 */
router.delete('/', ProfileAdminController.deleteProfile);

/**
 * @route   PATCH /api/profile-admin/reactivate
 * @desc    Reactivate deactivated admin account
 * @access  Private (Admin only)
 */
router.patch('/reactivate', ProfileAdminController.reactivateProfile);

module.exports = router;

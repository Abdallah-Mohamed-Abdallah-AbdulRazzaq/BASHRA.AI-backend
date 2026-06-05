const express = require('express');
const router = express.Router();
const ProfileUserController = require('../controllers/profileUserController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { uploadProfilePictureMiddleware } = require('../middleware/uploadMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Profile User Routes
 * مسارات الملفات الشخصية للمستخدمين
 * Base path: /api/profile-user
 */

// All routes require authentication
router.use(authenticateJWT);

// Check if account is active (allows /reactivate even if is_active = 0)
router.use(checkAccountActive);

/**
 * @route   GET /api/profile-user
 * @desc    Get current user profile
 * @access  Private (User only)
 */
router.get('/', parseFormData, ProfileUserController.getProfile);

/**
 * @route   GET /api/profile-user/basic
 * @desc    Get basic user data (selected fields only from users, user_profiles, and user_profile_translations)
 * @access  Private (User only)
 */
router.get('/basic', ProfileUserController.getBasicUserData);

/**
 * @route   PUT /api/profile-user/basic
 * @desc    Update basic user data (email, phone, profile fields, and translations for current language)
 * @access  Private (User only)
 * @body    {
 *            email: "string",
 *            phone: "string",
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            full_name: "string",
 *            emergency_contact_name: "string",
 *            emergency_contact_relationship: "string"
 *          }
 */
router.put('/basic', parseFormData, ProfileUserController.updateBasicUserData);

/**
 * @route   GET /api/profile-user/complete
 * @desc    Get complete user data (account + profile + all translations)
 * @access  Private (User only)
 */
router.get('/complete', ProfileUserController.getCompleteUserData);

/**
 * @route   PUT /api/profile-user
 * @desc    Update current user profile
 * @access  Private (User only)
 * @body    {
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            full_name: "string",
 *            emergency_contact_name: "string",
 *            emergency_contact_relationship: "string"
 *          }
 *          OR (for multi-language updates):
 *          {
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            translations: {
 *              ar: {
 *                full_name: "string",
 *                emergency_contact_name: "string",
 *                emergency_contact_relationship: "string"
 *              },
 *              en: {
 *                full_name: "string",
 *                emergency_contact_name: "string",
 *                emergency_contact_relationship: "string"
 *              }
 *            }
 *          }
 */
router.put('/', parseFormData, ProfileUserController.updateProfile);

/**
 * @route   POST /api/profile-user/picture
 * @desc    Upload profile picture
 * @access  Private (User only)
 * @body    FormData with field name: profile_picture
 */
router.post('/picture', uploadProfilePictureMiddleware, ProfileUserController.uploadProfilePicture);

/**
 * @route   DELETE /api/profile-user/picture
 * @desc    Delete profile picture
 * @access  Private (User only)
 */
router.delete('/picture', ProfileUserController.deleteProfilePicture);

/**
 * @route   DELETE /api/profile-user
 * @desc    Suspend user account
 * @access  Private (User only)
 */
router.delete('/', ProfileUserController.deleteProfile);

/**
 * @route   PATCH /api/profile-user/reactivate
 * @desc    Reactivate suspended or inactive user account
 * @access  Private (User only)
 */
router.patch('/reactivate', ProfileUserController.reactivateProfile);

module.exports = router;

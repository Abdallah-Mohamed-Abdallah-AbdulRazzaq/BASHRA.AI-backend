const express = require('express');
const router = express.Router();
const ProfileAssistantController = require('../controllers/profileAssistantController');
const { authenticateJWT, authorizeAssistant } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { uploadProfilePictureMiddleware } = require('../middleware/uploadMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Profile Assistant Routes
 * مسارات الملفات الشخصية للمساعدين
 * Base path: /api/profile-assistant
 */

// All routes require authentication and assistant role
router.use(authenticateJWT, authorizeAssistant);

// Check if account is active
router.use(checkAccountActive);

/**
 * @route   GET /api/profile-assistant
 * @desc    Get current assistant profile
 * @access  Private (Assistant only)
 */
router.get('/', parseFormData, ProfileAssistantController.getProfile);

/**
 * @route   GET /api/profile-assistant/complete
 * @desc    Get complete assistant data
 * @access  Private (Assistant only)
 */
router.get('/complete', ProfileAssistantController.getCompleteAssistantData);

/**
 * @route   PUT /api/profile-assistant
 * @desc    Update current assistant profile
 * @access  Private (Assistant only)
 * @body    {
 *            date_of_birth, gender, nationality, emergency_contact_phone,
 *            timezone, language_preference,
 *            full_name, job_title, emergency_contact_name, emergency_contact_relationship
 *          }
 */
router.put('/', parseFormData, ProfileAssistantController.updateProfile);

/**
 * @route   POST /api/profile-assistant/picture
 * @desc    Upload profile picture
 * @access  Private (Assistant only)
 */
router.post('/picture', uploadProfilePictureMiddleware, ProfileAssistantController.uploadProfilePicture);

/**
 * @route   DELETE /api/profile-assistant/picture
 * @desc    Delete profile picture
 * @access  Private (Assistant only)
 */
router.delete('/picture', ProfileAssistantController.deleteProfilePicture);

/**
 * @route   DELETE /api/profile-assistant
 * @desc    Deactivate assistant account
 * @access  Private (Assistant only)
 */
router.delete('/', ProfileAssistantController.deleteProfile);

/**
 * @route   PATCH /api/profile-assistant/reactivate
 * @desc    Reactivate deactivated assistant account
 * @access  Private (Assistant only)
 */
router.patch('/reactivate', ProfileAssistantController.reactivateProfile);

module.exports = router;

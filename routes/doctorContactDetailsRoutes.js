const express = require('express');
const router = express.Router();
const DoctorContactDetailsController = require('../controllers/doctorContactDetailsController');
const { authenticateJWT, authorizeDoctor, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Contact Details Routes
 * Base Path: /api/doctor-contact-details
 * 
 * Doctor: Can manage their own contact details
 * Admin: Can view all doctors' contact details
 */

/**
 * Doctor Routes (require Doctor authentication)
 */

/**
 * @route   GET /api/doctor-contact-details/my-details
 * @desc    Get doctor's own contact details
 * @access  Private (Doctor only)
 */
router.get('/my-details', authenticateJWT, authorizeDoctor, DoctorContactDetailsController.getMyContactDetails);

/**
 * @route   POST /api/doctor-contact-details
 * @desc    Create or update doctor's contact details
 * @access  Private (Doctor only)
 * @body    {
 *            whatsapp_number: "string (optional)",
 *            additional_phone: "string (optional)",
 *            personal_email: "string (optional)",
 *            contact_notes: "string (optional)"
 *          }
 * @note    At least one contact method is required
 */
router.post('/', authenticateJWT, authorizeDoctor, parseFormData, DoctorContactDetailsController.createOrUpdateContactDetails);

/**
 * @route   PUT /api/doctor-contact-details
 * @desc    Update doctor's contact details (partial update)
 * @access  Private (Doctor only)
 * @body    Same as POST (all fields optional)
 */
router.put('/', authenticateJWT, authorizeDoctor, parseFormData, DoctorContactDetailsController.updateContactDetails);

/**
 * @route   DELETE /api/doctor-contact-details
 * @desc    Delete doctor's contact details
 * @access  Private (Doctor only)
 */
router.delete('/', authenticateJWT, authorizeDoctor, DoctorContactDetailsController.deleteContactDetails);

/**
 * Admin Routes (require Admin authentication)
 */

/**
 * @route   GET /api/doctor-contact-details/all
 * @desc    Get all doctors' contact details
 * @access  Private (Admin only)
 * @query   doctor_id (optional): filter by specific doctor
 */
router.get('/all', authenticateJWT, authorizeAnyAdmin, DoctorContactDetailsController.getAllContactDetails);

/**
 * @route   GET /api/doctor-contact-details/doctor/:doctorId
 * @desc    Get specific doctor's contact details by doctor ID
 * @access  Private (Admin only)
 */
router.get('/doctor/:doctorId', authenticateJWT, authorizeAnyAdmin, DoctorContactDetailsController.getContactDetailsByDoctorId);

module.exports = router;

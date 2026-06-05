const express = require('express');
const router = express.Router();
const DoctorProfessionalController = require('../controllers/doctorProfessionalController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Professional Data Routes
 * مسارات البيانات المهنية للأطباء
 * Base path: /api/profile-doctor/professional
 */

// All routes require authentication
router.use(authenticateJWT, authorizeDoctor, checkAccountActive);

/**
 * @route   GET /api/profile-doctor/professional
 * @desc    Get professional data for doctor
 * @access  Private (Doctor only)
 */
router.get('/', parseFormData, DoctorProfessionalController.getProfessionalData);

/**
 * @route   PUT /api/profile-doctor/professional
 * @desc    Update professional data for doctor
 * @access  Private (Doctor only)
 * @body    {
 *            license_number: "string",
 *            years_of_experience: number,
 *            medical_school: "string",
 *            graduation_year: number,
 *            board_certifications: ["string"],
 *            languages_spoken: ["string"],
 *            specialty: "string",
 *            sub_specialty: "string",
 *            biography: "string"
 *          }
 *          OR (for multi-language updates):
 *          {
 *            license_number: "string",
 *            years_of_experience: number,
 *            medical_school: "string",
 *            graduation_year: number,
 *            board_certifications: ["string"],
 *            languages_spoken: ["string"],
 *            translations: {
 *              ar: {
 *                specialty: "string",
 *                sub_specialty: "string",
 *                biography: "string"
 *              },
 *              en: {
 *                specialty: "string",
 *                sub_specialty: "string",
 *                biography: "string"
 *              }
 *            }
 *          }
 */
router.put('/', parseFormData, DoctorProfessionalController.updateProfessionalData);

module.exports = router;

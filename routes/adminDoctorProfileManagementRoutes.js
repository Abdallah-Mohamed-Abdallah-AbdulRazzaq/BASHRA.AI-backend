const express = require('express');
const router = express.Router();
const AdminDoctorProfileManagementController = require('../controllers/AdminDoctorProfileManagementController');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');

/**
 * Admin Doctor Profile Management Routes
 * مسارات إدارة ملفات الأطباء للأدمن
 * Base path: /api/admin/doctors/:doctorId/profile
 */

// All routes require admin authentication
router.use(authenticateJWT, authorizeAdmin);

/**
 * @route   GET /api/admin/doctors/:doctorId/profile/complete
 * @desc    Get doctor complete profile (personal + professional + documents)
 * @access  Private (Admin only)
 */
router.get('/:doctorId/profile/complete', AdminDoctorProfileManagementController.getDoctorCompleteProfile);

/**
 * @route   GET /api/admin/doctors/:doctorId/profile/personal
 * @desc    Get doctor personal data only
 * @access  Private (Admin only)
 */
router.get('/:doctorId/profile/personal', AdminDoctorProfileManagementController.getDoctorPersonalData);

/**
 * @route   GET /api/admin/doctors/:doctorId/profile/professional
 * @desc    Get doctor professional data only
 * @access  Private (Admin only)
 */
router.get('/:doctorId/profile/professional', AdminDoctorProfileManagementController.getDoctorProfessionalData);

/**
 * @route   GET /api/admin/doctors/:doctorId/profile/documents
 * @desc    Get doctor verification documents
 * @access  Private (Admin only)
 */
router.get('/:doctorId/profile/documents', AdminDoctorProfileManagementController.getDoctorDocuments);

/**
 * @route   GET /api/admin/doctors/:doctorId/profile/documents/summary
 * @desc    Get documents summary for doctor
 * @access  Private (Admin only)
 */
router.get('/:doctorId/profile/documents/summary', AdminDoctorProfileManagementController.getDocumentsSummary);

/**
 * @route   PUT /api/admin/doctors/:doctorId/profile/personal
 * @desc    Update doctor personal data
 * @access  Private (Admin only)
 * @body    {
 *            email: "string",
 *            phone: "string",
 *            date_of_birth: "YYYY-MM-DD",
 *            gender: "male|female|other|prefer_not_to_say",
 *            nationality: "string",
 *            emergency_contact_phone: "string",
 *            timezone: "string",
 *            language_preference: "ar|en",
 *            translations: {
 *              ar: { full_name, emergency_contact_name, emergency_contact_relationship },
 *              en: { full_name, emergency_contact_name, emergency_contact_relationship }
 *            }
 *          }
 */
router.put('/:doctorId/profile/personal', AdminDoctorProfileManagementController.updateDoctorPersonalData);

/**
 * @route   PUT /api/admin/doctors/:doctorId/profile/professional
 * @desc    Update doctor professional data
 * @access  Private (Admin only)
 * @body    {
 *            license_number: "string",
 *            years_of_experience: number,
 *            medical_school: "string",
 *            graduation_year: number,
 *            board_certifications: ["string"],
 *            languages_spoken: ["string"],
 *            translations: {
 *              ar: { specialty, sub_specialty, biography },
 *              en: { specialty, sub_specialty, biography }
 *            }
 *          }
 */
router.put('/:doctorId/profile/professional', AdminDoctorProfileManagementController.updateDoctorProfessionalData);

/**
 * @route   PUT /api/admin/doctors/:doctorId/profile/documents/:documentId
 * @desc    Approve/Reject verification document
 * @access  Private (Admin only)
 * @body    {
 *            status: "pending|approved|rejected",
 *            rejection_reason: "string" (required if status is rejected)
 *          }
 */
router.put('/:doctorId/profile/documents/:documentId', AdminDoctorProfileManagementController.updateDocumentStatus);

/**
 * @route   DELETE /api/admin/doctors/:doctorId/profile
 * @desc    Delete doctor profile (soft delete)
 * @access  Private (Admin only)
 * @body    {
 *            reason: "string" (required)
 *          }
 */
router.delete('/:doctorId/profile', AdminDoctorProfileManagementController.deleteDoctorProfile);

/**
 * @route   POST /api/admin/doctors/:doctorId/profile/approve
 * @desc    Approve doctor profile completely (set is_verified, verification_date, verified_by, approval_status)
 * @access  Private (Admin only)
 * @body    {
 *            reason: "string" (optional)
 *          }
 */
router.post('/:doctorId/profile/approve', AdminDoctorProfileManagementController.approveDoctorProfile);

/**
 * @route   POST /api/admin/doctors/:doctorId/profile/reject
 * @desc    Reject doctor profile (set approval_status to rejected)
 * @access  Private (Admin only)
 * @body    {
 *            reason: "string" (required)
 *          }
 */
router.post('/:doctorId/profile/reject', AdminDoctorProfileManagementController.rejectDoctorProfile);

module.exports = router;

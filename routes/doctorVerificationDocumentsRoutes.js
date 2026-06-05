const express = require('express');
const router = express.Router();
const DoctorVerificationDocumentsController = require('../controllers/doctorVerificationDocumentsController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { uploadDocumentMiddleware } = require('../middleware/uploadMiddleware');

/**
 * Doctor Verification Documents Routes
 * مسارات مستندات التحقق للأطباء
 * Base path: /api/profile-doctor/verification-documents
 */

// All routes require authentication
router.use(authenticateJWT, authorizeDoctor, checkAccountActive);

/**
 * @route   POST /api/profile-doctor/verification-documents
 * @desc    Upload verification document
 * @access  Private (Doctor only)
 * @body    FormData with fields:
 *          - document_type: "national_id|passport|medical_license|board_certificate|university_degree|other"
 *          - file: document file
 */
router.post('/', uploadDocumentMiddleware, DoctorVerificationDocumentsController.uploadDocument);

/**
 * @route   GET /api/profile-doctor/verification-documents
 * @desc    Get all verification documents for doctor
 * @access  Private (Doctor only)
 */
router.get('/', DoctorVerificationDocumentsController.getAllDocuments);

/**
 * @route   GET /api/profile-doctor/verification-documents/summary
 * @desc    Get documents summary (count by status)
 * @access  Private (Doctor only)
 */
router.get('/summary', DoctorVerificationDocumentsController.getDocumentsSummary);

/**
 * @route   GET /api/profile-doctor/verification-documents/:id
 * @desc    Get single verification document by ID
 * @access  Private (Doctor only)
 */
router.get('/:id', DoctorVerificationDocumentsController.getDocumentById);

/**
 * @route   PUT /api/profile-doctor/verification-documents/:id
 * @desc    Update verification document (re-upload)
 * @access  Private (Doctor only)
 * @body    FormData with field: file (document file)
 */
router.put('/:id', uploadDocumentMiddleware, DoctorVerificationDocumentsController.updateDocument);

/**
 * @route   DELETE /api/profile-doctor/verification-documents/:id
 * @desc    Delete verification document
 * @access  Private (Doctor only)
 */
router.delete('/:id', DoctorVerificationDocumentsController.deleteDocument);

module.exports = router;

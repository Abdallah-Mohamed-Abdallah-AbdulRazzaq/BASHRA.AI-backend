const express = require('express');
const router = express.Router();
const ClinicsController = require('../controllers/clinicsController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { createUploadMiddleware, uploadWithErrorHandling } = require('../middleware/fileUploadMiddleware');

/**
 * Clinics Routes
 * Base Path: /api/clinics
 * 
 * All routes require Doctor authentication
 */

// Create clinic images upload middleware
const clinicImagesUpload = uploadWithErrorHandling(
  createUploadMiddleware({
    fileCategory: 'images',
    maxSize: 5 * 1024 * 1024, // 5MB per file
    fieldName: 'images',
    maxFiles: 5 // ✅ الحد الأقصى 5 صور لكل عيادة
  })
);

// All routes require authentication and doctor role
router.use(authenticateJWT, authorizeDoctor);

/**
 * @route   GET /api/clinics
 * @desc    Get all clinics for authenticated doctor
 * @access  Private (Doctor only)
 */
router.get('/', ClinicsController.getDoctorClinics);

/**
 * @route   GET /api/clinics/main
 * @desc    Get main clinic for authenticated doctor
 * @access  Private (Doctor only)
 */
router.get('/main', ClinicsController.getMainClinic);

/**
 * @route   GET /api/clinics/:id
 * @desc    Get single clinic by ID
 * @access  Private (Doctor only)
 */
router.get('/:id', ClinicsController.getClinicById);

/**
 * @route   POST /api/clinics
 * @desc    Create new clinic
 * @access  Private (Doctor only)
 * @body    {
 *            name: "string (required)",
 *            address_line_1: "string (required)",
 *            region_id: number (optional),
 *            latitude: number (optional),
 *            longitude: number (optional),
 *            phone_number: "string (optional)",
 *            is_main_branch: boolean (optional, default: false),
 *            status: "active|inactive|under_maintenance (optional, default: active)"
 *          }
 */
router.post('/', parseFormData, ClinicsController.createClinic);

/**
 * @route   PUT /api/clinics/:id
 * @desc    Update clinic
 * @access  Private (Doctor only)
 * @body    Same as POST (all fields optional)
 */
router.put('/:id', parseFormData, ClinicsController.updateClinic);

/**
 * @route   PATCH /api/clinics/:id/set-main
 * @desc    Set clinic as main branch
 * @access  Private (Doctor only)
 */
router.patch('/:id/set-main', ClinicsController.setMainClinic);

/**
 * @route   DELETE /api/clinics/:id
 * @desc    Delete clinic
 * @access  Private (Doctor only)
 */
router.delete('/:id', ClinicsController.deleteClinic);

// ============================================
// Clinic Images Routes
// ============================================

/**
 * @route   GET /api/clinics/:id/images
 * @desc    Get all images for a clinic
 * @access  Private (Doctor only)
 */
router.get('/:id/images', ClinicsController.getClinicImages);

/**
 * @route   POST /api/clinics/:id/images
 * @desc    Upload images for a clinic (Max 5 images per clinic)
 * @access  Private (Doctor only)
 * @body    form-data with 'images' field (multiple files allowed, max 5 per clinic)
 *          Optional: is_main (boolean) - set first image as main
 * @note    Each clinic can have maximum 5 images total
 */
router.post('/:id/images', clinicImagesUpload, ClinicsController.uploadClinicImages);

/**
 * @route   PUT /api/clinics/:id/images/reorder
 * @desc    Bulk reorder images
 * @access  Private (Doctor only)
 * @body    { image_orders: [{ id: number, sort_order: number }] }
 */
router.put('/:id/images/reorder', parseFormData, ClinicsController.reorderImages);

/**
 * @route   PATCH /api/clinics/:clinicId/images/:imageId/set-main
 * @desc    Set image as main cover
 * @access  Private (Doctor only)
 */
router.patch('/:clinicId/images/:imageId/set-main', ClinicsController.setMainImage);

/**
 * @route   PATCH /api/clinics/:clinicId/images/:imageId/order
 * @desc    Update single image sort order
 * @access  Private (Doctor only)
 * @body    { sort_order: number }
 */
router.patch('/:clinicId/images/:imageId/order', parseFormData, ClinicsController.updateImageOrder);

/**
 * @route   DELETE /api/clinics/:clinicId/images/:imageId
 * @desc    Delete clinic image
 * @access  Private (Doctor only)
 */
router.delete('/:clinicId/images/:imageId', ClinicsController.deleteClinicImage);

module.exports = router;

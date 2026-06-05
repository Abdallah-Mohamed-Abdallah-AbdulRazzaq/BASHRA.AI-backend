const express = require('express');
const router = express.Router();
const MedicationsController = require('../controllers/medicationsController');
const { authenticateJWT, authorizeAnyAdmin, authorizeAdminOrDoctor } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Medications Routes
 * Base Path: /api/medications
 * 
 * Admin: Full CRUD access (created_by_doctor_id = NULL)
 * Doctor: Read access + Create access (created_by_doctor_id = doctor.id)
 */

/**
 * @route   GET /api/medications
 * @desc    Get all medications with filtering and search
 * @access  Private (Admin & Doctor)
 * @query   is_active, category, form_type, search, page, limit
 */
router.get('/', authenticateJWT, authorizeAdminOrDoctor, MedicationsController.getAllMedications);

/**
 * @route   GET /api/medications/categories/list
 * @desc    Get all medication categories
 * @access  Private (Admin & Doctor)
 */
router.get('/categories/list', authenticateJWT, authorizeAdminOrDoctor, MedicationsController.getMedicationCategories);

/**
 * @route   GET /api/medications/category/:category
 * @desc    Get medications by category
 * @access  Private (Admin & Doctor)
 */
router.get('/category/:category', authenticateJWT, authorizeAdminOrDoctor, MedicationsController.getMedicationsByCategory);

/**
 * @route   GET /api/medications/:id
 * @desc    Get single medication by ID or UUID
 * @access  Private (Admin & Doctor)
 */
router.get('/:id', authenticateJWT, authorizeAdminOrDoctor, MedicationsController.getMedicationById);

/**
 * @route   POST /api/medications
 * @desc    Create new medication
 * @access  Private (Admin & Doctor)
 * @note    Admin creates with created_by_doctor_id = NULL
 *          Doctor creates with created_by_doctor_id = doctor.id
 * @body    {
 *            name_ar: "string (required)",
 *            name_en: "string (required)",
 *            scientific_name: "string (optional)",
 *            category: "string (optional)",
 *            form_type: "enum (tablet|capsule|syrup|cream|ointment|injection|drops|inhaler|suppository|sachet|other)",
 *            available_dosages: "array (optional)",
 *            indications: "text (optional)",
 *            warning_alert: "text (optional)",
 *            is_active: "boolean (optional, default: true)"
 *          }
 */
router.post('/', authenticateJWT, authorizeAdminOrDoctor, parseFormData, MedicationsController.createMedication);

/**
 * @route   PUT /api/medications/:id
 * @desc    Update medication
 * @access  Private (Admin only)
 * @body    Same as POST (all fields optional)
 */
router.put('/:id', authenticateJWT, authorizeAnyAdmin, parseFormData, MedicationsController.updateMedication);

/**
 * @route   PATCH /api/medications/:id/toggle-status
 * @desc    Toggle medication active status
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', authenticateJWT, authorizeAnyAdmin, MedicationsController.toggleMedicationStatus);

/**
 * @route   DELETE /api/medications/:id
 * @desc    Delete medication
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateJWT, authorizeAnyAdmin, MedicationsController.deleteMedication);

module.exports = router;

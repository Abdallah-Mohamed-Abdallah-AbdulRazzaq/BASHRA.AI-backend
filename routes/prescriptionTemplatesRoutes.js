const express = require('express');
const router = express.Router();
const PrescriptionTemplatesController = require('../controllers/prescriptionTemplatesController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Prescription Templates Routes
 * Base Path: /api/prescription-templates
 * 
 * Doctor only access (each doctor manages their own templates)
 */

// All routes require authentication and doctor role
router.use(authenticateJWT, authorizeDoctor);

/**
 * @route   GET /api/prescription-templates
 * @desc    Get all templates for logged-in doctor
 * @access  Private (Doctor only)
 * @query   include_items (optional): include template items
 */
router.get('/', PrescriptionTemplatesController.getAllTemplates);

/**
 * @route   GET /api/prescription-templates/:id
 * @desc    Get single template by ID or UUID with items
 * @access  Private (Doctor only)
 */
router.get('/:id', PrescriptionTemplatesController.getTemplateById);

/**
 * @route   POST /api/prescription-templates
 * @desc    Create new template with items
 * @access  Private (Doctor only)
 * @body    {
 *            template_name: "string (required)",
 *            description: "text (optional)",
 *            items: [
 *              {
 *                medication_id: number (required),
 *                default_dosage: "string (required)",
 *                default_frequency: "string (required)",
 *                default_duration: "string (optional)",
 *                default_instructions: "text (optional)",
 *                default_quantity: "string (optional)"
 *              }
 *            ]
 *          }
 */
router.post('/', parseFormData, PrescriptionTemplatesController.createTemplate);

/**
 * @route   PUT /api/prescription-templates/:id
 * @desc    Update template (name and description only)
 * @access  Private (Doctor only)
 * @body    {
 *            template_name: "string (optional)",
 *            description: "text (optional)"
 *          }
 */
router.put('/:id', parseFormData, PrescriptionTemplatesController.updateTemplate);

/**
 * @route   DELETE /api/prescription-templates/:id
 * @desc    Delete template
 * @access  Private (Doctor only)
 */
router.delete('/:id', PrescriptionTemplatesController.deleteTemplate);

/**
 * @route   POST /api/prescription-templates/:id/items
 * @desc    Add item to template
 * @access  Private (Doctor only)
 * @body    {
 *            medication_id: number (required),
 *            default_dosage: "string (required)",
 *            default_frequency: "string (required)",
 *            default_duration: "string (optional)",
 *            default_instructions: "text (optional)",
 *            default_quantity: "string (optional)"
 *          }
 */
router.post('/:id/items', parseFormData, PrescriptionTemplatesController.addItemToTemplate);

/**
 * @route   PUT /api/prescription-templates/:id/items/:itemId
 * @desc    Update template item
 * @access  Private (Doctor only)
 * @body    Same as add item (all fields optional)
 */
router.put('/:id/items/:itemId', parseFormData, PrescriptionTemplatesController.updateTemplateItem);

/**
 * @route   DELETE /api/prescription-templates/:id/items/:itemId
 * @desc    Delete item from template
 * @access  Private (Doctor only)
 */
router.delete('/:id/items/:itemId', PrescriptionTemplatesController.deleteTemplateItem);

/**
 * @route   PATCH /api/prescription-templates/:id/use
 * @desc    Increment template usage count
 * @access  Private (Doctor only)
 */
router.patch('/:id/use', PrescriptionTemplatesController.incrementUsageCount);

module.exports = router;

const express = require('express');
const router = express.Router();
const FeaturesController = require('../controllers/featuresController');
const { authenticateJWT, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Features Routes
 * Base Path: /api/features
 * 
 * All routes require Admin authentication
 */

// All routes require authentication and admin role
router.use(authenticateJWT, authorizeAnyAdmin);

/**
 * @route   GET /api/features
 * @desc    Get all features
 * @access  Private (Admin only)
 * @query   is_active (optional): filter by active status
 */
router.get('/', FeaturesController.getAllFeatures);

/**
 * @route   GET /api/features/:id
 * @desc    Get single feature by ID
 * @access  Private (Admin only)
 */
router.get('/:id', FeaturesController.getFeatureById);

/**
 * @route   POST /api/features
 * @desc    Create new feature
 * @access  Private (Admin only)
 * @body    {
 *            name_ar: "string (required)",
 *            name_en: "string (optional)",
 *            unit_ar: "string (optional)",
 *            unit_en: "string (optional)",
 *            is_active: boolean (optional, default: true)
 *          }
 */
router.post('/', parseFormData, FeaturesController.createFeature);

/**
 * @route   PUT /api/features/:id
 * @desc    Update feature
 * @access  Private (Admin only)
 * @body    Same as POST (all fields optional)
 */
router.put('/:id', parseFormData, FeaturesController.updateFeature);

/**
 * @route   PATCH /api/features/:id/toggle-status
 * @desc    Toggle feature active status
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', FeaturesController.toggleFeatureStatus);

/**
 * @route   DELETE /api/features/:id
 * @desc    Delete feature
 * @access  Private (Admin only)
 */
router.delete('/:id', FeaturesController.deleteFeature);

module.exports = router;

const express = require('express');
const router = express.Router();
const PackagesController = require('../controllers/packagesController');
const { authenticateJWT, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Packages Routes
 * Base Path: /api/packages
 * 
 * All routes require Admin authentication
 */

// All routes require authentication and admin role
router.use(authenticateJWT, authorizeAnyAdmin);

/**
 * @route   GET /api/packages
 * @desc    Get all packages with optional features
 * @access  Private (Admin only)
 * @query   is_active (optional): filter by active status
 * @query   include_features (optional): include package features
 */
router.get('/', PackagesController.getAllPackages);

/**
 * @route   GET /api/packages/:id
 * @desc    Get single package by ID with features
 * @access  Private (Admin only)
 */
router.get('/:id', PackagesController.getPackageById);

/**
 * @route   POST /api/packages
 * @desc    Create new package
 * @access  Private (Admin only)
 * @body    {
 *            name_ar: "string (required)",
 *            name_en: "string (optional)",
 *            secondary_name_ar: "string (optional)",
 *            secondary_name_en: "string (optional)",
 *            duration_days: number (required),
 *            price: number (required),
 *            is_active: boolean (optional, default: true)
 *          }
 */
router.post('/', parseFormData, PackagesController.createPackage);

/**
 * @route   PUT /api/packages/:id
 * @desc    Update package
 * @access  Private (Admin only)
 * @body    Same as POST (all fields optional)
 */
router.put('/:id', parseFormData, PackagesController.updatePackage);

/**
 * @route   PATCH /api/packages/:id/toggle-status
 * @desc    Toggle package active status
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-status', PackagesController.togglePackageStatus);

/**
 * @route   DELETE /api/packages/:id
 * @desc    Delete package
 * @access  Private (Admin only)
 */
router.delete('/:id', PackagesController.deletePackage);

module.exports = router;

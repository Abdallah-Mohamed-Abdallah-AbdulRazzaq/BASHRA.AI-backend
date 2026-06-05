const express = require('express');
const router = express.Router();
const PackageFeaturesController = require('../controllers/packageFeaturesController');
const { authenticateJWT, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Package Features Routes
 * Base Path: /api/package-features
 * 
 * All routes require Admin authentication
 */

// All routes require authentication and admin role
router.use(authenticateJWT, authorizeAnyAdmin);

/**
 * @route   GET /api/package-features/package/:packageId
 * @desc    Get all features for a specific package
 * @access  Private (Admin only)
 */
router.get('/package/:packageId', PackageFeaturesController.getPackageFeatures);

/**
 * @route   GET /api/package-features/feature/:featureId
 * @desc    Get all packages that include a specific feature
 * @access  Private (Admin only)
 */
router.get('/feature/:featureId', PackageFeaturesController.getFeaturePackages);

/**
 * @route   POST /api/package-features
 * @desc    Add feature to package
 * @access  Private (Admin only)
 * @body    {
 *            package_id: number (required),
 *            feature_id: number (required),
 *            feature_value: "string (required)",
 *            is_included: boolean (optional, default: true)
 *          }
 */
router.post('/', parseFormData, PackageFeaturesController.addFeatureToPackage);

/**
 * @route   POST /api/package-features/bulk
 * @desc    Bulk add features to package
 * @access  Private (Admin only)
 * @body    {
 *            package_id: number (required),
 *            features: [
 *              {
 *                feature_id: number,
 *                feature_value: "string",
 *                is_included: boolean (optional)
 *              }
 *            ]
 *          }
 */
router.post('/bulk', parseFormData, PackageFeaturesController.bulkAddFeatures);

/**
 * @route   PUT /api/package-features/:id
 * @desc    Update package feature
 * @access  Private (Admin only)
 * @body    {
 *            feature_value: "string (optional)",
 *            is_included: boolean (optional)
 *          }
 */
router.put('/:id', parseFormData, PackageFeaturesController.updatePackageFeature);

/**
 * @route   DELETE /api/package-features/:id
 * @desc    Delete package feature
 * @access  Private (Admin only)
 */
router.delete('/:id', PackageFeaturesController.deletePackageFeature);

module.exports = router;

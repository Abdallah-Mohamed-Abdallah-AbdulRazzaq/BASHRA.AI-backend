const express = require('express');
const router = express.Router();
const PublicPackagesController = require('../controllers/publicPackagesController');

/**
 * Public Features Routes
 * Base Path: /api/public/features
 * 
 * All routes are PUBLIC - No authentication required
 */

/**
 * @route   GET /api/public/features
 * @desc    Get all active features
 * @access  Public
 */
router.get('/', PublicPackagesController.getAllFeatures);

module.exports = router;

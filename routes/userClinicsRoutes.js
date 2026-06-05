const express = require('express');
const router = express.Router();
const ClinicsController = require('../controllers/clinicsController');
const { authenticateJWT, authorizeUser } = require('../middleware/authMiddleware');

/**
 * User Clinics Routes
 * Base Path: /api/user/clinics
 * 
 * Requires User authentication
 */

// All routes require authentication and user role
router.use(authenticateJWT, authorizeUser);

/**
 * @route   GET /api/user/clinics
 * @desc    Get clinics for authenticated user with search and filters
 * @access  Private (User only)
 * @query   doctor_id (optional) - Filter by doctor
 *          region_id (optional) - Filter by region
 *          search (optional) - Search by clinic name, address, or doctor name
 *          page (optional, default: 1) - Page number
 *          limit (optional, default: 20) - Items per page
 */
router.get('/', ClinicsController.getUserClinics);

/**
 * @route   GET /api/user/clinics/:id
 * @desc    Get single clinic details with all images
 * @access  Private (User only)
 */
router.get('/:id', ClinicsController.getUserClinicById);

module.exports = router;

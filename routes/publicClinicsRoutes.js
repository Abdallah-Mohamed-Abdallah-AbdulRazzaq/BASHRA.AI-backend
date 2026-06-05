const express = require('express');
const router = express.Router();
const ClinicsController = require('../controllers/clinicsController');

/**
 * Public Clinics Routes
 * Base Path: /api/public/clinics
 * 
 * No authentication required - Public access
 */

/**
 * @route   GET /api/public/clinics
 * @desc    Get all public clinics with filters
 * @access  Public
 * @query   doctor_id (optional) - Filter by doctor
 *          region_id (optional) - Filter by region
 *          status (optional, default: active) - Filter by status
 *          page (optional, default: 1) - Page number
 *          limit (optional, default: 20) - Items per page
 */
router.get('/', ClinicsController.getPublicClinics);

/**
 * @route   GET /api/public/clinics/doctor/:doctorId
 * @desc    Get all clinics for a specific doctor
 * @access  Public
 */
router.get('/doctor/:doctorId', ClinicsController.getClinicsByDoctor);

/**
 * @route   GET /api/public/clinics/:id
 * @desc    Get single clinic by ID with all images
 * @access  Public
 */
router.get('/:id', ClinicsController.getPublicClinicById);

module.exports = router;

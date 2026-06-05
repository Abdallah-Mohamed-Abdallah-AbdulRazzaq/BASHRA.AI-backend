const express = require('express');
const router = express.Router();
const CountriesCitiesController = require('../controllers/countriesCitiesController');
const { authenticateJWT, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { uploadMiddleware } = require('../middleware/fileUploadMiddleware');

/**
 * Countries & Cities Routes
 * Base Path: /api/countries-cities
 * 
 * Public routes: GET (read-only)
 * Admin routes: POST, PUT, DELETE
 */

// =============================================
// Public Routes (No Authentication Required)
// =============================================

/**
 * @route   GET /api/countries-cities
 * @desc    Get all countries, cities, regions, districts (hierarchical)
 * @access  Public
 * @query   level_type: country|city|region|district (optional)
 *          parent_id: number (optional)
 *          lang: ar|en (optional, default: ar)
 */
router.get('/', CountriesCitiesController.getAll);

/**
 * @route   GET /api/countries-cities/countries
 * @desc    Get all countries only
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/countries', CountriesCitiesController.getCountries);

/**
 * @route   GET /api/countries-cities/cities/:country_id
 * @desc    Get all cities in a country
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/cities/:country_id', CountriesCitiesController.getCitiesByCountry);

/**
 * @route   GET /api/countries-cities/regions/:city_id
 * @desc    Get all regions in a city
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/regions/:city_id', CountriesCitiesController.getRegionsByCity);

/**
 * @route   GET /api/countries-cities/districts/:region_id
 * @desc    Get all districts in a region
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/districts/:region_id', CountriesCitiesController.getDistrictsByRegion);

/**
 * @route   GET /api/countries-cities/hierarchy/:id
 * @desc    Get full hierarchy (country > city > region > district) for a location
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/hierarchy/:id', CountriesCitiesController.getHierarchy);

/**
 * @route   GET /api/countries-cities/search
 * @desc    Search countries, cities, regions, districts
 * @access  Public
 * @query   q: search query (required)
 *          level_type: country|city|region|district (optional)
 *          lang: ar|en (optional)
 */
router.get('/search', CountriesCitiesController.search);

/**
 * @route   GET /api/countries-cities/:id
 * @desc    Get single location by ID
 * @access  Public
 * @query   lang: ar|en (optional)
 */
router.get('/:id', CountriesCitiesController.getById);

// =============================================
// Admin Routes (Authentication + Authorization Required)
// =============================================

/**
 * @route   POST /api/countries-cities
 * @desc    Create new country/city/region/district
 * @access  Private (Admin only)
 * @body    {
 *            name_ar: "string (required)",
 *            name_en: "string (required)",
 *            level_type: "country|city|region|district (required)",
 *            parent_id: number (optional, required for city/region/district),
 *            image: file (optional, image file for location)
 *          }
 */
router.post('/', authenticateJWT, authorizeAnyAdmin, uploadMiddleware.singleImage, CountriesCitiesController.create);

/**
 * @route   PUT /api/countries-cities/:id
 * @desc    Update country/city/region/district
 * @access  Private (Admin only)
 * @body    {
 *            name_ar: "string (optional)",
 *            name_en: "string (optional)",
 *            parent_id: number (optional),
 *            image: file (optional, image file for location)
 *          }
 */
router.put('/:id', authenticateJWT, authorizeAnyAdmin, uploadMiddleware.singleImage, CountriesCitiesController.update);

/**
 * @route   DELETE /api/countries-cities/:id
 * @desc    Delete country/city/region/district (cascade delete children)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateJWT, authorizeAnyAdmin, CountriesCitiesController.delete);

module.exports = router;

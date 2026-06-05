const express = require('express');
const router = express.Router();
const PublicPackagesController = require('../controllers/publicPackagesController');

/**
 * Public Packages Routes
 * Base Path: /api/public/packages
 * 
 * All routes are PUBLIC - No authentication required
 */

/**
 * @route   GET /api/public/packages
 * @desc    Get all active packages with features
 * @access  Public
 */
router.get('/', PublicPackagesController.getAllPackages);

/**
 * @route   GET /api/public/packages/comparison
 * @desc    Get packages comparison matrix (for pricing page)
 * @access  Public
 */
router.get('/comparison', PublicPackagesController.getPackagesComparison);

/**
 * @route   GET /api/public/packages/featured
 * @desc    Get featured/recommended package
 * @access  Public
 */
router.get('/featured', PublicPackagesController.getFeaturedPackage);

/**
 * @route   GET /api/public/packages/cheapest
 * @desc    Get cheapest package
 * @access  Public
 */
router.get('/cheapest', PublicPackagesController.getCheapestPackage);

/**
 * @route   GET /api/public/packages/premium
 * @desc    Get most expensive/premium package
 * @access  Public
 */
router.get('/premium', PublicPackagesController.getPremiumPackage);

/**
 * @route   GET /api/public/packages/:id
 * @desc    Get single package by ID with features
 * @access  Public
 */
router.get('/:id', PublicPackagesController.getPackageById);

module.exports = router;

const express = require('express');
const router = express.Router();
const AddressController = require('../controllers/addressController');
const { authenticateJWT } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Address Routes
 * Base Path: /api/addresses
 * 
 * All routes require authentication
 */

// =============================================
// User/Doctor/Admin Address Routes
// =============================================

/**
 * @route   GET /api/addresses
 * @desc    Get all addresses for authenticated user
 * @access  Private (User, Doctor, Admin, Assistant)
 */
router.get('/', authenticateJWT, AddressController.getUserAddresses);

/**
 * @route   GET /api/addresses/primary
 * @desc    Get primary address for authenticated user
 * @access  Private (User, Doctor, Admin, Assistant)
 */
router.get('/primary', authenticateJWT, AddressController.getPrimaryAddress);

/**
 * @route   GET /api/addresses/:id
 * @desc    Get single address by ID
 * @access  Private (User, Doctor, Admin, Assistant)
 */
router.get('/:id', authenticateJWT, AddressController.getAddressById);

/**
 * @route   POST /api/addresses
 * @desc    Create new address
 * @access  Private (User, Doctor, Admin, Assistant)
 * @body    {
 *            address_line1: "string (required)",
 *            address_line2: "string (optional)",
 *            postal_code: "string (optional)",
 *            countries_cities_id: number (optional),
 *            latitude: number (optional),
 *            longitude: number (optional),
 *            type: "home|work|billing|shipping|other (optional, default: home)",
 *            is_primary: boolean (optional, default: false)
 *          }
 */
router.post('/', authenticateJWT, parseFormData, AddressController.createAddress);

/**
 * @route   PUT /api/addresses/:id
 * @desc    Update address
 * @access  Private (User, Doctor, Admin, Assistant)
 * @body    Same as POST (all fields optional)
 */
router.put('/:id', authenticateJWT, parseFormData, AddressController.updateAddress);

/**
 * @route   PATCH /api/addresses/:id/set-primary
 * @desc    Set address as primary
 * @access  Private (User, Doctor, Admin, Assistant)
 */
router.patch('/:id/set-primary', authenticateJWT, AddressController.setPrimaryAddress);

/**
 * @route   DELETE /api/addresses/:id
 * @desc    Delete address
 * @access  Private (User, Doctor, Admin, Assistant)
 */
router.delete('/:id', authenticateJWT, AddressController.deleteAddress);

module.exports = router;

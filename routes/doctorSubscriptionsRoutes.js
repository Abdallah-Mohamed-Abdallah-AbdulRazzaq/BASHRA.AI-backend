const express = require('express');
const router = express.Router();
const DoctorSubscriptionsController = require('../controllers/doctorSubscriptionsController');
const { authenticateJWT, authorizeDoctor, authorizeAnyAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Subscriptions Routes
 * Base Path: /api/doctor-subscriptions
 * 
 * Doctor: Can create subscription requests and view their subscriptions
 * Admin: Can manage all subscriptions
 */

// ==================== DOCTOR ROUTES ====================

/**
 * @route   POST /api/doctor-subscriptions/subscribe
 * @desc    Create subscription request
 * @access  Private (Doctor only)
 * @body    {
 *            package_id: number (required)
 *          }
 */
router.post('/subscribe', authenticateJWT, authorizeDoctor, parseFormData, DoctorSubscriptionsController.createSubscription);

/**
 * @route   GET /api/doctor-subscriptions/my-subscriptions
 * @desc    Get doctor's own subscriptions
 * @access  Private (Doctor only)
 * @query   status (optional): filter by status
 */
router.get('/my-subscriptions', authenticateJWT, authorizeDoctor, DoctorSubscriptionsController.getMySubscriptions);

/**
 * @route   GET /api/doctor-subscriptions/current
 * @desc    Get doctor's current active subscription
 * @access  Private (Doctor only)
 */
router.get('/current', authenticateJWT, authorizeDoctor, DoctorSubscriptionsController.getCurrentSubscription);

/**
 * @route   DELETE /api/doctor-subscriptions/:id/cancel
 * @desc    Cancel subscription request (only pending)
 * @access  Private (Doctor only)
 */
router.delete('/:id/cancel', authenticateJWT, authorizeDoctor, DoctorSubscriptionsController.cancelSubscriptionRequest);

// ==================== ADMIN ROUTES ====================

/**
 * @route   GET /api/doctor-subscriptions/admin/all
 * @desc    Get all subscriptions
 * @access  Private (Admin only)
 * @query   status (optional): filter by status
 * @query   doctor_id (optional): filter by doctor
 * @query   package_id (optional): filter by package
 */
router.get('/admin/all', authenticateJWT, authorizeAnyAdmin, DoctorSubscriptionsController.getAllSubscriptions);

/**
 * @route   GET /api/doctor-subscriptions/admin/:id
 * @desc    Get subscription by ID
 * @access  Private (Admin only)
 */
router.get('/admin/:id', authenticateJWT, authorizeAnyAdmin, DoctorSubscriptionsController.getSubscriptionById);

/**
 * @route   PATCH /api/doctor-subscriptions/admin/:id/approve
 * @desc    Approve subscription (change status to active)
 * @access  Private (Admin only)
 */
router.patch('/admin/:id/approve', authenticateJWT, authorizeAnyAdmin, DoctorSubscriptionsController.approveSubscription);

/**
 * @route   PUT /api/doctor-subscriptions/admin/:id
 * @desc    Update subscription
 * @access  Private (Admin only)
 * @body    {
 *            subscription_status: "enum (optional)",
 *            is_trial: boolean (optional),
 *            start_date: "date (optional)",
 *            end_date: "date (optional)"
 *          }
 */
router.put('/admin/:id', authenticateJWT, authorizeAnyAdmin, parseFormData, DoctorSubscriptionsController.updateSubscription);

/**
 * @route   PATCH /api/doctor-subscriptions/admin/:id/expire
 * @desc    Expire/Cancel subscription
 * @access  Private (Admin only)
 * @body    {
 *            reason: "string (optional)"
 *          }
 */
router.patch('/admin/:id/expire', authenticateJWT, authorizeAnyAdmin, parseFormData, DoctorSubscriptionsController.expireSubscription);

/**
 * @route   DELETE /api/doctor-subscriptions/admin/:id
 * @desc    Delete subscription
 * @access  Private (Admin only)
 */
router.delete('/admin/:id', authenticateJWT, authorizeAnyAdmin, DoctorSubscriptionsController.deleteSubscription);

module.exports = router;

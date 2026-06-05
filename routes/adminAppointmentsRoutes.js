const express = require('express');
const router = express.Router();
const AdminAppointmentsController = require('../controllers/adminAppointmentsController');
const { authenticateJWT, authorizeAdmin } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Admin Appointments Routes
 * مسارات مواعيد الإداريين
 * Base: /api/admin/appointments
 */

// All routes require authentication and admin authorization
router.use(authenticateJWT, authorizeAdmin, checkAccountActive, parseFormData);

/**
 * @route   GET /api/admin/appointments/statistics
 * @desc    Get appointment statistics
 * @access  Private (Admin only)
 * @query   {
 *            from_date: "YYYY-MM-DD" (optional),
 *            to_date: "YYYY-MM-DD" (optional),
 *            doctor_id: number (optional)
 *          }
 */
router.get('/statistics', AdminAppointmentsController.getStatistics);

/**
 * @route   GET /api/admin/appointments
 * @desc    Get all appointments
 * @access  Private (Admin only)
 * @query   {
 *            status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled" (optional),
 *            doctor_id: number (optional),
 *            patient_id: number (optional),
 *            appointment_type: "consultation|follow_up|urgent|routine" (optional),
 *            urgency_level: "low|medium|high|emergency" (optional),
 *            payment_status: "pending|paid|refunded|failed" (optional),
 *            from_date: "YYYY-MM-DD" (optional),
 *            to_date: "YYYY-MM-DD" (optional),
 *            page: number (default: 1),
 *            limit: number (default: 20)
 *          }
 */
router.get('/', AdminAppointmentsController.getAllAppointments);

/**
 * @route   GET /api/admin/appointments/:id
 * @desc    Get single appointment details
 * @access  Private (Admin only)
 * @param   id - Appointment ID or UUID
 */
router.get('/:id', AdminAppointmentsController.getAppointmentById);

/**
 * @route   POST /api/admin/appointments
 * @desc    Create appointment (admin creates for patient)
 * @access  Private (Admin only)
 * @body    {
 *            patient_id: number (required),
 *            schedule_id: number (required) - ID from doctor_schedules table,
 *            scheduled_date: "YYYY-MM-DD" (required),
 *            actual_start_time: "HH:MM:SS" (required) - Actual slot time,
 *            appointment_type: "consultation|follow_up|urgent|routine" (default: "consultation"),
 *            urgency_level: "low|medium|high|emergency" (default: "medium"),
 *            payment_status: "pending|paid|refunded|failed" (default: "pending"),
 *            language_code: "ar|en" (optional),
 *            chief_complaint: "string" (optional),
 *            symptoms_description: "text" (optional),
 *            notes: "text" (optional)
 *          }
 * @note    doctor_id, clinic_id, duration_minutes, consultation_fee, and currency_code
 *          are automatically fetched from doctor_schedules table using schedule_id
 */
router.post('/', AdminAppointmentsController.createAppointment);

/**
 * @route   PUT /api/admin/appointments/:id
 * @desc    Update appointment
 * @access  Private (Admin only)
 * @param   id - Appointment ID or UUID
 * @body    {
 *            scheduled_date: "YYYY-MM-DD" (optional),
 *            actual_start_time: "HH:MM:SS" (optional),
 *            duration_minutes: number (optional),
 *            appointment_type: "consultation|follow_up|urgent|routine" (optional),
 *            urgency_level: "low|medium|high|emergency" (optional),
 *            consultation_fee: decimal (optional),
 *            currency_code: "EGP|USD|..." (optional),
 *            payment_status: "pending|paid|refunded|failed" (optional),
 *            status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled" (optional)
 *          }
 */
router.put('/:id', AdminAppointmentsController.updateAppointment);

/**
 * @route   PATCH /api/admin/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private (Admin only)
 * @param   id - Appointment ID or UUID
 * @body    {
 *            cancellation_reason: "string" or { ar: "reason", en: "reason" }
 *          }
 */
router.patch('/:id/cancel', AdminAppointmentsController.cancelAppointment);

/**
 * @route   DELETE /api/admin/appointments/:id
 * @desc    Delete appointment
 * @access  Private (Admin only)
 * @param   id - Appointment ID or UUID
 */
router.delete('/:id', AdminAppointmentsController.deleteAppointment);

module.exports = router;

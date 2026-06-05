const express = require('express');
const router = express.Router();
const DoctorAppointmentsController = require('../controllers/doctorAppointmentsController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Appointments Routes
 * مسارات مواعيد الأطباء
 * Base: /api/doctor/appointments
 */

// All routes require authentication and doctor authorization
router.use(authenticateJWT, authorizeDoctor, checkAccountActive, parseFormData);

/**
 * @route   GET /api/doctor/appointments/today
 * @desc    Get today's appointments
 * @access  Private (Doctor only)
 */
router.get('/today', DoctorAppointmentsController.getTodayAppointments);

/**
 * @route   GET /api/doctor/appointments/statistics
 * @desc    Get appointment statistics
 * @access  Private (Doctor only)
 * @query   {
 *            from_date: "YYYY-MM-DD" (optional),
 *            to_date: "YYYY-MM-DD" (optional)
 *          }
 */
router.get('/statistics', DoctorAppointmentsController.getStatistics);

/**
 * @route   GET /api/doctor/appointments
 * @desc    Get doctor's appointments
 * @access  Private (Doctor only)
 * @query   {
 *            status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled" (optional),
 *            appointment_type: "consultation|follow_up|urgent|routine" (optional),
 *            from_date: "YYYY-MM-DD" (optional),
 *            to_date: "YYYY-MM-DD" (optional),
 *            page: number (default: 1),
 *            limit: number (default: 20)
 *          }
 */
router.get('/', DoctorAppointmentsController.getMyAppointments);

/**
 * @route   GET /api/doctor/appointments/:id
 * @desc    Get single appointment details
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 */
router.get('/:id', DoctorAppointmentsController.getAppointmentById);

/**
 * @route   PATCH /api/doctor/appointments/:id/confirm
 * @desc    Confirm appointment
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 */
router.patch('/:id/confirm', DoctorAppointmentsController.confirmAppointment);

/**
 * @route   PATCH /api/doctor/appointments/:id/start
 * @desc    Start appointment (mark as in progress)
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 */
router.patch('/:id/start', DoctorAppointmentsController.startAppointment);

/**
 * @route   PATCH /api/doctor/appointments/:id/complete
 * @desc    Complete appointment
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 */
router.patch('/:id/complete', DoctorAppointmentsController.completeAppointment);

/**
 * @route   PATCH /api/doctor/appointments/:id/no-show
 * @desc    Mark appointment as no-show
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 */
router.patch('/:id/no-show', DoctorAppointmentsController.markNoShow);

/**
 * @route   PATCH /api/doctor/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private (Doctor only)
 * @param   id - Appointment ID or UUID
 * @body    {
 *            cancellation_reason: "string" or { ar: "reason", en: "reason" }
 *          }
 */
router.patch('/:id/cancel', DoctorAppointmentsController.cancelAppointment);

module.exports = router;

const express = require('express');
const router = express.Router();
const PatientAppointmentsController = require('../controllers/patientAppointmentsController');
const { authenticateJWT, authorizeUser } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Patient Appointments Routes
 * مسارات مواعيد المرضى
 * Base: /api/patient/appointments
 */

// All routes require authentication and user authorization
router.use(authenticateJWT, authorizeUser, checkAccountActive, parseFormData);

/**
 * @route   GET /api/patient/appointments/available-slots
 * @desc    Get available time slots for a doctor by day of week
 * @access  Private (Patient only)
 * @query   doctor_id (required) - Doctor ID
 * @query   day_of_week (required) - Day name: saturday, sunday, monday, tuesday, wednesday, thursday, friday
 * @query   consultation_type (optional) - online or in_clinic
 */
router.get('/available-slots', PatientAppointmentsController.getAvailableSlots);

/**
 * @route   GET /api/patient/appointments
 * @desc    Get patient's appointments
 * @access  Private (Patient only)
 * @query   {
 *            status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled" (optional),
 *            from_date: "YYYY-MM-DD" (optional),
 *            to_date: "YYYY-MM-DD" (optional),
 *            page: number (default: 1),
 *            limit: number (default: 20)
 *          }
 */
router.get('/', PatientAppointmentsController.getMyAppointments);

/**
 * @route   GET /api/patient/appointments/:id
 * @desc    Get single appointment details
 * @access  Private (Patient only)
 * @param   id - Appointment ID or UUID
 */
router.get('/:id', PatientAppointmentsController.getAppointmentById);

/**
 * @route   POST /api/patient/appointments
 * @desc    Book a new appointment
 * @access  Private (Patient only)
 * @body    {
 *            schedule_id: number (required) - ID from doctor_schedules table,
 *            scheduled_date: "YYYY-MM-DD" (required),
 *            actual_start_time: "HH:MM:SS" (required) - Actual slot time,
 *            appointment_type: "consultation|follow_up|urgent|routine" (default: "consultation"),
 *            urgency_level: "low|medium|high|emergency" (default: "medium"),
 *            language_code: "ar|en" (optional, defaults to user's language),
 *            chief_complaint: "string" (optional) - Main complaint,
 *            symptoms_description: "text" (optional) - Detailed symptoms,
 *            notes: "text" (optional) - Additional notes
 *          }
 * @note    doctor_id, clinic_id, duration_minutes, consultation_fee, and currency_code
 *          are automatically fetched from doctor_schedules table using schedule_id
 */
router.post('/', PatientAppointmentsController.bookAppointment);

/**
 * @route   PATCH /api/patient/appointments/:id/cancel
 * @desc    Cancel appointment
 * @access  Private (Patient only)
 * @param   id - Appointment ID or UUID
 * @body    {
 *            cancellation_reason: "string" or { ar: "reason", en: "reason" }
 *          }
 */
router.patch('/:id/cancel', PatientAppointmentsController.cancelAppointment);

/**
 * @route   PATCH /api/patient/appointments/:id/reschedule
 * @desc    Reschedule appointment
 * @access  Private (Patient only)
 * @param   id - Appointment ID or UUID
 * @body    {
 *            scheduled_date: "YYYY-MM-DD" (required),
 *            actual_start_time: "HH:MM:SS" (required)
 *          }
 */
router.patch('/:id/reschedule', PatientAppointmentsController.rescheduleAppointment);

module.exports = router;

const express = require('express');
const router = express.Router();
const DoctorSchedulesController = require('../controllers/doctorSchedulesController');
const { authenticateJWT, authorizeDoctor } = require('../middleware/authMiddleware');
const { checkAccountActive } = require('../middleware/checkAccountActive');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Doctor Schedules Routes
 * مسارات جداول مواعيد الأطباء
 * Base path: /api/doctor-schedules
 */

// All routes require authentication and doctor authorization
router.use(authenticateJWT, authorizeDoctor, checkAccountActive, parseFormData);

/**
 * @route   POST /api/doctor-schedules
 * @desc    Create a new schedule
 * @access  Private (Doctor only)
 * @body    {
 *            clinic_id: number (optional, null for online),
 *            day_of_week: "saturday|sunday|monday|tuesday|wednesday|thursday|friday",
 *            start_time: "HH:MM:SS",
 *            end_time: "HH:MM:SS",
 *            session_price: number,
 *            currency_code: string (optional, 3-char ISO code like "USD", "EGP"),
 *            session_duration: number (in minutes),
 *            consultation_type: "online|in_clinic"
 *          }
 */
router.post('/', DoctorSchedulesController.createSchedule);

/**
 * @route   GET /api/doctor-schedules
 * @desc    Get all schedules for current doctor
 * @access  Private (Doctor only)
 * @query   consultation_type: "online|in_clinic" (optional)
 *          is_active: "true|false" (optional)
 *          day_of_week: "saturday|sunday|..." (optional)
 */
router.get('/', DoctorSchedulesController.getDoctorSchedules);

/**
 * @route   GET /api/doctor-schedules/:id
 * @desc    Get single schedule by ID
 * @access  Private (Doctor only)
 */
router.get('/:id', DoctorSchedulesController.getScheduleById);

/**
 * @route   PUT /api/doctor-schedules/:id
 * @desc    Update schedule
 * @access  Private (Doctor only)
 * @body    {
 *            clinic_id: number (optional),
 *            day_of_week: "saturday|sunday|..." (optional),
 *            start_time: "HH:MM:SS" (optional),
 *            end_time: "HH:MM:SS" (optional),
 *            session_price: number (optional),
 *            currency_code: string (optional, 3-char ISO code),
 *            session_duration: number (optional),
 *            consultation_type: "online|in_clinic" (optional),
 *            is_active: boolean (optional)
 *          }
 */
router.put('/:id', DoctorSchedulesController.updateSchedule);

/**
 * @route   DELETE /api/doctor-schedules/:id
 * @desc    Delete schedule (soft delete - sets is_active = 0)
 * @access  Private (Doctor only)
 */
router.delete('/:id', DoctorSchedulesController.deleteSchedule);

/**
 * @route   DELETE /api/doctor-schedules/:id/permanent
 * @desc    Permanently delete schedule
 * @access  Private (Doctor only)
 */
router.delete('/:id/permanent', DoctorSchedulesController.permanentDeleteSchedule);

/**
 * @route   GET /api/doctor-schedules/grouped/by-day
 * @desc    Get schedules grouped by day of week
 * @access  Private (Doctor only)
 * @query   consultation_type: "online|in_clinic" (optional)
 *          is_active: "true|false" (optional)
 */
router.get('/grouped/by-day', DoctorSchedulesController.getSchedulesGroupedByDay);

/**
 * @route   GET /api/doctor-schedules/grouped/by-type
 * @desc    Get schedules grouped by consultation type
 * @access  Private (Doctor only)
 * @query   is_active: "true|false" (optional)
 */
router.get('/grouped/by-type', DoctorSchedulesController.getSchedulesGroupedByType);

/**
 * @route   GET /api/doctor-schedules/grouped/by-clinic
 * @desc    Get schedules grouped by clinic
 * @access  Private (Doctor only)
 * @query   is_active: "true|false" (optional)
 */
router.get('/grouped/by-clinic', DoctorSchedulesController.getSchedulesGroupedByClinic);

/**
 * @route   GET /api/doctor-schedules/summary/weekly
 * @desc    Get weekly schedule summary with statistics
 * @access  Private (Doctor only)
 */
router.get('/summary/weekly', DoctorSchedulesController.getWeeklySummary);

/**
 * @route   GET /api/doctor-schedules/available-slots/:day
 * @desc    Get available time slots for a specific day
 * @access  Private (Doctor only)
 * @params  day: "saturday|sunday|monday|tuesday|wednesday|thursday|friday"
 * @query   consultation_type: "online|in_clinic" (optional)
 */
router.get('/available-slots/:day', DoctorSchedulesController.getAvailableSlots);

/**
 * @route   POST /api/doctor-schedules/bulk
 * @desc    Create multiple schedules at once
 * @access  Private (Doctor only)
 * @body    {
 *            schedules: [
 *              {
 *                clinic_id: number (optional),
 *                day_of_week: "saturday|...",
 *                start_time: "HH:MM:SS",
 *                end_time: "HH:MM:SS",
 *                session_price: number,
 *                currency_code: string (optional, 3-char ISO code),
 *                session_duration: number,
 *                consultation_type: "online|in_clinic"
 *              }
 *            ]
 *          }
 */
router.post('/bulk', DoctorSchedulesController.bulkCreateSchedules);

/**
 * @route   PATCH /api/doctor-schedules/:id/toggle
 * @desc    Toggle schedule active status (activate/deactivate)
 * @access  Private (Doctor only)
 */
router.patch('/:id/toggle', DoctorSchedulesController.toggleScheduleStatus);

module.exports = router;

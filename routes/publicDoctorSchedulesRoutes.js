const express = require('express');
const router = express.Router();
const DoctorSchedulesController = require('../controllers/doctorSchedulesController');

/**
 * Public Doctor Schedules Routes
 * مسارات جداول مواعيد الأطباء العامة (بدون مصادقة)
 * Base path: /api/public/doctor-schedules
 */

/**
 * @route   GET /api/public/doctor-schedules/:doctorId
 * @desc    Get public schedules for a specific doctor
 * @access  Public (No authentication required)
 * @query   consultation_type: "online|in_clinic" (optional)
 *          day_of_week: "saturday|sunday|..." (optional)
 */
router.get('/:doctorId', DoctorSchedulesController.getPublicDoctorSchedules);

/**
 * @route   GET /api/public/doctor-schedules/:doctorId/grouped/by-day
 * @desc    Get public schedules grouped by day of week
 * @access  Public (No authentication required)
 * @query   consultation_type: "online|in_clinic" (optional)
 */
router.get('/:doctorId/grouped/by-day', DoctorSchedulesController.getPublicSchedulesGroupedByDay);

/**
 * @route   GET /api/public/doctor-schedules/:doctorId/grouped/by-type
 * @desc    Get public schedules grouped by consultation type
 * @access  Public (No authentication required)
 */
router.get('/:doctorId/grouped/by-type', DoctorSchedulesController.getPublicSchedulesGroupedByType);

/**
 * @route   GET /api/public/doctor-schedules/:doctorId/available-slots/:day
 * @desc    Get available time slots for a specific day
 * @access  Public (No authentication required)
 * @params  day: "saturday|sunday|monday|tuesday|wednesday|thursday|friday"
 * @query   consultation_type: "online|in_clinic" (optional)
 */
router.get('/:doctorId/available-slots/:day', DoctorSchedulesController.getPublicAvailableSlots);

/**
 * @route   GET /api/public/doctor-schedules/:doctorId/summary/weekly
 * @desc    Get weekly schedule summary with statistics
 * @access  Public (No authentication required)
 */
router.get('/:doctorId/summary/weekly', DoctorSchedulesController.getPublicWeeklySummary);

module.exports = router;

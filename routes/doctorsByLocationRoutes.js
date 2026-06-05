const express = require('express');
const router = express.Router();
const DoctorsByLocationController = require('../controllers/doctorsByLocationController');

/**
 * Doctors By Location Routes
 * مسارات عرض الأطباء حسب الموقع
 * 
 * Base Path: /api/doctors-by-location
 * 
 * جميع الـ endpoints عامة (Public) - لا تتطلب مصادقة
 */

// =============================================
// Public Routes - لا تتطلب مصادقة
// =============================================

/** 
 * @route   GET /api/doctors-by-location
 * @desc    Get doctors by specific location
 * @desc    عرض الأطباء في موقع محدد
 * @access  Public
 * @query   {number} countries_cities_id - معرف الموقع (مطلوب)
 * @query   {string} level_type - نوع المستوى (country, city, region, district) - اختياري
 * @query   {number} page - رقم الصفحة (افتراضي: 1)
 * @query   {number} limit - عدد النتائج (افتراضي: 20)
 * @query   {string} lang - اللغة (ar/en) - افتراضي: ar
 * 
 * @example
 * GET /api/doctors-by-location?countries_cities_id=1&level_type=city&page=1&limit=10&lang=ar
 */
router.get('/', DoctorsByLocationController.getDoctorsByLocation);

/**
 * @route   GET /api/doctors-by-location/count
 * @desc    Get count of doctors in a specific location
 * @desc    عرض عدد الأطباء في موقع محدد
 * @access  Public
 * @query   {number} countries_cities_id - معرف الموقع (مطلوب)
 * @query   {string} level_type - نوع المستوى (اختياري)
 * 
 * @example
 * GET /api/doctors-by-location/count?countries_cities_id=1&level_type=city
 */
router.get('/count', DoctorsByLocationController.getDoctorsCountByLocation);

/**
 * @route   GET /api/doctors-by-location/grouped
 * @desc    Get doctors grouped by locations
 * @desc    عرض الأطباء مجمعين حسب المواقع
 * @access  Public
 * @query   {string} level_type - نوع المستوى (country, city, region, district) - مطلوب
 * @query   {number} parent_id - معرف الموقع الأب (اختياري)
 * @query   {string} lang - اللغة (ar/en) - افتراضي: ar
 * 
 * @example
 * GET /api/doctors-by-location/grouped?level_type=city&parent_id=1&lang=ar
 */
router.get('/grouped', DoctorsByLocationController.getDoctorsGroupedByLocation);

/**
 * @route   GET /api/doctors-by-location/search
 * @desc    Search doctors by location with advanced filters
 * @desc    البحث عن الأطباء حسب الموقع مع فلاتر متقدمة
 * @access  Public
 * @query   {number} countries_cities_id - معرف الموقع (مطلوب)
 * @query   {string} specialization - التخصص (اختياري)
 * @query   {number} min_experience - الحد الأدنى لسنوات الخبرة (اختياري)
 * @query   {boolean} include_children - تضمين المواقع الفرعية (افتراضي: true)
 * @query   {string} sort_by - ترتيب حسب (experience, name, created_at, rating) - افتراضي: rating
 * @query   {string} order - اتجاه الترتيب (asc, desc) - افتراضي: desc
 * @query   {number} page - رقم الصفحة (افتراضي: 1)
 * @query   {number} limit - عدد النتائج (افتراضي: 20)
 * @query   {string} lang - اللغة (ar/en) - افتراضي: ar
 * 
 * @example
 * GET /api/doctors-by-location/search?countries_cities_id=1&specialization=قلب&min_experience=5&sort_by=rating&order=desc&page=1&limit=10&lang=ar
 */
router.get('/search', DoctorsByLocationController.searchDoctorsByLocation);

/**
 * @route   GET /api/doctors-by-location/nearby
 * @desc    Get doctors near a GPS location using Haversine formula
 * @desc    البحث عن الأطباء القريبين باستخدام إحداثيات GPS
 * @access  Public
 * @query   {number} latitude - خط العرض (مطلوب)
 * @query   {number} longitude - خط الطول (مطلوب)
 * @query   {number} radius - نصف القطر بالكيلومتر (افتراضي: 5)
 * @query   {number} page - رقم الصفحة (افتراضي: 1)
 * @query   {number} limit - عدد النتائج (افتراضي: 20)
 * @query   {string} lang - اللغة (ar/en) - افتراضي: ar
 * 
 * @example
 * GET /api/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=10&page=1&limit=20&lang=ar
 */
router.get('/nearby', DoctorsByLocationController.getDoctorsNearby);

module.exports = router;

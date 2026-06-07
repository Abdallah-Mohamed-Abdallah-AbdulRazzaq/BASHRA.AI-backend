const express = require('express');
const router = express.Router();
const RatingsController = require('../controllers/ratingsController');
const { authenticateJWT, authorizeUser, authorizeDoctor, authorizeAdmin } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Ratings Routes
 * Base Path: /api/ratings
 */

router.get('/', authenticateJWT, RatingsController.getAllRatings);
router.get('/list', authenticateJWT, RatingsController.getAllRatings);
router.get('/doctor/:doctor_id/stats', RatingsController.getDoctorRatingStats);
router.get('/:id', authenticateJWT, RatingsController.getRatingById);

router.post('/', authenticateJWT, authorizeUser, parseFormData, RatingsController.createRating);
router.put('/:id', authenticateJWT, authorizeUser, parseFormData, RatingsController.updateRating);
router.delete('/:id', authenticateJWT, authorizeUser, RatingsController.deleteRating);
router.post('/:id/respond', authenticateJWT, authorizeDoctor, parseFormData, RatingsController.respondToRating);
router.patch('/:id/flag', authenticateJWT, authorizeAdmin, parseFormData, RatingsController.flagRating);
router.patch('/:id/status', authenticateJWT, authorizeAdmin, parseFormData, RatingsController.updateRatingStatus);

module.exports = router;







































// const express = require('express');
// const router = express.Router();
// const RatingsController = require('../controllers/ratingsController');
// const { authenticateJWT, authorizeUser, authorizeDoctor, authorizeAdmin } = require('../middleware/authMiddleware');
// const { parseFormData } = require('../middleware/formDataMiddleware');

// /**
//  * Ratings Routes
//  * Base Path: /api/ratings
//  * 
//  * Patient: Create, Update (own), Delete (own), View (own)
//  * Doctor: View (own ratings), Respond to ratings
//  * Admin: View all, Flag, Update status
//  */

// /**
//  * @route   GET /api/ratings
//  * @desc    Get all ratings (filtered by user role)
//  * @access  Private (Patient, Doctor, Admin)
//  * @query   doctor_id, patient_id, status, min_rating, max_rating, page, limit
//  */
// router.get('/', authenticateJWT, RatingsController.getAllRatings);

// /**
//  * @route   GET /api/ratings/doctor/:doctor_id/stats
//  * @desc    Get doctor rating statistics
//  * @access  Public
//  */
// router.get('/doctor/:doctor_id/stats', RatingsController.getDoctorRatingStats);

// /**
//  * @route   GET /api/ratings/:id
//  * @desc    Get single rating by ID or UUID
//  * @access  Private (Patient, Doctor, Admin)
//  */
// router.get('/:id', authenticateJWT, RatingsController.getRatingById);

// /**
//  * @route   POST /api/ratings
//  * @desc    Create new rating
//  * @access  Private (Patient only)
//  * @body    {
//  *            appointment_id: number (required),
//  *            doctor_id: number (required),
//  *            rating: number (required, 1-5),
//  *            categories: object (optional),
//  *            would_recommend: boolean (optional),
//  *            is_anonymous: boolean (optional, default: false),
//  *            translations: {
//  *              "ar": {
//  *                "review_title": "string",
//  *                "review_comment": "text"
//  *              },
//  *              "en": {...}
//  *            }
//  *          }
//  */
// router.post('/', authenticateJWT, authorizeUser, parseFormData, RatingsController.createRating);

// /**
//  * @route   PUT /api/ratings/:id
//  * @desc    Update rating (Patient only - own ratings)
//  * @access  Private (Patient only)
//  * @body    Same as POST (all fields optional)
//  */
// router.put('/:id', authenticateJWT, authorizeUser, parseFormData, RatingsController.updateRating);

// /**
//  * @route   DELETE /api/ratings/:id
//  * @desc    Delete rating (Patient only - own ratings)
//  * @access  Private (Patient only)
//  */
// router.delete('/:id', authenticateJWT, authorizeUser, RatingsController.deleteRating);

// /**
//  * @route   POST /api/ratings/:id/respond
//  * @desc    Doctor responds to rating
//  * @access  Private (Doctor only)
//  * @body    {
//  *            language_code: "string (required: ar, en)",
//  *            response: "text (required)"
//  *          }
//  */
// router.post('/:id/respond', authenticateJWT, authorizeDoctor, parseFormData, RatingsController.respondToRating);

// /**
//  * @route   PATCH /api/ratings/:id/flag
//  * @desc    Flag rating (Admin only)
//  * @access  Private (Admin only)
//  * @body    {
//  *            language_code: "string (optional)",
//  *            reason: "string (required)"
//  *          }
//  */
// router.patch('/:id/flag', authenticateJWT, authorizeAdmin, parseFormData, RatingsController.flagRating);

// /**
//  * @route   PATCH /api/ratings/:id/status
//  * @desc    Update rating status (Admin only)
//  * @access  Private (Admin only)
//  * @body    {
//  *            status: "string (required: active, hidden, removed)"
//  *          }
//  */
// router.patch('/:id/status', authenticateJWT, authorizeAdmin, parseFormData, RatingsController.updateRatingStatus);

// module.exports = router;

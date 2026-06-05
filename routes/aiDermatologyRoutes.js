const express = require('express');
const router = express.Router();

const AIDermatologyController = require('../controllers/AIDermatologyController');
const {
  authenticateJWT,
  authorizeUser,
  authorizeDoctor
} = require('../middleware/authMiddleware');

const { parseFormData } = require('../middleware/formDataMiddleware');
const { uploadMiddleware } = require('../middleware/fileUploadMiddleware');

/**
 * AI Dermatology Routes
 * شات وتحليل ذكاء اصطناعي منفصل عن شات التطبيق
 * Base path: /api/ai-dermatology
 */

/**
 * Doctor AI Dermatology Routes
 * These routes must be registered before user-only middleware.
 */

/**
 * @route   GET /api/ai-dermatology/doctor/shared-sessions
 * @desc    Doctor: get AI sessions shared with me
 * @access  Doctor only
 */
router.get(
  '/doctor/shared-sessions',
  authenticateJWT,
  authorizeDoctor,
  AIDermatologyController.doctorGetSharedSessions
);

/**
 * @route   GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
 * @desc    Doctor: get shared AI session details
 * @access  Doctor only
 */
router.get(
  '/doctor/shared-sessions/:shareUuid',
  authenticateJWT,
  authorizeDoctor,
  AIDermatologyController.doctorGetSharedSessionByShareUuid
);

/**
 * @route   GET /api/ai-dermatology/doctor/files/:fileUuid
 * @desc    Doctor: securely view AI file from shared session
 * @access  Doctor only
 */
router.get(
  '/doctor/files/:fileUuid',
  authenticateJWT,
  authorizeDoctor,
  AIDermatologyController.doctorGetSecureAIFile
);


/**
 * @route   PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
 * @desc    Doctor: review AI analysis result shared with him
 * @access  Doctor only
 */
router.patch(
  '/doctor/results/:resultUuid/review',
  authenticateJWT,
  authorizeDoctor,
  parseFormData,
  AIDermatologyController.doctorReviewAIResult
);







// All routes here are for normal app users only
router.use(authenticateJWT, authorizeUser);

/**
 * @route   POST /api/ai-dermatology/sessions
 * @desc    Create a new AI session
 * @access  User only
 */
router.post('/sessions', parseFormData, AIDermatologyController.createSession);

/**
 * @route   GET /api/ai-dermatology/sessions
 * @desc    Get my AI sessions
 * @access  User only
 */
router.get('/sessions', AIDermatologyController.getMySessions);

/**
 * @route   GET /api/ai-dermatology/sessions/:uuid
 * @desc    Get AI session details
 * @access  User only
 */
router.get('/sessions/:uuid', AIDermatologyController.getSessionByUuid);

/**
 * @route   POST /api/ai-dermatology/sessions/:uuid/messages
 * @desc    Send text message to AI dermatology session
 * @access  User only
 */
router.post('/sessions/:uuid/messages', parseFormData, AIDermatologyController.sendTextMessage);

/**
 * @route   POST /api/ai-dermatology/sessions/:uuid/images
 * @desc    Upload and analyze skin image in AI dermatology session
 * @access  User only
 * @form    image: file, description: string
 */
router.post(
  '/sessions/:uuid/images',
  uploadMiddleware.singleImage,
  AIDermatologyController.analyzeImage
);

/**
 * @route   POST /api/ai-dermatology/sessions/:uuid/documents
 * @desc    Upload and analyze medical report/document in AI dermatology session
 * @access  User only
 * @form    document: file, description: string
 */
router.post(
  '/sessions/:uuid/documents',
  uploadMiddleware.singleDocument,
  AIDermatologyController.analyzeDocument
);

/**
 * @route   POST /api/ai-dermatology/sessions/:uuid/complete
 * @desc    Complete AI session and generate final summary
 * @access  User only
 */
router.post('/sessions/:uuid/complete', AIDermatologyController.completeSession);

/**
 * @route   POST /api/ai-dermatology/sessions/:uuid/share
 * @desc    Share AI session/result with a doctor or appointment
 * @access  User only
 */
router.post('/sessions/:uuid/share', parseFormData, AIDermatologyController.shareSession);

/**
 * @route   GET /api/ai-dermatology/sessions/:uuid/shares
 * @desc    Get shares for an AI session
 * @access  User only
 */
router.get('/sessions/:uuid/shares', AIDermatologyController.getSessionShares);

/**
 * @route   PATCH /api/ai-dermatology/shares/:shareUuid/revoke
 * @desc    Revoke AI session/result share
 * @access  User only
 */
router.patch('/shares/:shareUuid/revoke', AIDermatologyController.revokeShare);

/**
 * @route   GET /api/ai-dermatology/files/:fileUuid
 * @desc    Securely view AI-related private file
 * @access  User only
 */
router.get('/files/:fileUuid', AIDermatologyController.getSecureAIFile);

/**
 * @route   GET /api/ai-dermatology/usage
 * @desc    Get my AI usage and remaining limits
 * @access  User only
 */
router.get('/usage', AIDermatologyController.getMyUsage);

module.exports = router;
// routes/authUserRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticateJWT, authorizeUser, validateRefreshToken } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

// Apply form-data middleware to all routes (supports both JSON and form-data)
router.use(parseFormData);

// Public routes
router.post('/register', (req, res) => { req.body.entityType = 'user'; AuthController.register(req, res); });

router.post('/login', (req, res) => { req.body.entityType = 'user'; AuthController.login(req, res); });

router.post('/verify-otp', (req, res) => { req.body.entityType = 'user'; AuthController.verifyOtp(req, res); });

router.post('/resend-otp', (req, res) => { req.body.entityType = 'user'; AuthController.resendOtp(req, res); });

router.post('/refresh-token', validateRefreshToken, AuthController.refreshToken);

router.post('/request-password-reset', (req, res) => { req.body.entityType = 'user'; AuthController.requestPasswordReset(req, res); });

router.post('/verify-password-reset-otp', (req, res) => { req.body.entityType = 'user'; AuthController.verifyPasswordResetOtp(req, res); });

router.post('/reset-password', AuthController.resetPassword);


// New OTP password reset endpoints
router.post('/request-password-reset-otp', (req, res) => { req.body.entityType = 'user'; AuthController.requestPasswordResetOtp(req, res); });
router.post('/reset-password-otp', (req, res) => { req.body.entityType = 'user'; AuthController.resetPasswordOtp(req, res); });

// Protected routes (require authentication)
router.use(authenticateJWT, authorizeUser);

router.post('/logout', AuthController.logout);
router.get('/sessions', AuthController.getActiveSessions);
router.get('/security-logs', AuthController.getSecurityLogs);

// Change password from within app (requires authentication)
router.post('/change-password-in-app', AuthController.changePasswordInApp);

module.exports = router;
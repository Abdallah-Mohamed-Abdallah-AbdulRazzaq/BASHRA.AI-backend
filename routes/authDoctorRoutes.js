// routes/authDoctorRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  authenticateJWT, 
  authorizeDoctor, 
  validateRefreshToken
} = require('../middleware/authMiddleware');

// Apply form-data middleware to all routes (supports both JSON and form-data)
router.use(parseFormData);

// Public routes
router.post('/register', (req, res) => { req.body.entityType = 'doctor'; AuthController.register(req, res); });

router.post('/login', (req, res) => { req.body.entityType = 'doctor'; AuthController.login(req, res); });

router.post('/verify-otp', (req, res) => { req.body.entityType = 'doctor'; AuthController.verifyOtp(req, res); });

router.post('/resend-otp', (req, res) => { req.body.entityType = 'doctor'; AuthController.resendOtp(req, res); });

router.post('/refresh-token', validateRefreshToken, AuthController.refreshToken);

router.post('/request-password-reset', (req, res) => { req.body.entityType = 'doctor'; AuthController.requestPasswordReset(req, res); });

router.post('/verify-password-reset-otp', (req, res) => { req.body.entityType = 'doctor'; AuthController.verifyPasswordResetOtp(req, res); });

router.post('/reset-password', AuthController.resetPassword);

// New OTP password reset endpoints
router.post('/request-password-reset-otp', (req, res) => { req.body.entityType = 'doctor'; AuthController.requestPasswordResetOtp(req, res); });
router.post('/reset-password-otp', (req, res) => { req.body.entityType = 'doctor'; AuthController.resetPasswordOtp(req, res); });

// Protected routes (require authentication)
router.use(authenticateJWT, authorizeDoctor);

router.post('/logout', AuthController.logout);
router.get('/sessions', AuthController.getActiveSessions);
router.get('/security-logs', AuthController.getSecurityLogs);

// Change password from within app (requires authentication)
router.post('/change-password-in-app', AuthController.changePasswordInApp);

module.exports = router;
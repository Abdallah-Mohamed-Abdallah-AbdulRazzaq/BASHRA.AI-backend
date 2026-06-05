// routes/authAssistantRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  authenticateJWT, 
  authorizeAssistant, 
  authorizeAdminOrDoctor,
  validateRefreshToken,
  adminActionLogger 
} = require('../middleware/authMiddleware');

// Apply form-data middleware to all routes (supports both JSON and form-data)
router.use(parseFormData);


// Assistant registration (admins or doctors can register assistants)
router.post('/register', 
  authenticateJWT, 
  authorizeAdminOrDoctor,
  adminActionLogger('CREATE_ASSISTANT', (req) => ({
    targetType: 'assistant',
    newValues: { email: req.body.email }
  })),
  (req, res) => {
    req.body.entityType = 'assistant';
    AuthController.register(req, res);
  }
);


// Public routes
router.post('/login', (req, res) => { req.body.entityType = 'assistant'; AuthController.login(req, res); });
router.post('/refresh-token', validateRefreshToken, AuthController.refreshToken);
router.post('/request-password-reset', (req, res) => { req.body.entityType = 'assistant'; AuthController.requestPasswordReset(req, res); });
router.post('/verify-password-reset-otp', (req, res) => { req.body.entityType = 'assistant'; AuthController.verifyPasswordResetOtp(req, res); });

router.post('/reset-password', AuthController.resetPassword);

// --- OTP password reset endpoints ---
router.post('/request-password-reset-otp',(req,res)=>{ req.body.entityType='assistant'; AuthController.requestPasswordResetOtp(req,res); });
router.post('/reset-password-otp',(req,res)=>{ req.body.entityType='assistant'; AuthController.resetPasswordOtp(req,res); });

router.post('/verify-otp', (req, res) => { req.body.entityType = 'assistant'; AuthController.verifyOtp(req, res); });
router.post('/resend-otp', (req, res) => { req.body.entityType = 'assistant'; AuthController.resendOtp(req, res); });


// Protected routes - Assistants only
router.use(authenticateJWT, authorizeAssistant);

router.post('/logout', AuthController.logout);
router.get('/sessions', AuthController.getActiveSessions);
router.get('/security-logs', AuthController.getSecurityLogs);

// Change password from within app (requires authentication)
router.post('/change-password-in-app', AuthController.changePasswordInApp);

module.exports = router;
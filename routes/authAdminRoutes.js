// routes/authAdminRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const AdminSecurityController = require('../controllers/AdminSecurityController');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  authenticateJWT, 
  authorizeSuperAdmin, 
  authorizeSystemAdmin, 
  authorizeClinicAdmin,
  authorizeAnyAdmin,
  adminActionLogger,
  validateRefreshToken 
} = require('../middleware/authMiddleware');

// Apply form-data middleware to all routes (supports both JSON and form-data)
router.use(parseFormData);

// Public routes
router.post('/login', (req, res) => {
  req.body.entityType = 'admin';
  AuthController.login(req, res);
});

router.post('/refresh-token', validateRefreshToken, AuthController.refreshToken);

router.post('/request-password-reset', (req, res) => {
  req.body.entityType = 'admin';
  AuthController.requestPasswordReset(req, res);
});

router.post('/reset-password', AuthController.resetPassword);

// --- OTP password reset endpoints ---
router.post('/request-password-reset-otp', (req,res)=>{
  req.body.entityType='admin';
  AuthController.requestPasswordResetOtp(req,res);
});
router.post('/reset-password-otp',(req,res)=>{
  req.body.entityType='admin';
  AuthController.resetPasswordOtp(req,res);
});

// Protected routes - All admins
router.use(authenticateJWT, authorizeAnyAdmin);

router.post('/logout', AuthController.logout);
router.get('/sessions', AuthController.getActiveSessions);
router.get('/security-logs', AuthController.getSecurityLogs);

// Admin management routes
router.get('/security/stats', AdminSecurityController.getSecurityStats);
router.get('/security/alerts', AdminSecurityController.getSecurityAlerts);
router.get('/security/system-sessions', AdminSecurityController.getSystemSessions);
router.get('/security/admin-logs', AdminSecurityController.getAdminLogs);
router.get('/security/failed-logins', AdminSecurityController.getFailedLogins);
router.get('/security/blocked-entities', AdminSecurityController.getBlockedEntities);

// System Admin and above only
router.use(authorizeSystemAdmin);

router.post('/security/block-entity', 
  adminActionLogger('BLOCK_ENTITY', (req) => ({
    targetType: req.body.entityType,
    targetId: req.body.targetId,
    newValues: { blockType: req.body.blockType, reason: req.body.reason }
  })),
  AdminSecurityController.blockEntity
);

router.post('/security/unblock-entity',
  adminActionLogger('UNBLOCK_ENTITY', (req) => ({
    targetType: req.body.entityType,
    targetId: req.body.targetId,
    newValues: { reason: req.body.reason }
  })),
  AdminSecurityController.unblockEntity
);

router.post('/security/revoke-sessions',
  adminActionLogger('REVOKE_ALL_SESSIONS'),
  AdminSecurityController.revokeAllSessions
);

router.post('/security/update-entity-status',
  adminActionLogger('UPDATE_ENTITY_STATUS', (req) => ({
    targetType: req.body.entityType,
    targetId: req.body.targetId,
    newValues: { status: req.body.status, reason: req.body.reason }
  })),
  AdminSecurityController.updateEntityStatus
);

router.post('/security/end-session',
  adminActionLogger('END_SESSION'),
  AdminSecurityController.endSession
);

// Super Admin only
router.use(authorizeSuperAdmin);

router.post('/register', 
  adminActionLogger('CREATE_ADMIN', (req) => ({
    targetType: 'admin',
    newValues: { email: req.body.email, adminType: req.body.adminType }
  })),
  (req, res) => {
    req.body.entityType = 'admin';
    AuthController.register(req, res);
  }
);

router.post('/security/manual-cleanup',
  adminActionLogger('MANUAL_CLEANUP'),
  AdminSecurityController.runCleanup
);

module.exports = router;
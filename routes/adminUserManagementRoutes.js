const express = require('express');
const router = express.Router();
const AdminUserManagementController = require('../controllers/AdminUserManagementController');
const { authenticateJWT, authorizeSuperAdmin, authorizeAdmin } = require('../middleware/authMiddleware');
const { body, query, param } = require('express-validator');

/**
 * Admin User Management Routes
 * All routes require JWT authentication
 * View routes require admin role
 * Update routes require super admin role
 */

// Apply JWT authentication to all routes
router.use(authenticateJWT);

/**
 * GET /api/admin/users/stats
 * Get user statistics and counts
 * @access Admin
 */
router.get('/stats', 
  authorizeAdmin,
  AdminUserManagementController.getUserStats
);

/**
 * GET /api/admin/users/search
 * Search users by multiple criteria
 * @access Admin
 */
router.get('/search', 
  authorizeAdmin,
  [
    query('query').optional().isString().trim(),
    query('email').optional().isEmail(),
    query('phone').optional().isString().trim(),
    query('uuid').optional().isUUID(),
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_verification']),
    query('verified').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  AdminUserManagementController.searchUsers
);

/**
 * GET /api/admin/users/status/:status
 * Get users filtered by specific status
 * @access Admin
 */
router.get('/status/:status', 
  authorizeAdmin,
  [
    param('status').isIn(['active', 'inactive', 'suspended', 'pending_verification'])
      .withMessage('Invalid status value'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  AdminUserManagementController.getUsersByStatus
);

/**
 * GET /api/admin/users/:id/logs
 * Get admin action logs for a specific user
 * @access Admin
 */
router.get('/:id/logs', 
  authorizeAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
    query('action').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  AdminUserManagementController.getUserLogs
);

/**
 * GET /api/admin/users/:id/medical
 * Get user medical/patient profile
 * @access Admin
 */
router.get('/:id/medical', 
  authorizeAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
  ],
  AdminUserManagementController.getUserMedicalProfile
);

/**
 * GET /api/admin/users/:id
 * Get single user complete details
 * @access Admin
 */
router.get('/:id', 
  authorizeAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
  ],
  AdminUserManagementController.getUserById
);

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 * @access Admin
 */
router.get('/', 
  authorizeAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_verification']),
    query('verified').optional().isBoolean()
  ],
  AdminUserManagementController.getAllUsers
);

/**
 * PUT /api/admin/users/:id/status
 * Update user status (Super Admin only)
 * @access Super Admin
 */
router.put('/:id/status', 
  authorizeSuperAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid user ID'),
    body('status')
      .isIn(['active', 'inactive', 'suspended', 'pending_verification'])
      .withMessage('Invalid status value'),
    body('reason')
      .isString()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Reason must be between 10 and 500 characters')
  ],
  AdminUserManagementController.updateUserStatus
);

module.exports = router;

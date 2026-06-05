const express = require('express');
const router = express.Router();

const AdminAIUsageController = require('../controllers/AdminAIUsageController');
const {
  authenticateJWT,
  authorizeAdmin,
  authorizeSuperAdmin
} = require('../middleware/authMiddleware');

const { body, query, param } = require('express-validator');

/**
 * Admin AI Usage Routes
 * Base path after mounting: /api/admin/ai-usage
 *
 * View routes: Admin
 * Mutating routes: Super Admin
 */

router.use(authenticateJWT);

/**
 * GET /api/admin/ai-usage/overview
 * @access Admin
 */
router.get(
  '/overview',
  authorizeAdmin,
  [
    query('period_key')
      .optional()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('period_key must be in YYYY-MM format')
  ],
  AdminAIUsageController.getOverview
);

/**
 * GET /api/admin/ai-usage/users/:userId
 * @access Admin
 */
router.get(
  '/users/:userId',
  authorizeAdmin,
  [
    param('userId').isInt({ min: 1 }).withMessage('Invalid user ID')
  ],
  AdminAIUsageController.getUserAIUsage
);

/**
 * GET /api/admin/ai-usage/policies
 * @access Admin
 */
router.get(
  '/policies',
  authorizeAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('scope_type').optional().isIn(['global', 'user', 'package']),
    query('is_active').optional().isBoolean()
  ],
  AdminAIUsageController.getPolicies
);

/**
 * GET /api/admin/ai-usage/policies/:id
 * @access Admin
 */
router.get(
  '/policies/:id',
  authorizeAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid policy ID')
  ],
  AdminAIUsageController.getPolicyById
);

/**
 * POST /api/admin/ai-usage/policies
 * @access Super Admin
 */
router.post(
  '/policies',
  authorizeSuperAdmin,
  [
    body('policy_name')
      .isString()
      .trim()
      .isLength({ min: 3, max: 150 })
      .withMessage('policy_name must be between 3 and 150 characters'),

    body('scope_type')
      .isIn(['global', 'user', 'package'])
      .withMessage('Invalid scope_type'),

    body('user_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Invalid user_id'),

    body('package_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Invalid package_id'),

    body('max_total_requests_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_total_requests_per_month'),

    body('max_chat_messages_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_chat_messages_per_month'),

    body('max_image_analyses_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_image_analyses_per_month'),

    body('max_document_analyses_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_document_analyses_per_month'),

    body('max_files_per_session')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid max_files_per_session'),

    body('max_tokens_per_request')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid max_tokens_per_request'),

    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean'),

    body('priority')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid priority')
  ],
  AdminAIUsageController.createPolicy
);

/**
 * PATCH /api/admin/ai-usage/policies/:id
 * @access Super Admin
 */
router.patch(
  '/policies/:id',
  authorizeSuperAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid policy ID'),

    body('policy_name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 150 })
      .withMessage('policy_name must be between 3 and 150 characters'),

    body('scope_type')
      .optional()
      .isIn(['global', 'user', 'package'])
      .withMessage('Invalid scope_type'),

    body('user_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Invalid user_id'),

    body('package_id')
      .optional({ nullable: true })
      .isInt({ min: 1 })
      .withMessage('Invalid package_id'),

    body('max_total_requests_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_total_requests_per_month'),

    body('max_chat_messages_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_chat_messages_per_month'),

    body('max_image_analyses_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_image_analyses_per_month'),

    body('max_document_analyses_per_month')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid max_document_analyses_per_month'),

    body('max_files_per_session')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid max_files_per_session'),

    body('max_tokens_per_request')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid max_tokens_per_request'),

    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be boolean'),

    body('priority')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid priority')
  ],
  AdminAIUsageController.updatePolicy
);

/**
 * PATCH /api/admin/ai-usage/policies/:id/status
 * @access Super Admin
 */
router.patch(
  '/policies/:id/status',
  authorizeSuperAdmin,
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid policy ID'),

    body('is_active')
      .isBoolean()
      .withMessage('is_active must be boolean')
  ],
  AdminAIUsageController.updatePolicyStatus
);

module.exports = router;
const express = require('express');
const router = express.Router();
const BlockedEntitiesController = require('../controllers/BlockedEntitiesController');
const { parseFormData } = require('../middleware/formDataMiddleware');
const { 
  authenticateJWT, 
  authorizeSystemAdmin,
  authorizeSuperAdmin,
  authorizeAnyAdmin,
  adminActionLogger 
} = require('../middleware/authMiddleware');

/**
 * Blocked Entities Routes
 * مسارات الكيانات المحظورة
 * Base path: /api/admin/blocked-entities
 */

// Apply form-data middleware to all routes
router.use(parseFormData);

// All routes require authentication and admin authorization
router.use(authenticateJWT, authorizeAnyAdmin);

/**
 * @route   GET /api/admin/blocked-entities
 * @desc    Get all blocked entities with filters and pagination
 * @access  Private (Admin only)
 * @query   {
 *            page: number (default: 1),
 *            limit: number (default: 20),
 *            entity_type: 'user' | 'doctor' | 'assistant' | 'admin',
 *            block_type: 'temporary' | 'permanent' | 'warning',
 *            is_active: 'true' | 'false',
 *            search: string,
 *            sort_by: 'created_at' | 'blocked_until' | 'block_type' | 'removed_at',
 *            sort_order: 'ASC' | 'DESC'
 *          }
 */
router.get('/', BlockedEntitiesController.getAllBlockedEntities);

/**
 * @route   GET /api/admin/blocked-entities/statistics
 * @desc    Get blocked entities statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', BlockedEntitiesController.getBlockStatistics);

/**
 * @route   GET /api/admin/blocked-entities/check
 * @desc    Check if an entity is blocked
 * @access  Private (Admin only)
 * @query   { entity_id: number, entity_type: string }
 */
router.get('/check', BlockedEntitiesController.checkEntityBlockStatus);

/**
 * @route   GET /api/admin/blocked-entities/:blockId
 * @desc    Get block details by ID
 * @access  Private (Admin only)
 */
router.get('/:blockId', BlockedEntitiesController.getBlockDetails);

/**
 * @route   GET /api/admin/blocked-entities/history/:entity_type/:entity_id
 * @desc    Get block history for an entity
 * @access  Private (Admin only)
 */
router.get('/history/:entity_type/:entity_id', BlockedEntitiesController.getEntityBlockHistory);

// System Admin and above only for modification operations
router.use(authorizeSystemAdmin);

/**
 * @route   POST /api/admin/blocked-entities/block
 * @desc    Block an entity (user, doctor, assistant, admin)
 * @access  Private (System Admin and above, Super Admin for blocking admins)
 * @body    {
 *            entity_id: number,
 *            entity_type: 'user' | 'doctor' | 'assistant' | 'admin',
 *            block_type: 'temporary' | 'permanent' | 'warning',
 *            blocked_until: ISO date string (required for temporary),
 *            reason: string (min 10 chars)
 *          }
 */
router.post('/block',
  adminActionLogger('BLOCK_ENTITY', (req) => ({
    targetType: req.body.entity_type,
    targetId: req.body.entity_id,
    newValues: { 
      block_type: req.body.block_type, 
      blocked_until: req.body.blocked_until,
      reason: req.body.reason 
    }
  })),
  BlockedEntitiesController.blockEntity
);

/**
 * @route   POST /api/admin/blocked-entities/unblock
 * @desc    Unblock an entity
 * @access  Private (System Admin and above, Super Admin for unblocking admins)
 * @body    {
 *            entity_id: number,
 *            entity_type: 'user' | 'doctor' | 'assistant' | 'admin',
 *            reason: string
 *          }
 */
router.post('/unblock',
  adminActionLogger('UNBLOCK_ENTITY', (req) => ({
    targetType: req.body.entity_type,
    targetId: req.body.entity_id,
    newValues: { reason: req.body.reason }
  })),
  BlockedEntitiesController.unblockEntity
);

/**
 * @route   PATCH /api/admin/blocked-entities/:blockId
 * @desc    Update block record (extend, change type, update reason)
 * @access  Private (System Admin and above)
 * @body    {
 *            block_type?: 'temporary' | 'permanent' | 'warning',
 *            blocked_until?: ISO date string,
 *            reason?: string
 *          }
 */
router.patch('/:blockId',
  adminActionLogger('UPDATE_BLOCK', (req) => ({
    targetType: 'block_record',
    targetId: req.params.blockId,
    newValues: { 
      block_type: req.body.block_type,
      blocked_until: req.body.blocked_until,
      reason: req.body.reason 
    }
  })),
  BlockedEntitiesController.updateBlock
);

/**
 * @route   POST /api/admin/blocked-entities/bulk/block
 * @desc    Bulk block multiple entities
 * @access  Private (System Admin and above)
 * @body    {
 *            entities: [{ entity_id: number, entity_type: string }],
 *            block_type: 'temporary' | 'permanent' | 'warning',
 *            blocked_until: ISO date string (required for temporary),
 *            reason: string
 *          }
 */
router.post('/bulk/block',
  adminActionLogger('BULK_BLOCK_ENTITIES', (req) => ({
    targetType: 'multiple',
    newValues: { 
      entities_count: req.body.entities?.length,
      block_type: req.body.block_type,
      reason: req.body.reason 
    }
  })),
  BlockedEntitiesController.bulkBlockEntities
);

/**
 * @route   POST /api/admin/blocked-entities/bulk/unblock
 * @desc    Bulk unblock multiple entities
 * @access  Private (System Admin and above)
 * @body    {
 *            entities: [{ entity_id: number, entity_type: string }],
 *            reason: string
 *          }
 */
router.post('/bulk/unblock',
  adminActionLogger('BULK_UNBLOCK_ENTITIES', (req) => ({
    targetType: 'multiple',
    newValues: { 
      entities_count: req.body.entities?.length,
      reason: req.body.reason 
    }
  })),
  BlockedEntitiesController.bulkUnblockEntities
);

/**
 * @route   POST /api/admin/blocked-entities/auto-unblock
 * @desc    Auto-unblock expired temporary blocks (can be called by scheduler)
 * @access  Private (System Admin and above)
 */
router.post('/auto-unblock',
  adminActionLogger('AUTO_UNBLOCK_EXPIRED', () => ({
    targetType: 'system',
    newValues: { action: 'auto_unblock_expired' }
  })),
  BlockedEntitiesController.autoUnblockExpired
);

module.exports = router;

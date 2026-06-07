const db = require('../config/db');
const { logAdminAction, getClientInfo } = require('../middleware/authMiddleware');
const SecurityService = require('../utils/SecurityService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'blocked-entities.log' })
  ]
});

/**
 * Blocked Entities Controller
 * معالج الكيانات المحظورة
 * يتيح للأدمن إدارة حظر وإلغاء حظر المستخدمين (users, doctors, assistants, admins)
 */
class BlockedEntitiesController {

  // Valid entity types
  static VALID_ENTITY_TYPES = ['user', 'doctor', 'assistant', 'admin'];
  
  // Valid block types
  static VALID_BLOCK_TYPES = ['temporary', 'permanent', 'warning'];

  /**
   * Get entity table name from entity type
   */
  static getTableName(entityType) {
    return entityType === 'user' ? 'users' : `${entityType}s`;
  }

  /**
   * Get blocked ID field name from entity type
   */
  static getBlockedIdField(entityType) {
    return `blocked_${entityType}_id`;
  }

  /**
   * Get profile table name from entity type
   */
  static getProfileTableName(entityType) {
    return `${entityType}_profiles`;
  }

  /**
   * Get profile translations table name from entity type
   */
  static getProfileTranslationsTableName(entityType) {
    return `${entityType}_profile_translations`;
  }

  /**
   * Block an entity (user, doctor, assistant, admin)
   * حظر كيان
   */
  static async blockEntity(req, res) {
    const { 
      entity_id, 
      entity_type, 
      block_type = 'temporary', 
      blocked_until, 
      reason 
    } = req.body;
    
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    // Validation
    if (!entity_id || !entity_type) {
      return res.status(400).json({
        success: false,
        message_ar: 'معرف الكيان ونوعه مطلوبان',
        message_en: 'Entity ID and type are required'
      });
    }

    if (!BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الكيان غير صحيح. الأنواع المسموحة: ' + BlockedEntitiesController.VALID_ENTITY_TYPES.join(', '),
        message_en: 'Invalid entity type. Allowed types: ' + BlockedEntitiesController.VALID_ENTITY_TYPES.join(', ')
      });
    }

    if (!BlockedEntitiesController.VALID_BLOCK_TYPES.includes(block_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الحظر غير صحيح. الأنواع المسموحة: ' + BlockedEntitiesController.VALID_BLOCK_TYPES.join(', '),
        message_en: 'Invalid block type. Allowed types: ' + BlockedEntitiesController.VALID_BLOCK_TYPES.join(', ')
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message_ar: 'سبب الحظر مطلوب ويجب أن يكون 10 أحرف على الأقل',
        message_en: 'Block reason is required and must be at least 10 characters'
      });
    }

    // Prevent admin from blocking themselves
    if (entity_type === 'admin' && entity_id === adminId) {
      return res.status(400).json({
        success: false,
        message_ar: 'لا يمكنك حظر نفسك',
        message_en: 'You cannot block yourself'
      });
    }

    // Only super_admin can block other admins
    if (entity_type === 'admin' && req.user.adminType !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message_ar: 'فقط المدير الأعلى يمكنه حظر المديرين الآخرين',
        message_en: 'Only super admin can block other admins'
      });
    }

    // Validate blocked_until for temporary blocks
    let blockedUntilDate = null;
    if (block_type === 'temporary') {
      if (!blocked_until) {
        return res.status(400).json({
          success: false,
          message_ar: 'تاريخ انتهاء الحظر مطلوب للحظر المؤقت',
          message_en: 'Block end date is required for temporary blocks'
        });
      }
      blockedUntilDate = new Date(blocked_until);
      if (blockedUntilDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message_ar: 'تاريخ انتهاء الحظر يجب أن يكون في المستقبل',
          message_en: 'Block end date must be in the future'
        });
      }
    }

    const connection = await db.getConnection();
    const tableName = BlockedEntitiesController.getTableName(entity_type);
    const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

    try {
      await connection.beginTransaction();

      // Check if entity exists
      const [entityRows] = await connection.query(
        `SELECT id, email, status FROM ${tableName} WHERE id = ?`,
        [entity_id]
      );

      if (entityRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'الكيان غير موجود',
          message_en: 'Entity not found'
        });
      }

      // Check if already blocked
      const [existingBlock] = await connection.query(
        `SELECT * FROM blocked_entities WHERE ${blockedIdField} = ? AND is_active = 1`,
        [entity_id]
      );

      if (existingBlock.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message_ar: 'هذا الكيان محظور بالفعل',
          message_en: 'This entity is already blocked',
          existing_block: {
            id: existingBlock[0].id,
            block_type: existingBlock[0].block_type,
            blocked_until: existingBlock[0].blocked_until,
            created_at: existingBlock[0].created_at
          }
        });
      }

      // Insert block record
      const [insertResult] = await connection.query(
        `INSERT INTO blocked_entities (${blockedIdField}, blocked_by_admin_id, block_type, blocked_until, reason, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [entity_id, adminId, block_type, blockedUntilDate, reason]
      );

      const blockId = insertResult.insertId;

      // Update entity status to suspended
      await connection.query(
        `UPDATE ${tableName} SET status = 'suspended', updated_at = NOW() WHERE id = ?`,
        [entity_id]
      );

      // Revoke all active sessions for this entity
      const entityIdField = `${entity_type}_id`;
      await connection.query(
        `UPDATE auth_tokens SET is_revoked = 1, revoked_at = NOW(), revoked_by_admin_id = ? 
         WHERE ${entityIdField} = ? AND is_revoked = 0`,
        [adminId, entity_id]
      );

      await connection.query(
        `UPDATE login_sessions SET is_active = 0, ended_at = NOW() 
         WHERE ${entityIdField} = ? AND is_active = 1`,
        [entity_id]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'BLOCK_ENTITY',
        entity_type,
        entity_id,
        { status: entityRows[0].status },
        { block_type, blocked_until: blockedUntilDate, reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Entity blocked', {
        blockId,
        entityId: entity_id,
        entityType: entity_type,
        blockType: block_type,
        blockedBy: adminId,
        reason
      });

      res.status(201).json({
        success: true,
        message_ar: 'تم حظر الكيان بنجاح',
        message_en: 'Entity blocked successfully',
        data: {
          block_id: blockId,
          entity_id,
          entity_type,
          block_type,
          blocked_until: blockedUntilDate,
          blocked_by: adminId
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Block entity error', { error: error.message, entity_id, entity_type });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في حظر الكيان',
        message_en: 'Error blocking entity'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Unblock an entity
   * إلغاء حظر كيان
   */
  static async unblockEntity(req, res) {
    const { entity_id, entity_type, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    // Validation
    if (!entity_id || !entity_type) {
      return res.status(400).json({
        success: false,
        message_ar: 'معرف الكيان ونوعه مطلوبان',
        message_en: 'Entity ID and type are required'
      });
    }

    if (!BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الكيان غير صحيح',
        message_en: 'Invalid entity type'
      });
    }

    // Only super_admin can unblock admins
    if (entity_type === 'admin' && req.user.adminType !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message_ar: 'فقط المدير الأعلى يمكنه إلغاء حظر المديرين',
        message_en: 'Only super admin can unblock admins'
      });
    }

    const connection = await db.getConnection();
    const tableName = BlockedEntitiesController.getTableName(entity_type);
    const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

    try {
      await connection.beginTransaction();

      // Check if entity is blocked
      const [blockRows] = await connection.query(
        `SELECT * FROM blocked_entities WHERE ${blockedIdField} = ? AND is_active = 1`,
        [entity_id]
      );

      if (blockRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'هذا الكيان غير محظور',
          message_en: 'This entity is not blocked'
        });
      }

      const blockRecord = blockRows[0];

      // Update block record
      await connection.query(
        `UPDATE blocked_entities 
         SET is_active = 0, removed_at = NOW(), removed_by_admin_id = ? 
         WHERE id = ?`,
        [adminId, blockRecord.id]
      );

      // Update entity status to active
      await connection.query(
        `UPDATE ${tableName} SET status = 'active', updated_at = NOW() WHERE id = ?`,
        [entity_id]
      );

      // Log admin action
      await logAdminAction(
        adminId,
        'UNBLOCK_ENTITY',
        entity_type,
        entity_id,
        { block_type: blockRecord.block_type, blocked_at: blockRecord.created_at },
        { reason },
        clientInfo
      );

      await connection.commit();

      logger.info('Entity unblocked', {
        blockId: blockRecord.id,
        entityId: entity_id,
        entityType: entity_type,
        unblockedBy: adminId,
        reason
      });

      res.json({
        success: true,
        message_ar: 'تم إلغاء حظر الكيان بنجاح',
        message_en: 'Entity unblocked successfully',
        data: {
          entity_id,
          entity_type,
          previous_block: {
            block_type: blockRecord.block_type,
            blocked_at: blockRecord.created_at,
            blocked_by: blockRecord.blocked_by_admin_id
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Unblock entity error', { error: error.message, entity_id, entity_type });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في إلغاء حظر الكيان',
        message_en: 'Error unblocking entity'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all blocked entities with filters
   * جلب جميع الكيانات المحظورة
   */
  static async getAllBlockedEntities(req, res) {
    const {
      page = 1,
      limit = 20,
      entity_type,
      block_type,
      is_active = 'true',
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offsetNum = (pageNum - 1) * limitNum;

    if (entity_type && !BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الكيان غير صحيح',
        message_en: 'Invalid entity type'
      });
    }

    if (block_type && !BlockedEntitiesController.VALID_BLOCK_TYPES.includes(block_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الحظر غير صحيح',
        message_en: 'Invalid block type'
      });
    }

    const normalizedIsActive = String(is_active).toLowerCase();
    let isActiveFilter;
    if (is_active !== undefined && is_active !== '') {
      if (['true', '1'].includes(normalizedIsActive)) {
        isActiveFilter = 1;
      } else if (['false', '0'].includes(normalizedIsActive)) {
        isActiveFilter = 0;
      } else {
        return res.status(400).json({
          success: false,
          message_ar: 'قيمة is_active غير صحيحة',
          message_en: 'Invalid is_active value'
        });
      }
    }

    try {
      const fromAndJoins = `
        FROM blocked_entities be
        LEFT JOIN admins ba ON be.blocked_by_admin_id = ba.id
        LEFT JOIN admins ra ON be.removed_by_admin_id = ra.id
        LEFT JOIN users u ON be.blocked_user_id = u.id
        LEFT JOIN doctors d ON be.blocked_doctor_id = d.id
        LEFT JOIN assistants ast ON be.blocked_assistant_id = ast.id
        LEFT JOIN admins adm ON be.blocked_admin_id = adm.id
      `;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (isActiveFilter !== undefined) {
        whereClause += ' AND be.is_active = ?';
        params.push(isActiveFilter);
      }

      if (entity_type) {
        const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);
        whereClause += ` AND be.${blockedIdField} IS NOT NULL`;
      }

      if (block_type) {
        whereClause += ' AND be.block_type = ?';
        params.push(block_type);
      }

      if (search) {
        whereClause += ` AND (
          u.email LIKE ? OR u.phone LIKE ? OR
          d.email LIKE ? OR d.phone LIKE ? OR
          ast.email LIKE ? OR ast.phone LIKE ? OR
          adm.email LIKE ? OR adm.phone LIKE ? OR
          be.reason LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        params.push(
          searchPattern, searchPattern,
          searchPattern, searchPattern,
          searchPattern, searchPattern,
          searchPattern, searchPattern,
          searchPattern
        );
      }

      const [countResult] = await db.query(
        `
        SELECT COUNT(*) as total
        ${fromAndJoins}
        ${whereClause}
        `,
        params
      );
      const total = Number(countResult[0]?.total || 0);

      const sortFieldMap = {
        created_at: 'be.created_at',
        blocked_until: 'be.blocked_until',
        block_type: 'be.block_type',
        removed_at: 'be.removed_at'
      };
      const sortField = sortFieldMap[sort_by] || sortFieldMap.created_at;
      const sortDirection = String(sort_order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const [blockedEntities] = await db.query(
        `
        SELECT
          be.id,
          be.blocked_user_id,
          be.blocked_admin_id,
          be.blocked_doctor_id,
          be.blocked_assistant_id,
          be.blocked_by_admin_id,
          be.block_type,
          be.blocked_until,
          be.reason,
          be.is_active,
          be.created_at,
          be.removed_at,
          be.removed_by_admin_id,
          ba.email as blocked_by_email,
          ba.admin_type as blocked_by_admin_type,
          ra.email as removed_by_email,
          CASE
            WHEN be.blocked_user_id IS NOT NULL THEN 'user'
            WHEN be.blocked_doctor_id IS NOT NULL THEN 'doctor'
            WHEN be.blocked_assistant_id IS NOT NULL THEN 'assistant'
            WHEN be.blocked_admin_id IS NOT NULL THEN 'admin'
          END as entity_type,
          COALESCE(be.blocked_user_id, be.blocked_doctor_id, be.blocked_assistant_id, be.blocked_admin_id) as entity_id,
          COALESCE(u.email, d.email, ast.email, adm.email) as entity_email,
          COALESCE(u.phone, d.phone, ast.phone, adm.phone) as entity_phone,
          COALESCE(u.status, d.status, ast.status, adm.status) as entity_status
        ${fromAndJoins}
        ${whereClause}
        ORDER BY ${sortField} ${sortDirection}
        LIMIT ${limitNum} OFFSET ${offsetNum}
        `,
        params
      );

      res.json({
        success: true,
        data: blockedEntities,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasMore: offsetNum + blockedEntities.length < total
        }
      });

    } catch (error) {
      logger.error('Get all blocked entities error', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب الكيانات المحظورة',
        message_en: 'Error fetching blocked entities',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /**
   * Get block details by ID
   * جلب تفاصيل الحظر
   */
  static async getBlockDetails(req, res) {
    const { blockId } = req.params;
    const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';

    try {
      const [rows] = await db.query(`
        SELECT 
          be.*,
          ba.email as blocked_by_email,
          ba.admin_type as blocked_by_admin_type,
          ra.email as removed_by_email,
          ra.admin_type as removed_by_admin_type,
          CASE 
            WHEN be.blocked_user_id IS NOT NULL THEN 'user'
            WHEN be.blocked_doctor_id IS NOT NULL THEN 'doctor'
            WHEN be.blocked_assistant_id IS NOT NULL THEN 'assistant'
            WHEN be.blocked_admin_id IS NOT NULL THEN 'admin'
          END as entity_type,
          COALESCE(be.blocked_user_id, be.blocked_doctor_id, be.blocked_assistant_id, be.blocked_admin_id) as entity_id
        FROM blocked_entities be
        LEFT JOIN admins ba ON be.blocked_by_admin_id = ba.id
        LEFT JOIN admins ra ON be.removed_by_admin_id = ra.id
        WHERE be.id = ?
      `, [blockId]);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message_ar: 'سجل الحظر غير موجود',
          message_en: 'Block record not found'
        });
      }

      const blockRecord = rows[0];

      // Get entity details
      const entityType = blockRecord.entity_type;
      const entityId = blockRecord.entity_id;
      const tableName = BlockedEntitiesController.getTableName(entityType);

      const [entityRows] = await db.query(
        `SELECT id, uuid, email, phone, status, created_at FROM ${tableName} WHERE id = ?`,
        [entityId]
      );

      res.json({
        success: true,
        data: {
          block: blockRecord,
          entity: entityRows[0] || null
        }
      });

    } catch (error) {
      logger.error('Get block details error', { error: error.message, blockId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب تفاصيل الحظر',
        message_en: 'Error fetching block details'
      });
    }
  }

  /**
   * Check if entity is blocked
   * التحقق من حالة حظر كيان
   */
  static async checkEntityBlockStatus(req, res) {
    const { entity_id, entity_type } = req.query;

    if (!entity_id || !entity_type) {
      return res.status(400).json({
        success: false,
        message_ar: 'معرف الكيان ونوعه مطلوبان',
        message_en: 'Entity ID and type are required'
      });
    }

    if (!BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الكيان غير صحيح',
        message_en: 'Invalid entity type'
      });
    }

    const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

    try {
      const [rows] = await db.query(`
        SELECT 
          be.*,
          a.email as blocked_by_email
        FROM blocked_entities be
        LEFT JOIN admins a ON be.blocked_by_admin_id = a.id
        WHERE be.${blockedIdField} = ? AND be.is_active = 1
      `, [entity_id]);

      const isBlocked = rows.length > 0;
      const blockInfo = isBlocked ? rows[0] : null;

      // Check if temporary block has expired
      if (isBlocked && blockInfo.block_type === 'temporary' && blockInfo.blocked_until) {
        if (new Date(blockInfo.blocked_until) < new Date()) {
          // Auto-unblock expired temporary blocks
          await db.query(
            `UPDATE blocked_entities SET is_active = 0, removed_at = NOW() WHERE id = ?`,
            [blockInfo.id]
          );

          return res.json({
            success: true,
            is_blocked: false,
            message_ar: 'انتهت فترة الحظر المؤقت',
            message_en: 'Temporary block has expired'
          });
        }
      }

      res.json({
        success: true,
        is_blocked: isBlocked,
        block_info: blockInfo ? {
          id: blockInfo.id,
          block_type: blockInfo.block_type,
          blocked_until: blockInfo.blocked_until,
          reason: blockInfo.reason,
          blocked_at: blockInfo.created_at,
          blocked_by: blockInfo.blocked_by_email
        } : null
      });

    } catch (error) {
      logger.error('Check entity block status error', { error: error.message, entity_id, entity_type });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في التحقق من حالة الحظر',
        message_en: 'Error checking block status'
      });
    }
  }

  /**
   * Get block history for an entity
   * جلب سجل الحظر لكيان
   */
  static async getEntityBlockHistory(req, res) {
    const { entity_id, entity_type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offsetNum = (pageNum - 1) * limitNum;

    if (!BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
      return res.status(400).json({
        success: false,
        message_ar: 'نوع الكيان غير صحيح',
        message_en: 'Invalid entity type'
      });
    }

    const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

    try {
      // Get entity info
      const tableName = BlockedEntitiesController.getTableName(entity_type);
      const [entityRows] = await db.query(
        `SELECT id, uuid, email, phone, status FROM ${tableName} WHERE id = ?`,
        [entity_id]
      );

      if (entityRows.length === 0) {
        return res.status(404).json({
          success: false,
          message_ar: 'الكيان غير موجود',
          message_en: 'Entity not found'
        });
      }

      // Get block history
      const [history] = await db.query(`
        SELECT 
          be.*,
          ba.email as blocked_by_email,
          ba.admin_type as blocked_by_admin_type,
          ra.email as removed_by_email,
          ra.admin_type as removed_by_admin_type
        FROM blocked_entities be
        LEFT JOIN admins ba ON be.blocked_by_admin_id = ba.id
        LEFT JOIN admins ra ON be.removed_by_admin_id = ra.id
        WHERE be.${blockedIdField} = ?
        ORDER BY be.created_at DESC
        LIMIT ${limitNum} OFFSET ${offsetNum}
      `, [entity_id]);

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM blocked_entities WHERE ${blockedIdField} = ?`,
        [entity_id]
      );
      const total = countResult[0]?.total || 0;

      res.json({
        success: true,
        entity: entityRows[0],
        history,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      logger.error('Get entity block history error', { error: error.message, entity_id, entity_type });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب سجل الحظر',
        message_en: 'Error fetching block history'
      });
    }
  }

  /**
   * Update block record (extend, change type, update reason)
   * تحديث سجل الحظر
   */
  static async updateBlock(req, res) {
    const { blockId } = req.params;
    const { block_type, blocked_until, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get current block record
      const [blockRows] = await connection.query(
        `SELECT * FROM blocked_entities WHERE id = ? AND is_active = 1`,
        [blockId]
      );

      if (blockRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message_ar: 'سجل الحظر غير موجود أو غير نشط',
          message_en: 'Block record not found or inactive'
        });
      }

      const currentBlock = blockRows[0];
      const updates = [];
      const updateValues = [];
      const oldValues = {};
      const newValues = {};

      // Update block_type if provided
      if (block_type && BlockedEntitiesController.VALID_BLOCK_TYPES.includes(block_type)) {
        updates.push('block_type = ?');
        updateValues.push(block_type);
        oldValues.block_type = currentBlock.block_type;
        newValues.block_type = block_type;
      }

      // Update blocked_until if provided
      if (blocked_until !== undefined) {
        const newBlockedUntil = blocked_until ? new Date(blocked_until) : null;
        if (newBlockedUntil && newBlockedUntil <= new Date()) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message_ar: 'تاريخ انتهاء الحظر يجب أن يكون في المستقبل',
            message_en: 'Block end date must be in the future'
          });
        }
        updates.push('blocked_until = ?');
        updateValues.push(newBlockedUntil);
        oldValues.blocked_until = currentBlock.blocked_until;
        newValues.blocked_until = newBlockedUntil;
      }

      // Update reason if provided
      if (reason) {
        updates.push('reason = ?');
        updateValues.push(reason);
        oldValues.reason = currentBlock.reason;
        newValues.reason = reason;
      }

      if (updates.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message_ar: 'لا توجد بيانات للتحديث',
          message_en: 'No data to update'
        });
      }

      // Execute update
      updateValues.push(blockId);
      await connection.query(
        `UPDATE blocked_entities SET ${updates.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Determine entity type and ID
      let entityType, entityId;
      if (currentBlock.blocked_user_id) {
        entityType = 'user';
        entityId = currentBlock.blocked_user_id;
      } else if (currentBlock.blocked_doctor_id) {
        entityType = 'doctor';
        entityId = currentBlock.blocked_doctor_id;
      } else if (currentBlock.blocked_assistant_id) {
        entityType = 'assistant';
        entityId = currentBlock.blocked_assistant_id;
      } else if (currentBlock.blocked_admin_id) {
        entityType = 'admin';
        entityId = currentBlock.blocked_admin_id;
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'UPDATE_BLOCK',
        entityType,
        entityId,
        oldValues,
        newValues,
        clientInfo
      );

      await connection.commit();

      logger.info('Block record updated', {
        blockId,
        entityId,
        entityType,
        updatedBy: adminId,
        changes: newValues
      });

      res.json({
        success: true,
        message_ar: 'تم تحديث سجل الحظر بنجاح',
        message_en: 'Block record updated successfully',
        data: {
          block_id: blockId,
          old_values: oldValues,
          new_values: newValues
        }
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Update block error', { error: error.message, blockId });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في تحديث سجل الحظر',
        message_en: 'Error updating block record'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get blocked entities statistics
   * إحصائيات الكيانات المحظورة
   */
  static async getBlockStatistics(req, res) {
    try {
      const [stats] = await db.query(`
        SELECT 
          -- Total counts
          COUNT(*) as total_blocks,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_blocks,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as removed_blocks,
          
          -- By entity type
          COUNT(CASE WHEN blocked_user_id IS NOT NULL AND is_active = 1 THEN 1 END) as blocked_users,
          COUNT(CASE WHEN blocked_doctor_id IS NOT NULL AND is_active = 1 THEN 1 END) as blocked_doctors,
          COUNT(CASE WHEN blocked_assistant_id IS NOT NULL AND is_active = 1 THEN 1 END) as blocked_assistants,
          COUNT(CASE WHEN blocked_admin_id IS NOT NULL AND is_active = 1 THEN 1 END) as blocked_admins,
          
          -- By block type (active only)
          COUNT(CASE WHEN block_type = 'temporary' AND is_active = 1 THEN 1 END) as temporary_blocks,
          COUNT(CASE WHEN block_type = 'permanent' AND is_active = 1 THEN 1 END) as permanent_blocks,
          COUNT(CASE WHEN block_type = 'warning' AND is_active = 1 THEN 1 END) as warning_blocks,
          
          -- Time-based stats
          COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as blocks_last_week,
          COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as blocks_last_month,
          COUNT(CASE WHEN removed_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as unblocks_last_week,
          
          -- Expiring soon (temporary blocks expiring in next 7 days)
          COUNT(CASE WHEN block_type = 'temporary' AND is_active = 1 AND blocked_until BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 END) as expiring_soon
        FROM blocked_entities
      `);

      // Get top blocking admins
      const [topBlockers] = await db.query(`
        SELECT 
          a.id,
          a.email,
          a.admin_type,
          COUNT(be.id) as block_count
        FROM blocked_entities be
        JOIN admins a ON be.blocked_by_admin_id = a.id
        WHERE be.created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY a.id
        ORDER BY block_count DESC
        LIMIT 5
      `);

      res.json({
        success: true,
        data: {
          summary: stats[0],
          top_blocking_admins: topBlockers
        }
      });

    } catch (error) {
      logger.error('Get block statistics error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في جلب الإحصائيات',
        message_en: 'Error fetching statistics'
      });
    }
  }

  /**
   * Bulk block entities
   * حظر مجموعة من الكيانات
   */
  static async bulkBlockEntities(req, res) {
    const { entities, block_type = 'temporary', blocked_until, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    // Validation
    if (!Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({
        success: false,
        message_ar: 'قائمة الكيانات مطلوبة',
        message_en: 'Entities list is required'
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message_ar: 'سبب الحظر مطلوب',
        message_en: 'Block reason is required'
      });
    }

    // Validate blocked_until for temporary blocks
    let blockedUntilDate = null;
    if (block_type === 'temporary') {
      if (!blocked_until) {
        return res.status(400).json({
          success: false,
          message_ar: 'تاريخ انتهاء الحظر مطلوب للحظر المؤقت',
          message_en: 'Block end date is required for temporary blocks'
        });
      }
      blockedUntilDate = new Date(blocked_until);
    }

    const connection = await db.getConnection();
    const results = { success: [], failed: [] };

    try {
      await connection.beginTransaction();

      for (const entity of entities) {
        const { entity_id, entity_type } = entity;

        if (!entity_id || !entity_type || !BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
          results.failed.push({ entity_id, entity_type, error: 'Invalid entity data' });
          continue;
        }

        // Skip admin blocking for non-super_admin
        if (entity_type === 'admin' && req.user.adminType !== 'super_admin') {
          results.failed.push({ entity_id, entity_type, error: 'Insufficient permissions' });
          continue;
        }

        const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

        // Check if already blocked
        const [existing] = await connection.query(
          `SELECT id FROM blocked_entities WHERE ${blockedIdField} = ? AND is_active = 1`,
          [entity_id]
        );

        if (existing.length > 0) {
          results.failed.push({ entity_id, entity_type, error: 'Already blocked' });
          continue;
        }

        // Insert block
        await connection.query(
          `INSERT INTO blocked_entities (${blockedIdField}, blocked_by_admin_id, block_type, blocked_until, reason, is_active, created_at) 
           VALUES (?, ?, ?, ?, ?, 1, NOW())`,
          [entity_id, adminId, block_type, blockedUntilDate, reason]
        );

        // Update entity status
        const tableName = BlockedEntitiesController.getTableName(entity_type);
        await connection.query(
          `UPDATE ${tableName} SET status = 'suspended', updated_at = NOW() WHERE id = ?`,
          [entity_id]
        );

        results.success.push({ entity_id, entity_type });
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'BULK_BLOCK_ENTITIES',
        'multiple',
        null,
        null,
        { 
          block_type, 
          blocked_until: blockedUntilDate, 
          reason,
          success_count: results.success.length,
          failed_count: results.failed.length
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Bulk block completed', {
        blockedBy: adminId,
        successCount: results.success.length,
        failedCount: results.failed.length
      });

      res.json({
        success: true,
        message_ar: `تم حظر ${results.success.length} كيان بنجاح`,
        message_en: `${results.success.length} entities blocked successfully`,
        data: results
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Bulk block error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في حظر الكيانات',
        message_en: 'Error blocking entities'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk unblock entities
   * إلغاء حظر مجموعة من الكيانات
   */
  static async bulkUnblockEntities(req, res) {
    const { entities, reason } = req.body;
    const adminId = req.user.id;
    const clientInfo = getClientInfo(req);

    if (!Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({
        success: false,
        message_ar: 'قائمة الكيانات مطلوبة',
        message_en: 'Entities list is required'
      });
    }

    const connection = await db.getConnection();
    const results = { success: [], failed: [] };

    try {
      await connection.beginTransaction();

      for (const entity of entities) {
        const { entity_id, entity_type } = entity;

        if (!entity_id || !entity_type || !BlockedEntitiesController.VALID_ENTITY_TYPES.includes(entity_type)) {
          results.failed.push({ entity_id, entity_type, error: 'Invalid entity data' });
          continue;
        }

        // Skip admin unblocking for non-super_admin
        if (entity_type === 'admin' && req.user.adminType !== 'super_admin') {
          results.failed.push({ entity_id, entity_type, error: 'Insufficient permissions' });
          continue;
        }

        const blockedIdField = BlockedEntitiesController.getBlockedIdField(entity_type);

        // Update block record
        const [result] = await connection.query(
          `UPDATE blocked_entities 
           SET is_active = 0, removed_at = NOW(), removed_by_admin_id = ? 
           WHERE ${blockedIdField} = ? AND is_active = 1`,
          [adminId, entity_id]
        );

        if (result.affectedRows === 0) {
          results.failed.push({ entity_id, entity_type, error: 'Not blocked' });
          continue;
        }

        // Update entity status
        const tableName = BlockedEntitiesController.getTableName(entity_type);
        await connection.query(
          `UPDATE ${tableName} SET status = 'active', updated_at = NOW() WHERE id = ?`,
          [entity_id]
        );

        results.success.push({ entity_id, entity_type });
      }

      // Log admin action
      await logAdminAction(
        adminId,
        'BULK_UNBLOCK_ENTITIES',
        'multiple',
        null,
        null,
        { 
          reason,
          success_count: results.success.length,
          failed_count: results.failed.length
        },
        clientInfo
      );

      await connection.commit();

      logger.info('Bulk unblock completed', {
        unblockedBy: adminId,
        successCount: results.success.length,
        failedCount: results.failed.length
      });

      res.json({
        success: true,
        message_ar: `تم إلغاء حظر ${results.success.length} كيان بنجاح`,
        message_en: `${results.success.length} entities unblocked successfully`,
        data: results
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Bulk unblock error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في إلغاء حظر الكيانات',
        message_en: 'Error unblocking entities'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Auto-unblock expired temporary blocks (can be called by scheduler)
   * إلغاء حظر الكيانات المنتهية تلقائياً
   */
  static async autoUnblockExpired(req, res) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get expired blocks
      const [expiredBlocks] = await connection.query(`
        SELECT 
          id,
          blocked_user_id,
          blocked_doctor_id,
          blocked_assistant_id,
          blocked_admin_id
        FROM blocked_entities 
        WHERE block_type = 'temporary' 
          AND is_active = 1 
          AND blocked_until IS NOT NULL 
          AND blocked_until < NOW()
      `);

      let unblockCount = 0;

      for (const block of expiredBlocks) {
        // Determine entity type and ID
        let entityType, entityId;
        if (block.blocked_user_id) {
          entityType = 'user';
          entityId = block.blocked_user_id;
        } else if (block.blocked_doctor_id) {
          entityType = 'doctor';
          entityId = block.blocked_doctor_id;
        } else if (block.blocked_assistant_id) {
          entityType = 'assistant';
          entityId = block.blocked_assistant_id;
        } else if (block.blocked_admin_id) {
          entityType = 'admin';
          entityId = block.blocked_admin_id;
        }

        // Update block record
        await connection.query(
          `UPDATE blocked_entities SET is_active = 0, removed_at = NOW() WHERE id = ?`,
          [block.id]
        );

        // Update entity status
        const tableName = BlockedEntitiesController.getTableName(entityType);
        await connection.query(
          `UPDATE ${tableName} SET status = 'active', updated_at = NOW() WHERE id = ?`,
          [entityId]
        );

        unblockCount++;
      }

      await connection.commit();

      logger.info('Auto-unblock completed', { unblockCount });

      res.json({
        success: true,
        message_ar: `تم إلغاء حظر ${unblockCount} كيان منتهي الصلاحية`,
        message_en: `${unblockCount} expired blocks removed`,
        unblocked_count: unblockCount
      });

    } catch (error) {
      await connection.rollback();
      logger.error('Auto-unblock error', { error: error.message });
      res.status(500).json({
        success: false,
        message_ar: 'خطأ في إلغاء الحظر التلقائي',
        message_en: 'Error in auto-unblock process'
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = BlockedEntitiesController;

const SecurityService = require('../utils/SecurityService');
const SecurityCleanup = require('../utils/SecurityCleanup');
const { logAdminAction, getClientInfo } = require('../middleware/authMiddleware');
const db = require('../config/db');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'admin-security.log' })
  ]
});

class AdminSecurityController {

  static toPositiveInt(value, fallback = 100, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static toNonNegativeInt(value, fallback = 0, max = 1000000) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
  }

  static normalizeEntityType(entityType) {
    if (!entityType) return null;
    const normalized = String(entityType).trim().toLowerCase();
    const allowed = ['user', 'admin', 'doctor', 'assistant'];
    return allowed.includes(normalized) ? normalized : null;
  }

  /**
   * Block a user/doctor/assistant
   */
  static async blockEntity(req, res) {
    const { targetId, entityType, blockType = 'temporary', blockedUntil, reason } = req.body;

    if (!targetId || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'Target ID and entity type are required'
      });
    }

    if (!['user', 'doctor', 'assistant'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    // Only super_admin and system_admin can block entities
    if (!['super_admin', 'system_admin'].includes(req.user.adminType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to block entities'
      });
    }

    try {
      const result = await SecurityService.blockEntity(
        targetId, 
        entityType, 
        req.user.id, 
        blockType, 
        blockedUntil ? new Date(blockedUntil) : null, 
        req
      );

      if (result.success) {
        // Log admin action
        const clientInfo = getClientInfo(req);
        await logAdminAction(
          req.user.id,
          'BLOCK_ENTITY',
          entityType,
          targetId,
          null,
          { blockType, blockedUntil, reason },
          clientInfo
        );
      }

      res.json(result);

    } catch (error) {
      logger.error('Block entity error', { error: error.message, targetId, entityType });
      res.status(500).json({
        success: false,
        message: 'Block operation failed'
      });
    }
  }

  /**
   * Unblock a user/doctor/assistant
   */
  static async unblockEntity(req, res) {
    const { targetId, entityType, reason } = req.body;

    if (!targetId || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'Target ID and entity type are required'
      });
    }

    // Only super_admin and system_admin can unblock entities
    if (!['super_admin', 'system_admin'].includes(req.user.adminType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to unblock entities'
      });
    }

    try {
      const result = await SecurityService.unblockEntity(targetId, entityType, req.user.id, req);

      if (result.success) {
        // Log admin action
        const clientInfo = getClientInfo(req);
        await logAdminAction(
          req.user.id,
          'UNBLOCK_ENTITY',
          entityType,
          targetId,
          null,
          { reason },
          clientInfo
        );
      }

      res.json(result);

    } catch (error) {
      logger.error('Unblock entity error', { error: error.message, targetId, entityType });
      res.status(500).json({
        success: false,
        message: 'Unblock operation failed'
      });
    }
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllSessions(req, res) {
    const { targetId, entityType, reason } = req.body;

    if (!targetId || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'Target ID and entity type are required'
      });
    }

    try {
      const result = await SecurityService.revokeAllSessions(targetId, entityType, req.user.id, req);

      if (result.success) {
        // Log admin action
        const clientInfo = getClientInfo(req);
        await logAdminAction(
          req.user.id,
          'REVOKE_ALL_SESSIONS',
          entityType,
          targetId,
          null,
          { reason },
          clientInfo
        );
      }

      res.json(result);

    } catch (error) {
      logger.error('Revoke sessions error', { error: error.message, targetId, entityType });
      res.status(500).json({
        success: false,
        message: 'Session revocation failed'
      });
    }
  }

  /**
   * Get security logs for any user (admin only)
   */
  static async getUserSecurityLogs(req, res) {
    const { targetId, entityType, limit = 100 } = req.query;

    if (!targetId || !entityType) {
      return res.status(400).json({
        success: false,
        message: 'Target ID and entity type are required'
      });
    }

    try {
      const result = await SecurityService.getSecurityLogs(
        targetId, 
        entityType, 
        parseInt(limit)
      );

      res.json(result);

    } catch (error) {
      logger.error('Get user security logs error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security logs'
      });
    }
  }

  /**
   * Get system security statistics
   */
  static async getSecurityStats(req, res) {
    try {
      const stats = await SecurityCleanup.getSecurityStats();

      if (!stats) {
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve security statistics'
        });
      }

      // Get additional admin-specific stats
      const [adminLogs] = await db.query(
        `SELECT 
          COUNT(*) as total_actions,
          COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as last_24h_actions,
          COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_severity_actions
         FROM admin_logs`
      );

      const [suspiciousActivity] = await db.query(
        `SELECT 
          COUNT(DISTINCT ip_address) as suspicious_ips,
          COUNT(DISTINCT email) as targeted_emails
         FROM failed_logins 
         WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY ip_address
         HAVING COUNT(*) > 10`
      );

      stats.adminStats = {
        totalAdminActions: adminLogs[0].total_actions,
        last24hActions: adminLogs[0].last_24h_actions,
        highSeverityActions: adminLogs[0].high_severity_actions,
        suspiciousIPs: suspiciousActivity.length
      };

      res.json({
        success: true,
        stats: stats
      });

    } catch (error) {
      logger.error('Get security stats error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security statistics'
      });
    }
  }

  /**
   * Get admin logs
   */
  static async getAdminLogs(req, res) {
    const { 
      limit = 100, 
      offset = 0, 
      adminId, 
      action, 
      severity, 
      startDate, 
      endDate 
    } = req.query;

    const limitNum = AdminSecurityController.toPositiveInt(limit, 100, 100);
    const offsetNum = AdminSecurityController.toNonNegativeInt(offset, 0);

    try {
      let query = 'SELECT al.*, a.email as admin_email FROM admin_logs al JOIN admins a ON al.admin_id = a.id WHERE 1=1';
      const params = [];

      if (adminId) {
        query += ' AND al.admin_id = ?';
        params.push(adminId);
      }

      if (action) {
        query += ' AND al.action LIKE ?';
        params.push(`%${action}%`);
      }

      if (severity) {
        query += ' AND al.severity = ?';
        params.push(severity);
      }

      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate);
      }

      query += ` ORDER BY al.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [logs] = await db.query(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM admin_logs WHERE 1=1';
      const countParams = [];

      if (adminId) {
        countQuery += ' AND admin_id = ?';
        countParams.push(adminId);
      }

      if (action) {
        countQuery += ' AND action LIKE ?';
        countParams.push(`%${action}%`);
      }

      if (severity) {
        countQuery += ' AND severity = ?';
        countParams.push(severity);
      }

      if (startDate) {
        countQuery += ' AND created_at >= ?';
        countParams.push(startDate);
      }

      if (endDate) {
        countQuery += ' AND created_at <= ?';
        countParams.push(endDate);
      }

      const [countResult] = await db.query(countQuery, countParams);

      res.json({
        success: true,
        logs: logs,
        pagination: {
          total: Number(countResult[0]?.total || 0),
          limit: limitNum,
          offset: offsetNum,
          hasMore: Number(countResult[0]?.total || 0) > (offsetNum + logs.length)
        }
      });

    } catch (error) {
      logger.error('Get admin logs error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve admin logs'
      });
    }
  }

  /**
   * Get failed login attempts
   */
  static async getFailedLogins(req, res) {
    const { 
      limit = 100, 
      offset = 0, 
      email, 
      ipAddress, 
      entityType, 
      hours = 24 
    } = req.query;

    const limitNum = AdminSecurityController.toPositiveInt(limit, 100, 100);
    const offsetNum = AdminSecurityController.toNonNegativeInt(offset, 0);
    const hoursNum = AdminSecurityController.toPositiveInt(hours, 24, 24 * 30);
    const normalizedEntityType = AdminSecurityController.normalizeEntityType(entityType);

    if (entityType && !normalizedEntityType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    try {
      let query = 'SELECT * FROM failed_logins WHERE attempted_at > DATE_SUB(NOW(), INTERVAL ? HOUR)';
      const params = [hoursNum];

      if (email) {
        query += ' AND email LIKE ?';
        params.push(`%${email}%`);
      }

      if (ipAddress) {
        query += ' AND ip_address = ?';
        params.push(ipAddress);
      }

      if (normalizedEntityType) {
        query += ' AND entity_type = ?';
        params.push(normalizedEntityType);
      }

      query += ` ORDER BY attempted_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [attempts] = await db.query(query, params);

      // Get summary statistics
      const [stats] = await db.query(
        `SELECT 
          COUNT(*) as total_attempts,
          COUNT(DISTINCT email) as unique_emails,
          COUNT(DISTINCT ip_address) as unique_ips,
          failure_reason,
          COUNT(*) as reason_count
         FROM failed_logins 
         WHERE attempted_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
         GROUP BY failure_reason`,
        [hoursNum]
      );

      res.json({
        success: true,
        attempts: attempts,
        stats: stats,
        pagination: {
          limit: limitNum,
          offset: offsetNum
        }
      });

    } catch (error) {
      logger.error('Get failed logins error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve failed login attempts'
      });
    }
  }

  /**
   * Get blocked entities
   */
  static async getBlockedEntities(req, res) {
    const { limit = 100, offset = 0, entityType, isActive = true } = req.query;

    const limitNum = AdminSecurityController.toPositiveInt(limit, 100, 100);
    const offsetNum = AdminSecurityController.toNonNegativeInt(offset, 0);
    const normalizedEntityType = AdminSecurityController.normalizeEntityType(entityType);

    if (entityType && !normalizedEntityType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    try {
      let query = `
        SELECT be.*, 
          ba.email as blocked_by_email,
          ra.email as removed_by_email,
          CASE 
            WHEN be.blocked_user_id IS NOT NULL THEN u.email
            WHEN be.blocked_admin_id IS NOT NULL THEN a.email  
            WHEN be.blocked_doctor_id IS NOT NULL THEN d.email
            WHEN be.blocked_assistant_id IS NOT NULL THEN ast.email
          END as blocked_entity_email
        FROM blocked_entities be
        LEFT JOIN admins ba ON be.blocked_by_admin_id = ba.id
        LEFT JOIN admins ra ON be.removed_by_admin_id = ra.id
        LEFT JOIN users u ON be.blocked_user_id = u.id
        LEFT JOIN admins a ON be.blocked_admin_id = a.id
        LEFT JOIN doctors d ON be.blocked_doctor_id = d.id
        LEFT JOIN assistants ast ON be.blocked_assistant_id = ast.id
        WHERE be.is_active = ?
      `;
      const params = [String(isActive).toLowerCase() === 'true' ? 1 : 0];

      if (normalizedEntityType) {
        query += ` AND be.blocked_${normalizedEntityType}_id IS NOT NULL`;
      }

      query += ` ORDER BY be.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [blockedEntities] = await db.query(query, params);

      res.json({
        success: true,
        blockedEntities: blockedEntities,
        pagination: {
          limit: limitNum,
          offset: offsetNum
        }
      });

    } catch (error) {
      logger.error('Get blocked entities error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve blocked entities'
      });
    }
  }

  /**
   * Run manual security cleanup
   */
  static async runCleanup(req, res) {
    // Only super_admin can run manual cleanup
    if (req.user.adminType !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can run manual cleanup'
      });
    }

    try {
      const result = await SecurityCleanup.manualCleanup();

      // Log admin action
      const clientInfo = getClientInfo(req);
      await logAdminAction(
        req.user.id,
        'MANUAL_SECURITY_CLEANUP',
        null,
        null,
        null,
        result,
        clientInfo
      );

      res.json({
        success: true,
        message: 'Security cleanup completed',
        stats: result
      });

    } catch (error) {
      logger.error('Manual cleanup error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Security cleanup failed'
      });
    }
  }

  /**
   * Update entity status (activate/deactivate/suspend)
   */
  static async updateEntityStatus(req, res) {
    const { targetId, entityType, status, reason } = req.body;

    if (!targetId || !entityType || !status) {
      return res.status(400).json({
        success: false,
        message: 'Target ID, entity type, and status are required'
      });
    }

    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    try {
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
      
      // Get current status
      const [currentEntity] = await db.query(
        `SELECT status, email FROM ${tableName} WHERE id = ?`,
        [targetId]
      );

      if (currentEntity.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Entity not found'
        });
      }

      const oldStatus = currentEntity[0].status;

      // Update status
      await db.query(
        `UPDATE ${tableName} SET status = ? WHERE id = ?`,
        [status, targetId]
      );

      // If suspending, revoke all sessions
      if (status === 'suspended') {
        await SecurityService.revokeAllSessions(targetId, entityType, req.user.id, req);
      }

      // Log admin action
      const clientInfo = getClientInfo(req);
      await logAdminAction(
        req.user.id,
        'UPDATE_ENTITY_STATUS',
        entityType,
        targetId,
        { status: oldStatus },
        { status: status, reason },
        clientInfo
      );

      logger.info('Entity status updated', {
        targetId,
        entityType,
        oldStatus,
        newStatus: status,
        updatedBy: req.user.id
      });

      res.json({
        success: true,
        message: `Entity status updated to ${status}`,
        oldStatus,
        newStatus: status
      });

    } catch (error) {
      logger.error('Update entity status error', { error: error.message, targetId, entityType });
      res.status(500).json({
        success: false,
        message: 'Failed to update entity status'
      });
    }
  }

  /**
   * Get active sessions across the system
   */
  static async getSystemSessions(req, res) {
    const { entityType, limit = 100, offset = 0 } = req.query;

    const limitNum = AdminSecurityController.toPositiveInt(limit, 100, 100);
    const offsetNum = AdminSecurityController.toNonNegativeInt(offset, 0);
    const normalizedEntityType = AdminSecurityController.normalizeEntityType(entityType);

    if (entityType && !normalizedEntityType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    try {
      let query = `
        SELECT ls.*,
          CASE 
            WHEN ls.user_id IS NOT NULL THEN 'user'
            WHEN ls.admin_id IS NOT NULL THEN 'admin'
            WHEN ls.doctor_id IS NOT NULL THEN 'doctor'
            WHEN ls.assistant_id IS NOT NULL THEN 'assistant'
          END as entity_type,
          CASE 
            WHEN ls.user_id IS NOT NULL THEN u.email
            WHEN ls.admin_id IS NOT NULL THEN a.email
            WHEN ls.doctor_id IS NOT NULL THEN d.email
            WHEN ls.assistant_id IS NOT NULL THEN ast.email
          END as entity_email
        FROM login_sessions ls
        LEFT JOIN users u ON ls.user_id = u.id
        LEFT JOIN admins a ON ls.admin_id = a.id
        LEFT JOIN doctors d ON ls.doctor_id = d.id
        LEFT JOIN assistants ast ON ls.assistant_id = ast.id
        WHERE ls.is_active = true AND ls.expires_at > NOW()
      `;
      
      const params = [];

      if (normalizedEntityType) {
        query += ` AND ls.${normalizedEntityType}_id IS NOT NULL`;
      }

      query += ` ORDER BY ls.last_activity_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [sessions] = await db.query(query, params);

      // Get session statistics
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as user_sessions,
          COUNT(CASE WHEN admin_id IS NOT NULL THEN 1 END) as admin_sessions,
          COUNT(CASE WHEN doctor_id IS NOT NULL THEN 1 END) as doctor_sessions,
          COUNT(CASE WHEN assistant_id IS NOT NULL THEN 1 END) as assistant_sessions,
          COUNT(CASE WHEN is_mobile = 1 THEN 1 END) as mobile_sessions,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM login_sessions 
        WHERE is_active = true AND expires_at > NOW()
      `);

      res.json({
        success: true,
        sessions: sessions,
        stats: stats[0],
        pagination: {
          limit: limitNum,
          offset: offsetNum
        }
      });

    } catch (error) {
      logger.error('Get system sessions error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve system sessions'
      });
    }
  }

  /**
   * Force end a specific session
   */
  static async endSession(req, res) {
    const { sessionId, reason } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    try {
      // Get session info before ending it
      const [sessionInfo] = await db.query(
        'SELECT * FROM login_sessions WHERE id = ? AND is_active = true',
        [sessionId]
      );

      if (sessionInfo.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Active session not found'
        });
      }

      const session = sessionInfo[0];

      // End the session
      await db.query(
        'UPDATE login_sessions SET is_active = false, ended_at = NOW() WHERE id = ?',
        [sessionId]
      );

      // Log admin action
      const clientInfo = getClientInfo(req);
      await logAdminAction(
        req.user.id,
        'END_SESSION',
        'session',
        sessionId,
        null,
        { reason, sessionToken: session.session_token },
        clientInfo
      );

      logger.info('Session ended by admin', {
        sessionId,
        endedBy: req.user.id,
        reason
      });

      res.json({
        success: true,
        message: 'Session ended successfully'
      });

    } catch (error) {
      logger.error('End session error', { error: error.message, sessionId });
      res.status(500).json({
        success: false,
        message: 'Failed to end session'
      });
    }
  }

  /**
   * Get security alerts/notifications
   */
  static async getSecurityAlerts(req, res) {
    const { limit = 50 } = req.query;
    const limitNum = AdminSecurityController.toPositiveInt(limit, 50, 100);

    try {
      // Get high-frequency failed logins (potential attacks)
      const [suspiciousIPs] = await db.query(`
        SELECT 
          ip_address,
          COUNT(*) as attempt_count,
          COUNT(DISTINCT email) as targeted_emails,
          MIN(attempted_at) as first_attempt,
          MAX(attempted_at) as last_attempt
        FROM failed_logins 
        WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY ip_address
        HAVING attempt_count > 10
        ORDER BY attempt_count DESC
        LIMIT ${limitNum}
      `);

      // Get users with many failed attempts
      const [targetedUsers] = await db.query(`
        SELECT 
          email,
          entity_type,
          COUNT(*) as attempt_count,
          COUNT(DISTINCT ip_address) as source_ips,
          MAX(attempted_at) as last_attempt
        FROM failed_logins 
        WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 6 HOUR)
        GROUP BY email, entity_type
        HAVING attempt_count > 5
        ORDER BY attempt_count DESC
        LIMIT ${limitNum}
      `);

      // Get recent high-severity admin actions
      const [criticalActions] = await db.query(`
        SELECT al.*, a.email as admin_email
        FROM admin_logs al
        JOIN admins a ON al.admin_id = a.id
        WHERE al.severity IN ('high', 'critical')
        AND al.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY al.created_at DESC
        LIMIT ${limitNum}
      `);

      // Get recently blocked entities
      const [recentBlocks] = await db.query(`
        SELECT be.*, ba.email as blocked_by_email
        FROM blocked_entities be
        JOIN admins ba ON be.blocked_by_admin_id = ba.id
        WHERE be.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY be.created_at DESC
        LIMIT ${limitNum}
      `);

      const alerts = {
        suspiciousIPs: suspiciousIPs.map(ip => ({
          type: 'suspicious_ip',
          severity: ip.attempt_count > 50 ? 'critical' : 'high',
          data: ip,
          message: `IP ${ip.ip_address} has ${ip.attempt_count} failed login attempts targeting ${ip.targeted_emails} emails`
        })),
        
        targetedUsers: targetedUsers.map(user => ({
          type: 'targeted_user',
          severity: user.source_ips > 5 ? 'critical' : 'high',
          data: user,
          message: `User ${user.email} targeted with ${user.attempt_count} failed attempts from ${user.source_ips} different IPs`
        })),
        
        criticalActions: criticalActions.map(action => ({
          type: 'critical_admin_action',
          severity: action.severity,
          data: action,
          message: `Admin ${action.admin_email} performed ${action.action} with ${action.severity} severity`
        })),
        
        recentBlocks: recentBlocks.map(block => ({
          type: 'entity_blocked',
          severity: 'medium',
          data: block,
          message: `Entity blocked by ${block.blocked_by_email} - Type: ${block.block_type}`
        }))
      };

      res.json({
        success: true,
        alerts: alerts,
        summary: {
          total: Object.values(alerts).reduce((sum, arr) => sum + arr.length, 0),
          critical: Object.values(alerts).reduce((sum, arr) => 
            sum + arr.filter(alert => alert.severity === 'critical').length, 0
          ),
          high: Object.values(alerts).reduce((sum, arr) => 
            sum + arr.filter(alert => alert.severity === 'high').length, 0
          )
        }
      });

    } catch (error) {
      logger.error('Get security alerts error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security alerts'
      });
    }
  }
}

module.exports = AdminSecurityController;
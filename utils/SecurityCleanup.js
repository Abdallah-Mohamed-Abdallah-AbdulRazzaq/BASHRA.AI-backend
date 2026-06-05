const cron = require('node-cron');
const SecurityService = require('./SecurityService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'cleanup.log' })
  ]
});

class SecurityCleanup {
  
  /**
   * Start the cleanup scheduler
   */
  static startScheduler() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting scheduled security cleanup');
      await this.runFullCleanup();
    });

    // Run suspicious activity monitoring every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      await this.monitorSuspiciousActivity();
    });

    // Run session validation every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      await this.validateActiveSessions();
    });

    logger.info('Security cleanup scheduler started');
  }

  /**
   * Run full cleanup process
   */
  static async runFullCleanup() {
    try {
      // Clean expired data
      await SecurityService.cleanupExpiredData();

      // Clean old password reset tokens
      await this.cleanupExpiredPasswordResets();

      // Clean old admin logs (keep last 90 days)
      await this.cleanupOldAdminLogs();

      // Clean old blocked entities that are no longer active
      await this.cleanupInactiveBlocks();

      logger.info('Full security cleanup completed successfully');
    } catch (error) {
      logger.error('Full security cleanup failed', { error: error.message });
    }
  }

  /**
   * Clean expired password reset tokens
   */
  static async cleanupExpiredPasswordResets() {
    try {
      const db = require('../config/db');
      const [result] = await db.query(
        'DELETE FROM password_resets WHERE expires_at < NOW() OR is_used = true'
      );

      logger.info('Expired password reset tokens cleaned', { 
        removedCount: result.affectedRows 
      });
    } catch (error) {
      logger.error('Password reset cleanup failed', { error: error.message });
    }
  }

  /**
   * Clean old admin logs (keep last 90 days)
   */
  static async cleanupOldAdminLogs() {
    try {
      const db = require('../config/db');
      const [result] = await db.query(
        'DELETE FROM admin_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)'
      );

      logger.info('Old admin logs cleaned', { 
        removedCount: result.affectedRows 
      });
    } catch (error) {
      logger.error('Admin logs cleanup failed', { error: error.message });
    }
  }

  /**
   * Clean inactive blocked entities
   */
  static async cleanupInactiveBlocks() {
    try {
      const db = require('../config/db');
      const [result] = await db.query(
        `UPDATE blocked_entities 
         SET is_active = false, removed_at = NOW() 
         WHERE is_active = true 
         AND block_type = 'temporary' 
         AND blocked_until IS NOT NULL 
         AND blocked_until < NOW()`
      );

      logger.info('Expired temporary blocks cleaned', { 
        updatedCount: result.affectedRows 
      });
    } catch (error) {
      logger.error('Blocked entities cleanup failed', { error: error.message });
    }
  }

  /**
   * Monitor for suspicious activity patterns
   */
  static async monitorSuspiciousActivity() {
    try {
      const db = require('../config/db');
      
      // Check for high-frequency failed login attempts from single IP
      const [suspiciousIPs] = await db.query(
        `SELECT ip_address, COUNT(*) as failure_count
         FROM failed_logins 
         WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY ip_address
         HAVING failure_count > 20
         ORDER BY failure_count DESC`
      );

      if (suspiciousIPs.length > 0) {
        logger.warn('Suspicious IP activity detected', { 
          suspiciousIPs: suspiciousIPs 
        });
        
        // You could implement auto-blocking here
        // await this.autoBlockSuspiciousIPs(suspiciousIPs);
      }

      // Check for multiple email attacks
      const [suspiciousEmails] = await db.query(
        `SELECT email, COUNT(*) as failure_count, COUNT(DISTINCT ip_address) as unique_ips
         FROM failed_logins 
         WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
         GROUP BY email
         HAVING failure_count > 15 OR unique_ips > 5
         ORDER BY failure_count DESC`
      );

      if (suspiciousEmails.length > 0) {
        logger.warn('Suspicious email targeting detected', { 
          suspiciousEmails: suspiciousEmails 
        });
      }

    } catch (error) {
      logger.error('Suspicious activity monitoring failed', { error: error.message });
    }
  }

  /**
   * Validate active sessions and clean invalid ones
   */
  static async validateActiveSessions() {
    try {
      const db = require('../config/db');
      
      // Find sessions that have been inactive for more than 24 hours
      const [inactiveSessions] = await db.query(
        `UPDATE login_sessions 
         SET is_active = false, ended_at = NOW() 
         WHERE is_active = true 
         AND last_activity_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      if (inactiveSessions.affectedRows > 0) {
        logger.info('Inactive sessions cleaned', { 
          cleanedCount: inactiveSessions.affectedRows 
        });
      }

      // Update session activity based on token usage
      const [activeTokens] = await db.query(
        `SELECT DISTINCT 
         CASE 
           WHEN user_id IS NOT NULL THEN CONCAT('user:', user_id)
           WHEN admin_id IS NOT NULL THEN CONCAT('admin:', admin_id)
           WHEN doctor_id IS NOT NULL THEN CONCAT('doctor:', doctor_id)
           WHEN assistant_id IS NOT NULL THEN CONCAT('assistant:', assistant_id)
         END as entity_identifier
         FROM auth_tokens 
         WHERE is_revoked = false 
         AND expires_at > NOW() 
         AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`
      );

      logger.info('Session validation completed', { 
        activeEntities: activeTokens.length 
      });

    } catch (error) {
      logger.error('Session validation failed', { error: error.message });
    }
  }

  /**
   * Get security statistics
   */
  static async getSecurityStats() {
    try {
      const db = require('../config/db');
      
      // Active sessions count
      const [activeSessions] = await db.query(
        'SELECT COUNT(*) as count FROM login_sessions WHERE is_active = true AND expires_at > NOW()'
      );

      // Failed login attempts in last 24 hours
      const [recentFailures] = await db.query(
        'SELECT COUNT(*) as count FROM failed_logins WHERE attempted_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
      );

      // Active blocks
      const [activeBlocks] = await db.query(
        'SELECT COUNT(*) as count FROM blocked_entities WHERE is_active = true'
      );

      // Active tokens
      const [activeTokens] = await db.query(
        'SELECT COUNT(*) as count FROM auth_tokens WHERE is_revoked = false AND expires_at > NOW()'
      );

      const stats = {
        activeSessions: activeSessions[0].count,
        recentFailures: recentFailures[0].count,
        activeBlocks: activeBlocks[0].count,
        activeTokens: activeTokens[0].count,
        timestamp: new Date()
      };

      logger.info('Security statistics generated', stats);
      return stats;

    } catch (error) {
      logger.error('Security stats generation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Manual cleanup trigger
   */
  static async manualCleanup() {
    logger.info('Manual cleanup triggered');
    await this.runFullCleanup();
    return await this.getSecurityStats();
  }
}

module.exports = SecurityCleanup;
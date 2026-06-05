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
    new winston.transports.File({ filename: 'cleanup.log' })
  ]
});

/**
 * Clean up unverified records and expired OTPs
 */
const cleanupUnverifiedRecords = async () => {
  try {
    logger.info('Starting cleanup of unverified records');

    const entityTypes = ['users', 'admins', 'doctors', 'assistants'];
    let totalCleaned = 0;

    for (const entityType of entityTypes) {
      // Clean records that are pending verification for more than 24 hours
      const [pendingResult] = await db.query(
        `DELETE FROM ${entityType} 
         WHERE status = 'pending_verification' 
         AND email_verified_at IS NULL 
         AND phone_verified_at IS NULL 
         AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      // Clean expired email OTPs
      const [emailOtpResult] = await db.query(
        `UPDATE ${entityType} 
         SET email_otp = NULL, email_otp_expiry = NULL, is_email_otp = 0 
         WHERE email_otp IS NOT NULL 
         AND email_otp_expiry < NOW()`
      );

      // Clean expired phone OTPs
      const [phoneOtpResult] = await db.query(
        `UPDATE ${entityType} 
         SET phone_otp = NULL, phone_otp_expiry = NULL, is_phone_otp = 0 
         WHERE phone_otp IS NOT NULL 
         AND phone_otp_expiry < NOW()`
      );

      const entityCleaned = pendingResult.affectedRows;
      totalCleaned += entityCleaned;

      if (entityCleaned > 0 || emailOtpResult.affectedRows > 0 || phoneOtpResult.affectedRows > 0) {
        logger.info(`Cleanup completed for ${entityType}`, {
          unverifiedRecordsRemoved: entityCleaned,
          expiredEmailOTPs: emailOtpResult.affectedRows,
          expiredPhoneOTPs: phoneOtpResult.affectedRows
        });
      }
    }

    // Clean up orphaned authentication records
    await cleanupOrphanedAuthRecords();

    logger.info('Unverified records cleanup completed', {
      totalRecordsRemoved: totalCleaned
    });

    return { success: true, recordsRemoved: totalCleaned };

  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Clean up orphaned authentication records
 */
const cleanupOrphanedAuthRecords = async () => {
  try {
    // Clean orphaned login sessions
    const tables = ['users', 'admins', 'doctors', 'assistants'];
    
    for (const table of tables) {
      const entityIdField = table === 'users' ? 'user_id' : table.slice(0, -1) + '_id';
      
      // Clean orphaned login sessions
      const [sessionResult] = await db.query(
        `DELETE ls FROM login_sessions ls 
         LEFT JOIN ${table} e ON ls.${entityIdField} = e.id 
         WHERE ls.${entityIdField} IS NOT NULL AND e.id IS NULL`
      );

      // Clean orphaned auth tokens
      const [tokenResult] = await db.query(
        `DELETE at FROM auth_tokens at 
         LEFT JOIN ${table} e ON at.${entityIdField} = e.id 
         WHERE at.${entityIdField} IS NOT NULL AND e.id IS NULL`
      );

      // Clean orphaned password resets
      const [resetResult] = await db.query(
        `DELETE pr FROM password_resets pr 
         LEFT JOIN ${table} e ON pr.${entityIdField} = e.id 
         WHERE pr.${entityIdField} IS NOT NULL AND e.id IS NULL`
      );

      // Clean orphaned blocked entities
      const blockedIdField = `blocked_${table.slice(0, -1)}_id`;
      const [blockedResult] = await db.query(
        `DELETE be FROM blocked_entities be 
         LEFT JOIN ${table} e ON be.${blockedIdField} = e.id 
         WHERE be.${blockedIdField} IS NOT NULL AND e.id IS NULL`
      );

      if (sessionResult.affectedRows > 0 || tokenResult.affectedRows > 0 || 
          resetResult.affectedRows > 0 || blockedResult.affectedRows > 0) {
        logger.info(`Orphaned records cleaned for ${table}`, {
          sessions: sessionResult.affectedRows,
          tokens: tokenResult.affectedRows,
          passwordResets: resetResult.affectedRows,
          blockedEntities: blockedResult.affectedRows
        });
      }
    }

  } catch (error) {
    logger.error('Orphaned records cleanup failed', { error: error.message });
  }
};

/**
 * Clean up records that have been inactive for a long time
 */
const cleanupInactiveRecords = async (daysInactive = 365) => {
  try {
    logger.info(`Starting cleanup of records inactive for ${daysInactive} days`);

    const entityTypes = ['users', 'admins', 'doctors', 'assistants'];
    let totalCleaned = 0;

    for (const entityType of entityTypes) {
      // Only clean regular users automatically, not admins/doctors/assistants
      if (entityType === 'users') {
        const [result] = await db.query(
          `UPDATE ${entityType} 
           SET status = 'inactive' 
           WHERE status = 'active' 
           AND (last_activity_at IS NULL OR last_activity_at < DATE_SUB(NOW(), INTERVAL ? DAY))
           AND (last_login_at IS NULL OR last_login_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [daysInactive, daysInactive]
        );

        totalCleaned += result.affectedRows;

        if (result.affectedRows > 0) {
          logger.info(`Marked ${result.affectedRows} ${entityType} as inactive`);
        }
      }
    }

    logger.info('Inactive records cleanup completed', {
      totalRecordsMarkedInactive: totalCleaned
    });

    return { success: true, recordsMarkedInactive: totalCleaned };

  } catch (error) {
    logger.error('Inactive records cleanup failed', { error: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Get cleanup statistics
 */
const getCleanupStats = async () => {
  try {
    const stats = {};
    const entityTypes = ['users', 'admins', 'doctors', 'assistants'];

    for (const entityType of entityTypes) {
      const [pendingCount] = await db.query(
        `SELECT COUNT(*) as count FROM ${entityType} WHERE status = 'pending_verification'`
      );

      const [expiredEmailOtp] = await db.query(
        `SELECT COUNT(*) as count FROM ${entityType} 
         WHERE email_otp IS NOT NULL AND email_otp_expiry < NOW()`
      );

      const [expiredPhoneOtp] = await db.query(
        `SELECT COUNT(*) as count FROM ${entityType} 
         WHERE phone_otp IS NOT NULL AND phone_otp_expiry < NOW()`
      );

      const [oldPending] = await db.query(
        `SELECT COUNT(*) as count FROM ${entityType} 
         WHERE status = 'pending_verification' 
         AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      );

      stats[entityType] = {
        pendingVerification: pendingCount[0].count,
        expiredEmailOTPs: expiredEmailOtp[0].count,
        expiredPhoneOTPs: expiredPhoneOtp[0].count,
        oldPendingRecords: oldPending[0].count
      };
    }

    // General cleanup stats
    const [expiredSessions] = await db.query(
      'SELECT COUNT(*) as count FROM login_sessions WHERE expires_at < NOW() AND is_active = true'
    );

    const [expiredTokens] = await db.query(
      'SELECT COUNT(*) as count FROM auth_tokens WHERE expires_at < NOW() AND is_revoked = false'
    );

    const [expiredResets] = await db.query(
      'SELECT COUNT(*) as count FROM password_resets WHERE expires_at < NOW() AND is_used = false'
    );

    stats.general = {
      expiredSessions: expiredSessions[0].count,
      expiredTokens: expiredTokens[0].count,
      expiredPasswordResets: expiredResets[0].count
    };

    return stats;

  } catch (error) {
    logger.error('Cleanup stats generation failed', { error: error.message });
    return null;
  }
};

// Schedule cleanup to run every hour
const scheduleCleanup = () => {
  const cron = require('node-cron');
  
  // Run unverified records cleanup every hour
  cron.schedule('0 * * * *', () => {
    cleanupUnverifiedRecords();
  });

  // Run inactive records cleanup daily at 2 AM
  cron.schedule('0 2 * * *', () => {
    cleanupInactiveRecords();
  });

  logger.info('Cleanup scheduler started');
};

module.exports = {
  cleanupUnverifiedRecords,
  cleanupInactiveRecords,
  cleanupOrphanedAuthRecords,
  getCleanupStats,
  scheduleCleanup
};
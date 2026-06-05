const db = require("../config/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const winston = require("winston");
const { generateOtp, sendOtp } = require("../utils/otpUtils");
const { generateToken, generateAccessToken, generateRefreshToken, createLoginSession, logFailedLogin, isEntityBlocked, getClientInfo } = require("../middleware/authMiddleware");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "security.log" }),
  ],
});

class SecurityService {
  
  // Maximum login attempts before locking account
  static MAX_LOGIN_ATTEMPTS = 5;
  static LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Authenticate user/admin/doctor/assistant
   */
  static async authenticate(email, password, entityType, req) {
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
    const clientInfo = getClientInfo(req);

    try {
      // Get user from database
      const [results] = await db.query(
        `SELECT * FROM ${tableName} WHERE email = ?`,
        [email]
      );

      if (results.length === 0) {
        await logFailedLogin(email, entityType, 'invalid_credentials', clientInfo);
        return { success: false, message_en: "Invalid credentials", message_ar: "البريد الإلكتروني أو كلمة المرور غير صحيح" };
      }

      const user = results[0];

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        await logFailedLogin(email, entityType, 'account_locked', clientInfo);
        return { success: false, message_en: "Account is temporarily locked", message_ar: "الحساب مؤقتًا مغلق" };
      }

      // Check if account is suspended
      if (user.status === 'suspended') {
        await logFailedLogin(email, entityType, 'account_suspended', clientInfo);
        return { success: false, message_en: "Account is suspended", message_ar: "الحساب موقوف" };
      }

      // Check if account is blocked
      const blocked = await isEntityBlocked(user.id, entityType);
      if (blocked) {
        await logFailedLogin(email, entityType, 'account_locked', clientInfo);
        return { success: false, message_en: "Account is blocked", message_ar: "الحساب مغلق" };
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordValid) {
        // Increment login attempts
        const newAttempts = user.login_attempts + 1;
        let lockUntil = null;

        if (newAttempts >= this.MAX_LOGIN_ATTEMPTS) {
          lockUntil = new Date(Date.now() + this.LOCKOUT_TIME);
        }

        await db.query(
          `UPDATE ${tableName} SET login_attempts = ?, locked_until = ? WHERE id = ?`,
          [newAttempts, lockUntil, user.id]
        );

        await logFailedLogin(email, entityType, 'invalid_credentials', clientInfo);
        
        if (lockUntil) {
          return { success: false, message_en: "Too many failed attempts. Account locked for 30 minutes.", message_ar: "عدد المحاولات غير صحيح. حسابك مغلق لمدة 30 دقيقة." };
        }
        
        return { success: false, message_en: "Invalid credentials", message_ar: "البريد الإلكتروني أو كلمة المرور غير صحيح" };
      }

      // Reset login attempts on successful login
      await db.query(
        `UPDATE ${tableName} SET login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?`,
        [user.id]
      );

      // Generate tokens and store them in database
      const accessToken = await generateAccessToken(user, entityType, clientInfo);
      const refreshToken = await generateRefreshToken(user, entityType, clientInfo);
      const sessionToken = await createLoginSession(user, entityType, clientInfo);

      logger.info("Successful authentication", { 
        userId: user.id, 
        entityType: entityType,
        email: email,
        ip: clientInfo.ip_address 
      });

      return {
        success: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          status: user.status,
          email_verified_at: user.email_verified_at,
          phone_verified_at: user.phone_verified_at,
          adminType: user.admin_type || null
        },
        tokens: {
          accessToken,
          refreshToken,
          sessionToken
        }
      };

    } catch (error) {
      logger.error("Authentication error", { 
        error: error.message, 
        email: email, 
        entityType: entityType 
      });
      return { success: false, message_en: "Authentication failed", message_ar: "فشل التحقق من الهوية" };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken, req) {
    const clientInfo = getClientInfo(req);

    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(refreshToken, process.env.SECRET_KEY);

      if (decoded.tokenType !== 'refresh') {
        return { success: false, message_en: "Invalid token type", message_ar: "الرمز غير صحيح" };
      }

      // Check if refresh token exists and is valid
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const [tokenResults] = await db.query(
        'SELECT * FROM auth_tokens WHERE token_hash = ? AND is_revoked = false AND expires_at > NOW()',
        [tokenHash]
      );

      if (tokenResults.length === 0) {
        return { success: false, message_en: "Invalid or expired refresh token", message_ar: "رمز التحديث غير صحيح أو انتهت صلاحيته" };
      }

      const tokenRecord = tokenResults[0];
      const entityType = decoded.entityType;
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

      // Get user information
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ?`, 
        [decoded.id]
      );

      if (userResults.length === 0) {
        return { success: false, message_en: "User not found or inactive", message_ar: "المستخدم غير موجود أو غير نشط" };
      }

      const user = userResults[0];

      // Generate new access token and store in database
      const newAccessToken = await generateAccessToken(user, entityType, clientInfo);

      logger.info("Access token refreshed", { 
        userId: user.id, 
        entityType: entityType,
        ip: clientInfo.ip_address 
      });

      return {
        success: true,
        accessToken: newAccessToken
      };

    } catch (error) {
      logger.error("Token refresh error", { 
        error: error.message,
        ip: clientInfo.ip_address 
      });
      return { success: false, message_en: "Token refresh failed", message_ar: "فشل تحديث رمز التحديث" };
    }
  }

  /**
   * Logout user and revoke tokens
   */
  static async logout(userId, entityType, sessionToken, req) {
    const clientInfo = getClientInfo(req);
    const entityIdField = `${entityType}_id`;

    try {
      // Get count of tokens to be revoked for logging
      const [tokenCountResult] = await db.query(
        `SELECT COUNT(*) as count FROM auth_tokens 
         WHERE ${entityIdField} = ? AND is_revoked = false`,
        [userId]
      );
      const tokenCount = tokenCountResult[0].count;

      // Revoke all active tokens for this user (access and refresh tokens)
      await db.query(
        `UPDATE auth_tokens SET is_revoked = true, revoked_at = NOW() 
         WHERE ${entityIdField} = ? AND is_revoked = false`,
        [userId]
      );

      // End all active login sessions for this user
      await db.query(
        `UPDATE login_sessions SET is_active = false, ended_at = NOW() 
         WHERE ${entityIdField} = ? AND is_active = true`,
        [userId]
      );

      // Get count of sessions ended for logging
      const [sessionCountResult] = await db.query(
        `SELECT COUNT(*) as count FROM login_sessions 
         WHERE ${entityIdField} = ? AND ended_at IS NOT NULL AND DATE(ended_at) = CURDATE()`,
        [userId]
      );
      const sessionCount = sessionCountResult[0].count;

      logger.info("User logged out successfully", { 
        userId: userId, 
        entityType: entityType,
        tokensRevoked: tokenCount,
        sessionsEnded: sessionCount,
        ip: clientInfo.ip_address,
        userAgent: clientInfo.user_agent
      });

      return { 
        success: true, 
        message_en: "Logged out successfully", 
        message_ar: "تم تسجيل الخروج بنجاح",
        tokensRevoked: tokenCount,
        sessionsEnded: sessionCount
      };

    } catch (error) {
      logger.error("Logout error", { 
        error: error.message, 
        userId: userId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Logout failed", message_ar: "فشل تسجيل الخروج" };
    }
  }

  /**
   * Revoke all sessions for a user (force logout from all devices)
   */
  static async revokeAllSessions(userId, entityType, adminId = null, req) {
    const clientInfo = getClientInfo(req);
    const entityIdField = `${entityType}_id`;

    try {
      // Revoke all tokens
      await db.query(
        `UPDATE auth_tokens SET is_revoked = true, revoked_at = NOW(), revoked_by_admin_id = ? 
         WHERE ${entityIdField} = ? AND is_revoked = false`,
        [adminId, userId]
      );

      // End all login sessions
      await db.query(
        `UPDATE login_sessions SET is_active = false, ended_at = NOW() 
         WHERE ${entityIdField} = ? AND is_active = true`,
        [userId]
      );

      logger.info("All sessions revoked", { 
        userId: userId, 
        entityType: entityType,
        revokedBy: adminId,
        ip: clientInfo.ip_address 
      });

      return { success: true, message_en: "All sessions revoked successfully", message_ar: "تم إلغاء جميع الجلسات بنجاح" };

    } catch (error) {
      logger.error("Session revocation error", { 
        error: error.message, 
        userId: userId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Session revocation failed", message_ar: "فشل إلغاء الجلسات" };
    }
  }

  /**
   * Block/unblock user
   */
  static async blockEntity(targetId, entityType, adminId, blockType = 'temporary', blockedUntil = null, req) {
    const clientInfo = getClientInfo(req);
    const blockedIdField = `blocked_${entityType}_id`;

    try {
      // Check if already blocked
      const [existing] = await db.query(
        `SELECT * FROM blocked_entities WHERE ${blockedIdField} = ? AND is_active = true`,
        [targetId]
      );

      if (existing.length > 0) {
        return { success: false, message_en: "Entity is already blocked", message_ar: "الإطار مغلق بالفعل" };
      }

      // Block the entity
      await db.query(
        `INSERT INTO blocked_entities (${blockedIdField}, blocked_by_admin_id, block_type, blocked_until) 
         VALUES (?, ?, ?, ?)`,
        [targetId, adminId, blockType, blockedUntil]
      );

      // Revoke all active sessions
      await this.revokeAllSessions(targetId, entityType, adminId, req);

      logger.info("Entity blocked", { 
        targetId: targetId, 
        entityType: entityType,
        blockedBy: adminId,
        blockType: blockType,
        ip: clientInfo.ip_address 
      });

      return { success: true, message_en: "Entity blocked successfully", message_ar: "تم حظر الإطار بنجاح" };

    } catch (error) {
      logger.error("Block entity error", { 
        error: error.message, 
        targetId: targetId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Block operation failed", message_ar: "فشل حظر الإطار" };
    }
  }

  /**
   * Unblock user
   */
  static async unblockEntity(targetId, entityType, adminId, req) {
    const clientInfo = getClientInfo(req);
    const blockedIdField = `blocked_${entityType}_id`;

    try {
      const [result] = await db.query(
        `UPDATE blocked_entities 
         SET is_active = false, removed_at = NOW(), removed_by_admin_id = ? 
         WHERE ${blockedIdField} = ? AND is_active = true`,
        [adminId, targetId]
      );

      if (result.affectedRows === 0) {
        return { success: false, message_en: "Entity is not blocked", message_ar: "الإطار غير مغلق" };
      }

      logger.info("Entity unblocked", { 
        targetId: targetId, 
        entityType: entityType,
        unblockedBy: adminId,
        ip: clientInfo.ip_address 
      });

      return { success: true, message_en: "Entity unblocked successfully", message_ar: "تم إلغاء حظر الإطار بنجاح" };

    } catch (error) {
      logger.error("Unblock entity error", { 
        error: error.message, 
        targetId: targetId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Unblock operation failed", message_ar: "فشل إلغاء حظر الإطار" };
    }
  }

  /**
   * Get user's active sessions
   */
  static async getActiveSessions(userId, entityType) {
    const entityIdField = `${entityType}_id`;

    try {
      const [sessions] = await db.query(
        `SELECT id, session_token, ip_address, device_type, browser, operating_system, 
                location_country, location_city, is_mobile, last_activity_at, created_at
         FROM login_sessions 
         WHERE ${entityIdField} = ? AND is_active = true AND expires_at > NOW()
         ORDER BY last_activity_at DESC`,
        [userId]
      );

      return { success: true, sessions: sessions };

    } catch (error) {
      logger.error("Get active sessions error", { 
        error: error.message, 
        userId: userId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Failed to retrieve sessions", message_ar: "فشل جلب الجلسات" };
    }
  }

  /**
   * Get security logs for a user
   */
  static async getSecurityLogs(userId, entityType, limit = 50) {
    const entityIdField = `${entityType}_id`;

    try {
      // Get recent login sessions
      const [sessions] = await db.query(
        `SELECT 'login' as type, ip_address, user_agent, created_at, ended_at, is_active
         FROM login_sessions 
         WHERE ${entityIdField} = ?
         ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
      );

      // Get failed login attempts
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
      const [user] = await db.query(`SELECT email FROM ${tableName} WHERE id = ?`, [userId]);
      
      if (user.length > 0) {
        const [failedLogins] = await db.query(
          `SELECT 'failed_login' as type, ip_address, user_agent, failure_reason, attempted_at as created_at
           FROM failed_logins 
           WHERE email = ? AND entity_type = ?
           ORDER BY attempted_at DESC LIMIT ?`,
          [user[0].email, entityType, limit]
        );

        const allLogs = [...sessions, ...failedLogins]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, limit);

        return { success: true, logs: allLogs };
      }

      return { success: true, logs: sessions };

    } catch (error) {
      logger.error("Get security logs error", { 
        error: error.message, 
        userId: userId, 
        entityType: entityType 
      });
      return { success: false, message_en: "Failed to retrieve security logs", message_ar: "فشل جلب السجلات الأمنية" };
    }
  }

  /**
   * Clean up expired tokens and sessions
   */
  static async cleanupExpiredData() {
    try {
      // Remove expired tokens
      const [expiredTokens] = await db.query(
        'DELETE FROM auth_tokens WHERE expires_at < NOW()'
      );

      // Remove expired sessions
      const [expiredSessions] = await db.query(
        'UPDATE login_sessions SET is_active = false, ended_at = NOW() WHERE expires_at < NOW() AND is_active = true'
      );

      // Remove old failed login attempts (older than 30 days)
      const [oldFailedLogins] = await db.query(
        'DELETE FROM failed_logins WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      logger.info("Cleanup completed", {
        expiredTokens: expiredTokens.affectedRows,
        expiredSessions: expiredSessions.affectedRows,
        oldFailedLogins: oldFailedLogins.affectedRows
      });

      return { success: true, message_en: "Cleanup completed successfully", message_ar: "تم تنظيف البيانات بنجاح" };

    } catch (error) {
      logger.error("Cleanup error", { error: error.message });
      return { success: false, message_en: "Cleanup failed", message_ar: "فشل تنظيف البيانات" };
    }
  }

  /**
   * Check for suspicious activity
   */
  static async checkSuspiciousActivity(email, entityType, clientInfo) {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check failed login attempts in the last hour
      const [recentFailures] = await db.query(
        `SELECT COUNT(*) as count FROM failed_logins 
         WHERE email = ? AND entity_type = ? AND attempted_at > ?`,
        [email, entityType, oneHourAgo]
      );

      // Check login attempts from different IPs in the last hour
      const [ipCount] = await db.query(
        `SELECT COUNT(DISTINCT ip_address) as count FROM failed_logins 
         WHERE email = ? AND entity_type = ? AND attempted_at > ?`,
        [email, entityType, oneHourAgo]
      );

      const suspicious = recentFailures[0].count > 10 || ipCount[0].count > 3;

      if (suspicious) {
        logger.warn("Suspicious activity detected", {
          email: email,
          entityType: entityType,
          recentFailures: recentFailures[0].count,
          uniqueIPs: ipCount[0].count,
          ip: clientInfo.ip_address
        });
      }

      return { isSuspicious: suspicious, details: { recentFailures: recentFailures[0].count, uniqueIPs: ipCount[0].count } };

    } catch (error) {
      logger.error("Suspicious activity check error", { error: error.message });
      return { isSuspicious: false, details: {} };
    }
  }

  /**
   * Generate password reset token
   */
  static async generatePasswordResetToken(email, entityType, req) {
    const clientInfo = getClientInfo(req);
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

    try {
      // Check if user exists
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE email = ?`,
        [email]
      );

      if (userResults.length === 0) {
        // Don't reveal if email exists or not
        return { success: true, message_en: "If the email exists, a reset link has been sent", message_ar: "إذا كانت البريد الإلكتروني موجودة، تم إرسال رابط إعادة التعيين" };
      }

      const user = userResults[0];
      const entityIdField = `${entityType}_id`;

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing reset tokens
      await db.query(
        `UPDATE password_resets SET is_used = true, used_at = NOW() 
         WHERE ${entityIdField} = ? AND is_used = false`,
        [user.id]
      );

      // Create new reset token
      await db.query(
        `INSERT INTO password_resets (${entityIdField}, token, email, ip_address, user_agent, expires_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, resetToken, email, clientInfo.ip_address, clientInfo.user_agent, expiresAt]
      );

      logger.info("Password reset token generated", {
        userId: user.id,
        entityType: entityType,
        email: email,
        ip: clientInfo.ip_address
      });

      return { 
        success: true, 
        message_en: "Password reset token generated",
        message_ar: "تم إنشاء رمز إعادة التعيين بنجاح",
        resetToken: resetToken // In production, this should be sent via email
      };

    } catch (error) {
      logger.error("Password reset token generation error", { 
        error: error.message, 
        email: email, 
        entityType: entityType 
      });
      return { success: false, message_en: "Failed to generate reset token", message_ar: "فشل إنشاء رمز إعادة التعيين" };
    }
  }

  /**
   * Reset password using token
   */
  static async resetPassword(token, newPassword, req) {
    const clientInfo = getClientInfo(req);

    try {
      // Find valid reset token
      const [tokenResults] = await db.query(
        `SELECT pr.*, 
         CASE 
           WHEN pr.user_id IS NOT NULL THEN 'user'
           WHEN pr.admin_id IS NOT NULL THEN 'admin'
           WHEN pr.doctor_id IS NOT NULL THEN 'doctor'
           WHEN pr.assistant_id IS NOT NULL THEN 'assistant'
         END as entity_type,
         COALESCE(pr.user_id, pr.admin_id, pr.doctor_id, pr.assistant_id) as entity_id
         FROM password_resets pr
         WHERE pr.token = ? AND pr.is_used = false AND pr.expires_at > NOW()`,
        [token]
      );

      if (tokenResults.length === 0) {
        return { success: false, message_en: "Invalid or expired reset token", message_ar: "رمز إعادة التعيين غير صحيح أو انتهت صلاحيته" };
      }

      const resetRecord = tokenResults[0];
      const entityType = resetRecord.entity_type;
      const entityId = resetRecord.entity_id;
      const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db.query(
        `UPDATE ${tableName} SET password_hash = ?, login_attempts = 0, locked_until = NULL WHERE id = ?`,
        [hashedPassword, entityId]
      );

      // Mark reset token as used
      await db.query(
        `UPDATE password_resets SET is_used = true, used_at = NOW() WHERE id = ?`,
        [resetRecord.id]
      );

      // Revoke all existing sessions for security
      await this.revokeAllSessions(entityId, entityType, null, req);

      logger.info("Password reset successful", {
        userId: entityId,
        entityType: entityType,
        ip: clientInfo.ip_address
      });

      return { success: true, message_en: "Password reset successful", message_ar: "تم إعادة تعيين كلمة المرور بنجاح" };

    } catch (error) {
      logger.error("Password reset error", { 
        error: error.message,
        ip: clientInfo.ip_address 
      });
      return { success: false, message_en: "Password reset failed", message_ar: "فشل إعادة تعيين كلمة المرور" };
    }
  }

  /**
   * Generate password reset OTP (email or phone)
   */
  static async generatePasswordResetOtp(identifier, type = 'email', entityType = 'user', req) {
    const clientInfo = getClientInfo(req);
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

    try {
      // Fetch user by email or phone
      const whereField = type === 'email' ? 'email' : 'phone';
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE ${whereField} = ?`,
        [identifier]
      );

      // Avoid disclosing user existence
      if (userResults.length === 0) {
        return { success: true, message_en: 'If the account exists, an OTP has been sent', message_ar: 'إذا كانت الحساب موجودة، تم إرسال رمز التحقق' };
      }

      const user = userResults[0];
      const entityIdField = `${entityType}_id`;

      // Generate 6-digit OTP valid for 15 minutes
      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Invalidate any previous unused reset records
      await db.query(
        `UPDATE password_resets SET is_used = true, used_at = NOW() WHERE ${entityIdField} = ? AND is_used = false`,
        [user.id]
      );

      // Insert new reset record
      await db.query(
        `INSERT INTO password_resets (${entityIdField}, token, email, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          otp,
          user.email, // always store email as it is mandatory on table
          clientInfo.ip_address,
          clientInfo.user_agent,
          expiresAt,
        ]
      );

      // Send the OTP through the requested channel
      await sendOtp(user.email, user.phone, otp, type);

      logger.info('Password reset OTP generated', {
        userId: user.id,
        entityType,
        channel: type,
        ip: clientInfo.ip_address,
      });

      const response = {
        success: true,
        message_en: 'OTP sent. It is valid for 15 minutes.',
        message_ar: 'تم إرسال رمز التحقق. يظل صلاحيته لمدة 15 دقيقة.',
      };
      if (process.env.NODE_ENV === 'development') {
        response.otp = otp; // helpful during local development only
      }
      return response;
    } catch (error) {
      logger.error('Password reset OTP generation error', {
        error: error.message,
        identifier,
        entityType,
      });
      return { success: false, message_en: 'Failed to generate password reset OTP', message_ar: 'فشل إنشاء رمز إعادة التعيين' };
    }
  }

  /**
   * Verify password reset OTP and generate reset token
   * Returns a password reset token upon successful verification.
   */
  static async verifyPasswordResetOtp(identifier, otp, type = 'email', entityType = 'user', req) {
    const clientInfo = getClientInfo(req);
    try {
      // Locate a valid OTP record
      const [otpResults] = await db.query(
        `SELECT pr.*, 
         CASE 
           WHEN pr.user_id IS NOT NULL THEN 'user'
           WHEN pr.admin_id IS NOT NULL THEN 'admin'
           WHEN pr.doctor_id IS NOT NULL THEN 'doctor'
           WHEN pr.assistant_id IS NOT NULL THEN 'assistant'
         END as entity_type,
         COALESCE(pr.user_id, pr.admin_id, pr.doctor_id, pr.assistant_id) as entity_id
         FROM password_resets pr
         WHERE pr.token = ? AND pr.is_used = false AND pr.expires_at > NOW()`,
        [otp]
      );

      if (otpResults.length === 0) {
        return { success: false, message_en: 'OTP is invalid or expired', message_ar: 'رمز التحقق غير صحيح أو انتهت صلاحيته' };
      }

      const resetRecord = otpResults[0];
      const actualEntityType = resetRecord.entity_type;
      const entityId = resetRecord.entity_id;
      const tableName = actualEntityType === 'user' ? 'users' : `${actualEntityType}s`;

      // Fetch user to verify channel matches & get email
      const [users] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [entityId]);
      const user = users[0];
      if (!user) {
        return { success: false, message_en: 'Associated account not found', message_ar: 'الحساب المرتبط غير موجود' };
      }

      if (
        (type === 'email' && user.email !== identifier) ||
        (type === 'phone' && user.phone !== identifier)
      ) {
        return { success: false, message_en: 'OTP does not match the provided account identifier', message_ar: 'رمز التحقق لا يتطابق مع معرف الحساب المقدم' };
      }

      // Mark OTP as used
      await db.query(`UPDATE password_resets SET is_used = true, used_at = NOW() WHERE id = ?`, [resetRecord.id]);

      // Generate password reset token (email-based)
      const tokenResult = await this.generatePasswordResetToken(user.email, actualEntityType, req);

      if (!tokenResult.success) {
        return tokenResult; // Return error structure as-is
      }

      logger.info('Password reset OTP verified', {
        userId: entityId,
        entityType: actualEntityType,
        ip: clientInfo.ip_address,
      });

      return {
        success: true,
        message_en: 'OTP verified successfully',
        message_ar: 'تم التحقق من رمز التحقق بنجاح',
        resetToken: tokenResult.resetToken,
      };

    } catch (error) {
      logger.error('Verify password reset OTP error', { error: error.message, identifier });
      return { success: false, message_en: 'Failed to verify OTP', message_ar: 'فشل التحقق من رمز التحقق' };
    }
  }

  /**
   * Reset password using OTP
   */
  static async resetPasswordWithOtp(identifier, otp, newPassword, type = 'email', entityType = 'user', req) {
    const clientInfo = getClientInfo(req);
    try {
      // Locate a valid OTP record
      const [otpResults] = await db.query(
        `SELECT pr.*, 
         CASE 
           WHEN pr.user_id IS NOT NULL THEN 'user'
           WHEN pr.admin_id IS NOT NULL THEN 'admin'
           WHEN pr.doctor_id IS NOT NULL THEN 'doctor'
           WHEN pr.assistant_id IS NOT NULL THEN 'assistant'
         END as entity_type,
         COALESCE(pr.user_id, pr.admin_id, pr.doctor_id, pr.assistant_id) as entity_id
         FROM password_resets pr
         WHERE pr.token = ? AND pr.is_used = false AND pr.expires_at > NOW()`,
        [otp]
      );

      if (otpResults.length === 0) {
        return { success: false, message_en: 'OTP is invalid or expired', message_ar: 'رمز التحقق غير صحيح أو انتهت صلاحيته' };
      }

      const resetRecord = otpResults[0];
      // Double-check identifier matches the intended user where possible
      const actualEntityType = resetRecord.entity_type;
      const entityId = resetRecord.entity_id;
      const tableName = actualEntityType === 'user' ? 'users' : `${actualEntityType}s`;

      // Fetch user to verify channel matches
      const [users] = await db.query(`SELECT * FROM ${tableName} WHERE id = ?`, [entityId]);
      const user = users[0];
      if (
        (type === 'email' && user.email !== identifier) ||
        (type === 'phone' && user.phone !== identifier)
      ) {
        return { success: false, message_en: 'OTP does not match the provided account identifier', message_ar: 'رمز التحقق لا يتطابق مع معرف الحساب المقدم' };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clean user lockouts
      await db.query(
        `UPDATE ${tableName} SET password_hash = ?, login_attempts = 0, locked_until = NULL WHERE id = ?`,
        [hashedPassword, entityId]
      );

      // Mark OTP record as used
      await db.query(`UPDATE password_resets SET is_used = true, used_at = NOW() WHERE id = ?`, [resetRecord.id]);

      // Revoke all existing sessions
      await this.revokeAllSessions(entityId, actualEntityType, null, req);

      logger.info('Password reset by OTP successful', {
        userId: entityId,
        entityType: actualEntityType,
        ip: clientInfo.ip_address,
      });

      return { success: true, message_en: 'Password reset successfully', message_ar: 'تم إعادة تعيين كلمة المرور بنجاح' };
    } catch (error) {
      logger.error('Password reset by OTP error', { error: error.message, identifier });
      return { success: false, message_en: 'Failed to reset password', message_ar: 'فشل إعادة تعيين كلمة المرور' };
    }
  }

  /**
   * Change password from within the app (authenticated user)
   * Requires old password verification before changing to new password
   */
  static async changePasswordInApp(userId, entityType, oldPassword, newPassword, req) {
    const clientInfo = getClientInfo(req);
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;

    try {
      // Validate new password length
      if (newPassword.length < 8) {
        return { 
          success: false, 
          message_en: 'New password must be at least 8 characters long', 
          message_ar: 'كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف' 
        };
      }

      // Get user from database
      const [userResults] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [userId]
      );

      if (userResults.length === 0) {
        return { 
          success: false, 
          message_en: 'User not found', 
          message_ar: 'المستخدم غير موجود' 
        };
      }

      const user = userResults[0];

      // Verify old password
      const oldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
      
      if (!oldPasswordValid) {
        logger.warn('Failed password change attempt - incorrect old password', {
          userId: userId,
          entityType: entityType,
          ip: clientInfo.ip_address
        });

        return { 
          success: false, 
          message_en: 'Current password is incorrect', 
          message_ar: 'كلمة المرور الحالية غير صحيحة' 
        };
      }

      // Check if new password is same as old password
      const samePassword = await bcrypt.compare(newPassword, user.password_hash);
      if (samePassword) {
        return { 
          success: false, 
          message_en: 'New password must be different from current password', 
          message_ar: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية' 
        };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db.query(
        `UPDATE ${tableName} SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
        [hashedPassword, userId]
      );

      // Revoke all existing sessions except current one for security
      // This forces re-login on all other devices
      await this.revokeAllSessions(userId, entityType, null, req);

      logger.info('Password changed successfully from within app', {
        userId: userId,
        entityType: entityType,
        ip: clientInfo.ip_address,
        userAgent: clientInfo.user_agent
      });

      return { 
        success: true, 
        message_en: 'Password changed successfully. Please login again on all devices.', 
        message_ar: 'تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى على جميع الأجهزة.' 
      };

    } catch (error) {
      logger.error('Change password in app error', { 
        error: error.message, 
        userId: userId, 
        entityType: entityType 
      });
      return { 
        success: false, 
        message_en: 'Failed to change password', 
        message_ar: 'فشل تغيير كلمة المرور' 
      };
    }
  }


}

module.exports = SecurityService;
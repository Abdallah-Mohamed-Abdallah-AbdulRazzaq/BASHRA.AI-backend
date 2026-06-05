const jwt = require("jsonwebtoken");
const db = require("../config/db");
const winston = require("winston");
const crypto = require("crypto");
const axios = require("axios");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "auth.log" }),
  ],
});

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("Missing SECRET_KEY in environment variables");
}

// Helper function to get client information
// Helper to get geolocation for an IP (simple free API)
const getGeoLocation = async (ip) => {
  // Skip localhost / private IPs
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168')) {
    return { country: null, city: null };
  }
  try {
    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 3000 });
    return { country: data.country_name || null, city: data.city || null };
  } catch (err) {
    logger.warn("Failed to fetch geo location", { ip, error: err.message });
    return { country: null, city: null };
  }
};

const getClientInfo = (req) => {
  // Prefer X-Forwarded-For if behind a reverse-proxy / load-balancer
  let rawIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress
    || req.ip
    || req.connection?.remoteAddress
    || '';

  // Remove IPv6 prefix for IPv4 addresses (e.g., ::ffff:127.0.0.1)
  if (rawIp.startsWith('::ffff:')) rawIp = rawIp.substring(7);

  // Normalise localhost
  if (rawIp === '::1') rawIp = '127.0.0.1';

  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
  
  return {
    ip_address: rawIp,
    user_agent: userAgent,
    device_type: /Mobile|Android|iPhone|iPad|Opera Mini/i.test(userAgent) ? 'mobile' : 'desktop',
    browser: getBrowserFromUserAgent(userAgent),
    operating_system: getOSFromUserAgent(userAgent),
    is_mobile: /Mobile|Android|iPhone|iPad/.test(userAgent)
  };
};

const getBrowserFromUserAgent = (userAgent) => {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

const getOSFromUserAgent = (userAgent) => {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

// Generate JWT token with enhanced payload
const generateToken = (user, entityType, tokenType = 'access') => {
  const payload = {
    id: user.id,
    uuid: user.uuid,
    email: user.email,
    entityType: entityType, // 'user', 'admin', 'doctor', 'assistant'
    tokenType: tokenType,
    adminType: entityType === 'admin' ? user.admin_type : undefined
  };

  const options = {
    expiresIn: tokenType === 'access' ? '7d' : '7d' // Access tokens: 7 days, Refresh tokens: 7 days
  };

  return jwt.sign(payload, SECRET_KEY, options);
};

// Generate access token and store in database
const generateAccessToken = async (user, entityType, clientInfo) => {
  const accessToken = generateToken(user, entityType, 'access');
  const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
  
  const entityIdField = `${entityType}_id`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await db.query(
      `INSERT INTO auth_tokens (${entityIdField}, token_hash, token_type, expires_at, ip_address, user_agent) 
       VALUES (?, ?, 'access', ?, ?, ?)`,
      [user.id, tokenHash, expiresAt, clientInfo.ip_address, clientInfo.user_agent]
    );

    return accessToken;
  } catch (error) {
    logger.error("Error storing access token", { error: error.message, userId: user.id });
    throw error;
  }
};

// Generate refresh token and store in database
const generateRefreshToken = async (user, entityType, clientInfo) => {
  const refreshToken = generateToken(user, entityType, 'refresh');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  const entityIdField = `${entityType}_id`;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  try {
    await db.query(
      `INSERT INTO auth_tokens (${entityIdField}, token_hash, token_type, expires_at, ip_address, user_agent) 
       VALUES (?, ?, 'refresh', ?, ?, ?)`,
      [user.id, tokenHash, expiresAt, clientInfo.ip_address, clientInfo.user_agent]
    );

    return refreshToken;
  } catch (error) {
    logger.error("Error storing refresh token", { error: error.message, userId: user.id });
    throw error;
  }
};

// Create login session
const createLoginSession = async (user, entityType, clientInfo) => {
  // Fetch geo data once per request
  const geo = await getGeoLocation(clientInfo.ip_address);
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const entityIdField = `${entityType}_id`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  try {
    await db.query(
      `INSERT INTO login_sessions 
       (${entityIdField}, session_token, ip_address, user_agent, device_type, browser, 
        operating_system, location_country, location_city, is_mobile, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, sessionToken, clientInfo.ip_address, clientInfo.user_agent,
        clientInfo.device_type, clientInfo.browser, clientInfo.operating_system,
        geo.country, geo.city, clientInfo.is_mobile, expiresAt
      ]
    );

    return sessionToken;
  } catch (error) {
    logger.error("Error creating login session", { error: error.message, userId: user.id });
    throw error;
  }
};

// Log failed login attempt
const logFailedLogin = async (email, entityType, failureReason, clientInfo) => {
  try {
    await db.query(
      `INSERT INTO failed_logins (email, ip_address, user_agent, entity_type, failure_reason) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, clientInfo.ip_address, clientInfo.user_agent, entityType, failureReason]
    );
  } catch (error) {
    logger.error("Error logging failed login", { error: error.message, email });
  }
};

// Check if entity is blocked
const isEntityBlocked = async (entityId, entityType) => {
  const blockedIdField = `blocked_${entityType}_id`;
  
  try {
    const [results] = await db.query(
      `SELECT * FROM blocked_entities 
       WHERE ${blockedIdField} = ? AND is_active = true 
       AND (blocked_until IS NULL OR blocked_until > NOW())`,
      [entityId]
    );

    return results.length > 0;
  } catch (error) {
    logger.error("Error checking if entity is blocked", { error: error.message, entityId });
    return false;
  }
};

// Main JWT authentication middleware
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const clientInfo = getClientInfo(req);
  
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header missing" });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Verify token is not revoked (check for both access and refresh tokens)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [tokenCheck] = await db.query(
      'SELECT * FROM auth_tokens WHERE token_hash = ? AND is_revoked = false AND expires_at > NOW()',
      [tokenHash]
    );

    // For both access and refresh tokens, check if they exist in database and are not revoked
    if (tokenCheck.length === 0) {
      logger.warn("Token not found or revoked", { 
        tokenType: decoded.tokenType,
        userId: decoded.id,
        ip: clientInfo.ip_address 
      });
      return res.status(403).json({ error: "Token revoked or expired" });
    }

    // Get user information based on entity type
    const entityType = decoded.entityType;
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
    
    const [userResults] = await db.query(
      `SELECT * FROM ${tableName} WHERE id = ?`,
      [decoded.id]
    );

    if (userResults.length === 0) {
      return res.status(403).json({ error: "User not found" });
    }

    const user = userResults[0];

    // Disallow suspended accounts (admin suspended, not user deactivated)
    if (user.status === 'suspended') {
      return res.status(403).json({ error: "Account is suspended" });
    }

    // Check if user is blocked
    const blocked = await isEntityBlocked(user.id, entityType);
    if (blocked) {
      return res.status(403).json({ error: "Account is blocked" });
    }

    // Update last activity
    await db.query(
      `UPDATE ${tableName} SET last_activity_at = NOW() WHERE id = ?`,
      [user.id]
    );

    // Set user information in request
    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      entityType: entityType,
      adminType: user.admin_type || null,
      status: user.status
    };
    
    logger.info("Token verified successfully", { 
      userId: user.id, 
      entityType: entityType,
      ip: clientInfo.ip_address 
    });
    
    next();
  } catch (err) {
    logger.error("JWT verification failed", {
      error: err.message,
      ip: clientInfo.ip_address
    });
    
    return res.status(403).json({ 
      error: "Invalid token",
      details: err.message 
    });
  }
};

// Session validation middleware
const validateSession = async (req, res, next) => {
  const sessionToken = req.headers['x-session-token'] || req.body.sessionToken;
  const clientInfo = getClientInfo(req);
  
  if (!sessionToken) {
    return res.status(401).json({ error: "Session token missing" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const entityType = req.user.entityType;
    const entityIdField = `${entityType}_id`;
    
    // Check if session exists and is active
    const [sessionResults] = await db.query(
      `SELECT * FROM login_sessions 
       WHERE session_token = ? AND ${entityIdField} = ? AND is_active = true AND expires_at > NOW()`,
      [sessionToken, req.user.id]
    );

    if (sessionResults.length === 0) {
      logger.warn("Invalid or expired session", { 
        userId: req.user.id,
        entityType: entityType,
        ip: clientInfo.ip_address 
      });
      return res.status(403).json({ error: "Session invalid or expired" });
    }

    // Update last activity
    await db.query(
      `UPDATE login_sessions SET last_activity_at = NOW() 
       WHERE session_token = ? AND ${entityIdField} = ?`,
      [sessionToken, req.user.id]
    );

    req.session = sessionResults[0];
    next();
    
  } catch (error) {
    logger.error("Session validation error", {
      error: error.message,
      userId: req.user.id,
      ip: clientInfo.ip_address
    });
    
    return res.status(500).json({ 
      error: "Session validation failed"
    });
  }
};

// Generic role authorization
const authorizeRole = (allowedEntityTypes, allowedAdminTypes = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { entityType, adminType } = req.user;

    // Check if entity type is allowed
    if (!allowedEntityTypes.includes(entityType)) {
      logger.warn("Authorization failed: Invalid entity type", { 
        userId: req.user.id, 
        entityType: entityType,
        allowedTypes: allowedEntityTypes 
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Check admin type if entity is admin and admin types are specified
    if (entityType === 'admin' && allowedAdminTypes && !allowedAdminTypes.includes(adminType)) {
      logger.warn("Authorization failed: Invalid admin type", { 
        userId: req.user.id, 
        adminType: adminType,
        allowedAdminTypes: allowedAdminTypes 
      });
      return res.status(403).json({ error: "Insufficient admin permissions" });
    }

    logger.info("Authorization successful", { 
      userId: req.user.id, 
      entityType: entityType,
      adminType: adminType 
    });
    
    next();
  };
};

// Specific authorization middlewares
const authorizeUser = authorizeRole(['user']);
const authorizeDoctor = authorizeRole(['doctor']);
const authorizeAssistant = authorizeRole(['assistant']);

// Admin authorization with different levels
const authorizeAdmin = authorizeRole(['admin']); // Any admin type
const authorizeSuperAdmin = authorizeRole(['admin'], ['super_admin']);
const authorizeSystemAdmin = authorizeRole(['admin'], ['super_admin', 'system_admin']);
const authorizeClinicAdmin = authorizeRole(['admin'], ['super_admin', 'system_admin', 'clinic_admin']);
const authorizeAnyAdmin = authorizeRole(['admin']); // Alias for authorizeAdmin

// Mixed authorization (e.g., admin or doctor)
const authorizeAdminOrDoctor = authorizeRole(['admin', 'doctor']);
const authorizeAdminOrAssistant = authorizeRole(['admin', 'assistant']);
const authorizeDoctorOrAssistant = authorizeRole(['doctor', 'assistant']);
const authorizeUserOrDoctorOrAssistant = authorizeRole(['user', 'doctor', 'assistant']);

// Log admin action
const logAdminAction = async (adminId, action, targetType = null, targetId = null, oldValues = null, newValues = null, clientInfo = {}) => {
  try {
    await db.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, old_values, new_values, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId, action, targetType, targetId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        clientInfo.ip_address, clientInfo.user_agent
      ]
    );
  } catch (error) {
    logger.error("Error logging admin action", { error: error.message, adminId, action });
  }
};

// Middleware to log admin actions automatically
const adminActionLogger = (action, getTargetInfo = null) => {
  return (req, res, next) => {
    const originalSend = res.send;
    const clientInfo = getClientInfo(req);

    res.send = function(data) {
      // Only log successful actions (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user && req.user.entityType === 'admin') {
        const targetInfo = getTargetInfo ? getTargetInfo(req, res) : {};
        
        logAdminAction(
          req.user.id,
          action,
          targetInfo.targetType,
          targetInfo.targetId,
          targetInfo.oldValues,
          targetInfo.newValues,
          clientInfo
        );
      }
      
      originalSend.call(this, data);
    };

    next();
  };
};

// Refresh token validation
const validateRefreshToken = async (req, res, next) => {
  // Accept token from body, query or header
  let refreshToken = (req.body && req.body.refreshToken) ||
                     req.query.refreshToken ||
                     req.headers['x-refresh-token'];
  // Normalize: if supplied via header/query, ensure it exists on req.body for downstream handlers
  if (!refreshToken && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    refreshToken = req.headers.authorization.split(' ')[1];
  }
  if (refreshToken && (!req.body || !req.body.refreshToken)) {
    req.body = req.body || {};
    req.body.refreshToken = refreshToken;
  }
  const clientInfo = getClientInfo(req);

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, SECRET_KEY);
    
    if (decoded.tokenType !== 'refresh') {
      return res.status(400).json({ error: "Invalid token type" });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [tokenResults] = await db.query(
      'SELECT * FROM auth_tokens WHERE token_hash = ? AND is_revoked = false AND expires_at > NOW()',
      [tokenHash]
    );

    if (tokenResults.length === 0) {
      return res.status(403).json({ error: "Invalid or expired refresh token" });
    }

    req.tokenInfo = {
      decoded: decoded,
      tokenRecord: tokenResults[0]
    };

    next();
  } catch (error) {
    logger.error("Refresh token validation failed", { 
      error: error.message,
      ip: clientInfo.ip_address 
    });
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};

module.exports = {
  authenticateJWT,
  
  validateSession,
  authorizeRole,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  createLoginSession,
  logFailedLogin,
  isEntityBlocked,
  getClientInfo,

  authorizeUser,
  authorizeDoctor,
  authorizeAssistant,
  authorizeAdmin,
  authorizeSuperAdmin,
  authorizeSystemAdmin,
  authorizeClinicAdmin,
  authorizeAnyAdmin,

  authorizeAdminOrDoctor,
  authorizeAdminOrAssistant,
  authorizeDoctorOrAssistant,
  authorizeUserOrDoctorOrAssistant,

  logAdminAction,
  adminActionLogger,
  validateRefreshToken,
  getClientInfo
};
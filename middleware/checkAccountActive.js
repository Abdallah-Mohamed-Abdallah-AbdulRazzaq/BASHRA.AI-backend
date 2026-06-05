const db = require("../config/db");
const winston = require("winston");

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

/**
 * Middleware to check if account is active (is_active = 1)
 * Allows access to /reactivate endpoint even if is_active = 0
 * التحقق من أن الحساب نشط (is_active = 1)
 * يسمح بالوصول إلى endpoint /reactivate حتى لو كان is_active = 0
 */
const checkAccountActive = async (req, res, next) => {
  // Allow reactivate endpoint even if account is inactive
  if (req.path.includes('/reactivate')) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  try {
    const entityType = req.user.entityType;
    const tableName = entityType === 'user' ? 'users' : `${entityType}s`;
    
    const [userResults] = await db.query(
      `SELECT is_active FROM ${tableName} WHERE id = ?`,
      [req.user.id]
    );

    if (userResults.length === 0) {
      return res.status(403).json({ error: "User not found" });
    }

    const user = userResults[0];

    // Check if account is deactivated
    if (user.is_active === 0 || user.is_active === false) {
      logger.warn("Account is deactivated", { 
        userId: req.user.id,
        entityType: entityType
      });
      
      // Dynamic reactivate endpoint based on entity type
      const reactivateEndpoint = `/api/profile-${entityType}/reactivate`;
      
      return res.status(403).json({ 
        error: "Account is deactivated. Please reactivate your account.",
        error_ar: "الحساب معطّل. يرجى إعادة تفعيل حسابك.",
        reactivate_endpoint: reactivateEndpoint
      });
    }

    next();
  } catch (error) {
    logger.error("Error checking account active status", {
      error: error.message,
      userId: req.user.id
    });
    
    return res.status(500).json({ 
      error: "Error checking account status"
    });
  }
};

module.exports = { checkAccountActive };

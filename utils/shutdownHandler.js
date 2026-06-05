const winston = require('winston');

// استخدام نفس logger من app.js
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.File({ filename: 'error.log', level: 'error' })
  ]
});

class ShutdownHandler {
  constructor() {
    this.isShuttingDown = false;
    this.connections = {
      server: null,
      io: null,
      db: null,
      redis: null
    };
    this.shutdownTimeout = 30000; // 30 seconds
  }

  /**
   * تسجيل connection للإغلاق
   * @param {string} name - اسم الـ connection (server, io, db, redis)
   * @param {object} connection - الـ connection object
   */
  register(name, connection) {
    if (!['server', 'io', 'db', 'redis'].includes(name)) {
      logger.warn(`Unknown connection type: ${name}`);
      return;
    }
    
    this.connections[name] = connection;
    logger.info(`Shutdown handler: Registered ${name} connection`);
  }

  /**
   * إلغاء تسجيل connection
   * @param {string} name - اسم الـ connection
   */
  unregister(name) {
    this.connections[name] = null;
    logger.info(`Shutdown handler: Unregistered ${name} connection`);
  }

  /**
   * الإغلاق الآمن
   * @param {string} signal - إشارة الإغلاق (SIGTERM, SIGINT, etc.)
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n🛑 ${signal} received, initiating graceful shutdown...\n`);
    logger.info(`${signal} received, shutting down gracefully`);

    // Timeout للإغلاق القسري
    const forceShutdownTimeout = setTimeout(() => {
      console.log('\n⚠️  Graceful shutdown timeout exceeded, forcing shutdown...\n');
      logger.error('Forced shutdown after timeout', { 
        timeout: this.shutdownTimeout 
      });
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // 1. إغلاق HTTP server (لا يقبل connections جديدة)
      if (this.connections.server) {
        console.log('📡 Closing HTTP server...');
        await new Promise((resolve, reject) => {
          this.connections.server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server', { error: err.message });
              reject(err);
            } else {
              console.log('✅ HTTP server closed');
              logger.info('HTTP server closed successfully');
              resolve();
            }
          });
        });
      }

      // 2. إغلاق Socket.IO
      if (this.connections.io) {
        console.log('🔌 Closing Socket.IO...');
        await new Promise((resolve) => {
          this.connections.io.close(() => {
            console.log('✅ Socket.IO closed');
            logger.info('Socket.IO closed successfully');
            resolve();
          });
        });
      }

      // 3. إغلاق Database
      if (this.connections.db) {
        console.log('🗄️  Closing database connection...');
        try {
          if (typeof this.connections.db.end === 'function') {
            await this.connections.db.end();
          } else if (typeof this.connections.db.close === 'function') {
            await this.connections.db.close();
          }
          console.log('✅ Database connection closed');
          logger.info('Database connection closed successfully');
        } catch (dbError) {
          logger.error('Error closing database', { error: dbError.message });
          console.log('⚠️  Database close error (non-fatal)');
        }
      }

      // 4. إغلاق Redis
      if (this.connections.redis) {
        console.log('🔴 Closing Redis connection...');
        try {
          if (typeof this.connections.redis.close === 'function') {
            await this.connections.redis.close();
          } else if (typeof this.connections.redis.quit === 'function') {
            await this.connections.redis.quit();
          } else if (typeof this.connections.redis.disconnect === 'function') {
            await this.connections.redis.disconnect();
          }
          console.log('✅ Redis connection closed');
          logger.info('Redis connection closed successfully');
        } catch (redisError) {
          logger.error('Error closing Redis', { error: redisError.message });
          console.log('⚠️  Redis close error (non-fatal)');
        }
      }

      clearTimeout(forceShutdownTimeout);
      console.log('\n✅ Graceful shutdown completed successfully\n');
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);

    } catch (error) {
      console.log('\n❌ Error during shutdown:', error.message, '\n');
      logger.error('Error during graceful shutdown', { 
        error: error.message,
        stack: error.stack 
      });
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  }

  /**
   * تعيين timeout للإغلاق القسري
   * @param {number} timeout - الوقت بالميلي ثانية
   */
  setShutdownTimeout(timeout) {
    this.shutdownTimeout = timeout;
    logger.info(`Shutdown timeout set to ${timeout}ms`);
  }
}

module.exports = new ShutdownHandler();

const redis = require('redis');
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

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // إنشاء Redis client
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Redis: Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          }
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB) || 0
      });

      // Event handlers
      this.client.on('connect', () => {
        logger.info('Redis: Connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Connected and ready');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis: Error', { 
          error: err.message,
          code: err.code 
        });
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis: Connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis: Reconnecting...');
      });

      // الاتصال
      await this.client.connect();
      
      // اختبار الاتصال
      await this.client.ping();
      logger.info('Redis: Connection test successful');

      return this.client;

    } catch (error) {
      logger.error('Redis: Failed to connect', { 
        error: error.message,
        stack: error.stack 
      });
      this.isConnected = false;
      throw error;
    }
  }

  getClient() {
    return this.client;
  }

  isClientConnected() {
    return this.isConnected && this.client && this.client.isOpen;
  }

  async close() {
    if (this.client && this.client.isOpen) {
      try {
        await this.client.quit();
        logger.info('Redis: Client closed gracefully');
      } catch (error) {
        logger.error('Redis: Error closing client', { error: error.message });
        // Force close
        await this.client.disconnect();
      }
    }
  }
}

module.exports = new RedisClient();

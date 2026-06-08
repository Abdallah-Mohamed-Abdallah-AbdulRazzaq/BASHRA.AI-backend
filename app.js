require('dotenv').config();  // Load environment variables from .env file

// Validate environment variables before starting
const EnvValidator = require('./utils/envValidator');
EnvValidator.validate();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./config/redis');
const helmet = require('helmet'); // Security middleware
const multer = require('multer'); // For parsing multipart/form-data
const rateLimit = require('express-rate-limit'); // Rate limiting
const winston = require('winston');

const app = express();
const routes = require('./routes/index');  // Import API routes

// Import cleanup utilities
const { scheduleCleanup } = require('./utils/cleanupUnverifiedRecords');
const SecurityCleanup = require('./utils/SecurityCleanup');
const shutdownHandler = require('./utils/shutdownHandler');

// Logger setup
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

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.socket.io"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://cdn.socket.io"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
// IMPORTANT: keep CORS before rate limiters and routes so browser preflight OPTIONS requests
// receive CORS headers and do not fail with 500/429 before reaching the API.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3006',
  'https://api.bashraai.com',
  'https://bashraai.com',
  'https://www.bashraai.com',
  'https://admin.bashraai.com',
  'https://www.admin.bashraai.com',
  process.env.FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL,
  process.env.DASHBOARD_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no Origin header, e.g. Postman, curl, server-to-server, mobile apps.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error(`CORS blocked origin: ${origin}`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'lang',
    'Accept-Language',
    'Cache-Control',
    'Pragma'
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate Limiting
const generalLimiter = rateLimit({
  skip: (req) => req.method === 'OPTIONS',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  skip: (req) => req.method === 'OPTIONS',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 authentication requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + email for more specific rate limiting on auth endpoints
    // Ensure we don't throw if body parsing hasn't run yet
    const email = req.body && typeof req.body === 'object' ? req.body.email : undefined;
    return `${req.ip}:${email || 'anonymous'}`;
  }
});

const otpLimiter = rateLimit({
  skip: (req) => req.method === 'OPTIONS',
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 OTP requests per 5 minutes
  message: {
    error: 'Too many OTP requests, please try again later.',
    retryAfter: 5 * 60
  }
});

// Apply rate limiting
app.use(generalLimiter);

// Apply stricter rate limiting to auth endpoints
app.use([
  '/api/auth-user/login',
  '/api/auth-admin/login',
  '/api/auth-doctor/login',
  '/api/auth-assistant/login'
], authLimiter);
app.use([
  '/api/auth-user/register',
  '/api/auth-admin/register',
  '/api/auth-doctor/register',
  '/api/auth-assistant/register'
], authLimiter);
app.use([
  '/api/auth-user/verify-otp',
  '/api/auth-admin/verify-otp',
  '/api/auth-doctor/verify-otp',
  '/api/auth-assistant/verify-otp'
], otpLimiter);
app.use([
  '/api/auth-user/resend-otp',
  '/api/auth-admin/resend-otp',
  '/api/auth-doctor/resend-otp',
  '/api/auth-assistant/resend-otp'
], otpLimiter);

// Trust proxy if behind reverse proxy (for proper IP detection)
app.set('trust proxy', 1);

// Middleware Setup
app.use(express.json({ limit: '10mb' }));  // Parse incoming JSON requests with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Note: multer().none() removed because it conflicts with file upload routes
// File uploads are handled by route-specific middleware

// Initialize Redis for sessions (production only)
let sessionStore;
if (process.env.NODE_ENV === 'production') {
  // في production: استخدم Redis
  redisClient.connect().then(() => {
    sessionStore = new RedisStore({ 
      client: redisClient.getClient(),
      prefix: 'sess:',
      ttl: 86400 // 24 hours in seconds
    });
    logger.info('Session store: Redis (production)');
    
    // Register Redis for graceful shutdown
    shutdownHandler.register('redis', redisClient);
  }).catch((err) => {
    logger.error('Redis connection failed, falling back to memory store', { 
      error: err.message 
    });
    logger.warn('⚠️  Using memory store - sessions will not persist across restarts');
    sessionStore = null; // سيستخدم memory store
  });
} else {
  // في development: استخدم memory store
  logger.info('Session store: Memory (development)');
  sessionStore = null;
}

// Session Setup
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // Don't save uninitialized sessions
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId' // Don't use default session name
}));

// Passport Authentication Setup
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    });

    next();
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Language detection middleware
const langDetector = require('./middleware/langDetector');
app.use(langDetector);

// Health check endpoint
app.get('/health', (req, res) => {
  const StaticFilesMiddleware = require('./middleware/staticFilesMiddleware');
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    staticFiles: StaticFilesMiddleware.getInfo()
  });
});

// API Routes
app.use('/api', routes);

// ============================================
// Public Static Files (No Authentication)
// ============================================
// Managed by StaticFilesMiddleware - configured in config/staticFilesConfig.js
const StaticFilesMiddleware = require('./middleware/staticFilesMiddleware');
StaticFilesMiddleware.initialize(app);

// Protected upload routes (requires authentication)
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/upload', uploadRoutes);

// Create the server and pass the Express app
const server = http.createServer(app);

// Register server for graceful shutdown
shutdownHandler.register('server', server);

// Setup Socket.io for real-time communication
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Register Socket.IO for graceful shutdown
shutdownHandler.register('io', io);

// Log all Socket.IO connection attempts (before middleware)
io.engine.on("connection_error", (err) => {
  logger.error('Socket.IO connection error', {
    code: err.code,
    message: err.message,
    context: err.context
  });
});

// Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    // يدعم Token من auth (للتطبيقات) أو query parameters (لـ Postman)
    const authToken = socket.handshake.auth.token;
    const queryToken = socket.handshake.query.token;
    const token = authToken || queryToken;
    
    // Detailed logging للتشخيص
    logger.info('Socket connection attempt', {
      socketId: socket.id,
      hasAuthToken: !!authToken,
      hasQueryToken: !!queryToken,
      tokenSource: authToken ? 'auth' : (queryToken ? 'query' : 'none'),
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'N/A'
    });
    
    if (!token) {
      logger.warn('Socket authentication failed: No token provided', {
        socketId: socket.id,
        authKeys: Object.keys(socket.handshake.auth),
        queryKeys: Object.keys(socket.handshake.query)
      });
      return next(new Error('Authentication error: No token provided'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    // التحقق من وجود الحقول المطلوبة
    if (!decoded.id || !decoded.entityType) {
      logger.error('Socket authentication failed: Invalid token payload', {
        socketId: socket.id,
        hasId: !!decoded.id,
        hasEntityType: !!decoded.entityType,
        decodedKeys: Object.keys(decoded)
      });
      return next(new Error('Authentication error: Invalid token payload'));
    }
    
    socket.userId = decoded.id;
    socket.entityType = decoded.entityType;
    
    logger.info('Socket authenticated successfully', { 
      socketId: socket.id, 
      userId: decoded.id, 
      entityType: decoded.entityType,
      tokenSource: authToken ? 'auth' : 'query'
    });
    
    next();
  } catch (err) {
    logger.error('Socket authentication failed', { 
      socketId: socket.id,
      error: err.message,
      errorName: err.name,
      stack: err.stack
    });
    next(new Error(`Authentication error: ${err.message}`));
  }
});

// Initialize Chat Socket Handler
const ChatSocketHandler = require('./sockets/chatSocketHandler');
ChatSocketHandler.initialize(io);

// Attach the io object to the request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler (catch-all)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown using shutdown handler
process.on('SIGTERM', () => shutdownHandler.shutdown('SIGTERM'));
process.on('SIGINT', () => shutdownHandler.shutdown('SIGINT'));

// Start cleanup schedulers
try {
  scheduleCleanup(); // Start unverified records cleanup
  SecurityCleanup.startScheduler(); // Start security cleanup
  logger.info('Cleanup schedulers started successfully');
} catch (error) {
  logger.error('Failed to start cleanup schedulers', { error: error.message });
}

// Start the server
const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
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

class EnvValidator {
  static validate() {
    // المتغيرات المطلوبة (حرجة)
    const requiredVars = [
      'SESSION_SECRET',
      'SECRET_KEY',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME'
    ];

    // المتغيرات الموصى بها
    const recommendedVars = {
      'NODE_ENV': 'development',
      'PORT': '3006',
      'BACKEND_URL': 'http://localhost:3006',
      'FRONTEND_URL': 'http://localhost:3000',
      'AI_PROVIDER': 'openai',
      'AI_MODEL': 'gpt-4.1-mini',
      'AI_ENABLE_IMAGE_ANALYSIS': 'true',
      'AI_ENABLE_DOCUMENT_ANALYSIS': 'true',
      'AI_REQUIRE_PATIENT_CONSENT': 'true',
      'AI_DEFAULT_LANGUAGE': 'ar',
      'OPENAI_API_KEY': '',
      'AI_USE_MOCK': 'false',
      'AI_TEMPERATURE': '0.2'
    };

    // المتغيرات التي لا يجب طباعة قيمتها في الـ terminal أو اللوجات
    const sensitiveVars = [
      'OPENAI_API_KEY',
      'DB_PASSWORD',
      'SESSION_SECRET',
      'SECRET_KEY',
      'REDIS_PASSWORD',
      'EMAIL_PASS',
      'SMTP_PASS'
    ];

    const getDisplayValue = (varName) => {
      if (!process.env[varName]) return null;
      return sensitiveVars.includes(varName) ? 'Set' : process.env[varName];
    };

    // المتغيرات المطلوبة في production
    const productionVars = [
      'REDIS_HOST',
      'REDIS_PORT'
    ];

    const missingVars = [];
    const warnings = [];

    console.log('\n🔍 Validating environment variables...\n');

    // التحقق من المتغيرات المطلوبة
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else {
        console.log(`✅ ${varName}: ${getDisplayValue(varName)}`);
      }
    });

    // التحقق من المتغيرات الموصى بها
    Object.entries(recommendedVars).forEach(([varName, defaultValue]) => {
      if (!process.env[varName]) {
        warnings.push(`${varName} is not set, defaulting to '${defaultValue}'`);
        console.log(`⚠️  ${varName}: Not set (using default: ${defaultValue})`);
      } else {
        console.log(`✅ ${varName}: ${getDisplayValue(varName)}`);
      }
    });

    // التحقق من متغيرات production
    if (process.env.NODE_ENV === 'production') {
      console.log('\n🔒 Production mode detected, checking additional requirements...\n');

      productionVars.forEach(varName => {
        if (!process.env[varName]) {
          warnings.push(`${varName} is not set in production environment`);
          console.log(`⚠️  ${varName}: Not set (recommended for production)`);
        } else {
          console.log(`✅ ${varName}: ${getDisplayValue(varName)}`);
        }
      });

      // تحذيرات إضافية للـ production
      if (!process.env.FRONTEND_URL) {
        warnings.push('FRONTEND_URL should be set in production for CORS');
      }

      if (!process.env.BACKEND_URL) {
        warnings.push('BACKEND_URL should be set in production for secure AI file URLs');
      }

    }

    // عرض التحذيرات
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:\n');
      warnings.forEach(warning => {
        console.log(`   - ${warning}`);
        logger.warn(`Environment Warning: ${warning}`);
      });
    }

    // إذا كان هناك متغيرات مفقودة، أوقف التطبيق
    if (missingVars.length > 0) {
      console.log('\n❌ Missing required environment variables:\n');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('\n💡 Please set these variables in your .env file');
      console.log('   You can copy .env.example to .env and fill in the values\n');

      logger.error('Missing required environment variables', {
        missing: missingVars
      });

      process.exit(1);
    }

    console.log('\n✅ Environment validation passed!\n');
    logger.info('Environment validation completed successfully');
  }

  static getConfig() {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT) || 3006,
      sessionSecret: process.env.SESSION_SECRET,
      jwtSecret: process.env.SECRET_KEY,
      database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0
      },
      backend: {
        url: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3006}`
      },
      frontend: {
        url: process.env.FRONTEND_URL
      }
    };
  }
}

module.exports = EnvValidator;
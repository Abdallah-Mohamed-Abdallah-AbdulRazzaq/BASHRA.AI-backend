const express = require('express');
const path = require('path');
const fs = require('fs');
const staticFilesConfig = require('../config/staticFilesConfig');

/**
 * Static Files Middleware
 * Middleware مركزي لإدارة جميع الملفات الثابتة
 * 
 * هذا الـ middleware يقوم بتحميل جميع المجلدات العامة المحددة في staticFilesConfig
 * بدون الحاجة لإضافة كود يدوي في app.js
 */

class StaticFilesMiddleware {
  
  /**
   * Initialize static files middleware
   * تهيئة middleware للملفات الثابتة
   * @param {Object} app - Express app instance
   */
  static initialize(app) {
    const { 
      publicDirectories, 
      cacheConfig, 
      securityHeaders, 
      autoCreateDirectories,
      logAccess 
    } = staticFilesConfig;

    console.log('\n🗂️  Initializing Static Files Middleware...');
    console.log('================================================');

    // Filter enabled directories
    const enabledDirectories = publicDirectories.filter(dir => dir.enabled);

    if (enabledDirectories.length === 0) {
      console.log('⚠️  No public directories enabled');
      return;
    }

    // Setup each directory
    enabledDirectories.forEach((config, index) => {
      try {
        this.setupStaticDirectory(app, config, {
          cacheConfig,
          securityHeaders,
          autoCreateDirectories,
          logAccess
        });
        
        console.log(`✅ [${index + 1}/${enabledDirectories.length}] ${config.route}`);
        console.log(`   📁 ${config.directory}`);
        console.log(`   📝 ${config.description}`);
      } catch (error) {
        console.error(`❌ Failed to setup: ${config.route}`);
        console.error(`   Error: ${error.message}`);
      }
    });

    console.log('================================================');
    console.log(`✅ Static Files Middleware initialized (${enabledDirectories.length} directories)\n`);
  }

  /**
   * Setup a single static directory
   * إعداد مجلد ثابت واحد
   */
  static setupStaticDirectory(app, config, options) {
    const { route, directory } = config;
    const { cacheConfig, securityHeaders, autoCreateDirectories, logAccess } = options;

    // Build absolute path
    const absolutePath = path.join(process.cwd(), directory);

    // Auto-create directory if enabled
    if (autoCreateDirectories) {
      this.ensureDirectoryExists(absolutePath);
    }

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      console.warn(`⚠️  Directory does not exist: ${directory}`);
      return;
    }

    // Setup static middleware with options
    app.use(route, express.static(absolutePath, {
      maxAge: cacheConfig.maxAge,
      etag: cacheConfig.etag,
      lastModified: cacheConfig.lastModified,
      immutable: cacheConfig.immutable,
      setHeaders: (res, filePath) => {
        // Apply security headers
        Object.keys(securityHeaders).forEach(header => {
          res.setHeader(header, securityHeaders[header]);
        });

        // Log access if enabled
        if (logAccess) {
          const relativePath = path.relative(absolutePath, filePath);
          console.log(`📄 Static file accessed: ${route}/${relativePath}`);
        }
      }
    }));
  }

  /**
   * Ensure directory exists, create if not
   * التأكد من وجود المجلد، إنشاؤه إذا لم يكن موجوداً
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   📂 Created directory: ${dirPath}`);
      } catch (error) {
        console.error(`   ❌ Failed to create directory: ${dirPath}`);
        console.error(`      Error: ${error.message}`);
      }
    }
  }

  /**
   * Get list of all public directories
   * الحصول على قائمة جميع المجلدات العامة
   */
  static getPublicDirectories() {
    return staticFilesConfig.publicDirectories
      .filter(dir => dir.enabled)
      .map(dir => ({
        route: dir.route,
        directory: dir.directory,
        description: dir.description
      }));
  }

  /**
   * Add a new public directory dynamically
   * إضافة مجلد عام جديد بشكل ديناميكي
   * @param {Object} app - Express app instance
   * @param {Object} config - Directory configuration
   */
  static addPublicDirectory(app, config) {
    const { 
      cacheConfig, 
      securityHeaders, 
      autoCreateDirectories,
      logAccess 
    } = staticFilesConfig;

    console.log(`\n➕ Adding new public directory: ${config.route}`);
    
    this.setupStaticDirectory(app, config, {
      cacheConfig,
      securityHeaders,
      autoCreateDirectories,
      logAccess
    });

    console.log(`✅ Directory added successfully\n`);
  }

  /**
   * Get middleware info for health check
   * الحصول على معلومات الـ middleware للـ health check
   */
  static getInfo() {
    const enabledDirs = staticFilesConfig.publicDirectories.filter(dir => dir.enabled);
    
    return {
      totalDirectories: staticFilesConfig.publicDirectories.length,
      enabledDirectories: enabledDirs.length,
      directories: enabledDirs.map(dir => ({
        route: dir.route,
        description: dir.description
      })),
      cacheEnabled: staticFilesConfig.cacheConfig.maxAge !== '0',
      autoCreateDirectories: staticFilesConfig.autoCreateDirectories
    };
  }
}

module.exports = StaticFilesMiddleware;

/**
 * Static Files Configuration
 * إعدادات الملفات الثابتة (Static Files)
 * 
 * هذا الملف يحدد جميع المجلدات التي يجب أن تكون متاحة كـ static files
 * بدون الحاجة لـ authentication
 */

module.exports = {
  /**
   * Public directories configuration
   * المجلدات العامة التي يمكن الوصول إليها بدون authentication
   * 
   * Format:
   * {
   *   route: '/upload/files/location-images',  // URL path
   *   directory: 'upload/files/location-images', // Physical directory
   *   description: 'Location images',           // Description
   *   enabled: true                              // Enable/disable
   * }
   */
  publicDirectories: [
    {
      route: '/upload/files/location-images',
      directory: 'upload/files/location-images',
      description: 'Location images (countries, cities, regions, districts)',
      enabled: true
    },
    {
      route: '/upload/files/profile-picture',
      directory: 'upload/files/profile-picture',
      description: 'Profile pictures (all user types: user, doctor, admin, assistant)',
      enabled: true
    },
    {
      route: '/upload/health-tips',
      directory: 'upload/health-tips',
      description: 'Health tips images',
      enabled: true
    },
    // Clinic images (صور العيادات)
    {
      route: '/upload/files/clinic-images',
      directory: 'upload/files/clinic-images',
      description: 'Clinic images (gallery and cover images)',
      enabled: true
    },
    // ID Documents (مستندات الهوية - national_id, passport)
    {
      route: '/upload/files/id-document',
      directory: 'upload/files/id-document',
      description: 'ID documents (national ID, passport)',
      enabled: true
    },
    // Licenses (الرخص - medical_license)
    {
      route: '/upload/files/license',
      directory: 'upload/files/license',
      description: 'Professional licenses (medical license)',
      enabled: true
    },
    // Documents (المستندات - certificates, degrees)
    {
      route: '/upload/files/document',
      directory: 'upload/files/document',
      description: 'General documents (certificates, degrees)',
      enabled: true
    },
  ],

  /**
   * Cache configuration for static files
   * إعدادات الـ cache للملفات الثابتة
   */
  cacheConfig: {
    maxAge: '1d',           // Cache duration (1 day)
    etag: true,             // Enable ETag
    lastModified: true,     // Enable Last-Modified header
    immutable: false        // Set to true for files that never change
  },

  /**
   * Security headers for static files
   * رؤوس الأمان للملفات الثابتة
   */
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=86400',  // 1 day
    'X-Frame-Options': 'SAMEORIGIN'
  },

  /**
   * Auto-create directories if they don't exist
   * إنشاء المجلدات تلقائياً إذا لم تكن موجودة
   */
  autoCreateDirectories: true,

  /**
   * Log static file access (for debugging)
   * تسجيل الوصول للملفات الثابتة (للتشخيص)
   */
  logAccess: process.env.NODE_ENV === 'development'
};

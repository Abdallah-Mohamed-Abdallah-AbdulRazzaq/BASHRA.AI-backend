const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * File Service
 * خدمة مركزية لإدارة جميع الملفات في النظام
 * Central service for managing all files in the system
 */
class FileService {
  static toPositiveInt(value, fallback = 50, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static toNonNegativeInt(value, fallback = 0, max = 1000000) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
  }

  static normalizeEntityType(entityType) {
    const normalized = String(entityType || '').trim().toLowerCase();
    const allowed = ['user', 'admin', 'doctor', 'assistant'];
    if (!allowed.includes(normalized)) {
      throw new Error(`Invalid entity type: ${entityType}`);
    }
    return normalized;
  }

  
  /**
   * Upload and register file in database
   * رفع وتسجيل الملف في قاعدة البيانات
   * @param {Object} file - Multer file object
   * @param {Object} uploadedBy - { entityType: 'user'|'admin'|'doctor'|'assistant', entityId: number }
   * @param {Object} options - Additional options
   * @returns {Object} File record
   */
  static async uploadFile(file, uploadedBy, options = {}) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Validate inputs
      if (!file) {
        throw new Error('No file provided');
      }
      
      if (!uploadedBy || !uploadedBy.entityType || !uploadedBy.entityId) {
        throw new Error('Invalid uploader information');
      }
      
      // Extract options
      const {
        fileCategory = 'other',
        relatedToType = null,
        relatedToId = null,
        isPublic = false,
        isEncrypted = false,
        encryptionKey = null,
        storageProvider = 'local',
        expiresAt = null,
        metadata = null
      } = options;
      
      // Generate UUID
      const fileUuid = uuidv4();
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const storedFilename = `${fileCategory}_${fileUuid}_${timestamp}${ext}`;
      
      // Define upload directory based on category and entity type
      const categoryDir = fileCategory.replace(/_/g, '-');
      let uploadDir;
      let relativePath;
      
      // Special handling for profile pictures - separate folder per user type
      if (fileCategory === 'profile_picture') {
        // Create subdirectory for each user type: user, doctor, admin, assistant
        const userTypeDir = uploadedBy.entityType; // 'user', 'doctor', 'admin', 'assistant'
        uploadDir = path.join(__dirname, '..', 'upload', 'files', categoryDir, userTypeDir);
        relativePath = `${categoryDir}/${userTypeDir}`;
      } else {
        uploadDir = path.join(__dirname, '..', 'upload', 'files', categoryDir);
        relativePath = categoryDir;
      }
      
      // Create directory if it doesn't exist
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Save file to disk
      const filePath = path.join(uploadDir, storedFilename);
      await fs.writeFile(filePath, file.buffer);
      
      // Generate file URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
      const fileUrl = `${baseUrl}/upload/files/${relativePath}/${storedFilename}`;
      
      // Determine uploaded_by field
      const uploadedByField = `uploaded_by_${uploadedBy.entityType}_id`;
      
      // Prepare metadata
      const metadataJson = metadata ? JSON.stringify(metadata) : null;
      
      // Insert file record into database
      const [result] = await connection.execute(
        `INSERT INTO files (
          uuid,
          ${uploadedByField},
          related_to_type,
          related_to_id,
          file_category,
          original_filename,
          stored_filename,
          file_path,
          file_url,
          mime_type,
          file_size,
          file_extension,
          is_public,
          is_encrypted,
          encryption_key,
          metadata,
          storage_provider,
          expires_at,
          virus_scan_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fileUuid,
          uploadedBy.entityId,
          relatedToType,
          relatedToId,
          fileCategory,
          file.originalname,
          storedFilename,
          `/upload/files/${relativePath}/${storedFilename}`,
          fileUrl,
          file.mimetype,
          file.size,
          ext.replace('.', ''),
          isPublic ? 1 : 0,
          isEncrypted ? 1 : 0,
          encryptionKey,
          metadataJson,
          storageProvider,
          expiresAt,
          'pending'
        ]
      );
      
      await connection.commit();
      
      // Return file record
      return {
        id: result.insertId,
        uuid: fileUuid,
        file_url: fileUrl,
        original_filename: file.originalname,
        stored_filename: storedFilename,
        file_size: file.size,
        mime_type: file.mimetype,
        file_category: fileCategory
      };
      
    } catch (error) {
      await connection.rollback();
      throw new Error('Error uploading file: ' + error.message);
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get file by UUID
   * جلب الملف بواسطة UUID
   */
  static async getFileByUuid(uuid) {
    try {
      const [files] = await db.execute(
        `SELECT * FROM files WHERE uuid = ? AND is_deleted = 0`,
        [uuid]
      );
      
      if (files.length === 0) {
        return null;
      }
      
      const file = files[0];
      
      // Update access count and last accessed time
      await db.execute(
        `UPDATE files SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [file.id]
      );
      
      return file;
    } catch (error) {
      throw new Error('Error getting file: ' + error.message);
    }
  }
  
  /**
   * Get files by uploader
   * جلب الملفات حسب الرافع
   */
  static async getFilesByUploader(entityType, entityId, options = {}) {
    try {
      const { fileCategory, limit = 50, offset = 0 } = options;
      const limitNum = FileService.toPositiveInt(limit, 50, 100);
      const offsetNum = FileService.toNonNegativeInt(offset, 0);
      const normalizedEntityType = FileService.normalizeEntityType(entityType);
      
      const uploadedByField = `uploaded_by_${normalizedEntityType}_id`;
      
      let query = `SELECT * FROM files WHERE ${uploadedByField} = ? AND is_deleted = 0`;
      const params = [entityId];
      
      if (fileCategory) {
        query += ` AND file_category = ?`;
        params.push(fileCategory);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      const [files] = await db.execute(query, params);
      
      return files;
    } catch (error) {
      throw new Error('Error getting files: ' + error.message);
    }
  }
  
  /**
   * Get files by related entity
   * جلب الملفات حسب الكيان المرتبط
   */
  static async getFilesByRelatedEntity(relatedToType, relatedToId, options = {}) {
    try {
      const { fileCategory, limit = 50, offset = 0 } = options;
      const limitNum = FileService.toPositiveInt(limit, 50, 100);
      const offsetNum = FileService.toNonNegativeInt(offset, 0);
      
      let query = `SELECT * FROM files WHERE related_to_type = ? AND related_to_id = ? AND is_deleted = 0`;
      const params = [relatedToType, relatedToId];
      
      if (fileCategory) {
        query += ` AND file_category = ?`;
        params.push(fileCategory);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
      
      const [files] = await db.execute(query, params);
      
      return files;
    } catch (error) {
      throw new Error('Error getting files: ' + error.message);
    }
  }
  
  /**
   * Delete file (soft delete)
   * حذف الملف (حذف ناعم)
   */
  static async deleteFile(uuid, deleteFromDisk = false) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get file record
      const [files] = await connection.execute(
        `SELECT * FROM files WHERE uuid = ?`,
        [uuid]
      );
      
      if (files.length === 0) {
        throw new Error('File not found');
      }
      
      const file = files[0];
      
      // Soft delete in database
      await connection.execute(
        `UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
        [uuid]
      );
      
      // Optionally delete from disk
      if (deleteFromDisk && file.storage_provider === 'local') {
        try {
          const filePath = path.join(__dirname, '..', file.file_path);
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Error deleting file from disk:', err);
          // Don't throw error, just log it
        }
      }
      
      await connection.commit();
      
      return true;
    } catch (error) {
      await connection.rollback();
      throw new Error('Error deleting file: ' + error.message);
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update file metadata
   * تحديث البيانات الوصفية للملف
   */
  static async updateFileMetadata(uuid, updates) {
    try {
      const allowedFields = [
        'is_public',
        'metadata',
        'virus_scan_status',
        'virus_scan_date',
        'expires_at'
      ];
      
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          
          // Handle JSON metadata
          if (key === 'metadata' && typeof updates[key] === 'object') {
            updateValues.push(JSON.stringify(updates[key]));
          } else {
            updateValues.push(updates[key]);
          }
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updateValues.push(uuid);
      
      await db.execute(
        `UPDATE files SET ${updateFields.join(', ')} WHERE uuid = ?`,
        updateValues
      );
      
      return true;
    } catch (error) {
      throw new Error('Error updating file metadata: ' + error.message);
    }
  }
  
  /**
   * Get file statistics
   * الحصول على إحصائيات الملفات
   */
  static async getFileStatistics(entityType = null, entityId = null) {
    try {
      let query = `
        SELECT 
          file_category,
          COUNT(*) as count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size
        FROM files 
        WHERE is_deleted = 0
      `;
      
      const params = [];
      
      if (entityType && entityId) {
        const uploadedByField = `uploaded_by_${entityType}_id`;
        query += ` AND ${uploadedByField} = ?`;
        params.push(entityId);
      }
      
      query += ` GROUP BY file_category`;
      
      const [stats] = await db.execute(query, params);
      
      return stats;
    } catch (error) {
      throw new Error('Error getting file statistics: ' + error.message);
    }
  }
  
  /**
   * Clean up expired files
   * تنظيف الملفات المنتهية الصلاحية
   */
  static async cleanupExpiredFiles() {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Find expired files
      const [expiredFiles] = await connection.execute(
        `SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_deleted = 0`
      );
      
      // Soft delete them
      for (const file of expiredFiles) {
        await connection.execute(
          `UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [file.id]
        );
        
        // Optionally delete from disk
        if (file.storage_provider === 'local') {
          try {
            const filePath = path.join(__dirname, '..', file.file_path);
            await fs.unlink(filePath);
          } catch (err) {
            console.error('Error deleting expired file from disk:', err);
          }
        }
      }
      
      await connection.commit();
      
      return expiredFiles.length;
    } catch (error) {
      await connection.rollback();
      throw new Error('Error cleaning up expired files: ' + error.message);
    } finally {
      connection.release();
    }
  }
  
  /**
   * Initialize profile picture directories for all user types
   * إنشاء المجلدات الأساسية لصور الملفات الشخصية
   * Creates the folder structure:
   * - upload/files/profile-picture/user/
   * - upload/files/profile-picture/doctor/
   * - upload/files/profile-picture/admin/
   * - upload/files/profile-picture/assistant/
   */
  static async initializeProfilePictureDirectories() {
    try {
      const userTypes = ['user', 'doctor', 'admin', 'assistant'];
      const baseDir = path.join(__dirname, '..', 'upload', 'files', 'profile-picture');
      
      // Create main profile-picture directory
      await fs.mkdir(baseDir, { recursive: true });
      
      // Create subdirectories for each user type
      for (const userType of userTypes) {
        const userTypeDir = path.join(baseDir, userType);
        await fs.mkdir(userTypeDir, { recursive: true });
        console.log(`✅ Created directory: upload/files/profile-picture/${userType}/`);
      }
      
      console.log('✅ All profile picture directories initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing profile picture directories:', error);
      throw new Error('Error initializing directories: ' + error.message);
    }
  }
  
  /**
   * Get upload path for profile picture based on user type
   * الحصول على مسار الرفع لصورة الملف الشخصي حسب نوع المستخدم
   * @param {String} userType - 'user', 'doctor', 'admin', or 'assistant'
   * @returns {String} Relative path for profile picture upload
   */
  static getProfilePicturePath(userType) {
    const validUserTypes = ['user', 'doctor', 'admin', 'assistant'];
    
    if (!validUserTypes.includes(userType)) {
      throw new Error(`Invalid user type: ${userType}. Valid types are: ${validUserTypes.join(', ')}`);
    }
    
    return `profile-picture/${userType}`;
  }
  
  /**
   * Get full directory path for user type
   * الحصول على المسار الكامل للمجلد حسب نوع المستخدم
   * @param {String} userType - 'user', 'doctor', 'admin', or 'assistant'
   * @returns {String} Full directory path
   */
  static getProfilePictureDirectory(userType) {
    const validUserTypes = ['user', 'doctor', 'admin', 'assistant'];
    
    if (!validUserTypes.includes(userType)) {
      throw new Error(`Invalid user type: ${userType}. Valid types are: ${validUserTypes.join(', ')}`);
    }
    
    return path.join(__dirname, '..', 'upload', 'files', 'profile-picture', userType);
  }
  
  /**
   * Validate and ensure profile picture directory exists
   * التحقق من وجود مجلد صور الملف الشخصي وإنشائه إذا لزم الأمر
   * @param {String} userType - 'user', 'doctor', 'admin', or 'assistant'
   */
  static async ensureProfilePictureDirectory(userType) {
    try {
      const directory = FileService.getProfilePictureDirectory(userType);
      await fs.mkdir(directory, { recursive: true });
      return directory;
    } catch (error) {
      throw new Error(`Error ensuring directory for ${userType}: ${error.message}`);
    }
  }
}

module.exports = FileService;

const FileService = require('../services/fileService');
const db = require('../config/db');

/**
 * Files Controller
 * للإدارة الكاملة للملفات (Admin only)
 * Complete file management (Admin only)
 */
class FilesController {
  static VALID_ENTITY_TYPES = ['user', 'admin', 'doctor', 'assistant'];
  static VALID_FILE_CATEGORIES = ['profile_picture', 'medical_image', 'document', 'prescription', 'license', 'id_document', 'other'];
  static VALID_VIRUS_SCAN_STATUSES = ['pending', 'clean', 'infected', 'error'];

  static toPositiveInt(value, fallback = 1, max = 100) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
  }

  static toNonNegativeInt(value, fallback = 0, max = 1000000) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
  }

  
  /**
   * Get all files with filters
   * جلب جميع الملفات مع الفلاتر
   */
  static async getAllFiles(req, res) {
    try {
      const {
        page,
        limit,
        entityType,
        entityId,
        fileCategory,
        relatedToType,
        relatedToId,
        virusScanStatus,
        isPublic,
        storageProvider,
        searchTerm
      } = req.query;
      
      const pageNum = FilesController.toPositiveInt(page, 1, 1000000);
      const limitNum = FilesController.toPositiveInt(limit, 50, 100);
      const offsetNum = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE is_deleted = 0';
      const params = [];
      
      if (entityType || entityId) {
        if (!entityType || !entityId || !FilesController.VALID_ENTITY_TYPES.includes(entityType)) {
          return res.status(400).json({
            success: false,
            message: 'Valid entityType and entityId are required when filtering by uploader'
          });
        }

        const parsedEntityId = Number.parseInt(entityId, 10);
        if (!Number.isFinite(parsedEntityId) || parsedEntityId < 1) {
          return res.status(400).json({
            success: false,
            message: 'Invalid entityId'
          });
        }

        const uploadedByField = `uploaded_by_${entityType}_id`;
        whereClause += ` AND ${uploadedByField} = ?`;
        params.push(parsedEntityId);
      }
      
      if (fileCategory) {
        if (!FilesController.VALID_FILE_CATEGORIES.includes(fileCategory)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid fileCategory'
          });
        }
        whereClause += ' AND file_category = ?';
        params.push(fileCategory);
      }
      
      if (relatedToType || relatedToId) {
        const parsedRelatedId = Number.parseInt(relatedToId, 10);
        if (!relatedToType || !Number.isFinite(parsedRelatedId) || parsedRelatedId < 1) {
          return res.status(400).json({
            success: false,
            message: 'Valid relatedToType and relatedToId are required when filtering by related entity'
          });
        }
        whereClause += ' AND related_to_type = ? AND related_to_id = ?';
        params.push(relatedToType, parsedRelatedId);
      }
      
      if (virusScanStatus) {
        if (!FilesController.VALID_VIRUS_SCAN_STATUSES.includes(virusScanStatus)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid virusScanStatus'
          });
        }
        whereClause += ' AND virus_scan_status = ?';
        params.push(virusScanStatus);
      }
      
      if (isPublic !== undefined && isPublic !== '') {
        const normalizedPublic = String(isPublic).toLowerCase();
        if (!['true', 'false', '1', '0'].includes(normalizedPublic)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid isPublic value'
          });
        }
        whereClause += ' AND is_public = ?';
        params.push(['true', '1'].includes(normalizedPublic) ? 1 : 0);
      }
      
      if (storageProvider) {
        whereClause += ' AND storage_provider = ?';
        params.push(storageProvider);
      }
      
      if (searchTerm) {
        whereClause += ' AND (original_filename LIKE ? OR stored_filename LIKE ? OR uuid LIKE ?)';
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
      
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM files ${whereClause}`,
        params
      );
      const totalFiles = Number(countResult[0]?.total || 0);
      
      const [files] = await db.execute(
        `SELECT * FROM files ${whereClause} ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`,
        params
      );
      
      return res.status(200).json({
        success: true,
        message: 'Files retrieved successfully',
        data: {
          files,
          pagination: {
            total: totalFiles,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiles / limitNum),
            hasMore: offsetNum + files.length < totalFiles
          }
        }
      });
      
    } catch (error) {
      console.error('Error in getAllFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving files',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  /**
   * Get file by UUID
   * جلب ملف بواسطة UUID
   */
  static async getFileByUuid(req, res) {
    try {
      const { uuid } = req.params;
      
      const file = await FileService.getFileByUuid(uuid);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'File retrieved successfully',
        data: file
      });
      
    } catch (error) {
      console.error('Error in getFileByUuid:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving file',
        error: error.message
      });
    }
  }
  
  /**
   * Get file statistics
   * الحصول على إحصائيات الملفات
   */
  static async getFileStatistics(req, res) {
    try {
      const { entityType, entityId } = req.query;
      
      const stats = await FileService.getFileStatistics(entityType, entityId);
      
      // Get overall stats
      const [overallStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size,
          COUNT(DISTINCT uploaded_by_user_id) + 
          COUNT(DISTINCT uploaded_by_admin_id) + 
          COUNT(DISTINCT uploaded_by_doctor_id) + 
          COUNT(DISTINCT uploaded_by_assistant_id) as total_uploaders
        FROM files 
        WHERE is_deleted = 0
      `);
      
      // Get virus scan statistics
      const [virusStats] = await db.execute(`
        SELECT 
          virus_scan_status,
          COUNT(*) as count
        FROM files 
        WHERE is_deleted = 0
        GROUP BY virus_scan_status
      `);
      
      // Get storage provider statistics
      const [storageStats] = await db.execute(`
        SELECT 
          storage_provider,
          COUNT(*) as count,
          SUM(file_size) as total_size
        FROM files 
        WHERE is_deleted = 0
        GROUP BY storage_provider
      `);
      
      return res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          overall: overallStats[0],
          byCategory: stats,
          byVirusScan: virusStats,
          byStorageProvider: storageStats
        }
      });
      
    } catch (error) {
      console.error('Error in getFileStatistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving statistics',
        error: error.message
      });
    }
  }
  
  /**
   * Update file metadata
   * تحديث البيانات الوصفية للملف
   */
  static async updateFileMetadata(req, res) {
    try {
      const { uuid } = req.params;
      const updates = req.body;
      
      await FileService.updateFileMetadata(uuid, updates);
      
      return res.status(200).json({
        success: true,
        message: 'File metadata updated successfully'
      });
      
    } catch (error) {
      console.error('Error in updateFileMetadata:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating file metadata',
        error: error.message
      });
    }
  }
  
  /**
   * Delete file
   * حذف ملف
   */
  static async deleteFile(req, res) {
    try {
      const { uuid } = req.params;
      const { deleteFromDisk = false } = req.query;
      
      await FileService.deleteFile(uuid, deleteFromDisk === 'true');
      
      return res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
      
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting file',
        error: error.message
      });
    }
  }
  
  /**
   * Restore deleted file
   * استعادة ملف محذوف
   */
  static async restoreFile(req, res) {
    try {
      const { uuid } = req.params;
      
      await db.execute(
        `UPDATE files SET is_deleted = 0, deleted_at = NULL WHERE uuid = ?`,
        [uuid]
      );
      
      return res.status(200).json({
        success: true,
        message: 'File restored successfully'
      });
      
    } catch (error) {
      console.error('Error in restoreFile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error restoring file',
        error: error.message
      });
    }
  }
  
  /**
   * Clean up expired files
   * تنظيف الملفات المنتهية
   */
  static async cleanupExpiredFiles(req, res) {
    try {
      const deletedCount = await FileService.cleanupExpiredFiles();
      
      return res.status(200).json({
        success: true,
        message: `Cleaned up ${deletedCount} expired files`,
        data: {
          deletedCount
        }
      });
      
    } catch (error) {
      console.error('Error in cleanupExpiredFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error cleaning up expired files',
        error: error.message
      });
    }
  }
  
  /**
   * Get files by uploader
   * جلب ملفات المستخدم
   */
  static async getFilesByUploader(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const { fileCategory, limit = 50, offset = 0 } = req.query;
      const limitNum = FilesController.toPositiveInt(limit, 50, 100);
      const offsetNum = FilesController.toNonNegativeInt(offset, 0);
      
      const files = await FileService.getFilesByUploader(
        entityType,
        entityId,
        { fileCategory, limit: limitNum, offset: offsetNum }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Files retrieved successfully',
        data: files
      });
      
    } catch (error) {
      console.error('Error in getFilesByUploader:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving files',
        error: error.message
      });
    }
  }
  
  /**
   * Get files by related entity
   * جلب ملفات حسب الكيان المرتبط
   */
  static async getFilesByRelated(req, res) {
    try {
      const { relatedToType, relatedToId } = req.params;
      const { fileCategory, limit = 50, offset = 0 } = req.query;
      const limitNum = FilesController.toPositiveInt(limit, 50, 100);
      const offsetNum = FilesController.toNonNegativeInt(offset, 0);
      
      const files = await FileService.getFilesByRelatedEntity(
        relatedToType,
        relatedToId,
        { fileCategory, limit: limitNum, offset: offsetNum }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Files retrieved successfully',
        data: files
      });
      
    } catch (error) {
      console.error('Error in getFilesByRelated:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrieving files',
        error: error.message
      });
    }
  }
  
  /**
   * Bulk delete files
   * حذف مجموعة ملفات
   */
  static async bulkDeleteFiles(req, res) {
    try {
      const { uuids, deleteFromDisk = false } = req.body;
      
      if (!Array.isArray(uuids) || uuids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide an array of UUIDs'
        });
      }
      
      const results = {
        success: [],
        failed: []
      };
      
      for (const uuid of uuids) {
        try {
          await FileService.deleteFile(uuid, deleteFromDisk);
          results.success.push(uuid);
        } catch (error) {
          results.failed.push({ uuid, error: error.message });
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Deleted ${results.success.length} files, ${results.failed.length} failed`,
        data: results
      });
      
    } catch (error) {
      console.error('Error in bulkDeleteFiles:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting files',
        error: error.message
      });
    }
  }
}

module.exports = FilesController;

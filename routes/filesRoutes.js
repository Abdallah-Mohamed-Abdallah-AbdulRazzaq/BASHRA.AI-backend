const express = require('express');
const router = express.Router();
const FilesController = require('../controllers/FilesController');
const { authenticateJWT, authorizeSuperAdmin, authorizeAnyAdmin, adminActionLogger } = require('../middleware/authMiddleware');
const { parseFormData } = require('../middleware/formDataMiddleware');

/**
 * Files Management Routes
 * مسارات إدارة الملفات
 * Admin Only - للمسؤولين فقط
 * Base path: /api/files
 */

// All routes require authentication and admin authorization
router.use(authenticateJWT, authorizeSuperAdmin, authorizeAnyAdmin);

/**
 * @route   GET /api/files
 * @desc    Get all files with filters
 * @access  Private (Admin only)
 * @query   {
 *            page: number,
 *            limit: number,
 *            entityType: 'user'|'admin'|'doctor'|'assistant',
 *            entityId: number,
 *            fileCategory: string,
 *            relatedToType: string,
 *            relatedToId: number,
 *            virusScanStatus: 'pending'|'clean'|'infected'|'error',
 *            isPublic: boolean,
 *            storageProvider: string,
 *            searchTerm: string
 *          }
 */
router.get('/', FilesController.getAllFiles);

/**
 * @route   GET /api/files/statistics
 * @desc    Get file statistics
 * @access  Private (Admin only)
 */
router.get('/statistics', FilesController.getFileStatistics);

/**
 * @route   GET /api/files/:uuid
 * @desc    Get file by UUID
 * @access  Private (Admin only)
 */
router.get('/:uuid', FilesController.getFileByUuid);

/**
 * @route   GET /api/files/uploader/:entityType/:entityId
 * @desc    Get files by uploader
 * @access  Private (Admin only)
 * @params  entityType: 'user'|'admin'|'doctor'|'assistant'
 *          entityId: number
 */
router.get('/uploader/:entityType/:entityId', FilesController.getFilesByUploader);

/**
 * @route   GET /api/files/related/:relatedToType/:relatedToId
 * @desc    Get files by related entity
 * @access  Private (Admin only)
 */
router.get('/related/:relatedToType/:relatedToId', FilesController.getFilesByRelated);

/**
 * @route   PUT /api/files/:uuid
 * @desc    Update file metadata
 * @access  Private (Admin only)
 * @body    {
 *            is_public: boolean,
 *            metadata: object,
 *            virus_scan_status: string,
 *            virus_scan_date: datetime,
 *            expires_at: datetime
 *          }
 */
router.put('/:uuid',
  parseFormData,
  adminActionLogger('UPDATE_FILE_METADATA', (req) => ({
    targetType: 'file',
    targetId: req.params.uuid,
    newValues: req.body
  })),
  FilesController.updateFileMetadata
);

/**
 * @route   DELETE /api/files/:uuid
 * @desc    Delete file (soft delete)
 * @access  Private (Admin only)
 * @query   deleteFromDisk: boolean
 */
router.delete('/:uuid',
  adminActionLogger('DELETE_FILE', (req) => ({
    targetType: 'file',
    targetId: req.params.uuid,
    newValues: { deleteFromDisk: req.query.deleteFromDisk }
  })),
  FilesController.deleteFile
);

/**
 * @route   POST /api/files/:uuid/restore
 * @desc    Restore deleted file
 * @access  Private (Admin only)
 */
router.post('/:uuid/restore',
  adminActionLogger('RESTORE_FILE', (req) => ({
    targetType: 'file',
    targetId: req.params.uuid
  })),
  FilesController.restoreFile
);

/**
 * @route   POST /api/files/cleanup/expired
 * @desc    Clean up expired files
 * @access  Private (Admin only)
 */
router.post('/cleanup/expired',
  adminActionLogger('CLEANUP_EXPIRED_FILES'),
  FilesController.cleanupExpiredFiles
);

/**
 * @route   POST /api/files/bulk-delete
 * @desc    Bulk delete files
 * @access  Private (Admin only)
 * @body    {
 *            uuids: string[],
 *            deleteFromDisk: boolean
 *          }
 */
router.post('/bulk-delete',
  parseFormData,
  adminActionLogger('BULK_DELETE_FILES', (req) => ({
    targetType: 'files',
    newValues: { count: req.body.uuids?.length }
  })),
  FilesController.bulkDeleteFiles
);

module.exports = router;

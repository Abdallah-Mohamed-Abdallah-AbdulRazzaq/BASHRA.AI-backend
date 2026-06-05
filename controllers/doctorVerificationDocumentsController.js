const db = require('../config/db');
const FileService = require('../services/fileService');

/**
 * Doctor Verification Documents Controller
 * معالج مستندات التحقق للأطباء
 */
class DoctorVerificationDocumentsController {

  /**
   * Helper function to normalize language code
   */
  static normalizeLanguage(langHeader, userPreference) {
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }
    return userPreference || 'ar';
  }

  /**
   * Map document_type to file_category
   * تحويل نوع المستند إلى فئة الملف
   * 
   * @param {string} documentType - نوع المستند من doctor_verification_documents
   * @returns {string} - فئة الملف لجدول files
   */
  static mapDocumentTypeToFileCategory(documentType) {
    const mapping = {
      'national_id': 'id_document',      // بطاقة الهوية
      'passport': 'id_document',          // جواز السفر
      'medical_license': 'license',       // الرخصة الطبية
      'board_certificate': 'document',    // شهادة البورد
      'university_degree': 'document',    // الشهادة الجامعية
      'other': 'document'                 // أخرى
    };
    
    return mapping[documentType] || 'document';
  }

  /**
   * Upload verification document
   * رفع مستند التحقق
   */
  static async uploadDocument(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const { document_type } = req.body;

      // Validate document_type
      const validTypes = ['national_id', 'passport', 'medical_license', 'board_certificate', 'university_degree', 'other'];
      if (!document_type || !validTypes.includes(document_type)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'نوع المستند غير صالح' 
            : 'Invalid document type',
          valid_types: validTypes
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'الرجاء رفع ملف المستند' 
            : 'Please upload a document file'
        });
      }

      // Map document_type to file_category
      const fileCategory = DoctorVerificationDocumentsController.mapDocumentTypeToFileCategory(document_type);

      // Use FileService to upload and register the file
      const fileRecord = await FileService.uploadFile(
        req.file,
        {
          entityType: 'doctor',
          entityId: doctorId
        },
        {
          fileCategory: fileCategory, // استخدام file_category الصحيح
          relatedToType: 'doctor_verification',
          relatedToId: null,
          isPublic: false,
          metadata: {
            document_type: document_type,
            uploaded_from: 'doctor_verification',
            original_document_type: document_type // حفظ النوع الأصلي
          }
        }
      );

      // Insert document record
      const [result] = await connection.execute(
        `INSERT INTO doctor_verification_documents 
        (doctor_id, document_type, file_url, status, uploaded_at)
        VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
        [doctorId, document_type, fileRecord.file_url]
      );

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: language === 'ar' 
          ? 'تم رفع المستند بنجاح' 
          : 'Document uploaded successfully',
        data: {
          id: result.insertId,
          document_type,
          file_url: fileRecord.file_url,
          file_uuid: fileRecord.uuid,
          status: 'pending'
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in uploadDocument:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في رفع المستند' 
          : 'Error uploading document',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get all verification documents for doctor
   * جلب جميع مستندات التحقق للطبيب
   */
  static async getAllDocuments(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const [documents] = await db.execute(
        `SELECT 
          id, document_type, file_url, status, rejection_reason,
          uploaded_at, verified_at, verified_by
        FROM doctor_verification_documents 
        WHERE doctor_id = ?
        ORDER BY uploaded_at DESC`,
        [doctorId]
      );

      res.status(200).json({
        success: true,
        count: documents.length,
        data: documents
      });

    } catch (error) {
      console.error('Error in getAllDocuments:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب المستندات' 
          : 'Error fetching documents',
        error: error.message
      });
    }
  }

  /**
   * Get single verification document by ID
   * جلب مستند تحقق محدد
   */
  static async getDocumentById(req, res) {
    try {
      const doctorId = req.user.id;
      const documentId = req.params.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const [documents] = await db.execute(
        `SELECT 
          id, document_type, file_url, status, rejection_reason,
          uploaded_at, verified_at, verified_by
        FROM doctor_verification_documents 
        WHERE id = ? AND doctor_id = ?`,
        [documentId, doctorId]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستند غير موجود' : 'Document not found'
        });
      }

      res.status(200).json({
        success: true,
        data: documents[0]
      });

    } catch (error) {
      console.error('Error in getDocumentById:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب المستند' 
          : 'Error fetching document',
        error: error.message
      });
    }
  }

  /**
   * Update verification document (re-upload)
   * تحديث مستند التحقق (إعادة رفع)
   */
  static async updateDocument(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const documentId = req.params.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if document exists and belongs to doctor
      const [existingDocs] = await connection.execute(
        'SELECT id, file_url, status FROM doctor_verification_documents WHERE id = ? AND doctor_id = ?',
        [documentId, doctorId]
      );

      if (existingDocs.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستند غير موجود' : 'Document not found'
        });
      }

      const oldFileUrl = existingDocs[0].file_url;

      // Check if file was uploaded
      if (!req.file) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'الرجاء رفع ملف المستند الجديد' 
            : 'Please upload a new document file'
        });
      }

      // Get document_type from request body or from existing document
      const [docTypeRows] = await connection.execute(
        'SELECT document_type FROM doctor_verification_documents WHERE id = ?',
        [documentId]
      );
      const documentType = req.body.document_type || docTypeRows[0]?.document_type || 'other';

      // Map document_type to file_category
      const fileCategory = DoctorVerificationDocumentsController.mapDocumentTypeToFileCategory(documentType);

      // Use FileService to upload and register the new file
      const fileRecord = await FileService.uploadFile(
        req.file,
        {
          entityType: 'doctor',
          entityId: doctorId
        },
        {
          fileCategory: fileCategory, // استخدام file_category الصحيح
          relatedToType: 'doctor_verification',
          relatedToId: documentId,
          isPublic: false,
          metadata: {
            document_type: documentType,
            uploaded_from: 'doctor_verification_update',
            original_document_type: documentType
          }
        }
      );

      // Update document record with new file URL
      await connection.execute(
        `UPDATE doctor_verification_documents 
        SET file_url = ?, status = 'pending', rejection_reason = NULL, 
            uploaded_at = CURRENT_TIMESTAMP, verified_at = NULL, verified_by = NULL
        WHERE id = ?`,
        [fileRecord.file_url, documentId]
      );

      // Mark old file as deleted in files table (soft delete)
      if (oldFileUrl) {
        try {
          // Extract UUID from old file URL if it exists in files table
          await connection.execute(
            `UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
             WHERE file_url = ? AND uploaded_by_doctor_id = ?`,
            [oldFileUrl, doctorId]
          );
        } catch (fileError) {
          console.error('Error marking old file as deleted:', fileError);
          // Continue even if this fails
        }
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم تحديث المستند بنجاح' 
          : 'Document updated successfully',
        data: {
          id: documentId,
          file_url: fileRecord.file_url,
          file_uuid: fileRecord.uuid,
          status: 'pending'
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateDocument:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في تحديث المستند' 
          : 'Error updating document',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Delete verification document
   * حذف مستند التحقق
   */
  static async deleteDocument(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const doctorId = req.user.id;
      const documentId = req.params.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      // Check if document exists and belongs to doctor
      const [existingDocs] = await connection.execute(
        'SELECT id, file_url, status FROM doctor_verification_documents WHERE id = ? AND doctor_id = ?',
        [documentId, doctorId]
      );

      if (existingDocs.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'المستند غير موجود' : 'Document not found'
        });
      }

      // Don't allow deletion of approved documents
      if (existingDocs[0].status === 'approved') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? 'لا يمكن حذف مستند تم الموافقة عليه' 
            : 'Cannot delete approved document'
        });
      }

      const fileUrl = existingDocs[0].file_url;

      // Delete document record from doctor_verification_documents
      await connection.execute(
        'DELETE FROM doctor_verification_documents WHERE id = ?',
        [documentId]
      );

      // Mark file as deleted in files table (soft delete)
      if (fileUrl) {
        try {
          await connection.execute(
            `UPDATE files SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP 
             WHERE file_url = ? AND uploaded_by_doctor_id = ?`,
            [fileUrl, doctorId]
          );
        } catch (fileError) {
          console.error('Error marking file as deleted:', fileError);
          // Continue even if this fails
        }
      }

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: language === 'ar' 
          ? 'تم حذف المستند بنجاح' 
          : 'Document deleted successfully'
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error in deleteDocument:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      return res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في حذف المستند' 
          : 'Error deleting document',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get documents summary (count by status)
   * جلب ملخص المستندات (العدد حسب الحالة)
   */
  static async getDocumentsSummary(req, res) {
    try {
      const doctorId = req.user.id;
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const [summary] = await db.execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM doctor_verification_documents 
        WHERE doctor_id = ?`,
        [doctorId]
      );

      res.status(200).json({
        success: true,
        data: summary[0]
      });

    } catch (error) {
      console.error('Error in getDocumentsSummary:', error);
      const language = DoctorVerificationDocumentsController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'خطأ في جلب ملخص المستندات' 
          : 'Error fetching documents summary',
        error: error.message
      });
    }
  }
}

module.exports = DoctorVerificationDocumentsController;

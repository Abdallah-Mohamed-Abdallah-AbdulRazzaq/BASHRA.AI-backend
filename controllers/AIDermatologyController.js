const AISessionService = require('../services/ai/AISessionService');
const AIUsageService = require('../services/ai/AIUsageService');
const AIDermatologyService = require('../services/ai/AIDermatologyService');
const AIShareService = require('../services/ai/AIShareService');

class AIDermatologyController {
  static async createSession(req, res) {
    try {
      const userId = req.user.id;

      const session = await AISessionService.createSession(userId, {
        title: req.body.title,
        input_mode: req.body.input_mode || 'chat',
        language_code: req.body.language_code || process.env.AI_DEFAULT_LANGUAGE || 'ar',
        patient_consent: req.body.patient_consent === true || req.body.patient_consent === 'true' || req.body.patient_consent === 1 || req.body.patient_consent === '1'
      });

      return res.status(201).json({
        success: true,
        message_ar: 'تم إنشاء جلسة الذكاء الاصطناعي بنجاح',
        message_en: 'AI session created successfully',
        data: session
      });
    } catch (error) {
      console.error('AI createSession error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل إنشاء جلسة الذكاء الاصطناعي',
        message_en: 'Failed to create AI session',
        error: error.message
      });
    }
  }

  static async getMySessions(req, res) {
    try {
      const userId = req.user.id;

      const data = await AISessionService.getUserSessions(userId, {
        page: req.query.page,
        limit: req.query.limit
      });

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب جلسات الذكاء الاصطناعي بنجاح',
        message_en: 'AI sessions retrieved successfully',
        data
      });
    } catch (error) {
      console.error('AI getMySessions error:', error);

      return res.status(500).json({
        success: false,
        message_ar: 'فشل جلب جلسات الذكاء الاصطناعي',
        message_en: 'Failed to retrieve AI sessions',
        error: error.message
      });
    }
  }

  static async getSessionByUuid(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;

      const data = await AISessionService.getUserSessionByUuid(userId, uuid);

      if (!data) {
        return res.status(404).json({
          success: false,
          message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
          message_en: 'AI session not found'
        });
      }

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب جلسة الذكاء الاصطناعي بنجاح',
        message_en: 'AI session retrieved successfully',
        data
      });
    } catch (error) {
      console.error('AI getSessionByUuid error:', error);

      return res.status(500).json({
        success: false,
        message_ar: 'فشل جلب جلسة الذكاء الاصطناعي',
        message_en: 'Failed to retrieve AI session',
        error: error.message
      });
    }
  }

  static async getMyUsage(req, res) {
    try {
      const userId = req.user.id;

      const usage = await AIUsageService.getUsageSummary(userId);

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب استخدام الذكاء الاصطناعي بنجاح',
        message_en: 'AI usage retrieved successfully',
        data: usage
      });
    } catch (error) {
      console.error('AI getMyUsage error:', error);

      return res.status(500).json({
        success: false,
        message_ar: 'فشل جلب استخدام الذكاء الاصطناعي',
        message_en: 'Failed to retrieve AI usage',
        error: error.message
      });
    }
  }

  static async sendTextMessage(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;
      const message = req.body.message || req.body.content;

      const data = await AIDermatologyService.sendTextMessage(userId, uuid, message);

      return res.status(201).json({
        success: true,
        message_ar: 'تم إرسال الرسالة وتحليلها بنجاح',
        message_en: 'Message sent and analyzed successfully',
        data
      });
    } catch (error) {
      console.error('AI sendTextMessage error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل إرسال رسالة الذكاء الاصطناعي',
        message_en: 'Failed to send AI message',
        error: error.message
      });
    }
  }

  static async analyzeImage(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;
      const description = req.body.description || req.body.message || '';

      const data = await AIDermatologyService.analyzeImage(
        userId,
        uuid,
        req.file,
        description
      );

      return res.status(201).json({
        success: true,
        message_ar: 'تم رفع الصورة وتحليلها بنجاح',
        message_en: 'Image uploaded and analyzed successfully',
        data
      });
    } catch (error) {
      console.error('AI analyzeImage error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل تحليل الصورة بالذكاء الاصطناعي',
        message_en: 'Failed to analyze image with AI',
        error: error.message
      });
    }
  }

  static async getSecureAIFile(req, res) {
    try {
      const userId = req.user.id;
      const { fileUuid } = req.params;

      const data = await AIDermatologyService.getSecureAIFileForUser(userId, fileUuid);

      if (!data) {
        return res.status(404).json({
          success: false,
          message_ar: 'الملف غير موجود أو غير مصرح لك بالوصول إليه',
          message_en: 'File not found or you are not allowed to access it'
        });
      }

      const safeFilename = String(data.originalFilename).replace(/"/g, '');

      res.setHeader('Content-Type', data.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      return res.sendFile(data.absolutePath);
    } catch (error) {
      console.error('AI getSecureAIFile error:', error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل جلب ملف الذكاء الاصطناعي',
        message_en: 'Failed to retrieve AI file',
        error: error.message
      });
    }
  }

  static async analyzeDocument(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;
      const description = req.body.description || req.body.message || '';

      const data = await AIDermatologyService.analyzeDocument(
        userId,
        uuid,
        req.file,
        description
      );

      return res.status(201).json({
        success: true,
        message_ar: 'تم رفع التقرير وتحليله بنجاح',
        message_en: 'Document uploaded and analyzed successfully',
        data
      });
    } catch (error) {
      console.error('AI analyzeDocument error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل تحليل التقرير بالذكاء الاصطناعي',
        message_en: 'Failed to analyze document with AI',
        error: error.message
      });
    }
  }

  static async completeSession(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;

      const data = await AIDermatologyService.completeSession(userId, uuid);

      return res.status(201).json({
        success: true,
        message_ar: 'تم إنهاء جلسة الذكاء الاصطناعي وإنشاء الملخص النهائي بنجاح',
        message_en: 'AI session completed and final summary generated successfully',
        data
      });
    } catch (error) {
      console.error('AI completeSession error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل إنهاء جلسة الذكاء الاصطناعي',
        message_en: 'Failed to complete AI session',
        error: error.message
      });
    }
  }

  static async shareSession(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;

      const data = await AIShareService.createShare(userId, uuid, req.body || {});

      return res.status(data.already_shared ? 200 : 201).json({
        success: true,
        message_ar: data.already_shared
          ? 'تمت مشاركة جلسة الذكاء الاصطناعي مسبقًا مع هذا الطبيب'
          : 'تمت مشاركة جلسة الذكاء الاصطناعي بنجاح',
        message_en: data.already_shared
          ? 'AI session was already shared with this doctor'
          : 'AI session shared successfully',
        data
      });
    } catch (error) {
      console.error('AI shareSession error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل مشاركة جلسة الذكاء الاصطناعي',
        message_en: 'Failed to share AI session',
        error: error.message
      });
    }
  }

  static async getSessionShares(req, res) {
    try {
      const userId = req.user.id;
      const { uuid } = req.params;

      const data = await AIShareService.getSessionShares(userId, uuid);

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب مشاركات جلسة الذكاء الاصطناعي بنجاح',
        message_en: 'AI session shares retrieved successfully',
        data
      });
    } catch (error) {
      console.error('AI getSessionShares error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل جلب مشاركات جلسة الذكاء الاصطناعي',
        message_en: 'Failed to retrieve AI session shares',
        error: error.message
      });
    }
  }

  static async revokeShare(req, res) {
    try {
      const userId = req.user.id;
      const { shareUuid } = req.params;

      const data = await AIShareService.revokeShare(userId, shareUuid);

      return res.status(200).json({
        success: true,
        message_ar: data.already_revoked
          ? 'تم إلغاء هذه المشاركة مسبقًا'
          : 'تم إلغاء مشاركة جلسة الذكاء الاصطناعي بنجاح',
        message_en: data.already_revoked
          ? 'This AI share was already revoked'
          : 'AI session share revoked successfully',
        data
      });
    } catch (error) {
      console.error('AI revokeShare error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل إلغاء مشاركة جلسة الذكاء الاصطناعي',
        message_en: 'Failed to revoke AI session share',
        error: error.message
      });
    }
  }

  static async doctorGetSharedSessions(req, res) {
    try {
      const doctorId = req.user.id;

      const data = await AIShareService.getDoctorSharedSessions(doctorId);

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب جلسات الذكاء الاصطناعي المشتركة مع الطبيب بنجاح',
        message_en: 'Doctor shared AI sessions retrieved successfully',
        data
      });
    } catch (error) {
      console.error('AI doctorGetSharedSessions error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل جلب جلسات الذكاء الاصطناعي المشتركة مع الطبيب',
        message_en: 'Failed to retrieve doctor shared AI sessions',
        error: error.message
      });
    }
  }

  static async doctorGetSharedSessionByShareUuid(req, res) {
    try {
      const doctorId = req.user.id;
      const { shareUuid } = req.params;

      const data = await AIShareService.getDoctorSharedSessionByShareUuid(
        doctorId,
        shareUuid
      );

      return res.status(200).json({
        success: true,
        message_ar: 'تم جلب تفاصيل جلسة الذكاء الاصطناعي المشتركة بنجاح',
        message_en: 'Shared AI session details retrieved successfully',
        data
      });
    } catch (error) {
      console.error('AI doctorGetSharedSessionByShareUuid error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل جلب تفاصيل جلسة الذكاء الاصطناعي المشتركة',
        message_en: 'Failed to retrieve shared AI session details',
        error: error.message
      });
    }
  }

  static async doctorGetSecureAIFile(req, res) {
    try {
      const doctorId = req.user.id;
      const { fileUuid } = req.params;

      const data = await AIShareService.getSecureSharedAIFileForDoctor(
        doctorId,
        fileUuid
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message_ar: 'الملف غير موجود أو غير مصرح للطبيب بالوصول إليه',
          message_en: 'File not found or doctor is not allowed to access it'
        });
      }

      const safeFilename = String(data.originalFilename).replace(/"/g, '');

      res.setHeader('Content-Type', data.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      return res.sendFile(data.absolutePath);
    } catch (error) {
      console.error('AI doctorGetSecureAIFile error:', error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل جلب ملف الذكاء الاصطناعي للطبيب',
        message_en: 'Failed to retrieve AI file for doctor',
        error: error.message
      });
    }
  }

  static async doctorReviewAIResult(req, res) {
    try {
      const doctorId = req.user.id;
      const { resultUuid } = req.params;

      const data = await AIShareService.reviewSharedAIResult(
        doctorId,
        resultUuid,
        req.body || {}
      );

      return res.status(200).json({
        success: true,
        message_ar: 'تم حفظ مراجعة الطبيب لنتيجة الذكاء الاصطناعي بنجاح',
        message_en: 'Doctor review for AI result saved successfully',
        data
      });
    } catch (error) {
      console.error('AI doctorReviewAIResult error:', error);

      if (error.response) {
        return res.status(error.statusCode || 400).json(error.response);
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message_ar: 'فشل حفظ مراجعة الطبيب لنتيجة الذكاء الاصطناعي',
        message_en: 'Failed to save doctor review for AI result',
        error: error.message
      });
    }
  }

}

module.exports = AIDermatologyController;
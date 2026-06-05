const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const AIUsageService = require('./AIUsageService');
const AIProviderFactory = require('./AIProviderFactory');
const FileService = require('../fileService');
const fs = require('fs');
const path = require('path');


class AIDermatologyService {
  static normalizeBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  static getBackendBaseUrl() {
    const fallbackPort = process.env.PORT || 3006;
    const rawBaseUrl = process.env.BACKEND_URL || process.env.BASE_URL || `http://localhost:${fallbackPort}`;

    return String(rawBaseUrl).trim().replace(/\/+$/, '');
  }

  static buildSecureAIFilePath(fileUuid) {
    if (!fileUuid) return null;
    return `/api/ai-dermatology/files/${fileUuid}`;
  }

  static buildSecureAIFileUrl(fileUuid) {
    const filePath = this.buildSecureAIFilePath(fileUuid);
    if (!filePath) return null;

    return `${this.getBackendBaseUrl()}${filePath}`;
  }


  static normalizeAIResponse(aiResponse, fallbackMessage = '', languageCode = 'ar', defaultResponseKind = 'dermatology_assessment') {
    const response = aiResponse && typeof aiResponse === 'object'
      ? { ...aiResponse }
      : this.buildMockDermatologyResponse(fallbackMessage, languageCode);

    const safeLanguage = response.language === 'en' ? 'en' : 'ar';
    const fallbackText = String(fallbackMessage || '').trim();

    response.language = safeLanguage;
    response.response_kind = response.response_kind || defaultResponseKind;
    response.case_summary = String(response.case_summary || fallbackText || (safeLanguage === 'en'
      ? 'The message was received for dermatology-focused support.'
      : 'تم استلام الرسالة للمساعدة في إطار الجلدية.'));
    response.conversation_reply = String(response.conversation_reply || response.case_summary);

    response.possible_conditions = Array.isArray(response.possible_conditions) ? response.possible_conditions : [];
    response.red_flags = Array.isArray(response.red_flags) ? response.red_flags : [];
    response.safe_advice = Array.isArray(response.safe_advice) ? response.safe_advice : [];
    response.avoid = Array.isArray(response.avoid) ? response.avoid : [];
    response.follow_up_questions = Array.isArray(response.follow_up_questions) ? response.follow_up_questions : [];

    const allowedSeverity = ['mild', 'moderate', 'severe', 'urgent'];
    if (!allowedSeverity.includes(response.severity)) response.severity = 'mild';

    const allowedNextSteps = ['self_care', 'book_dermatologist', 'urgent_care', 'doctor_review'];
    if (!allowedNextSteps.includes(response.recommended_next_step)) {
      response.recommended_next_step = response.severity === 'urgent' ? 'urgent_care' : 'book_dermatologist';
    }

    const allowedConfidence = ['low', 'medium', 'high'];
    if (!allowedConfidence.includes(response.confidence_level)) response.confidence_level = 'low';

    response.needs_doctor_review = Boolean(response.needs_doctor_review);
    response.disclaimer = String(response.disclaimer || (safeLanguage === 'en'
      ? 'This information does not replace consultation with a qualified dermatologist.'
      : 'هذه المعلومات لا تغني عن استشارة طبيب جلدية مختص.'));

    return response;
  }

  static getUserFacingReply(aiResponse, fallback = '') {
    return String(
      aiResponse?.conversation_reply
      || aiResponse?.case_summary
      || fallback
      || ''
    ).trim();
  }

  static async getOwnedActiveSession(userId, sessionUuid) {
    const [sessions] = await db.execute(
      `
      SELECT *
      FROM ai_sessions
      WHERE uuid = ?
        AND user_id = ?
        AND status = 'active'
      LIMIT 1
      `,
      [sessionUuid, userId]
    );

    return sessions.length > 0 ? sessions[0] : null;
  }

  static buildMockDermatologyResponse(message, languageCode = 'ar') {
    const lowerMessage = String(message || '').toLowerCase();

    const urgentKeywords = [
      'صديد',
      'قيح',
      'نزيف',
      'حمى',
      'حرارة',
      'تورم شديد',
      'ألم شديد',
      'ينتشر بسرعة',
      'انتشار سريع',
      'حول العين',
      'العين',
      'ضيق تنفس',
      'حساسية شديدة',
      'دوخة',
      'إغماء'
    ];

    const moderateKeywords = [
      'حكة',
      'احمرار',
      'طفح',
      'حبوب',
      'تقشر',
      'جفاف',
      'تورم',
      'ألم',
      'بقع'
    ];

    const hasUrgentFlag = urgentKeywords.some((keyword) => lowerMessage.includes(keyword));
    const hasModerateFlag = moderateKeywords.some((keyword) => lowerMessage.includes(keyword));

    let severity = 'mild';
    let riskLevel = 'low';
    let recommendedNextStep = 'book_dermatologist';
    let confidenceLevel = 'low';
    let needsDoctorReview = true;

    if (hasUrgentFlag) {
      severity = 'urgent';
      riskLevel = 'urgent';
      recommendedNextStep = 'urgent_care';
      confidenceLevel = 'medium';
      needsDoctorReview = true;
    } else if (hasModerateFlag) {
      severity = 'moderate';
      riskLevel = 'medium';
      recommendedNextStep = 'book_dermatologist';
      confidenceLevel = 'low';
      needsDoctorReview = true;
    }

    const responseAr = {
      language: languageCode,
      response_kind: hasUrgentFlag ? 'safety_triage' : 'dermatology_chat',
      conversation_reply: hasUrgentFlag
        ? 'فهمت عليك. بما أنك ذكرت عرضًا قد يكون مقلقًا مثل صديد أو حرارة أو ألم شديد أو انتشار سريع، الأفضل عدم الانتظار والتواصل مع طبيب أو طوارئ حسب شدة الحالة. أستطيع مساعدتك بأسئلة تنظيمية، لكن لا يمكنني تأكيد التشخيص عن بعد.'
        : 'فهمت عليك. الأعراض التي وصفتها قد تحدث مع أكثر من سبب جلدي، لذلك سأتعامل معها كمعلومة أولية وليست تشخيصًا نهائيًا. حاول تجنب حك المنطقة وحافظ عليها نظيفة وجافة، وإذا استمرت أو زادت فمن الأفضل مراجعة طبيب جلدية.',
      case_summary: 'تم استلام وصف الحالة الجلدية. هذه قراءة أولية مساعدة وليست تشخيصًا نهائيًا.',
      possible_conditions: [
        {
          name: 'تهيج أو التهاب جلدي محتمل',
          likelihood: 'medium',
          reasoning: 'الأعراض المذكورة قد تظهر في حالات جلدية متعددة، ولا يمكن الجزم بدون صورة أو فحص طبي.'
        },
        {
          name: 'حساسية جلدية محتملة',
          likelihood: 'low',
          reasoning: 'قد ترتبط بعض الأعراض بالحساسية أو التعرض لمادة مهيجة، لكن يلزم معرفة تفاصيل أكثر.'
        }
      ],
      severity,
      red_flags: hasUrgentFlag
        ? ['تم ذكر عرض قد يحتاج إلى تقييم عاجل مثل صديد أو حرارة أو ألم شديد أو انتشار سريع.']
        : [],
      safe_advice: [
        'تجنب حك المنطقة المصابة قدر الإمكان.',
        'حافظ على نظافة وجفاف المنطقة.',
        'تجنب استخدام كريمات قوية أو أدوية موصوفة بدون مراجعة طبيب.',
        'يمكنك رفع صورة واضحة للحالة لتحسين التحليل المبدئي.'
      ],
      avoid: [
        'لا تستخدم مضادات حيوية أو كورتيزون موضعي بدون وصفة.',
        'لا تفقع الحبوب أو تجرح المنطقة.',
        'لا تعتمد على هذا التحليل كتشخيص نهائي.'
      ],
      recommended_next_step: recommendedNextStep,
      follow_up_questions: [
        'منذ متى بدأت الأعراض؟',
        'هل يوجد ألم أو حكة؟',
        'هل الحالة تنتشر أو تزيد؟',
        'هل استخدمت أي كريم أو دواء مؤخرًا؟',
        'هل توجد حرارة أو صديد أو تورم واضح؟'
      ],
      needs_doctor_review: needsDoctorReview,
      confidence_level: confidenceLevel,
      disclaimer: 'هذا تحليل مساعد بالذكاء الاصطناعي وليس تشخيصًا طبيًا نهائيًا. عند وجود ألم شديد أو صديد أو حرارة أو انتشار سريع يجب مراجعة طبيب أو طوارئ.'
    };

    const responseEn = {
      language: languageCode,
      response_kind: hasUrgentFlag ? 'safety_triage' : 'dermatology_chat',
      conversation_reply: hasUrgentFlag
        ? 'I understand. Since you mentioned a potentially concerning sign such as pus, fever, severe pain, or rapid spread, it is safer to seek urgent medical care depending on how severe it is. I can help organize the symptoms, but I cannot confirm a diagnosis remotely.'
        : 'I understand. The symptoms you described can happen with more than one skin condition, so this is only an initial guide, not a final diagnosis. Avoid scratching, keep the area clean and dry, and consider seeing a dermatologist if it persists or gets worse.',
      case_summary: 'The skin concern was received. This is an initial AI-assisted assessment and not a final diagnosis.',
      possible_conditions: [
        {
          name: 'Possible skin irritation or inflammation',
          likelihood: 'medium',
          reasoning: 'The described symptoms may appear in multiple skin conditions and cannot be confirmed without an image or medical examination.'
        },
        {
          name: 'Possible allergic skin reaction',
          likelihood: 'low',
          reasoning: 'Some symptoms may be related to allergy or irritant exposure, but more details are needed.'
        }
      ],
      severity,
      red_flags: hasUrgentFlag
        ? ['A potentially urgent symptom was mentioned, such as pus, fever, severe pain, or rapid spread.']
        : [],
      safe_advice: [
        'Avoid scratching the affected area.',
        'Keep the area clean and dry.',
        'Avoid strong creams or prescription medications without medical advice.',
        'You can upload a clear image to improve the initial assessment.'
      ],
      avoid: [
        'Do not use antibiotics or topical steroids without a prescription.',
        'Do not pop bumps or injure the area.',
        'Do not treat this assessment as a final diagnosis.'
      ],
      recommended_next_step: recommendedNextStep,
      follow_up_questions: [
        'When did the symptoms start?',
        'Is there pain or itching?',
        'Is it spreading or getting worse?',
        'Have you used any cream or medicine recently?',
        'Is there fever, pus, or clear swelling?'
      ],
      needs_doctor_review: needsDoctorReview,
      confidence_level: confidenceLevel,
      disclaimer: 'This is an AI-assisted assessment, not a final medical diagnosis. Seek medical care urgently if there is severe pain, pus, fever, or rapid spread.'
    };

    return languageCode === 'en' ? responseEn : responseAr;
  }

  static async buildRealDermatologyResponse({
    session,
    message
  }) {
    const [previousMessages] = await db.execute(
      `
      SELECT sender_type, message_type, content, structured_content, created_at
      FROM ai_session_messages
      WHERE ai_session_id = ?
      ORDER BY created_at ASC
      LIMIT 20
      `,
      [session.id]
    );

    const provider = AIProviderFactory.createProvider();

    return provider.analyzeTextMessage({
      message,
      languageCode: session.language_code || 'ar',
      previousMessages
    });
  }

  static async sendTextMessage(userId, sessionUuid, message) {
    const cleanMessage = String(message || '').trim();

    if (!cleanMessage) {
      const error = new Error('Message is required');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'نص الرسالة مطلوب',
        message_en: 'Message is required'
      };
      throw error;
    }

    if (cleanMessage.length > 3000) {
      const error = new Error('Message is too long');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'نص الرسالة طويل جدًا. الحد الأقصى 3000 حرف',
        message_en: 'Message is too long. Maximum 3000 characters'
      };
      throw error;
    }

    const session = await this.getOwnedActiveSession(userId, sessionUuid);

    if (!session) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
        message_en: 'AI session not found or inactive'
      };
      throw error;
    }

    const usageCheck = await AIUsageService.assertCanUse(userId, 'chat_message');

    if (!usageCheck.allowed) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'chat_message',
        status: 'blocked_limit',
        metadata: {
          reason: usageCheck.reason
        }
      });

      const error = new Error(usageCheck.reason);
      error.statusCode = 429;
      error.response = {
        success: false,
        reason: usageCheck.reason,
        message_ar: usageCheck.message_ar,
        message_en: usageCheck.message_en,
        usage: usageCheck.usage
      };
      throw error;
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const userMessageUuid = uuidv4();

      const [userMessageResult] = await connection.execute(
        `
        INSERT INTO ai_session_messages (
          uuid,
          ai_session_id,
          user_id,
          sender_type,
          message_type,
          content
        )
        VALUES (?, ?, ?, 'user', 'text', ?)
        `,
        [userMessageUuid, session.id, userId, cleanMessage]
      );


      let aiResponse;
      let aiProviderResult = null;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let processingTimeMs = 0;
      let responseMode = 'mock';

      const useMock = process.env.AI_USE_MOCK === 'true';

      if (useMock) {
        aiResponse = this.buildMockDermatologyResponse(cleanMessage, session.language_code || 'ar');
      } else {
        aiProviderResult = await this.buildRealDermatologyResponse({
          session,
          message: cleanMessage
        });

        aiResponse = aiProviderResult.data;
        promptTokens = aiProviderResult.usage.prompt_tokens;
        completionTokens = aiProviderResult.usage.completion_tokens;
        totalTokens = aiProviderResult.usage.total_tokens;
        processingTimeMs = aiProviderResult.processing_time_ms;
        responseMode = 'openai';
      }

      aiResponse = this.normalizeAIResponse(
        aiResponse,
        cleanMessage,
        session.language_code || 'ar',
        'dermatology_chat'
      );

      const aiConversationReply = this.getUserFacingReply(aiResponse, aiResponse.case_summary);

      const aiMessageUuid = uuidv4();

      await connection.execute(
        `
        INSERT INTO ai_session_messages (
          uuid,
          ai_session_id,
          user_id,
          sender_type,
          message_type,
          content,
          structured_content,
          prompt_tokens,
          completion_tokens,
          total_tokens
        )
        VALUES (?, ?, ?, 'ai', 'text', ?, ?, ?, ?, ?)
        `,
        [
        aiMessageUuid,
        session.id,
        userId,
        aiConversationReply,
        JSON.stringify(aiResponse),
        promptTokens,
        completionTokens,
        totalTokens
        ]
      );

      const resultUuid = uuidv4();

      const [analysisResult] = await connection.execute(
        `
        INSERT INTO ai_analysis_results (
          uuid,
          ai_session_id,
          user_id,
          result_type,
          language_code,
          case_summary,
          possible_conditions,
          severity,
          red_flags,
          safe_advice,
          avoid,
          recommended_next_step,
          confidence_level,
          needs_doctor_review,
          ai_response_json,
          processing_time_ms
        )
        VALUES (?, ?, ?, 'chat_response', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          resultUuid,
          session.id,
          userId,
          session.language_code || 'ar',
          aiResponse.case_summary,
          JSON.stringify(aiResponse.possible_conditions),
          aiResponse.severity,
          JSON.stringify(aiResponse.red_flags),
          JSON.stringify(aiResponse.safe_advice),
          JSON.stringify(aiResponse.avoid),
          aiResponse.recommended_next_step,
          aiResponse.confidence_level,
          aiResponse.needs_doctor_review ? 1 : 0,
          JSON.stringify(aiResponse),
          processingTimeMs
        ]
      );

      let newTitle = session.title;

      if (!newTitle) {
        newTitle = cleanMessage.length > 60 ? `${cleanMessage.substring(0, 60)}...` : cleanMessage;
      }

      await connection.execute(
        `
        UPDATE ai_sessions
        SET
          title = ?,
          input_mode = CASE
            WHEN input_mode = 'chat' THEN 'chat'
            ELSE input_mode
          END,
          risk_level = CASE
            WHEN ? IN ('small_talk', 'out_of_scope') THEN risk_level
            ELSE ?
          END,
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
        `,
        [
          newTitle,
          aiResponse.response_kind,
          this.mapSeverityToRiskLevel(aiResponse.severity),
          session.id
        ]
      );

      await connection.commit();

      await db.execute(
        `
        INSERT INTO ai_provider_logs (
          ai_session_id,
          user_id,
          provider,
          model,
          request_type,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms,
          status,
          request_metadata,
          response_metadata
        )
        VALUES (?, ?, ?, ?, 'chat', ?, ?, ?, ?, 'success', ?, ?)
        `,
        [
          session.id,
          userId,
          aiProviderResult?.provider || 'mock',
          aiProviderResult?.model || process.env.AI_MODEL || 'mock',
          promptTokens,
          completionTokens,
          totalTokens,
          processingTimeMs,
          JSON.stringify({
            mode: responseMode,
            message_length: cleanMessage.length
          }),
          JSON.stringify({
            severity: aiResponse.severity,
            recommended_next_step: aiResponse.recommended_next_step,
            confidence_level: aiResponse.confidence_level,
            response_kind: aiResponse.response_kind
          })
        ]
      );

      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        aiResultId: analysisResult.insertId,
        eventType: 'chat_message',
        status: 'success',
        countedUnits: 1,
        promptTokens,
        completionTokens,
        totalTokens,
        metadata: {
        mode: responseMode,
        user_message_id: userMessageResult.insertId,
        provider: aiProviderResult?.provider || 'mock',
        model: aiProviderResult?.model || null
        }
      });

      return {
        session_uuid: session.uuid,
        user_message: {
          uuid: userMessageUuid,
          content: cleanMessage
        },
        ai_message: {
          uuid: aiMessageUuid,
          content: aiConversationReply,
          structured_content: aiResponse
        },
        result: {
          uuid: resultUuid,
          result_type: 'chat_response',
          severity: aiResponse.severity,
          recommended_next_step: aiResponse.recommended_next_step,
          confidence_level: aiResponse.confidence_level,
          needs_doctor_review: aiResponse.needs_doctor_review
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static mapSeverityToRiskLevel(severity) {
    if (severity === 'urgent') return 'urgent';
    if (severity === 'severe') return 'high';
    if (severity === 'moderate') return 'medium';
    return 'low';
  }

  static async buildRealImageDermatologyResponse({
    session,
    imageFile,
    description
  }) {
    const [previousMessages] = await db.execute(
      `
      SELECT sender_type, message_type, content, structured_content, created_at
      FROM ai_session_messages
      WHERE ai_session_id = ?
      ORDER BY created_at ASC
      LIMIT 20
      `,
      [session.id]
    );

    const provider = AIProviderFactory.createProvider();

    return provider.analyzeImageMessage({
      imageFile,
      description,
      languageCode: session.language_code || 'ar',
      previousMessages
    });
  }

  static async analyzeImage(userId, sessionUuid, imageFile, description = '') {
    const cleanDescription = String(description || '').trim();

    if (!imageFile) {
      const error = new Error('Image file is required');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'الصورة مطلوبة',
        message_en: 'Image file is required'
      };
      throw error;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!allowedMimeTypes.includes(imageFile.mimetype)) {
      const error = new Error('Unsupported image type');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'نوع الصورة غير مدعوم. الأنواع المسموحة: JPEG, PNG, WebP',
        message_en: 'Unsupported image type. Allowed types: JPEG, PNG, WebP'
      };
      throw error;
    }

    const session = await this.getOwnedActiveSession(userId, sessionUuid);

    if (!session) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
        message_en: 'AI session not found or inactive'
      };
      throw error;
    }

    const usageCheck = await AIUsageService.assertCanUse(userId, 'image_analysis');

    if (!usageCheck.allowed) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'image_analysis',
        status: 'blocked_limit',
        metadata: {
          reason: usageCheck.reason
        }
      });

      const error = new Error(usageCheck.reason);
      error.statusCode = 429;
      error.response = {
        success: false,
        reason: usageCheck.reason,
        message_ar: usageCheck.message_ar,
        message_en: usageCheck.message_en,
        usage: usageCheck.usage
      };
      throw error;
    }

    const usageSummary = usageCheck.usage;

    const [fileCountRows] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM ai_session_files
      WHERE ai_session_id = ?
      `,
      [session.id]
    );

    const currentFileCount = fileCountRows[0].total || 0;
    const maxFilesPerSession = usageSummary.policy.max_files_per_session || 5;

    if (currentFileCount >= maxFilesPerSession) {
      const error = new Error('Maximum files per AI session exceeded');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: `تم الوصول إلى الحد الأقصى للملفات في هذه الجلسة وهو ${maxFilesPerSession}`,
        message_en: `Maximum files per session reached: ${maxFilesPerSession}`
      };
      throw error;
    }

    let uploadedFile = null;
    let aiSessionFileId = null;
    const userMessageUuid = uuidv4();

    try {
      uploadedFile = await FileService.uploadFile(
        imageFile,
        {
          entityType: 'user',
          entityId: userId
        },
        {
          fileCategory: 'medical_image',
          relatedToType: 'ai_session',
          relatedToId: session.id,
          isPublic: false,
          metadata: {
            ai_session_uuid: session.uuid,
            file_role: 'skin_image',
            description: cleanDescription || null,
            source: 'ai_dermatology_image_analysis'
          }
        }
      );

      const fileConnection = await db.getConnection();

      try {
        await fileConnection.beginTransaction();

        const [sessionFileResult] = await fileConnection.execute(
          `
          INSERT INTO ai_session_files (
            ai_session_id,
            user_id,
            file_id,
            file_role,
            analysis_status,
            metadata
          )
          VALUES (?, ?, ?, 'skin_image', 'pending', ?)
          `,
          [
            session.id,
            userId,
            uploadedFile.id,
            JSON.stringify({
              description: cleanDescription || null,
              mime_type: uploadedFile.mime_type,
              file_size: uploadedFile.file_size
            })
          ]
        );

        aiSessionFileId = sessionFileResult.insertId;

        await fileConnection.execute(
          `
          INSERT INTO ai_session_messages (
            uuid,
            ai_session_id,
            user_id,
            sender_type,
            message_type,
            content,
            file_id
          )
          VALUES (?, ?, ?, 'user', 'image', ?, ?)
          `,
          [
            userMessageUuid,
            session.id,
            userId,
            cleanDescription || 'تم رفع صورة جلدية للتحليل',
            uploadedFile.id
          ]
        );

        await fileConnection.commit();
      } catch (error) {
        await fileConnection.rollback();
        throw error;
      } finally {
        fileConnection.release();
      }

      let aiResponse;
      let aiProviderResult = null;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let processingTimeMs = 0;
      let responseMode = 'mock';

      const useMock = process.env.AI_USE_MOCK === 'true';

      if (useMock) {
        aiResponse = this.buildMockDermatologyResponse(
          cleanDescription || 'تم رفع صورة جلدية للتحليل',
          session.language_code || 'ar'
        );
      } else {
        aiProviderResult = await this.buildRealImageDermatologyResponse({
          session,
          imageFile,
          description: cleanDescription
        });

        aiResponse = aiProviderResult.data;
        promptTokens = aiProviderResult.usage.prompt_tokens;
        completionTokens = aiProviderResult.usage.completion_tokens;
        totalTokens = aiProviderResult.usage.total_tokens;
        processingTimeMs = aiProviderResult.processing_time_ms;
        responseMode = 'openai';
      }

      aiResponse = this.normalizeAIResponse(
        aiResponse,
        cleanDescription || 'تم رفع صورة جلدية للتحليل',
        session.language_code || 'ar',
        'image_analysis'
      );

      const aiConversationReply = this.getUserFacingReply(aiResponse, aiResponse.case_summary);

      const aiMessageUuid = uuidv4();
      const resultUuid = uuidv4();

      const analysisConnection = await db.getConnection();

      try {
        await analysisConnection.beginTransaction();

        await analysisConnection.execute(
          `
          INSERT INTO ai_session_messages (
            uuid,
            ai_session_id,
            user_id,
            sender_type,
            message_type,
            content,
            structured_content,
            file_id,
            prompt_tokens,
            completion_tokens,
            total_tokens
          )
          VALUES (?, ?, ?, 'ai', 'image', ?, ?, ?, ?, ?, ?)
          `,
          [
            aiMessageUuid,
            session.id,
            userId,
            aiConversationReply,
            JSON.stringify(aiResponse),
            uploadedFile.id,
            promptTokens,
            completionTokens,
            totalTokens
          ]
        );

        const [analysisResult] = await analysisConnection.execute(
          `
          INSERT INTO ai_analysis_results (
            uuid,
            ai_session_id,
            user_id,
            result_type,
            language_code,
            case_summary,
            possible_conditions,
            severity,
            red_flags,
            safe_advice,
            avoid,
            recommended_next_step,
            confidence_level,
            needs_doctor_review,
            ai_response_json,
            processing_time_ms
          )
          VALUES (?, ?, ?, 'image_analysis', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            resultUuid,
            session.id,
            userId,
            session.language_code || 'ar',
            aiResponse.case_summary,
            JSON.stringify(aiResponse.possible_conditions),
            aiResponse.severity,
            JSON.stringify(aiResponse.red_flags),
            JSON.stringify(aiResponse.safe_advice),
            JSON.stringify(aiResponse.avoid),
            aiResponse.recommended_next_step,
            aiResponse.confidence_level,
            aiResponse.needs_doctor_review ? 1 : 0,
            JSON.stringify(aiResponse),
            processingTimeMs
          ]
        );

        await analysisConnection.execute(
          `
          UPDATE ai_session_files
          SET
            analysis_status = 'processed',
            updated_at = NOW()
          WHERE id = ?
          `,
          [aiSessionFileId]
        );

        await analysisConnection.execute(
          `
          UPDATE ai_sessions
          SET
            input_mode = CASE
              WHEN input_mode = 'chat' THEN 'mixed'
              ELSE input_mode
            END,
            risk_level = ?,
            last_message_at = NOW(),
            updated_at = NOW()
          WHERE id = ?
          `,
          [
            this.mapSeverityToRiskLevel(aiResponse.severity),
            session.id
          ]
        );

        await analysisConnection.commit();

        await db.execute(
          `
          INSERT INTO ai_provider_logs (
            ai_session_id,
            user_id,
            provider,
            model,
            request_type,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            latency_ms,
            status,
            request_metadata,
            response_metadata
          )
          VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'success', ?, ?)
          `,
          [
            session.id,
            userId,
            aiProviderResult?.provider || 'mock',
            aiProviderResult?.model || process.env.AI_MODEL || 'mock',
            promptTokens,
            completionTokens,
            totalTokens,
            processingTimeMs,
            JSON.stringify({
              mode: responseMode,
              file_uuid: uploadedFile.uuid,
              mime_type: uploadedFile.mime_type,
              file_size: uploadedFile.file_size,
              description_length: cleanDescription.length
            }),
            JSON.stringify({
              severity: aiResponse.severity,
              recommended_next_step: aiResponse.recommended_next_step,
              confidence_level: aiResponse.confidence_level
            })
          ]
        );

        await AIUsageService.recordUsageEvent({
          userId,
          aiSessionId: session.id,
          aiResultId: analysisResult.insertId,
          eventType: 'image_analysis',
          status: 'success',
          countedUnits: 1,
          promptTokens,
          completionTokens,
          totalTokens,
          metadata: {
            mode: responseMode,
            file_uuid: uploadedFile.uuid,
            file_id: uploadedFile.id,
            provider: aiProviderResult?.provider || 'mock',
            model: aiProviderResult?.model || null
          }
        });

        return {
          session_uuid: session.uuid,
          uploaded_file: {
            id: uploadedFile.id,
            uuid: uploadedFile.uuid,

            // Public file_url is kept for backward compatibility,
            // but mobile/dashboard should NOT use it for medical images.
            file_url: uploadedFile.file_url,

            // Secure authenticated endpoint for viewing AI medical files.
            secure_file_url: this.buildSecureAIFileUrl(uploadedFile.uuid),
            secure_file_path: this.buildSecureAIFilePath(uploadedFile.uuid),

            original_filename: uploadedFile.original_filename,
            mime_type: uploadedFile.mime_type,
            file_size: uploadedFile.file_size,
            file_category: uploadedFile.file_category
          },
          user_message: {
            uuid: userMessageUuid,
            content: cleanDescription || 'تم رفع صورة جلدية للتحليل'
          },
          ai_message: {
            uuid: aiMessageUuid,
            content: aiConversationReply,
            structured_content: aiResponse
          },
          result: {
            uuid: resultUuid,
            result_type: 'image_analysis',
            severity: aiResponse.severity,
            recommended_next_step: aiResponse.recommended_next_step,
            confidence_level: aiResponse.confidence_level,
            needs_doctor_review: aiResponse.needs_doctor_review
          }
        };
      } catch (error) {
        await analysisConnection.rollback();

        if (aiSessionFileId) {
          await db.execute(
            `
            UPDATE ai_session_files
            SET analysis_status = 'failed', updated_at = NOW()
            WHERE id = ?
            `,
            [aiSessionFileId]
          );
        }

        throw error;
      } finally {
        analysisConnection.release();
      }
    } catch (error) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'image_analysis',
        status: 'failed',
        metadata: {
          error_message: error.message,
          file_uuid: uploadedFile?.uuid || null
        }
      });

      await db.execute(
        `
        INSERT INTO ai_provider_logs (
          ai_session_id,
          user_id,
          provider,
          model,
          request_type,
          status,
          error_message,
          request_metadata
        )
        VALUES (?, ?, ?, ?, 'image', 'failed', ?, ?)
        `,
        [
          session.id,
          userId,
          process.env.AI_PROVIDER || 'openai',
          process.env.AI_MODEL || 'unknown',
          error.message,
          JSON.stringify({
            file_uuid: uploadedFile?.uuid || null,
            mime_type: imageFile?.mimetype || null,
            file_size: imageFile?.size || null
          })
        ]
      );

      throw error;
    }
  }

  static async getSecureAIFileForUser(userId, fileUuid) {
    const [files] = await db.execute(
      `
      SELECT
        f.*,
        asf.ai_session_id,
        asf.file_role,
        asf.analysis_status,
        s.uuid AS ai_session_uuid,
        s.user_id AS session_owner_user_id
      FROM files f
      INNER JOIN ai_session_files asf
        ON asf.file_id = f.id
      INNER JOIN ai_sessions s
        ON s.id = asf.ai_session_id
      WHERE f.uuid = ?
        AND s.user_id = ?
        AND f.is_deleted = 0
      LIMIT 1
      `,
      [fileUuid, userId]
    );

    if (files.length === 0) {
      return null;
    }

    const file = files[0];

    const allowedCategories = ['medical_image', 'document', 'other'];

    if (!allowedCategories.includes(file.file_category)) {
      const error = new Error('File category is not allowed for AI secure access');
      error.statusCode = 403;
      throw error;
    }

    if (!file.file_path) {
      const error = new Error('File path is missing');
      error.statusCode = 404;
      throw error;
    }

    const normalizedRelativePath = String(file.file_path).startsWith('/')
      ? String(file.file_path).slice(1)
      : String(file.file_path);

    const uploadRoot = path.resolve(process.cwd(), 'upload', 'files');
    const absolutePath = path.resolve(process.cwd(), normalizedRelativePath);

    if (!absolutePath.startsWith(uploadRoot + path.sep)) {
      const error = new Error('Invalid file path');
      error.statusCode = 403;
      throw error;
    }

    if (!fs.existsSync(absolutePath)) {
      const error = new Error('File not found on disk');
      error.statusCode = 404;
      throw error;
    }

    await db.execute(
      `
      UPDATE files
      SET
        access_count = access_count + 1,
        last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [file.id]
    );

    return {
      file,
      absolutePath,
      mimeType: file.mime_type || 'application/octet-stream',
      originalFilename: file.original_filename || file.stored_filename || 'ai-file'
    };
  }

  static async buildRealDocumentDermatologyResponse({
    session,
    documentFile,
    description
  }) {
    const [previousMessages] = await db.execute(
      `
      SELECT sender_type, message_type, content, structured_content, created_at
      FROM ai_session_messages
      WHERE ai_session_id = ?
      ORDER BY created_at ASC
      LIMIT 20
      `,
      [session.id]
    );

    const provider = AIProviderFactory.createProvider();

    return provider.analyzeDocumentMessage({
      documentFile,
      description,
      languageCode: session.language_code || 'ar',
      previousMessages
    });
  }

  static async analyzeDocument(userId, sessionUuid, documentFile, description = '') {
    const cleanDescription = String(description || '').trim();

    if (!documentFile) {
      const error = new Error('Document file is required');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'ملف التقرير مطلوب',
        message_en: 'Document file is required'
      };
      throw error;
    }

    const allowedMimeTypes = [
      'application/pdf',
      'text/plain'
    ];

    if (!allowedMimeTypes.includes(documentFile.mimetype)) {
      const error = new Error('Unsupported document type');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'نوع الملف غير مدعوم حاليًا. الأنواع المسموحة: PDF و TXT',
        message_en: 'Unsupported document type. Currently allowed: PDF and TXT'
      };
      throw error;
    }

    const session = await this.getOwnedActiveSession(userId, sessionUuid);

    if (!session) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
        message_en: 'AI session not found or inactive'
      };
      throw error;
    }

    const usageCheck = await AIUsageService.assertCanUse(userId, 'document_analysis');

    if (!usageCheck.allowed) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'document_analysis',
        status: 'blocked_limit',
        metadata: {
          reason: usageCheck.reason
        }
      });

      const error = new Error(usageCheck.reason);
      error.statusCode = 429;
      error.response = {
        success: false,
        reason: usageCheck.reason,
        message_ar: usageCheck.message_ar,
        message_en: usageCheck.message_en,
        usage: usageCheck.usage
      };
      throw error;
    }

    const usageSummary = usageCheck.usage;

    const [fileCountRows] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM ai_session_files
      WHERE ai_session_id = ?
      `,
      [session.id]
    );

    const currentFileCount = fileCountRows[0].total || 0;
    const maxFilesPerSession = usageSummary.policy.max_files_per_session || 5;

    if (currentFileCount >= maxFilesPerSession) {
      const error = new Error('Maximum files per AI session exceeded');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: `تم الوصول إلى الحد الأقصى للملفات في هذه الجلسة وهو ${maxFilesPerSession}`,
        message_en: `Maximum files per session reached: ${maxFilesPerSession}`
      };
      throw error;
    }

    let uploadedFile = null;
    let aiSessionFileId = null;
    const userMessageUuid = uuidv4();

    try {
      uploadedFile = await FileService.uploadFile(
        documentFile,
        {
          entityType: 'user',
          entityId: userId
        },
        {
          fileCategory: 'other',
          relatedToType: 'ai_session',
          relatedToId: session.id,
          isPublic: false,
          metadata: {
            ai_session_uuid: session.uuid,
            file_role: 'medical_report',
            description: cleanDescription || null,
            source: 'ai_dermatology_document_analysis'
          }
        }
      );

      const fileConnection = await db.getConnection();

      try {
        await fileConnection.beginTransaction();

        const [sessionFileResult] = await fileConnection.execute(
          `
          INSERT INTO ai_session_files (
            ai_session_id,
            user_id,
            file_id,
            file_role,
            analysis_status,
            metadata
          )
          VALUES (?, ?, ?, 'medical_report', 'pending', ?)
          `,
          [
            session.id,
            userId,
            uploadedFile.id,
            JSON.stringify({
              description: cleanDescription || null,
              mime_type: uploadedFile.mime_type,
              file_size: uploadedFile.file_size
            })
          ]
        );

        aiSessionFileId = sessionFileResult.insertId;

        await fileConnection.execute(
          `
          INSERT INTO ai_session_messages (
            uuid,
            ai_session_id,
            user_id,
            sender_type,
            message_type,
            content,
            file_id
          )
          VALUES (?, ?, ?, 'user', 'document', ?, ?)
          `,
          [
            userMessageUuid,
            session.id,
            userId,
            cleanDescription || 'تم رفع تقرير طبي للتحليل',
            uploadedFile.id
          ]
        );

        await fileConnection.commit();
      } catch (error) {
        await fileConnection.rollback();
        throw error;
      } finally {
        fileConnection.release();
      }

      let aiResponse;
      let aiProviderResult = null;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      let processingTimeMs = 0;
      let responseMode = 'mock';

      const useMock = process.env.AI_USE_MOCK === 'true';

      if (useMock) {
        aiResponse = this.buildMockDermatologyResponse(
          cleanDescription || 'تم رفع تقرير طبي للتحليل',
          session.language_code || 'ar'
        );
      } else {
        aiProviderResult = await this.buildRealDocumentDermatologyResponse({
          session,
          documentFile,
          description: cleanDescription
        });

        aiResponse = aiProviderResult.data;
        promptTokens = aiProviderResult.usage.prompt_tokens;
        completionTokens = aiProviderResult.usage.completion_tokens;
        totalTokens = aiProviderResult.usage.total_tokens;
        processingTimeMs = aiProviderResult.processing_time_ms;
        responseMode = 'openai';
      }

      aiResponse = this.normalizeAIResponse(
        aiResponse,
        cleanDescription || 'تم رفع تقرير طبي للتحليل',
        session.language_code || 'ar',
        'document_analysis'
      );

      const aiConversationReply = this.getUserFacingReply(aiResponse, aiResponse.case_summary);

      const aiMessageUuid = uuidv4();
      const resultUuid = uuidv4();

      const analysisConnection = await db.getConnection();

      try {
        await analysisConnection.beginTransaction();

        await analysisConnection.execute(
          `
          INSERT INTO ai_session_messages (
            uuid,
            ai_session_id,
            user_id,
            sender_type,
            message_type,
            content,
            structured_content,
            file_id,
            prompt_tokens,
            completion_tokens,
            total_tokens
          )
          VALUES (?, ?, ?, 'ai', 'document', ?, ?, ?, ?, ?, ?)
          `,
          [
            aiMessageUuid,
            session.id,
            userId,
            aiConversationReply,
            JSON.stringify(aiResponse),
            uploadedFile.id,
            promptTokens,
            completionTokens,
            totalTokens
          ]
        );

        const [analysisResult] = await analysisConnection.execute(
          `
          INSERT INTO ai_analysis_results (
            uuid,
            ai_session_id,
            user_id,
            result_type,
            language_code,
            case_summary,
            possible_conditions,
            severity,
            red_flags,
            safe_advice,
            avoid,
            recommended_next_step,
            confidence_level,
            needs_doctor_review,
            ai_response_json,
            processing_time_ms
          )
          VALUES (?, ?, ?, 'document_analysis', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            resultUuid,
            session.id,
            userId,
            session.language_code || 'ar',
            aiResponse.case_summary,
            JSON.stringify(aiResponse.possible_conditions),
            aiResponse.severity,
            JSON.stringify(aiResponse.red_flags),
            JSON.stringify(aiResponse.safe_advice),
            JSON.stringify(aiResponse.avoid),
            aiResponse.recommended_next_step,
            aiResponse.confidence_level,
            aiResponse.needs_doctor_review ? 1 : 0,
            JSON.stringify(aiResponse),
            processingTimeMs
          ]
        );

        await analysisConnection.execute(
          `
          UPDATE ai_session_files
          SET
            analysis_status = 'processed',
            updated_at = NOW()
          WHERE id = ?
          `,
          [aiSessionFileId]
        );

        await analysisConnection.execute(
          `
          UPDATE ai_sessions
          SET
            input_mode = 'mixed',
            risk_level = ?,
            last_message_at = NOW(),
            updated_at = NOW()
          WHERE id = ?
          `,
          [
            this.mapSeverityToRiskLevel(aiResponse.severity),
            session.id
          ]
        );

        await analysisConnection.commit();

        await db.execute(
          `
          INSERT INTO ai_provider_logs (
            ai_session_id,
            user_id,
            provider,
            model,
            request_type,
            prompt_tokens,
            completion_tokens,
            total_tokens,
            latency_ms,
            status,
            request_metadata,
            response_metadata
          )
          VALUES (?, ?, ?, ?, 'document', ?, ?, ?, ?, 'success', ?, ?)
          `,
          [
            session.id,
            userId,
            aiProviderResult?.provider || 'mock',
            aiProviderResult?.model || process.env.AI_MODEL || 'mock',
            promptTokens,
            completionTokens,
            totalTokens,
            processingTimeMs,
            JSON.stringify({
              mode: responseMode,
              file_uuid: uploadedFile.uuid,
              mime_type: uploadedFile.mime_type,
              file_size: uploadedFile.file_size,
              description_length: cleanDescription.length
            }),
            JSON.stringify({
              severity: aiResponse.severity,
              recommended_next_step: aiResponse.recommended_next_step,
              confidence_level: aiResponse.confidence_level
            })
          ]
        );

        await AIUsageService.recordUsageEvent({
          userId,
          aiSessionId: session.id,
          aiResultId: analysisResult.insertId,
          eventType: 'document_analysis',
          status: 'success',
          countedUnits: 1,
          promptTokens,
          completionTokens,
          totalTokens,
          metadata: {
            mode: responseMode,
            file_uuid: uploadedFile.uuid,
            file_id: uploadedFile.id,
            provider: aiProviderResult?.provider || 'mock',
            model: aiProviderResult?.model || null
          }
        });

        return {
          session_uuid: session.uuid,
          uploaded_file: {
            id: uploadedFile.id,
            uuid: uploadedFile.uuid,
            file_url: uploadedFile.file_url,
            secure_file_url: this.buildSecureAIFileUrl(uploadedFile.uuid),
            secure_file_path: this.buildSecureAIFilePath(uploadedFile.uuid),
            original_filename: uploadedFile.original_filename,
            mime_type: uploadedFile.mime_type,
            file_size: uploadedFile.file_size,
            file_category: uploadedFile.file_category
          },
          user_message: {
            uuid: userMessageUuid,
            content: cleanDescription || 'تم رفع تقرير طبي للتحليل'
          },
          ai_message: {
            uuid: aiMessageUuid,
            content: aiConversationReply,
            structured_content: aiResponse
          },
          result: {
            uuid: resultUuid,
            result_type: 'document_analysis',
            severity: aiResponse.severity,
            recommended_next_step: aiResponse.recommended_next_step,
            confidence_level: aiResponse.confidence_level,
            needs_doctor_review: aiResponse.needs_doctor_review
          }
        };
      } catch (error) {
        await analysisConnection.rollback();

        if (aiSessionFileId) {
          await db.execute(
            `
            UPDATE ai_session_files
            SET analysis_status = 'failed', updated_at = NOW()
            WHERE id = ?
            `,
            [aiSessionFileId]
          );
        }

        throw error;
      } finally {
        analysisConnection.release();
      }
    } catch (error) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'document_analysis',
        status: 'failed',
        metadata: {
          error_message: error.message,
          file_uuid: uploadedFile?.uuid || null
        }
      });

      await db.execute(
        `
        INSERT INTO ai_provider_logs (
          ai_session_id,
          user_id,
          provider,
          model,
          request_type,
          status,
          error_message,
          request_metadata
        )
        VALUES (?, ?, ?, ?, 'document', 'failed', ?, ?)
        `,
        [
          session.id,
          userId,
          process.env.AI_PROVIDER || 'openai',
          process.env.AI_MODEL || 'unknown',
          error.message,
          JSON.stringify({
            file_uuid: uploadedFile?.uuid || null,
            mime_type: documentFile?.mimetype || null,
            file_size: documentFile?.size || null
          })
        ]
      );

      throw error;
    }
  }

  static async buildRealFinalSummaryResponse({
    session,
    messages,
    results,
    files
  }) {
    const provider = AIProviderFactory.createProvider();

    return provider.generateFinalSummary({
      session,
      messages,
      results,
      files
    });
  }

  static async completeSession(userId, sessionUuid) {
    const [sessions] = await db.execute(
      `
      SELECT *
      FROM ai_sessions
      WHERE uuid = ?
        AND user_id = ?
        AND status != 'deleted'
      LIMIT 1
      `,
      [sessionUuid, userId]
    );

    if (sessions.length === 0) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
        message_en: 'AI session not found'
      };
      throw error;
    }

    const session = sessions[0];

    if (session.status === 'completed') {
      const error = new Error('AI session is already completed');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'تم إنهاء هذه الجلسة مسبقًا',
        message_en: 'This AI session is already completed'
      };
      throw error;
    }

    if (session.status !== 'active') {
      const error = new Error('AI session is not active');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'لا يمكن إنهاء جلسة غير نشطة',
        message_en: 'Cannot complete a non-active AI session'
      };
      throw error;
    }

    const usageCheck = await AIUsageService.assertCanUse(userId, 'final_summary');

    if (!usageCheck.allowed) {
      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'final_summary',
        status: 'blocked_limit',
        metadata: {
          reason: usageCheck.reason
        }
      });

      const error = new Error(usageCheck.reason);
      error.statusCode = 429;
      error.response = {
        success: false,
        reason: usageCheck.reason,
        message_ar: usageCheck.message_ar,
        message_en: usageCheck.message_en,
        usage: usageCheck.usage
      };
      throw error;
    }

    const [messages] = await db.execute(
      `
      SELECT
        id,
        uuid,
        sender_type,
        message_type,
        content,
        structured_content,
        file_id,
        created_at
      FROM ai_session_messages
      WHERE ai_session_id = ?
      ORDER BY created_at ASC, id ASC
      `,
      [session.id]
    );

    const [results] = await db.execute(
      `
      SELECT
        id,
        uuid,
        result_type,
        case_summary,
        possible_conditions,
        severity,
        red_flags,
        safe_advice,
        avoid,
        recommended_next_step,
        confidence_level,
        needs_doctor_review,
        ai_response_json,
        created_at
      FROM ai_analysis_results
      WHERE ai_session_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [session.id]
    );

    if (results.length === 0) {
      const error = new Error('No AI analysis results found to summarize');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'لا توجد نتائج تحليل داخل الجلسة لإنشاء ملخص نهائي',
        message_en: 'No AI analysis results found to create a final summary'
      };
      throw error;
    }

    const [files] = await db.execute(
      `
      SELECT
        asf.file_role,
        asf.analysis_status,
        asf.created_at,
        f.uuid,
        f.file_category,
        f.original_filename,
        f.mime_type,
        f.file_size
      FROM ai_session_files asf
      INNER JOIN files f
        ON f.id = asf.file_id
      WHERE asf.ai_session_id = ?
        AND f.is_deleted = 0
      ORDER BY asf.created_at ASC, asf.id ASC
      `,
      [session.id]
    );

    const parseJsonSafely = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return value;

      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    };

    const preparedMessages = messages.map((message) => ({
      ...message,
      structured_content: parseJsonSafely(message.structured_content)
    }));

    const preparedResults = results.map((result) => ({
      ...result,
      possible_conditions: parseJsonSafely(result.possible_conditions),
      red_flags: parseJsonSafely(result.red_flags),
      safe_advice: parseJsonSafely(result.safe_advice),
      avoid: parseJsonSafely(result.avoid),
      ai_response_json: parseJsonSafely(result.ai_response_json)
    }));

    let aiResponse;
    let aiProviderResult = null;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let processingTimeMs = 0;
    let responseMode = 'mock';

    const useMock = process.env.AI_USE_MOCK === 'true';

    if (useMock) {
      aiResponse = this.buildMockDermatologyResponse(
        'إنشاء ملخص نهائي لجلسة الذكاء الاصطناعي',
        session.language_code || 'ar'
      );
    } else {
      aiProviderResult = await this.buildRealFinalSummaryResponse({
        session,
        messages: preparedMessages,
        results: preparedResults,
        files
      });

      aiResponse = aiProviderResult.data;
      promptTokens = aiProviderResult.usage.prompt_tokens;
      completionTokens = aiProviderResult.usage.completion_tokens;
      totalTokens = aiProviderResult.usage.total_tokens;
      processingTimeMs = aiProviderResult.processing_time_ms;
      responseMode = 'openai';
    }

    aiResponse = this.normalizeAIResponse(
      aiResponse,
      'إنشاء ملخص نهائي لجلسة الذكاء الاصطناعي',
      session.language_code || 'ar',
      'final_summary'
    );

    const aiConversationReply = this.getUserFacingReply(aiResponse, aiResponse.case_summary);

    const aiMessageUuid = uuidv4();
    const resultUuid = uuidv4();

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
        INSERT INTO ai_session_messages (
          uuid,
          ai_session_id,
          user_id,
          sender_type,
          message_type,
          content,
          structured_content,
          prompt_tokens,
          completion_tokens,
          total_tokens
        )
        VALUES (?, ?, ?, 'ai', 'text', ?, ?, ?, ?, ?)
        `,
        [
          aiMessageUuid,
          session.id,
          userId,
          aiConversationReply,
          JSON.stringify(aiResponse),
          promptTokens,
          completionTokens,
          totalTokens
        ]
      );

      const [analysisResult] = await connection.execute(
        `
        INSERT INTO ai_analysis_results (
          uuid,
          ai_session_id,
          user_id,
          result_type,
          language_code,
          case_summary,
          possible_conditions,
          severity,
          red_flags,
          safe_advice,
          avoid,
          recommended_next_step,
          confidence_level,
          needs_doctor_review,
          ai_response_json,
          processing_time_ms
        )
        VALUES (?, ?, ?, 'final_summary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          resultUuid,
          session.id,
          userId,
          session.language_code || 'ar',
          aiResponse.case_summary,
          JSON.stringify(aiResponse.possible_conditions),
          aiResponse.severity,
          JSON.stringify(aiResponse.red_flags),
          JSON.stringify(aiResponse.safe_advice),
          JSON.stringify(aiResponse.avoid),
          aiResponse.recommended_next_step,
          aiResponse.confidence_level,
          aiResponse.needs_doctor_review ? 1 : 0,
          JSON.stringify(aiResponse),
          processingTimeMs
        ]
      );

      await connection.execute(
        `
        UPDATE ai_sessions
        SET
          status = 'completed',
          risk_level = ?,
          summary_json = ?,
          last_message_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
        `,
        [
          this.mapSeverityToRiskLevel(aiResponse.severity),
          JSON.stringify(aiResponse),
          session.id
        ]
      );

      await connection.commit();

      await db.execute(
        `
        INSERT INTO ai_provider_logs (
          ai_session_id,
          user_id,
          provider,
          model,
          request_type,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          latency_ms,
          status,
          request_metadata,
          response_metadata
        )
        VALUES (?, ?, ?, ?, 'summary', ?, ?, ?, ?, 'success', ?, ?)
        `,
        [
          session.id,
          userId,
          aiProviderResult?.provider || 'mock',
          aiProviderResult?.model || process.env.AI_MODEL || 'mock',
          promptTokens,
          completionTokens,
          totalTokens,
          processingTimeMs,
          JSON.stringify({
            mode: responseMode,
            source_results_count: preparedResults.length,
            source_messages_count: preparedMessages.length,
            source_files_count: files.length
          }),
          JSON.stringify({
            severity: aiResponse.severity,
            recommended_next_step: aiResponse.recommended_next_step,
            confidence_level: aiResponse.confidence_level,
            response_kind: aiResponse.response_kind
          })
        ]
      );

      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        aiResultId: analysisResult.insertId,
        eventType: 'final_summary',
        status: 'success',
        countedUnits: 1,
        promptTokens,
        completionTokens,
        totalTokens,
        metadata: {
          mode: responseMode,
          provider: aiProviderResult?.provider || 'mock',
          model: aiProviderResult?.model || null,
          source_results_count: preparedResults.length,
          source_messages_count: preparedMessages.length,
          source_files_count: files.length
        }
      });

      return {
        session_uuid: session.uuid,
        status: 'completed',
        ai_message: {
          uuid: aiMessageUuid,
          content: aiConversationReply,
          structured_content: aiResponse
        },
        result: {
          uuid: resultUuid,
          result_type: 'final_summary',
          severity: aiResponse.severity,
          recommended_next_step: aiResponse.recommended_next_step,
          confidence_level: aiResponse.confidence_level,
          needs_doctor_review: aiResponse.needs_doctor_review
        },
        source_context: {
          messages_count: preparedMessages.length,
          files_count: files.length,
          results_count: preparedResults.length
        }
      };
    } catch (error) {
      await connection.rollback();

      await AIUsageService.recordUsageEvent({
        userId,
        aiSessionId: session.id,
        eventType: 'final_summary',
        status: 'failed',
        metadata: {
          error_message: error.message
        }
      });

      await db.execute(
        `
        INSERT INTO ai_provider_logs (
          ai_session_id,
          user_id,
          provider,
          model,
          request_type,
          status,
          error_message,
          request_metadata
        )
        VALUES (?, ?, ?, ?, 'summary', 'failed', ?, ?)
        `,
        [
          session.id,
          userId,
          process.env.AI_PROVIDER || 'openai',
          process.env.AI_MODEL || 'unknown',
          error.message,
          JSON.stringify({
            source_results_count: preparedResults.length,
            source_messages_count: preparedMessages.length,
            source_files_count: files.length
          })
        ]
      );

      throw error;
    } finally {
      connection.release();
    }
  }

}

module.exports = AIDermatologyService;
















































// const db = require('../../config/db');
// const { v4: uuidv4 } = require('uuid');
// const AIUsageService = require('./AIUsageService');
// const AIProviderFactory = require('./AIProviderFactory');
// const FileService = require('../fileService');
// const fs = require('fs');
// const path = require('path');


// class AIDermatologyService {
//   static normalizeBoolean(value) {
//     return value === true || value === 'true' || value === 1 || value === '1';
//   }

//   static async getOwnedActiveSession(userId, sessionUuid) {
//     const [sessions] = await db.execute(
//       `
//       SELECT *
//       FROM ai_sessions
//       WHERE uuid = ?
//         AND user_id = ?
//         AND status = 'active'
//       LIMIT 1
//       `,
//       [sessionUuid, userId]
//     );

//     return sessions.length > 0 ? sessions[0] : null;
//   }

//   static buildMockDermatologyResponse(message, languageCode = 'ar') {
//     const lowerMessage = String(message || '').toLowerCase();

//     const urgentKeywords = [
//       'صديد',
//       'قيح',
//       'نزيف',
//       'حمى',
//       'حرارة',
//       'تورم شديد',
//       'ألم شديد',
//       'ينتشر بسرعة',
//       'انتشار سريع',
//       'حول العين',
//       'العين',
//       'ضيق تنفس',
//       'حساسية شديدة',
//       'دوخة',
//       'إغماء'
//     ];

//     const moderateKeywords = [
//       'حكة',
//       'احمرار',
//       'طفح',
//       'حبوب',
//       'تقشر',
//       'جفاف',
//       'تورم',
//       'ألم',
//       'بقع'
//     ];

//     const hasUrgentFlag = urgentKeywords.some((keyword) => lowerMessage.includes(keyword));
//     const hasModerateFlag = moderateKeywords.some((keyword) => lowerMessage.includes(keyword));

//     let severity = 'mild';
//     let riskLevel = 'low';
//     let recommendedNextStep = 'book_dermatologist';
//     let confidenceLevel = 'low';
//     let needsDoctorReview = true;

//     if (hasUrgentFlag) {
//       severity = 'urgent';
//       riskLevel = 'urgent';
//       recommendedNextStep = 'urgent_care';
//       confidenceLevel = 'medium';
//       needsDoctorReview = true;
//     } else if (hasModerateFlag) {
//       severity = 'moderate';
//       riskLevel = 'medium';
//       recommendedNextStep = 'book_dermatologist';
//       confidenceLevel = 'low';
//       needsDoctorReview = true;
//     }

//     const responseAr = {
//       language: languageCode,
//       case_summary: 'تم استلام وصف الحالة الجلدية. هذه قراءة أولية مساعدة وليست تشخيصًا نهائيًا.',
//       possible_conditions: [
//         {
//           name: 'تهيج أو التهاب جلدي محتمل',
//           likelihood: 'medium',
//           reasoning: 'الأعراض المذكورة قد تظهر في حالات جلدية متعددة، ولا يمكن الجزم بدون صورة أو فحص طبي.'
//         },
//         {
//           name: 'حساسية جلدية محتملة',
//           likelihood: 'low',
//           reasoning: 'قد ترتبط بعض الأعراض بالحساسية أو التعرض لمادة مهيجة، لكن يلزم معرفة تفاصيل أكثر.'
//         }
//       ],
//       severity,
//       red_flags: hasUrgentFlag
//         ? ['تم ذكر عرض قد يحتاج إلى تقييم عاجل مثل صديد أو حرارة أو ألم شديد أو انتشار سريع.']
//         : [],
//       safe_advice: [
//         'تجنب حك المنطقة المصابة قدر الإمكان.',
//         'حافظ على نظافة وجفاف المنطقة.',
//         'تجنب استخدام كريمات قوية أو أدوية موصوفة بدون مراجعة طبيب.',
//         'يمكنك رفع صورة واضحة للحالة لتحسين التحليل المبدئي.'
//       ],
//       avoid: [
//         'لا تستخدم مضادات حيوية أو كورتيزون موضعي بدون وصفة.',
//         'لا تفقع الحبوب أو تجرح المنطقة.',
//         'لا تعتمد على هذا التحليل كتشخيص نهائي.'
//       ],
//       recommended_next_step: recommendedNextStep,
//       follow_up_questions: [
//         'منذ متى بدأت الأعراض؟',
//         'هل يوجد ألم أو حكة؟',
//         'هل الحالة تنتشر أو تزيد؟',
//         'هل استخدمت أي كريم أو دواء مؤخرًا؟',
//         'هل توجد حرارة أو صديد أو تورم واضح؟'
//       ],
//       needs_doctor_review: needsDoctorReview,
//       confidence_level: confidenceLevel,
//       disclaimer: 'هذا تحليل مساعد بالذكاء الاصطناعي وليس تشخيصًا طبيًا نهائيًا. عند وجود ألم شديد أو صديد أو حرارة أو انتشار سريع يجب مراجعة طبيب أو طوارئ.'
//     };

//     const responseEn = {
//       language: languageCode,
//       case_summary: 'The skin concern was received. This is an initial AI-assisted assessment and not a final diagnosis.',
//       possible_conditions: [
//         {
//           name: 'Possible skin irritation or inflammation',
//           likelihood: 'medium',
//           reasoning: 'The described symptoms may appear in multiple skin conditions and cannot be confirmed without an image or medical examination.'
//         },
//         {
//           name: 'Possible allergic skin reaction',
//           likelihood: 'low',
//           reasoning: 'Some symptoms may be related to allergy or irritant exposure, but more details are needed.'
//         }
//       ],
//       severity,
//       red_flags: hasUrgentFlag
//         ? ['A potentially urgent symptom was mentioned, such as pus, fever, severe pain, or rapid spread.']
//         : [],
//       safe_advice: [
//         'Avoid scratching the affected area.',
//         'Keep the area clean and dry.',
//         'Avoid strong creams or prescription medications without medical advice.',
//         'You can upload a clear image to improve the initial assessment.'
//       ],
//       avoid: [
//         'Do not use antibiotics or topical steroids without a prescription.',
//         'Do not pop bumps or injure the area.',
//         'Do not treat this assessment as a final diagnosis.'
//       ],
//       recommended_next_step: recommendedNextStep,
//       follow_up_questions: [
//         'When did the symptoms start?',
//         'Is there pain or itching?',
//         'Is it spreading or getting worse?',
//         'Have you used any cream or medicine recently?',
//         'Is there fever, pus, or clear swelling?'
//       ],
//       needs_doctor_review: needsDoctorReview,
//       confidence_level: confidenceLevel,
//       disclaimer: 'This is an AI-assisted assessment, not a final medical diagnosis. Seek medical care urgently if there is severe pain, pus, fever, or rapid spread.'
//     };

//     return languageCode === 'en' ? responseEn : responseAr;
//   }

//   static async buildRealDermatologyResponse({
//     session,
//     message
//   }) {
//     const [previousMessages] = await db.execute(
//       `
//       SELECT sender_type, message_type, content, structured_content, created_at
//       FROM ai_session_messages
//       WHERE ai_session_id = ?
//       ORDER BY created_at ASC
//       LIMIT 20
//       `,
//       [session.id]
//     );

//     const provider = AIProviderFactory.createProvider();

//     return provider.analyzeTextMessage({
//       message,
//       languageCode: session.language_code || 'ar',
//       previousMessages
//     });
//   }

//   static async sendTextMessage(userId, sessionUuid, message) {
//     const cleanMessage = String(message || '').trim();

//     if (!cleanMessage) {
//       const error = new Error('Message is required');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'نص الرسالة مطلوب',
//         message_en: 'Message is required'
//       };
//       throw error;
//     }

//     if (cleanMessage.length > 3000) {
//       const error = new Error('Message is too long');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'نص الرسالة طويل جدًا. الحد الأقصى 3000 حرف',
//         message_en: 'Message is too long. Maximum 3000 characters'
//       };
//       throw error;
//     }

//     const session = await this.getOwnedActiveSession(userId, sessionUuid);

//     if (!session) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
//         message_en: 'AI session not found or inactive'
//       };
//       throw error;
//     }

//     const usageCheck = await AIUsageService.assertCanUse(userId, 'chat_message');

//     if (!usageCheck.allowed) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'chat_message',
//         status: 'blocked_limit',
//         metadata: {
//           reason: usageCheck.reason
//         }
//       });

//       const error = new Error(usageCheck.reason);
//       error.statusCode = 429;
//       error.response = {
//         success: false,
//         reason: usageCheck.reason,
//         message_ar: usageCheck.message_ar,
//         message_en: usageCheck.message_en,
//         usage: usageCheck.usage
//       };
//       throw error;
//     }

//     const connection = await db.getConnection();

//     try {
//       await connection.beginTransaction();

//       const userMessageUuid = uuidv4();

//       const [userMessageResult] = await connection.execute(
//         `
//         INSERT INTO ai_session_messages (
//           uuid,
//           ai_session_id,
//           user_id,
//           sender_type,
//           message_type,
//           content
//         )
//         VALUES (?, ?, ?, 'user', 'text', ?)
//         `,
//         [userMessageUuid, session.id, userId, cleanMessage]
//       );


//       let aiResponse;
//       let aiProviderResult = null;
//       let promptTokens = 0;
//       let completionTokens = 0;
//       let totalTokens = 0;
//       let processingTimeMs = 0;
//       let responseMode = 'mock';

//       const useMock = process.env.AI_USE_MOCK === 'true';

//       if (useMock) {
//         aiResponse = this.buildMockDermatologyResponse(cleanMessage, session.language_code || 'ar');
//       } else {
//         aiProviderResult = await this.buildRealDermatologyResponse({
//           session,
//           message: cleanMessage
//         });

//         aiResponse = aiProviderResult.data;
//         promptTokens = aiProviderResult.usage.prompt_tokens;
//         completionTokens = aiProviderResult.usage.completion_tokens;
//         totalTokens = aiProviderResult.usage.total_tokens;
//         processingTimeMs = aiProviderResult.processing_time_ms;
//         responseMode = 'openai';
//       }


//       const aiMessageUuid = uuidv4();

//       await connection.execute(
//         `
//         INSERT INTO ai_session_messages (
//           uuid,
//           ai_session_id,
//           user_id,
//           sender_type,
//           message_type,
//           content,
//           structured_content,
//           prompt_tokens,
//           completion_tokens,
//           total_tokens
//         )
//         VALUES (?, ?, ?, 'ai', 'text', ?, ?, ?, ?, ?)
//         `,
//         [
//         aiMessageUuid,
//         session.id,
//         userId,
//         aiResponse.case_summary,
//         JSON.stringify(aiResponse),
//         promptTokens,
//         completionTokens,
//         totalTokens
//         ]
//       );

//       const resultUuid = uuidv4();

//       const [analysisResult] = await connection.execute(
//         `
//         INSERT INTO ai_analysis_results (
//           uuid,
//           ai_session_id,
//           user_id,
//           result_type,
//           language_code,
//           case_summary,
//           possible_conditions,
//           severity,
//           red_flags,
//           safe_advice,
//           avoid,
//           recommended_next_step,
//           confidence_level,
//           needs_doctor_review,
//           ai_response_json,
//           processing_time_ms
//         )
//         VALUES (?, ?, ?, 'chat_response', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           resultUuid,
//           session.id,
//           userId,
//           session.language_code || 'ar',
//           aiResponse.case_summary,
//           JSON.stringify(aiResponse.possible_conditions),
//           aiResponse.severity,
//           JSON.stringify(aiResponse.red_flags),
//           JSON.stringify(aiResponse.safe_advice),
//           JSON.stringify(aiResponse.avoid),
//           aiResponse.recommended_next_step,
//           aiResponse.confidence_level,
//           aiResponse.needs_doctor_review ? 1 : 0,
//           JSON.stringify(aiResponse),
//           processingTimeMs
//         ]
//       );

//       let newTitle = session.title;

//       if (!newTitle) {
//         newTitle = cleanMessage.length > 60 ? `${cleanMessage.substring(0, 60)}...` : cleanMessage;
//       }

//       await connection.execute(
//         `
//         UPDATE ai_sessions
//         SET
//           title = ?,
//           input_mode = CASE
//             WHEN input_mode = 'chat' THEN 'chat'
//             ELSE input_mode
//           END,
//           risk_level = ?,
//           last_message_at = NOW(),
//           updated_at = NOW()
//         WHERE id = ?
//         `,
//         [
//           newTitle,
//           aiResponse.severity === 'urgent'
//             ? 'urgent'
//             : aiResponse.severity === 'severe'
//               ? 'high'
//               : aiResponse.severity === 'moderate'
//                 ? 'medium'
//                 : 'low',
//           session.id
//         ]
//       );

//       await connection.commit();

//       await db.execute(
//         `
//         INSERT INTO ai_provider_logs (
//           ai_session_id,
//           user_id,
//           provider,
//           model,
//           request_type,
//           prompt_tokens,
//           completion_tokens,
//           total_tokens,
//           latency_ms,
//           status,
//           request_metadata,
//           response_metadata
//         )
//         VALUES (?, ?, ?, ?, 'chat', ?, ?, ?, ?, 'success', ?, ?)
//         `,
//         [
//           session.id,
//           userId,
//           aiProviderResult?.provider || 'mock',
//           aiProviderResult?.model || process.env.AI_MODEL || 'mock',
//           promptTokens,
//           completionTokens,
//           totalTokens,
//           processingTimeMs,
//           JSON.stringify({
//             mode: responseMode,
//             message_length: cleanMessage.length
//           }),
//           JSON.stringify({
//             severity: aiResponse.severity,
//             recommended_next_step: aiResponse.recommended_next_step,
//             confidence_level: aiResponse.confidence_level
//           })
//         ]
//       );

//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         aiResultId: analysisResult.insertId,
//         eventType: 'chat_message',
//         status: 'success',
//         countedUnits: 1,
//         promptTokens,
//         completionTokens,
//         totalTokens,
//         metadata: {
//         mode: responseMode,
//         user_message_id: userMessageResult.insertId,
//         provider: aiProviderResult?.provider || 'mock',
//         model: aiProviderResult?.model || null
//         }
//       });

//       return {
//         session_uuid: session.uuid,
//         user_message: {
//           uuid: userMessageUuid,
//           content: cleanMessage
//         },
//         ai_message: {
//           uuid: aiMessageUuid,
//           content: aiResponse.case_summary,
//           structured_content: aiResponse
//         },
//         result: {
//           uuid: resultUuid,
//           result_type: 'chat_response',
//           severity: aiResponse.severity,
//           recommended_next_step: aiResponse.recommended_next_step,
//           confidence_level: aiResponse.confidence_level,
//           needs_doctor_review: aiResponse.needs_doctor_review
//         }
//       };
//     } catch (error) {
//       await connection.rollback();
//       throw error;
//     } finally {
//       connection.release();
//     }
//   }

//   static mapSeverityToRiskLevel(severity) {
//     if (severity === 'urgent') return 'urgent';
//     if (severity === 'severe') return 'high';
//     if (severity === 'moderate') return 'medium';
//     return 'low';
//   }

//   static async buildRealImageDermatologyResponse({
//     session,
//     imageFile,
//     description
//   }) {
//     const [previousMessages] = await db.execute(
//       `
//       SELECT sender_type, message_type, content, structured_content, created_at
//       FROM ai_session_messages
//       WHERE ai_session_id = ?
//       ORDER BY created_at ASC
//       LIMIT 20
//       `,
//       [session.id]
//     );

//     const provider = AIProviderFactory.createProvider();

//     return provider.analyzeImageMessage({
//       imageFile,
//       description,
//       languageCode: session.language_code || 'ar',
//       previousMessages
//     });
//   }

//   static async analyzeImage(userId, sessionUuid, imageFile, description = '') {
//     const cleanDescription = String(description || '').trim();

//     if (!imageFile) {
//       const error = new Error('Image file is required');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'الصورة مطلوبة',
//         message_en: 'Image file is required'
//       };
//       throw error;
//     }

//     const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

//     if (!allowedMimeTypes.includes(imageFile.mimetype)) {
//       const error = new Error('Unsupported image type');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'نوع الصورة غير مدعوم. الأنواع المسموحة: JPEG, PNG, WebP',
//         message_en: 'Unsupported image type. Allowed types: JPEG, PNG, WebP'
//       };
//       throw error;
//     }

//     const session = await this.getOwnedActiveSession(userId, sessionUuid);

//     if (!session) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
//         message_en: 'AI session not found or inactive'
//       };
//       throw error;
//     }

//     const usageCheck = await AIUsageService.assertCanUse(userId, 'image_analysis');

//     if (!usageCheck.allowed) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'image_analysis',
//         status: 'blocked_limit',
//         metadata: {
//           reason: usageCheck.reason
//         }
//       });

//       const error = new Error(usageCheck.reason);
//       error.statusCode = 429;
//       error.response = {
//         success: false,
//         reason: usageCheck.reason,
//         message_ar: usageCheck.message_ar,
//         message_en: usageCheck.message_en,
//         usage: usageCheck.usage
//       };
//       throw error;
//     }

//     const usageSummary = usageCheck.usage;

//     const [fileCountRows] = await db.execute(
//       `
//       SELECT COUNT(*) AS total
//       FROM ai_session_files
//       WHERE ai_session_id = ?
//       `,
//       [session.id]
//     );

//     const currentFileCount = fileCountRows[0].total || 0;
//     const maxFilesPerSession = usageSummary.policy.max_files_per_session || 5;

//     if (currentFileCount >= maxFilesPerSession) {
//       const error = new Error('Maximum files per AI session exceeded');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: `تم الوصول إلى الحد الأقصى للملفات في هذه الجلسة وهو ${maxFilesPerSession}`,
//         message_en: `Maximum files per session reached: ${maxFilesPerSession}`
//       };
//       throw error;
//     }

//     let uploadedFile = null;
//     let aiSessionFileId = null;
//     const userMessageUuid = uuidv4();

//     try {
//       uploadedFile = await FileService.uploadFile(
//         imageFile,
//         {
//           entityType: 'user',
//           entityId: userId
//         },
//         {
//           fileCategory: 'medical_image',
//           relatedToType: 'ai_session',
//           relatedToId: session.id,
//           isPublic: false,
//           metadata: {
//             ai_session_uuid: session.uuid,
//             file_role: 'skin_image',
//             description: cleanDescription || null,
//             source: 'ai_dermatology_image_analysis'
//           }
//         }
//       );

//       const fileConnection = await db.getConnection();

//       try {
//         await fileConnection.beginTransaction();

//         const [sessionFileResult] = await fileConnection.execute(
//           `
//           INSERT INTO ai_session_files (
//             ai_session_id,
//             user_id,
//             file_id,
//             file_role,
//             analysis_status,
//             metadata
//           )
//           VALUES (?, ?, ?, 'skin_image', 'pending', ?)
//           `,
//           [
//             session.id,
//             userId,
//             uploadedFile.id,
//             JSON.stringify({
//               description: cleanDescription || null,
//               mime_type: uploadedFile.mime_type,
//               file_size: uploadedFile.file_size
//             })
//           ]
//         );

//         aiSessionFileId = sessionFileResult.insertId;

//         await fileConnection.execute(
//           `
//           INSERT INTO ai_session_messages (
//             uuid,
//             ai_session_id,
//             user_id,
//             sender_type,
//             message_type,
//             content,
//             file_id
//           )
//           VALUES (?, ?, ?, 'user', 'image', ?, ?)
//           `,
//           [
//             userMessageUuid,
//             session.id,
//             userId,
//             cleanDescription || 'تم رفع صورة جلدية للتحليل',
//             uploadedFile.id
//           ]
//         );

//         await fileConnection.commit();
//       } catch (error) {
//         await fileConnection.rollback();
//         throw error;
//       } finally {
//         fileConnection.release();
//       }

//       let aiResponse;
//       let aiProviderResult = null;
//       let promptTokens = 0;
//       let completionTokens = 0;
//       let totalTokens = 0;
//       let processingTimeMs = 0;
//       let responseMode = 'mock';

//       const useMock = process.env.AI_USE_MOCK === 'true';

//       if (useMock) {
//         aiResponse = this.buildMockDermatologyResponse(
//           cleanDescription || 'تم رفع صورة جلدية للتحليل',
//           session.language_code || 'ar'
//         );
//       } else {
//         aiProviderResult = await this.buildRealImageDermatologyResponse({
//           session,
//           imageFile,
//           description: cleanDescription
//         });

//         aiResponse = aiProviderResult.data;
//         promptTokens = aiProviderResult.usage.prompt_tokens;
//         completionTokens = aiProviderResult.usage.completion_tokens;
//         totalTokens = aiProviderResult.usage.total_tokens;
//         processingTimeMs = aiProviderResult.processing_time_ms;
//         responseMode = 'openai';
//       }

//       const aiMessageUuid = uuidv4();
//       const resultUuid = uuidv4();

//       const analysisConnection = await db.getConnection();

//       try {
//         await analysisConnection.beginTransaction();

//         await analysisConnection.execute(
//           `
//           INSERT INTO ai_session_messages (
//             uuid,
//             ai_session_id,
//             user_id,
//             sender_type,
//             message_type,
//             content,
//             structured_content,
//             file_id,
//             prompt_tokens,
//             completion_tokens,
//             total_tokens
//           )
//           VALUES (?, ?, ?, 'ai', 'image', ?, ?, ?, ?, ?, ?)
//           `,
//           [
//             aiMessageUuid,
//             session.id,
//             userId,
//             aiResponse.case_summary,
//             JSON.stringify(aiResponse),
//             uploadedFile.id,
//             promptTokens,
//             completionTokens,
//             totalTokens
//           ]
//         );

//         const [analysisResult] = await analysisConnection.execute(
//           `
//           INSERT INTO ai_analysis_results (
//             uuid,
//             ai_session_id,
//             user_id,
//             result_type,
//             language_code,
//             case_summary,
//             possible_conditions,
//             severity,
//             red_flags,
//             safe_advice,
//             avoid,
//             recommended_next_step,
//             confidence_level,
//             needs_doctor_review,
//             ai_response_json,
//             processing_time_ms
//           )
//           VALUES (?, ?, ?, 'image_analysis', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//           `,
//           [
//             resultUuid,
//             session.id,
//             userId,
//             session.language_code || 'ar',
//             aiResponse.case_summary,
//             JSON.stringify(aiResponse.possible_conditions),
//             aiResponse.severity,
//             JSON.stringify(aiResponse.red_flags),
//             JSON.stringify(aiResponse.safe_advice),
//             JSON.stringify(aiResponse.avoid),
//             aiResponse.recommended_next_step,
//             aiResponse.confidence_level,
//             aiResponse.needs_doctor_review ? 1 : 0,
//             JSON.stringify(aiResponse),
//             processingTimeMs
//           ]
//         );

//         await analysisConnection.execute(
//           `
//           UPDATE ai_session_files
//           SET
//             analysis_status = 'processed',
//             updated_at = NOW()
//           WHERE id = ?
//           `,
//           [aiSessionFileId]
//         );

//         await analysisConnection.execute(
//           `
//           UPDATE ai_sessions
//           SET
//             input_mode = CASE
//               WHEN input_mode = 'chat' THEN 'mixed'
//               ELSE input_mode
//             END,
//             risk_level = ?,
//             last_message_at = NOW(),
//             updated_at = NOW()
//           WHERE id = ?
//           `,
//           [
//             this.mapSeverityToRiskLevel(aiResponse.severity),
//             session.id
//           ]
//         );

//         await analysisConnection.commit();

//         await db.execute(
//           `
//           INSERT INTO ai_provider_logs (
//             ai_session_id,
//             user_id,
//             provider,
//             model,
//             request_type,
//             prompt_tokens,
//             completion_tokens,
//             total_tokens,
//             latency_ms,
//             status,
//             request_metadata,
//             response_metadata
//           )
//           VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'success', ?, ?)
//           `,
//           [
//             session.id,
//             userId,
//             aiProviderResult?.provider || 'mock',
//             aiProviderResult?.model || process.env.AI_MODEL || 'mock',
//             promptTokens,
//             completionTokens,
//             totalTokens,
//             processingTimeMs,
//             JSON.stringify({
//               mode: responseMode,
//               file_uuid: uploadedFile.uuid,
//               mime_type: uploadedFile.mime_type,
//               file_size: uploadedFile.file_size,
//               description_length: cleanDescription.length
//             }),
//             JSON.stringify({
//               severity: aiResponse.severity,
//               recommended_next_step: aiResponse.recommended_next_step,
//               confidence_level: aiResponse.confidence_level
//             })
//           ]
//         );

//         await AIUsageService.recordUsageEvent({
//           userId,
//           aiSessionId: session.id,
//           aiResultId: analysisResult.insertId,
//           eventType: 'image_analysis',
//           status: 'success',
//           countedUnits: 1,
//           promptTokens,
//           completionTokens,
//           totalTokens,
//           metadata: {
//             mode: responseMode,
//             file_uuid: uploadedFile.uuid,
//             file_id: uploadedFile.id,
//             provider: aiProviderResult?.provider || 'mock',
//             model: aiProviderResult?.model || null
//           }
//         });

//         return {
//           session_uuid: session.uuid,
//           uploaded_file: {
//             id: uploadedFile.id,
//             uuid: uploadedFile.uuid,

//             // Public file_url is kept for backward compatibility,
//             // but mobile/dashboard should NOT use it for medical images.
//             file_url: uploadedFile.file_url,

//             // Secure authenticated endpoint for viewing AI medical files.
//             secure_file_url: `/api/ai-dermatology/files/${uploadedFile.uuid}`,

//             original_filename: uploadedFile.original_filename,
//             mime_type: uploadedFile.mime_type,
//             file_size: uploadedFile.file_size,
//             file_category: uploadedFile.file_category
//           },
//           user_message: {
//             uuid: userMessageUuid,
//             content: cleanDescription || 'تم رفع صورة جلدية للتحليل'
//           },
//           ai_message: {
//             uuid: aiMessageUuid,
//             content: aiResponse.case_summary,
//             structured_content: aiResponse
//           },
//           result: {
//             uuid: resultUuid,
//             result_type: 'image_analysis',
//             severity: aiResponse.severity,
//             recommended_next_step: aiResponse.recommended_next_step,
//             confidence_level: aiResponse.confidence_level,
//             needs_doctor_review: aiResponse.needs_doctor_review
//           }
//         };
//       } catch (error) {
//         await analysisConnection.rollback();

//         if (aiSessionFileId) {
//           await db.execute(
//             `
//             UPDATE ai_session_files
//             SET analysis_status = 'failed', updated_at = NOW()
//             WHERE id = ?
//             `,
//             [aiSessionFileId]
//           );
//         }

//         throw error;
//       } finally {
//         analysisConnection.release();
//       }
//     } catch (error) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'image_analysis',
//         status: 'failed',
//         metadata: {
//           error_message: error.message,
//           file_uuid: uploadedFile?.uuid || null
//         }
//       });

//       await db.execute(
//         `
//         INSERT INTO ai_provider_logs (
//           ai_session_id,
//           user_id,
//           provider,
//           model,
//           request_type,
//           status,
//           error_message,
//           request_metadata
//         )
//         VALUES (?, ?, ?, ?, 'image', 'failed', ?, ?)
//         `,
//         [
//           session.id,
//           userId,
//           process.env.AI_PROVIDER || 'openai',
//           process.env.AI_MODEL || 'unknown',
//           error.message,
//           JSON.stringify({
//             file_uuid: uploadedFile?.uuid || null,
//             mime_type: imageFile?.mimetype || null,
//             file_size: imageFile?.size || null
//           })
//         ]
//       );

//       throw error;
//     }
//   }

//   static async getSecureAIFileForUser(userId, fileUuid) {
//     const [files] = await db.execute(
//       `
//       SELECT
//         f.*,
//         asf.ai_session_id,
//         asf.file_role,
//         asf.analysis_status,
//         s.uuid AS ai_session_uuid,
//         s.user_id AS session_owner_user_id
//       FROM files f
//       INNER JOIN ai_session_files asf
//         ON asf.file_id = f.id
//       INNER JOIN ai_sessions s
//         ON s.id = asf.ai_session_id
//       WHERE f.uuid = ?
//         AND s.user_id = ?
//         AND f.is_deleted = 0
//       LIMIT 1
//       `,
//       [fileUuid, userId]
//     );

//     if (files.length === 0) {
//       return null;
//     }

//     const file = files[0];

//     const allowedCategories = ['medical_image', 'document', 'other'];

//     if (!allowedCategories.includes(file.file_category)) {
//       const error = new Error('File category is not allowed for AI secure access');
//       error.statusCode = 403;
//       throw error;
//     }

//     if (!file.file_path) {
//       const error = new Error('File path is missing');
//       error.statusCode = 404;
//       throw error;
//     }

//     const normalizedRelativePath = String(file.file_path).startsWith('/')
//       ? String(file.file_path).slice(1)
//       : String(file.file_path);

//     const uploadRoot = path.resolve(process.cwd(), 'upload', 'files');
//     const absolutePath = path.resolve(process.cwd(), normalizedRelativePath);

//     if (!absolutePath.startsWith(uploadRoot + path.sep)) {
//       const error = new Error('Invalid file path');
//       error.statusCode = 403;
//       throw error;
//     }

//     if (!fs.existsSync(absolutePath)) {
//       const error = new Error('File not found on disk');
//       error.statusCode = 404;
//       throw error;
//     }

//     await db.execute(
//       `
//       UPDATE files
//       SET
//         access_count = access_count + 1,
//         last_accessed_at = CURRENT_TIMESTAMP
//       WHERE id = ?
//       `,
//       [file.id]
//     );

//     return {
//       file,
//       absolutePath,
//       mimeType: file.mime_type || 'application/octet-stream',
//       originalFilename: file.original_filename || file.stored_filename || 'ai-file'
//     };
//   }

//   static async buildRealDocumentDermatologyResponse({
//     session,
//     documentFile,
//     description
//   }) {
//     const [previousMessages] = await db.execute(
//       `
//       SELECT sender_type, message_type, content, structured_content, created_at
//       FROM ai_session_messages
//       WHERE ai_session_id = ?
//       ORDER BY created_at ASC
//       LIMIT 20
//       `,
//       [session.id]
//     );

//     const provider = AIProviderFactory.createProvider();

//     return provider.analyzeDocumentMessage({
//       documentFile,
//       description,
//       languageCode: session.language_code || 'ar',
//       previousMessages
//     });
//   }

//   static async analyzeDocument(userId, sessionUuid, documentFile, description = '') {
//     const cleanDescription = String(description || '').trim();

//     if (!documentFile) {
//       const error = new Error('Document file is required');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'ملف التقرير مطلوب',
//         message_en: 'Document file is required'
//       };
//       throw error;
//     }

//     const allowedMimeTypes = [
//       'application/pdf',
//       'text/plain'
//     ];

//     if (!allowedMimeTypes.includes(documentFile.mimetype)) {
//       const error = new Error('Unsupported document type');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'نوع الملف غير مدعوم حاليًا. الأنواع المسموحة: PDF و TXT',
//         message_en: 'Unsupported document type. Currently allowed: PDF and TXT'
//       };
//       throw error;
//     }

//     const session = await this.getOwnedActiveSession(userId, sessionUuid);

//     if (!session) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة',
//         message_en: 'AI session not found or inactive'
//       };
//       throw error;
//     }

//     const usageCheck = await AIUsageService.assertCanUse(userId, 'document_analysis');

//     if (!usageCheck.allowed) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'document_analysis',
//         status: 'blocked_limit',
//         metadata: {
//           reason: usageCheck.reason
//         }
//       });

//       const error = new Error(usageCheck.reason);
//       error.statusCode = 429;
//       error.response = {
//         success: false,
//         reason: usageCheck.reason,
//         message_ar: usageCheck.message_ar,
//         message_en: usageCheck.message_en,
//         usage: usageCheck.usage
//       };
//       throw error;
//     }

//     const usageSummary = usageCheck.usage;

//     const [fileCountRows] = await db.execute(
//       `
//       SELECT COUNT(*) AS total
//       FROM ai_session_files
//       WHERE ai_session_id = ?
//       `,
//       [session.id]
//     );

//     const currentFileCount = fileCountRows[0].total || 0;
//     const maxFilesPerSession = usageSummary.policy.max_files_per_session || 5;

//     if (currentFileCount >= maxFilesPerSession) {
//       const error = new Error('Maximum files per AI session exceeded');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: `تم الوصول إلى الحد الأقصى للملفات في هذه الجلسة وهو ${maxFilesPerSession}`,
//         message_en: `Maximum files per session reached: ${maxFilesPerSession}`
//       };
//       throw error;
//     }

//     let uploadedFile = null;
//     let aiSessionFileId = null;
//     const userMessageUuid = uuidv4();

//     try {
//       uploadedFile = await FileService.uploadFile(
//         documentFile,
//         {
//           entityType: 'user',
//           entityId: userId
//         },
//         {
//           fileCategory: 'other',
//           relatedToType: 'ai_session',
//           relatedToId: session.id,
//           isPublic: false,
//           metadata: {
//             ai_session_uuid: session.uuid,
//             file_role: 'medical_report',
//             description: cleanDescription || null,
//             source: 'ai_dermatology_document_analysis'
//           }
//         }
//       );

//       const fileConnection = await db.getConnection();

//       try {
//         await fileConnection.beginTransaction();

//         const [sessionFileResult] = await fileConnection.execute(
//           `
//           INSERT INTO ai_session_files (
//             ai_session_id,
//             user_id,
//             file_id,
//             file_role,
//             analysis_status,
//             metadata
//           )
//           VALUES (?, ?, ?, 'medical_report', 'pending', ?)
//           `,
//           [
//             session.id,
//             userId,
//             uploadedFile.id,
//             JSON.stringify({
//               description: cleanDescription || null,
//               mime_type: uploadedFile.mime_type,
//               file_size: uploadedFile.file_size
//             })
//           ]
//         );

//         aiSessionFileId = sessionFileResult.insertId;

//         await fileConnection.execute(
//           `
//           INSERT INTO ai_session_messages (
//             uuid,
//             ai_session_id,
//             user_id,
//             sender_type,
//             message_type,
//             content,
//             file_id
//           )
//           VALUES (?, ?, ?, 'user', 'document', ?, ?)
//           `,
//           [
//             userMessageUuid,
//             session.id,
//             userId,
//             cleanDescription || 'تم رفع تقرير طبي للتحليل',
//             uploadedFile.id
//           ]
//         );

//         await fileConnection.commit();
//       } catch (error) {
//         await fileConnection.rollback();
//         throw error;
//       } finally {
//         fileConnection.release();
//       }

//       let aiResponse;
//       let aiProviderResult = null;
//       let promptTokens = 0;
//       let completionTokens = 0;
//       let totalTokens = 0;
//       let processingTimeMs = 0;
//       let responseMode = 'mock';

//       const useMock = process.env.AI_USE_MOCK === 'true';

//       if (useMock) {
//         aiResponse = this.buildMockDermatologyResponse(
//           cleanDescription || 'تم رفع تقرير طبي للتحليل',
//           session.language_code || 'ar'
//         );
//       } else {
//         aiProviderResult = await this.buildRealDocumentDermatologyResponse({
//           session,
//           documentFile,
//           description: cleanDescription
//         });

//         aiResponse = aiProviderResult.data;
//         promptTokens = aiProviderResult.usage.prompt_tokens;
//         completionTokens = aiProviderResult.usage.completion_tokens;
//         totalTokens = aiProviderResult.usage.total_tokens;
//         processingTimeMs = aiProviderResult.processing_time_ms;
//         responseMode = 'openai';
//       }

//       const aiMessageUuid = uuidv4();
//       const resultUuid = uuidv4();

//       const analysisConnection = await db.getConnection();

//       try {
//         await analysisConnection.beginTransaction();

//         await analysisConnection.execute(
//           `
//           INSERT INTO ai_session_messages (
//             uuid,
//             ai_session_id,
//             user_id,
//             sender_type,
//             message_type,
//             content,
//             structured_content,
//             file_id,
//             prompt_tokens,
//             completion_tokens,
//             total_tokens
//           )
//           VALUES (?, ?, ?, 'ai', 'document', ?, ?, ?, ?, ?, ?)
//           `,
//           [
//             aiMessageUuid,
//             session.id,
//             userId,
//             aiResponse.case_summary,
//             JSON.stringify(aiResponse),
//             uploadedFile.id,
//             promptTokens,
//             completionTokens,
//             totalTokens
//           ]
//         );

//         const [analysisResult] = await analysisConnection.execute(
//           `
//           INSERT INTO ai_analysis_results (
//             uuid,
//             ai_session_id,
//             user_id,
//             result_type,
//             language_code,
//             case_summary,
//             possible_conditions,
//             severity,
//             red_flags,
//             safe_advice,
//             avoid,
//             recommended_next_step,
//             confidence_level,
//             needs_doctor_review,
//             ai_response_json,
//             processing_time_ms
//           )
//           VALUES (?, ?, ?, 'document_analysis', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//           `,
//           [
//             resultUuid,
//             session.id,
//             userId,
//             session.language_code || 'ar',
//             aiResponse.case_summary,
//             JSON.stringify(aiResponse.possible_conditions),
//             aiResponse.severity,
//             JSON.stringify(aiResponse.red_flags),
//             JSON.stringify(aiResponse.safe_advice),
//             JSON.stringify(aiResponse.avoid),
//             aiResponse.recommended_next_step,
//             aiResponse.confidence_level,
//             aiResponse.needs_doctor_review ? 1 : 0,
//             JSON.stringify(aiResponse),
//             processingTimeMs
//           ]
//         );

//         await analysisConnection.execute(
//           `
//           UPDATE ai_session_files
//           SET
//             analysis_status = 'processed',
//             updated_at = NOW()
//           WHERE id = ?
//           `,
//           [aiSessionFileId]
//         );

//         await analysisConnection.execute(
//           `
//           UPDATE ai_sessions
//           SET
//             input_mode = 'mixed',
//             risk_level = ?,
//             last_message_at = NOW(),
//             updated_at = NOW()
//           WHERE id = ?
//           `,
//           [
//             this.mapSeverityToRiskLevel(aiResponse.severity),
//             session.id
//           ]
//         );

//         await analysisConnection.commit();

//         await db.execute(
//           `
//           INSERT INTO ai_provider_logs (
//             ai_session_id,
//             user_id,
//             provider,
//             model,
//             request_type,
//             prompt_tokens,
//             completion_tokens,
//             total_tokens,
//             latency_ms,
//             status,
//             request_metadata,
//             response_metadata
//           )
//           VALUES (?, ?, ?, ?, 'document', ?, ?, ?, ?, 'success', ?, ?)
//           `,
//           [
//             session.id,
//             userId,
//             aiProviderResult?.provider || 'mock',
//             aiProviderResult?.model || process.env.AI_MODEL || 'mock',
//             promptTokens,
//             completionTokens,
//             totalTokens,
//             processingTimeMs,
//             JSON.stringify({
//               mode: responseMode,
//               file_uuid: uploadedFile.uuid,
//               mime_type: uploadedFile.mime_type,
//               file_size: uploadedFile.file_size,
//               description_length: cleanDescription.length
//             }),
//             JSON.stringify({
//               severity: aiResponse.severity,
//               recommended_next_step: aiResponse.recommended_next_step,
//               confidence_level: aiResponse.confidence_level
//             })
//           ]
//         );

//         await AIUsageService.recordUsageEvent({
//           userId,
//           aiSessionId: session.id,
//           aiResultId: analysisResult.insertId,
//           eventType: 'document_analysis',
//           status: 'success',
//           countedUnits: 1,
//           promptTokens,
//           completionTokens,
//           totalTokens,
//           metadata: {
//             mode: responseMode,
//             file_uuid: uploadedFile.uuid,
//             file_id: uploadedFile.id,
//             provider: aiProviderResult?.provider || 'mock',
//             model: aiProviderResult?.model || null
//           }
//         });

//         return {
//           session_uuid: session.uuid,
//           uploaded_file: {
//             id: uploadedFile.id,
//             uuid: uploadedFile.uuid,
//             file_url: uploadedFile.file_url,
//             secure_file_url: `/api/ai-dermatology/files/${uploadedFile.uuid}`,
//             original_filename: uploadedFile.original_filename,
//             mime_type: uploadedFile.mime_type,
//             file_size: uploadedFile.file_size,
//             file_category: uploadedFile.file_category
//           },
//           user_message: {
//             uuid: userMessageUuid,
//             content: cleanDescription || 'تم رفع تقرير طبي للتحليل'
//           },
//           ai_message: {
//             uuid: aiMessageUuid,
//             content: aiResponse.case_summary,
//             structured_content: aiResponse
//           },
//           result: {
//             uuid: resultUuid,
//             result_type: 'document_analysis',
//             severity: aiResponse.severity,
//             recommended_next_step: aiResponse.recommended_next_step,
//             confidence_level: aiResponse.confidence_level,
//             needs_doctor_review: aiResponse.needs_doctor_review
//           }
//         };
//       } catch (error) {
//         await analysisConnection.rollback();

//         if (aiSessionFileId) {
//           await db.execute(
//             `
//             UPDATE ai_session_files
//             SET analysis_status = 'failed', updated_at = NOW()
//             WHERE id = ?
//             `,
//             [aiSessionFileId]
//           );
//         }

//         throw error;
//       } finally {
//         analysisConnection.release();
//       }
//     } catch (error) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'document_analysis',
//         status: 'failed',
//         metadata: {
//           error_message: error.message,
//           file_uuid: uploadedFile?.uuid || null
//         }
//       });

//       await db.execute(
//         `
//         INSERT INTO ai_provider_logs (
//           ai_session_id,
//           user_id,
//           provider,
//           model,
//           request_type,
//           status,
//           error_message,
//           request_metadata
//         )
//         VALUES (?, ?, ?, ?, 'document', 'failed', ?, ?)
//         `,
//         [
//           session.id,
//           userId,
//           process.env.AI_PROVIDER || 'openai',
//           process.env.AI_MODEL || 'unknown',
//           error.message,
//           JSON.stringify({
//             file_uuid: uploadedFile?.uuid || null,
//             mime_type: documentFile?.mimetype || null,
//             file_size: documentFile?.size || null
//           })
//         ]
//       );

//       throw error;
//     }
//   }

//   static async buildRealFinalSummaryResponse({
//     session,
//     messages,
//     results,
//     files
//   }) {
//     const provider = AIProviderFactory.createProvider();

//     return provider.generateFinalSummary({
//       session,
//       messages,
//       results,
//       files
//     });
//   }

//   static async completeSession(userId, sessionUuid) {
//     const [sessions] = await db.execute(
//       `
//       SELECT *
//       FROM ai_sessions
//       WHERE uuid = ?
//         AND user_id = ?
//         AND status != 'deleted'
//       LIMIT 1
//       `,
//       [sessionUuid, userId]
//     );

//     if (sessions.length === 0) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
//         message_en: 'AI session not found'
//       };
//       throw error;
//     }

//     const session = sessions[0];

//     if (session.status === 'completed') {
//       const error = new Error('AI session is already completed');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'تم إنهاء هذه الجلسة مسبقًا',
//         message_en: 'This AI session is already completed'
//       };
//       throw error;
//     }

//     if (session.status !== 'active') {
//       const error = new Error('AI session is not active');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'لا يمكن إنهاء جلسة غير نشطة',
//         message_en: 'Cannot complete a non-active AI session'
//       };
//       throw error;
//     }

//     const usageCheck = await AIUsageService.assertCanUse(userId, 'final_summary');

//     if (!usageCheck.allowed) {
//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'final_summary',
//         status: 'blocked_limit',
//         metadata: {
//           reason: usageCheck.reason
//         }
//       });

//       const error = new Error(usageCheck.reason);
//       error.statusCode = 429;
//       error.response = {
//         success: false,
//         reason: usageCheck.reason,
//         message_ar: usageCheck.message_ar,
//         message_en: usageCheck.message_en,
//         usage: usageCheck.usage
//       };
//       throw error;
//     }

//     const [messages] = await db.execute(
//       `
//       SELECT
//         id,
//         uuid,
//         sender_type,
//         message_type,
//         content,
//         structured_content,
//         file_id,
//         created_at
//       FROM ai_session_messages
//       WHERE ai_session_id = ?
//       ORDER BY created_at ASC, id ASC
//       `,
//       [session.id]
//     );

//     const [results] = await db.execute(
//       `
//       SELECT
//         id,
//         uuid,
//         result_type,
//         case_summary,
//         possible_conditions,
//         severity,
//         red_flags,
//         safe_advice,
//         avoid,
//         recommended_next_step,
//         confidence_level,
//         needs_doctor_review,
//         ai_response_json,
//         created_at
//       FROM ai_analysis_results
//       WHERE ai_session_id = ?
//       ORDER BY created_at DESC, id DESC
//       `,
//       [session.id]
//     );

//     if (results.length === 0) {
//       const error = new Error('No AI analysis results found to summarize');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'لا توجد نتائج تحليل داخل الجلسة لإنشاء ملخص نهائي',
//         message_en: 'No AI analysis results found to create a final summary'
//       };
//       throw error;
//     }

//     const [files] = await db.execute(
//       `
//       SELECT
//         asf.file_role,
//         asf.analysis_status,
//         asf.created_at,
//         f.uuid,
//         f.file_category,
//         f.original_filename,
//         f.mime_type,
//         f.file_size
//       FROM ai_session_files asf
//       INNER JOIN files f
//         ON f.id = asf.file_id
//       WHERE asf.ai_session_id = ?
//         AND f.is_deleted = 0
//       ORDER BY asf.created_at ASC, asf.id ASC
//       `,
//       [session.id]
//     );

//     const parseJsonSafely = (value) => {
//       if (value === null || value === undefined) return null;
//       if (typeof value === 'object') return value;

//       try {
//         return JSON.parse(value);
//       } catch (error) {
//         return value;
//       }
//     };

//     const preparedMessages = messages.map((message) => ({
//       ...message,
//       structured_content: parseJsonSafely(message.structured_content)
//     }));

//     const preparedResults = results.map((result) => ({
//       ...result,
//       possible_conditions: parseJsonSafely(result.possible_conditions),
//       red_flags: parseJsonSafely(result.red_flags),
//       safe_advice: parseJsonSafely(result.safe_advice),
//       avoid: parseJsonSafely(result.avoid),
//       ai_response_json: parseJsonSafely(result.ai_response_json)
//     }));

//     let aiResponse;
//     let aiProviderResult = null;
//     let promptTokens = 0;
//     let completionTokens = 0;
//     let totalTokens = 0;
//     let processingTimeMs = 0;
//     let responseMode = 'mock';

//     const useMock = process.env.AI_USE_MOCK === 'true';

//     if (useMock) {
//       aiResponse = this.buildMockDermatologyResponse(
//         'إنشاء ملخص نهائي لجلسة الذكاء الاصطناعي',
//         session.language_code || 'ar'
//       );
//     } else {
//       aiProviderResult = await this.buildRealFinalSummaryResponse({
//         session,
//         messages: preparedMessages,
//         results: preparedResults,
//         files
//       });

//       aiResponse = aiProviderResult.data;
//       promptTokens = aiProviderResult.usage.prompt_tokens;
//       completionTokens = aiProviderResult.usage.completion_tokens;
//       totalTokens = aiProviderResult.usage.total_tokens;
//       processingTimeMs = aiProviderResult.processing_time_ms;
//       responseMode = 'openai';
//     }

//     const aiMessageUuid = uuidv4();
//     const resultUuid = uuidv4();

//     const connection = await db.getConnection();

//     try {
//       await connection.beginTransaction();

//       await connection.execute(
//         `
//         INSERT INTO ai_session_messages (
//           uuid,
//           ai_session_id,
//           user_id,
//           sender_type,
//           message_type,
//           content,
//           structured_content,
//           prompt_tokens,
//           completion_tokens,
//           total_tokens
//         )
//         VALUES (?, ?, ?, 'ai', 'text', ?, ?, ?, ?, ?)
//         `,
//         [
//           aiMessageUuid,
//           session.id,
//           userId,
//           aiResponse.case_summary,
//           JSON.stringify(aiResponse),
//           promptTokens,
//           completionTokens,
//           totalTokens
//         ]
//       );

//       const [analysisResult] = await connection.execute(
//         `
//         INSERT INTO ai_analysis_results (
//           uuid,
//           ai_session_id,
//           user_id,
//           result_type,
//           language_code,
//           case_summary,
//           possible_conditions,
//           severity,
//           red_flags,
//           safe_advice,
//           avoid,
//           recommended_next_step,
//           confidence_level,
//           needs_doctor_review,
//           ai_response_json,
//           processing_time_ms
//         )
//         VALUES (?, ?, ?, 'final_summary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           resultUuid,
//           session.id,
//           userId,
//           session.language_code || 'ar',
//           aiResponse.case_summary,
//           JSON.stringify(aiResponse.possible_conditions),
//           aiResponse.severity,
//           JSON.stringify(aiResponse.red_flags),
//           JSON.stringify(aiResponse.safe_advice),
//           JSON.stringify(aiResponse.avoid),
//           aiResponse.recommended_next_step,
//           aiResponse.confidence_level,
//           aiResponse.needs_doctor_review ? 1 : 0,
//           JSON.stringify(aiResponse),
//           processingTimeMs
//         ]
//       );

//       await connection.execute(
//         `
//         UPDATE ai_sessions
//         SET
//           status = 'completed',
//           risk_level = ?,
//           summary_json = ?,
//           last_message_at = NOW(),
//           updated_at = NOW()
//         WHERE id = ?
//         `,
//         [
//           this.mapSeverityToRiskLevel(aiResponse.severity),
//           JSON.stringify(aiResponse),
//           session.id
//         ]
//       );

//       await connection.commit();

//       await db.execute(
//         `
//         INSERT INTO ai_provider_logs (
//           ai_session_id,
//           user_id,
//           provider,
//           model,
//           request_type,
//           prompt_tokens,
//           completion_tokens,
//           total_tokens,
//           latency_ms,
//           status,
//           request_metadata,
//           response_metadata
//         )
//         VALUES (?, ?, ?, ?, 'summary', ?, ?, ?, ?, 'success', ?, ?)
//         `,
//         [
//           session.id,
//           userId,
//           aiProviderResult?.provider || 'mock',
//           aiProviderResult?.model || process.env.AI_MODEL || 'mock',
//           promptTokens,
//           completionTokens,
//           totalTokens,
//           processingTimeMs,
//           JSON.stringify({
//             mode: responseMode,
//             source_results_count: preparedResults.length,
//             source_messages_count: preparedMessages.length,
//             source_files_count: files.length
//           }),
//           JSON.stringify({
//             severity: aiResponse.severity,
//             recommended_next_step: aiResponse.recommended_next_step,
//             confidence_level: aiResponse.confidence_level
//           })
//         ]
//       );

//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         aiResultId: analysisResult.insertId,
//         eventType: 'final_summary',
//         status: 'success',
//         countedUnits: 1,
//         promptTokens,
//         completionTokens,
//         totalTokens,
//         metadata: {
//           mode: responseMode,
//           provider: aiProviderResult?.provider || 'mock',
//           model: aiProviderResult?.model || null,
//           source_results_count: preparedResults.length,
//           source_messages_count: preparedMessages.length,
//           source_files_count: files.length
//         }
//       });

//       return {
//         session_uuid: session.uuid,
//         status: 'completed',
//         ai_message: {
//           uuid: aiMessageUuid,
//           content: aiResponse.case_summary,
//           structured_content: aiResponse
//         },
//         result: {
//           uuid: resultUuid,
//           result_type: 'final_summary',
//           severity: aiResponse.severity,
//           recommended_next_step: aiResponse.recommended_next_step,
//           confidence_level: aiResponse.confidence_level,
//           needs_doctor_review: aiResponse.needs_doctor_review
//         },
//         source_context: {
//           messages_count: preparedMessages.length,
//           files_count: files.length,
//           results_count: preparedResults.length
//         }
//       };
//     } catch (error) {
//       await connection.rollback();

//       await AIUsageService.recordUsageEvent({
//         userId,
//         aiSessionId: session.id,
//         eventType: 'final_summary',
//         status: 'failed',
//         metadata: {
//           error_message: error.message
//         }
//       });

//       await db.execute(
//         `
//         INSERT INTO ai_provider_logs (
//           ai_session_id,
//           user_id,
//           provider,
//           model,
//           request_type,
//           status,
//           error_message,
//           request_metadata
//         )
//         VALUES (?, ?, ?, ?, 'summary', 'failed', ?, ?)
//         `,
//         [
//           session.id,
//           userId,
//           process.env.AI_PROVIDER || 'openai',
//           process.env.AI_MODEL || 'unknown',
//           error.message,
//           JSON.stringify({
//             source_results_count: preparedResults.length,
//             source_messages_count: preparedMessages.length,
//             source_files_count: files.length
//           })
//         ]
//       );

//       throw error;
//     } finally {
//       connection.release();
//     }
//   }

// }

// module.exports = AIDermatologyService;
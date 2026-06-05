const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

class AISessionService {
  static async createSession(userId, data = {}) {
    const {
      title = null,
      input_mode = 'chat',
      language_code = process.env.AI_DEFAULT_LANGUAGE || 'ar',
      patient_consent = false
    } = data;

    const allowedInputModes = ['chat', 'image', 'document', 'mixed'];

    if (!allowedInputModes.includes(input_mode)) {
      const error = new Error('Invalid input_mode');
      error.statusCode = 400;
      throw error;
    }

    const requireConsent = process.env.AI_REQUIRE_PATIENT_CONSENT !== 'false';

    if (requireConsent && !patient_consent) {
      const error = new Error('Patient consent is required');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'يجب الموافقة على استخدام الذكاء الاصطناعي قبل بدء الجلسة',
        message_en: 'Patient consent is required before starting an AI session'
      };
      throw error;
    }

    const sessionUuid = uuidv4();

    const [result] = await db.execute(
      `
      INSERT INTO ai_sessions (
        uuid,
        user_id,
        title,
        input_mode,
        language_code,
        patient_consent,
        consent_at,
        ai_provider,
        ai_model
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sessionUuid,
        userId,
        title,
        input_mode,
        language_code,
        patient_consent ? 1 : 0,
        patient_consent ? new Date() : null,
        process.env.AI_PROVIDER || 'openai',
        process.env.AI_MODEL || 'gpt-4.1-mini'
      ]
    );

    const [sessions] = await db.execute(
      `
      SELECT *
      FROM ai_sessions
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return sessions[0];
  }

  static parseJsonField(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'object') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }

  static getBackendBaseUrl() {
    const fallbackPort = process.env.PORT || 3006;
    const rawBaseUrl = process.env.BACKEND_URL || process.env.BASE_URL || `http://localhost:${fallbackPort}`;

    return String(rawBaseUrl).trim().replace(/\/+$/, '');
  }

  static buildSecureFilePath(fileUuid) {
    if (!fileUuid) return null;
    return `/api/ai-dermatology/files/${fileUuid}`;
  }

  static buildSecureFileUrl(fileUuid) {
    const filePath = this.buildSecureFilePath(fileUuid);
    if (!filePath) return null;

    return `${this.getBackendBaseUrl()}${filePath}`;
  }

  static async getUserSessions(userId, options = {}) {
    const page = Math.max(parseInt(options.page || 1), 1);
    const limit = Math.min(Math.max(parseInt(options.limit || 20), 1), 50);
    const offset = (page - 1) * limit;

    const [countRows] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM ai_sessions
      WHERE user_id = ?
        AND status != 'deleted'
      `,
      [userId]
    );

    const [sessions] = await db.execute(
      `
      SELECT
        id,
        uuid,
        title,
        status,
        input_mode,
        specialty,
        language_code,
        patient_consent,
        risk_level,
        ai_provider,
        ai_model,
        last_message_at,
        created_at,
        updated_at
      FROM ai_sessions
      WHERE user_id = ?
        AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
      `,
      [userId]
    );

    return {
      sessions,
      pagination: {
        total: countRows[0].total,
        page,
        limit,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    };
  }

  static async getUserSessionByUuid(userId, sessionUuid) {
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
      return null;
    }

    const session = sessions[0];

    const [messages] = await db.execute(
      `
      SELECT
        m.id,
        m.uuid,
        m.sender_type,
        m.message_type,
        m.content,
        m.structured_content,
        m.file_id,
        m.prompt_tokens,
        m.completion_tokens,
        m.total_tokens,
        m.created_at,

        f.uuid AS file_uuid,
        f.original_filename,
        f.file_category,
        f.mime_type,
        f.file_size,
        f.file_url,
        f.is_public
      FROM ai_session_messages m
      LEFT JOIN files f
        ON f.id = m.file_id
        AND f.is_deleted = 0
      WHERE m.ai_session_id = ?
      ORDER BY m.created_at ASC, m.id ASC
      `,
      [session.id]
    );

    const [files] = await db.execute(
      `
      SELECT
        asf.id AS ai_session_file_id,
        asf.file_role,
        asf.analysis_status,
        asf.extracted_text,
        asf.metadata AS ai_file_metadata,
        asf.created_at,
        asf.updated_at,

        f.id AS file_id,
        f.uuid,
        f.file_category,
        f.original_filename,
        f.stored_filename,
        f.file_path,
        f.file_url,
        f.mime_type,
        f.file_size,
        f.file_extension,
        f.is_public,
        f.metadata AS file_metadata,
        f.access_count,
        f.last_accessed_at
      FROM ai_session_files asf
      INNER JOIN files f
        ON f.id = asf.file_id
      WHERE asf.ai_session_id = ?
        AND f.is_deleted = 0
      ORDER BY asf.created_at ASC, asf.id ASC
      `,
      [session.id]
    );

    const [results] = await db.execute(
      `
      SELECT
        id,
        uuid,
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
        processing_time_ms,
        doctor_reviewed,
        doctor_agreement,
        reviewed_by_doctor_id,
        doctor_notes,
        reviewed_at,
        created_at
      FROM ai_analysis_results
      WHERE ai_session_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [session.id]
    );

    const formattedFiles = files.map((file) => ({
      ai_session_file_id: file.ai_session_file_id,
      file_id: file.file_id,
      uuid: file.uuid,
      file_role: file.file_role,
      analysis_status: file.analysis_status,
      file_category: file.file_category,
      original_filename: file.original_filename,
      stored_filename: file.stored_filename,
      mime_type: file.mime_type,
      file_size: file.file_size,
      file_extension: file.file_extension,
      is_public: file.is_public,

      // Keep original URL for compatibility, but apps should use secure_file_url.
      file_url: file.file_url,
      secure_file_url: this.buildSecureFileUrl(file.uuid),
      secure_file_path: this.buildSecureFilePath(file.uuid),

      metadata: {
        ai_file_metadata: this.parseJsonField(file.ai_file_metadata),
        file_metadata: this.parseJsonField(file.file_metadata)
      },

      access: {
        access_count: file.access_count,
        last_accessed_at: file.last_accessed_at
      },

      created_at: file.created_at,
      updated_at: file.updated_at
    }));

    const fileById = new Map();

    formattedFiles.forEach((file) => {
      fileById.set(file.file_id, file);
    });

    const formattedMessages = messages.map((message) => {
      const attachedFile = message.file_id ? fileById.get(message.file_id) : null;

      return {
        id: message.id,
        uuid: message.uuid,
        sender_type: message.sender_type,
        message_type: message.message_type,
        content: message.content,
        structured_content: this.parseJsonField(message.structured_content),
        file_id: message.file_id,

        file: attachedFile
          ? {
              file_id: attachedFile.file_id,
              uuid: attachedFile.uuid,
              file_role: attachedFile.file_role,
              file_category: attachedFile.file_category,
              original_filename: attachedFile.original_filename,
              mime_type: attachedFile.mime_type,
              file_size: attachedFile.file_size,
              secure_file_url: attachedFile.secure_file_url,
              secure_file_path: attachedFile.secure_file_path
            }
          : null,

        tokens: {
          prompt_tokens: message.prompt_tokens,
          completion_tokens: message.completion_tokens,
          total_tokens: message.total_tokens
        },

        created_at: message.created_at
      };
    });

    const formattedResults = results.map((result) => ({
      id: result.id,
      uuid: result.uuid,
      result_type: result.result_type,
      language_code: result.language_code,
      case_summary: result.case_summary,
      possible_conditions: this.parseJsonField(result.possible_conditions),
      severity: result.severity,
      red_flags: this.parseJsonField(result.red_flags),
      safe_advice: this.parseJsonField(result.safe_advice),
      avoid: this.parseJsonField(result.avoid),
      recommended_next_step: result.recommended_next_step,
      confidence_level: result.confidence_level,
      needs_doctor_review: Boolean(result.needs_doctor_review),
      ai_response_json: this.parseJsonField(result.ai_response_json),
      processing_time_ms: result.processing_time_ms,

      doctor_review: {
        doctor_reviewed: Boolean(result.doctor_reviewed),
        doctor_agreement: result.doctor_agreement,
        reviewed_by_doctor_id: result.reviewed_by_doctor_id,
        doctor_notes: result.doctor_notes,
        reviewed_at: result.reviewed_at
      },

      created_at: result.created_at
    }));

    const stats = {
      messages_count: formattedMessages.length,
      files_count: formattedFiles.length,
      results_count: formattedResults.length,
      chat_messages_count: formattedMessages.filter((message) => message.message_type === 'text').length,
      image_messages_count: formattedMessages.filter((message) => message.message_type === 'image').length,
      document_messages_count: formattedMessages.filter((message) => message.message_type === 'document').length,
      image_files_count: formattedFiles.filter((file) => file.file_role === 'skin_image').length,
      document_files_count: formattedFiles.filter((file) => file.file_role === 'medical_report').length
    };

    return {
      session,
      messages: formattedMessages,
      files: formattedFiles,
      results: formattedResults,
      latest_result: formattedResults.length > 0 ? formattedResults[0] : null,
      stats
    };
  }
}

module.exports = AISessionService;
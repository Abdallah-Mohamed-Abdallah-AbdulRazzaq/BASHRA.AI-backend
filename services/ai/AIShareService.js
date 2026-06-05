const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class AIShareService {
  static normalizePositiveInteger(value) {
    if (value === null || value === undefined || value === '') return null;

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      return null;
    }

    return numberValue;
  }

  static async getOwnedSession(userId, sessionUuid) {
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

    return sessions.length > 0 ? sessions[0] : null;
  }

  static async getLatestShareableResult(aiSessionId, requestedResultUuid = null) {
    if (requestedResultUuid) {
      const [results] = await db.execute(
        `
        SELECT *
        FROM ai_analysis_results
        WHERE uuid = ?
          AND ai_session_id = ?
        LIMIT 1
        `,
        [requestedResultUuid, aiSessionId]
      );

      return results.length > 0 ? results[0] : null;
    }

    const [results] = await db.execute(
      `
      SELECT *
      FROM ai_analysis_results
      WHERE ai_session_id = ?
      ORDER BY
        CASE
          WHEN JSON_UNQUOTE(JSON_EXTRACT(ai_response_json, '$.response_kind')) IN ('small_talk', 'out_of_scope') THEN 9
          WHEN result_type = 'final_summary' THEN 1
          WHEN result_type = 'document_analysis' THEN 2
          WHEN result_type = 'image_analysis' THEN 3
          WHEN result_type = 'chat_response' THEN 4
          ELSE 5
        END,
        created_at DESC,
        id DESC
      LIMIT 1
      `,
      [aiSessionId]
    );

    return results.length > 0 ? results[0] : null;
  }

  static async getDoctorById(doctorId) {
    const [doctors] = await db.execute(
      `
      SELECT
        d.id,
        d.uuid,
        d.email,
        d.status,
        d.is_active,
        dp.id AS doctor_profile_id,
        dp.approval_status,
        dp.is_verified,
        dp.is_available,
        dpt.full_name,
        dpt.specialty,
        dpt.sub_specialty
      FROM doctors d
      LEFT JOIN doctor_profiles dp
        ON dp.doctor_id = d.id
      LEFT JOIN doctor_profile_translations dpt
        ON dpt.doctor_profile_id = dp.id
      WHERE d.id = ?
      LIMIT 1
      `,
      [doctorId]
    );

    return doctors.length > 0 ? doctors[0] : null;
  }

  static async getAppointmentForUser(userId, appointmentId) {
    const [appointments] = await db.execute(
      `
      SELECT
        id,
        uuid,
        patient_id,
        doctor_id,
        status,
        scheduled_date,
        actual_start_time,
        appointment_type
      FROM appointments
      WHERE id = ?
        AND patient_id = ?
      LIMIT 1
      `,
      [appointmentId, userId]
    );

    return appointments.length > 0 ? appointments[0] : null;
  }

  static async createShare(userId, sessionUuid, payload = {}) {
    const doctorIdFromPayload = this.normalizePositiveInteger(payload.doctor_id);
    const appointmentId = this.normalizePositiveInteger(payload.appointment_id);
    const requestedResultUuid = payload.result_uuid || null;

    if (!doctorIdFromPayload && !appointmentId) {
      const error = new Error('doctor_id or appointment_id is required');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'يجب إرسال doctor_id أو appointment_id لمشاركة نتيجة الذكاء الاصطناعي',
        message_en: 'doctor_id or appointment_id is required to share AI result'
      };
      throw error;
    }

    const session = await this.getOwnedSession(userId, sessionUuid);

    if (!session) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
        message_en: 'AI session not found'
      };
      throw error;
    }

    const result = await this.getLatestShareableResult(session.id, requestedResultUuid);

    if (!result) {
      const error = new Error('No AI result found to share');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'لا توجد نتيجة ذكاء اصطناعي قابلة للمشاركة داخل هذه الجلسة',
        message_en: 'No shareable AI result found in this session'
      };
      throw error;
    }

    let appointment = null;
    let doctorId = doctorIdFromPayload;

    if (appointmentId) {
      appointment = await this.getAppointmentForUser(userId, appointmentId);

      if (!appointment) {
        const error = new Error('Appointment not found');
        error.statusCode = 404;
        error.response = {
          success: false,
          message_ar: 'الموعد غير موجود أو لا يخص هذا المستخدم',
          message_en: 'Appointment not found or does not belong to this user'
        };
        throw error;
      }

      doctorId = appointment.doctor_id;
    }

    const doctor = await this.getDoctorById(doctorId);

    if (!doctor) {
      const error = new Error('Doctor not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'الطبيب غير موجود',
        message_en: 'Doctor not found'
      };
      throw error;
    }

    if (Number(doctor.is_active) !== 1) {
      const error = new Error('Doctor is not active');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'لا يمكن مشاركة نتيجة الذكاء الاصطناعي مع طبيب غير نشط',
        message_en: 'Cannot share AI result with an inactive doctor'
      };
      throw error;
    }

    const [existingShares] = await db.execute(
      `
      SELECT *
      FROM ai_result_shares
      WHERE ai_session_id = ?
        AND user_id = ?
        AND doctor_id = ?
        AND (
          (? IS NULL AND appointment_id IS NULL)
          OR appointment_id = ?
        )
        AND share_status = 'active'
      LIMIT 1
      `,
      [
        session.id,
        userId,
        doctorId,
        appointmentId,
        appointmentId
      ]
    );

    if (existingShares.length > 0) {
      const existingShare = existingShares[0];

      return {
        already_shared: true,
        share: {
          id: existingShare.id,
          uuid: existingShare.uuid,
          share_status: existingShare.share_status,
          shared_at: existingShare.shared_at,
          revoked_at: existingShare.revoked_at
        },
        session: {
          id: session.id,
          uuid: session.uuid,
          status: session.status,
          risk_level: session.risk_level
        },
        result: {
          id: result.id,
          uuid: result.uuid,
          result_type: result.result_type,
          severity: result.severity,
          recommended_next_step: result.recommended_next_step
        },
        doctor: {
          id: doctor.id,
          uuid: doctor.uuid,
          email: doctor.email,
          full_name: doctor.full_name,
          specialty: doctor.specialty,
          sub_specialty: doctor.sub_specialty
        },
        appointment: appointment
          ? {
              id: appointment.id,
              uuid: appointment.uuid,
              status: appointment.status,
              scheduled_date: appointment.scheduled_date,
              appointment_type: appointment.appointment_type
            }
          : null
      };
    }

    const shareUuid = uuidv4();

    const [insertResult] = await db.execute(
      `
      INSERT INTO ai_result_shares (
        uuid,
        ai_session_id,
        ai_result_id,
        user_id,
        doctor_id,
        appointment_id,
        share_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active')
      `,
      [
        shareUuid,
        session.id,
        result.id,
        userId,
        doctorId,
        appointmentId
      ]
    );

    return {
      already_shared: false,
      share: {
        id: insertResult.insertId,
        uuid: shareUuid,
        share_status: 'active'
      },
      session: {
        id: session.id,
        uuid: session.uuid,
        status: session.status,
        risk_level: session.risk_level
      },
      result: {
        id: result.id,
        uuid: result.uuid,
        result_type: result.result_type,
        severity: result.severity,
        recommended_next_step: result.recommended_next_step
      },
      doctor: {
        id: doctor.id,
        uuid: doctor.uuid,
        email: doctor.email,
        full_name: doctor.full_name,
        specialty: doctor.specialty,
        sub_specialty: doctor.sub_specialty
      },
      appointment: appointment
        ? {
            id: appointment.id,
            uuid: appointment.uuid,
            status: appointment.status,
            scheduled_date: appointment.scheduled_date,
            appointment_type: appointment.appointment_type
          }
        : null
    };
  }

  static async getSessionShares(userId, sessionUuid) {
    const session = await this.getOwnedSession(userId, sessionUuid);

    if (!session) {
      const error = new Error('AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
        message_en: 'AI session not found'
      };
      throw error;
    }

    const [shares] = await db.execute(
      `
      SELECT
        s.id,
        s.uuid,
        s.share_status,
        s.shared_at,
        s.revoked_at,

        r.uuid AS result_uuid,
        r.result_type,
        r.severity,
        r.recommended_next_step,
        r.confidence_level,

        d.id AS doctor_id,
        d.uuid AS doctor_uuid,
        d.email AS doctor_email,

        dp.approval_status,
        dp.is_verified,
        dp.is_available,

        dpt.full_name AS doctor_full_name,
        dpt.specialty,
        dpt.sub_specialty,

        a.id AS appointment_id,
        a.uuid AS appointment_uuid,
        a.status AS appointment_status,
        a.scheduled_date,
        a.appointment_type
      FROM ai_result_shares s
      LEFT JOIN ai_analysis_results r
        ON r.id = s.ai_result_id
      LEFT JOIN doctors d
        ON d.id = s.doctor_id
      LEFT JOIN doctor_profiles dp
        ON dp.doctor_id = d.id
      LEFT JOIN doctor_profile_translations dpt
        ON dpt.doctor_profile_id = dp.id
      LEFT JOIN appointments a
        ON a.id = s.appointment_id
      WHERE s.ai_session_id = ?
        AND s.user_id = ?
      ORDER BY s.shared_at DESC, s.id DESC
      `,
      [session.id, userId]
    );

    return {
      session: {
        id: session.id,
        uuid: session.uuid,
        status: session.status,
        risk_level: session.risk_level
      },
      shares: shares.map((share) => ({
        id: share.id,
        uuid: share.uuid,
        share_status: share.share_status,
        shared_at: share.shared_at,
        revoked_at: share.revoked_at,
        result: {
          uuid: share.result_uuid,
          result_type: share.result_type,
          severity: share.severity,
          recommended_next_step: share.recommended_next_step,
          confidence_level: share.confidence_level
        },
        doctor: share.doctor_id
          ? {
              id: share.doctor_id,
              uuid: share.doctor_uuid,
              email: share.doctor_email,
              full_name: share.doctor_full_name,
              specialty: share.specialty,
              sub_specialty: share.sub_specialty,
              approval_status: share.approval_status,
              is_verified: share.is_verified,
              is_available: share.is_available
            }
          : null,
        appointment: share.appointment_id
          ? {
              id: share.appointment_id,
              uuid: share.appointment_uuid,
              status: share.appointment_status,
              scheduled_date: share.scheduled_date,
              appointment_type: share.appointment_type
            }
          : null
      }))
    };
  }

  static async revokeShare(userId, shareUuid) {
    const [shares] = await db.execute(
      `
      SELECT s.*
      FROM ai_result_shares s
      INNER JOIN ai_sessions ai
        ON ai.id = s.ai_session_id
      WHERE s.uuid = ?
        AND s.user_id = ?
        AND ai.user_id = ?
      LIMIT 1
      `,
      [shareUuid, userId, userId]
    );

    if (shares.length === 0) {
      const error = new Error('AI share not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'المشاركة غير موجودة',
        message_en: 'AI share not found'
      };
      throw error;
    }

    const share = shares[0];

    if (share.share_status === 'revoked') {
      return {
        uuid: share.uuid,
        share_status: 'revoked',
        already_revoked: true,
        revoked_at: share.revoked_at
      };
    }

    await db.execute(
      `
      UPDATE ai_result_shares
      SET
        share_status = 'revoked',
        revoked_at = NOW()
      WHERE id = ?
      `,
      [share.id]
    );

    return {
      uuid: share.uuid,
      share_status: 'revoked',
      already_revoked: false
    };
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

  static buildDoctorSecureFilePath(fileUuid) {
    if (!fileUuid) return null;
    return `/api/ai-dermatology/doctor/files/${fileUuid}`;
  }

  static buildDoctorSecureFileUrl(fileUuid) {
    const filePath = this.buildDoctorSecureFilePath(fileUuid);
    if (!filePath) return null;

    return `${this.getBackendBaseUrl()}${filePath}`;
  }

  static async getDoctorSharedSessions(doctorId) {
    const [shares] = await db.execute(
      `
      SELECT
        sh.id AS share_id,
        sh.uuid AS share_uuid,
        sh.share_status,
        sh.shared_at,
        sh.revoked_at,

        s.id AS ai_session_id,
        s.uuid AS ai_session_uuid,
        s.title,
        s.status AS session_status,
        s.input_mode,
        s.specialty,
        s.language_code,
        s.risk_level,
        s.last_message_at,
        s.created_at AS session_created_at,

        u.id AS patient_user_id,
        u.uuid AS patient_uuid,
        u.email AS patient_email,
        ucp.full_name AS patient_full_name,
        ucp.phone AS patient_phone,
        ucp.gender AS patient_gender,
        ucp.profile_picture_url AS patient_profile_picture_url,

        r.uuid AS result_uuid,
        r.result_type,
        r.severity,
        r.recommended_next_step,
        r.confidence_level,
        r.needs_doctor_review,
        r.created_at AS result_created_at,

        a.id AS appointment_id,
        a.uuid AS appointment_uuid,
        a.status AS appointment_status,
        a.scheduled_date,
        a.appointment_type,

        (
          SELECT COUNT(*)
          FROM ai_session_messages m
          WHERE m.ai_session_id = s.id
        ) AS messages_count,

        (
          SELECT COUNT(*)
          FROM ai_session_files sf
          WHERE sf.ai_session_id = s.id
        ) AS files_count,

        (
          SELECT COUNT(*)
          FROM ai_analysis_results ar
          WHERE ar.ai_session_id = s.id
        ) AS results_count

      FROM ai_result_shares sh
      INNER JOIN ai_sessions s
        ON s.id = sh.ai_session_id
      INNER JOIN users u
        ON u.id = sh.user_id
      LEFT JOIN user_complete_profiles ucp
        ON ucp.id = u.id
      LEFT JOIN ai_analysis_results r
        ON r.id = sh.ai_result_id
      LEFT JOIN appointments a
        ON a.id = sh.appointment_id
      WHERE sh.doctor_id = ?
        AND sh.share_status = 'active'
        AND s.status != 'deleted'
      ORDER BY sh.shared_at DESC, sh.id DESC
      `,
      [doctorId]
    );

    return {
      shares: shares.map((share) => ({
        share: {
          id: share.share_id,
          uuid: share.share_uuid,
          share_status: share.share_status,
          shared_at: share.shared_at,
          revoked_at: share.revoked_at
        },
        session: {
          id: share.ai_session_id,
          uuid: share.ai_session_uuid,
          title: share.title,
          status: share.session_status,
          input_mode: share.input_mode,
          specialty: share.specialty,
          language_code: share.language_code,
          risk_level: share.risk_level,
          last_message_at: share.last_message_at,
          created_at: share.session_created_at
        },
        patient: {
          id: share.patient_user_id,
          uuid: share.patient_uuid,
          email: share.patient_email,
          full_name: share.patient_full_name,
          phone: share.patient_phone,
          gender: share.patient_gender,
          profile_picture_url: share.patient_profile_picture_url
        },
        result: {
          uuid: share.result_uuid,
          result_type: share.result_type,
          severity: share.severity,
          recommended_next_step: share.recommended_next_step,
          confidence_level: share.confidence_level,
          needs_doctor_review: Boolean(share.needs_doctor_review),
          created_at: share.result_created_at
        },
        appointment: share.appointment_id
          ? {
              id: share.appointment_id,
              uuid: share.appointment_uuid,
              status: share.appointment_status,
              scheduled_date: share.scheduled_date,
              appointment_type: share.appointment_type
            }
          : null,
        stats: {
          messages_count: share.messages_count,
          files_count: share.files_count,
          results_count: share.results_count
        }
      }))
    };
  }

  static async getDoctorSharedSessionByShareUuid(doctorId, shareUuid) {
    const [shares] = await db.execute(
      `
      SELECT
        sh.*,

        s.uuid AS ai_session_uuid,
        s.title,
        s.status AS session_status,
        s.input_mode,
        s.specialty,
        s.language_code,
        s.patient_consent,
        s.risk_level,
        s.summary_json,
        s.last_message_at,
        s.created_at AS session_created_at,
        s.updated_at AS session_updated_at,

        u.uuid AS patient_uuid,
        u.email AS patient_email,
        ucp.full_name AS patient_full_name,
        ucp.phone AS patient_phone,
        ucp.gender AS patient_gender,
        ucp.date_of_birth AS patient_date_of_birth,
        ucp.profile_picture_url AS patient_profile_picture_url,

        a.uuid AS appointment_uuid,
        a.status AS appointment_status,
        a.scheduled_date,
        a.appointment_type

      FROM ai_result_shares sh
      INNER JOIN ai_sessions s
        ON s.id = sh.ai_session_id
      INNER JOIN users u
        ON u.id = sh.user_id
      LEFT JOIN user_complete_profiles ucp
        ON ucp.id = u.id
      LEFT JOIN appointments a
        ON a.id = sh.appointment_id
      WHERE sh.uuid = ?
        AND sh.doctor_id = ?
        AND sh.share_status = 'active'
        AND s.status != 'deleted'
      LIMIT 1
      `,
      [shareUuid, doctorId]
    );

    if (shares.length === 0) {
      const error = new Error('Shared AI session not found');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'جلسة الذكاء الاصطناعي المشتركة غير موجودة أو غير مصرح لك بالوصول إليها',
        message_en: 'Shared AI session not found or you are not allowed to access it'
      };
      throw error;
    }

    const share = shares[0];

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
      [share.ai_session_id]
    );

    const [files] = await db.execute(
      `
      SELECT
        asf.id AS ai_session_file_id,
        asf.file_role,
        asf.analysis_status,
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
      [share.ai_session_id]
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
      [share.ai_session_id]
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

      file_url: file.file_url,
      secure_file_url: this.buildDoctorSecureFileUrl(file.uuid),
      secure_file_path: this.buildDoctorSecureFilePath(file.uuid),

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
    formattedFiles.forEach((file) => fileById.set(file.file_id, file));

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

    const sharedResult = formattedResults.find((result) => (
      Number(result.id) === Number(share.ai_result_id)
    )) || null;

    return {
      share: {
        id: share.id,
        uuid: share.uuid,
        share_status: share.share_status,
        shared_at: share.shared_at,
        revoked_at: share.revoked_at
      },
      session: {
        id: share.ai_session_id,
        uuid: share.ai_session_uuid,
        title: share.title,
        status: share.session_status,
        input_mode: share.input_mode,
        specialty: share.specialty,
        language_code: share.language_code,
        patient_consent: Boolean(share.patient_consent),
        risk_level: share.risk_level,
        summary_json: this.parseJsonField(share.summary_json),
        last_message_at: share.last_message_at,
        created_at: share.session_created_at,
        updated_at: share.session_updated_at
      },
      patient: {
        id: share.user_id,
        uuid: share.patient_uuid,
        email: share.patient_email,
        full_name: share.patient_full_name,
        phone: share.patient_phone,
        gender: share.patient_gender,
        date_of_birth: share.patient_date_of_birth,
        profile_picture_url: share.patient_profile_picture_url
      },
      appointment: share.appointment_id
        ? {
            id: share.appointment_id,
            uuid: share.appointment_uuid,
            status: share.appointment_status,
            scheduled_date: share.scheduled_date,
            appointment_type: share.appointment_type
          }
        : null,
      messages: formattedMessages,
      files: formattedFiles,
      results: formattedResults,

      // The exact AI result selected when the patient shared this session.
      // Doctor dashboard should prefer this over latest_result.
      shared_result: sharedResult,

      // Kept for backward compatibility and chronological display.
      latest_result: formattedResults.length > 0 ? formattedResults[0] : null,

      stats: {
        messages_count: formattedMessages.length,
        files_count: formattedFiles.length,
        results_count: formattedResults.length
      }
    };
  }

  static async getSecureSharedAIFileForDoctor(doctorId, fileUuid) {
    const [files] = await db.execute(
      `
      SELECT
        f.*,
        asf.ai_session_id,
        asf.file_role,
        asf.analysis_status,
        sh.uuid AS share_uuid,
        sh.doctor_id
      FROM files f
      INNER JOIN ai_session_files asf
        ON asf.file_id = f.id
      INNER JOIN ai_result_shares sh
        ON sh.ai_session_id = asf.ai_session_id
      INNER JOIN ai_sessions s
        ON s.id = asf.ai_session_id
      WHERE f.uuid = ?
        AND sh.doctor_id = ?
        AND sh.share_status = 'active'
        AND f.is_deleted = 0
        AND s.status != 'deleted'
      LIMIT 1
      `,
      [fileUuid, doctorId]
    );

    if (files.length === 0) {
      return null;
    }

    const file = files[0];

    const allowedCategories = ['medical_image', 'document', 'other'];

    if (!allowedCategories.includes(file.file_category)) {
      const error = new Error('File category is not allowed for doctor AI secure access');
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

  static async reviewSharedAIResult(doctorId, resultUuid, payload = {}) {
    const allowedAgreements = ['agree', 'partially_agree', 'disagree'];

    const doctorAgreement = String(payload.doctor_agreement || '').trim();
    const doctorNotes = String(payload.doctor_notes || '').trim();

    if (!allowedAgreements.includes(doctorAgreement)) {
      const error = new Error('Invalid doctor_agreement');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'قيمة doctor_agreement غير صحيحة. القيم المسموحة: agree, partially_agree, disagree',
        message_en: 'Invalid doctor_agreement. Allowed values: agree, partially_agree, disagree'
      };
      throw error;
    }

    if (doctorNotes.length > 5000) {
      const error = new Error('Doctor notes are too long');
      error.statusCode = 400;
      error.response = {
        success: false,
        message_ar: 'ملاحظات الطبيب طويلة جدًا. الحد الأقصى 5000 حرف',
        message_en: 'Doctor notes are too long. Maximum is 5000 characters'
      };
      throw error;
    }

    const [rows] = await db.execute(
      `
      SELECT
        r.id AS result_id,
        r.uuid AS result_uuid,
        r.ai_session_id,
        r.user_id,
        r.result_type,
        r.case_summary,
        r.severity,
        r.recommended_next_step,
        r.confidence_level,
        r.needs_doctor_review,
        r.doctor_reviewed,
        r.doctor_agreement,
        r.reviewed_by_doctor_id,
        r.doctor_notes,
        r.reviewed_at,

        s.uuid AS ai_session_uuid,
        s.status AS session_status,
        s.risk_level AS session_risk_level,

        sh.id AS share_id,
        sh.uuid AS share_uuid,
        sh.share_status,
        sh.shared_at,

        u.uuid AS patient_uuid,
        u.email AS patient_email

      FROM ai_analysis_results r
      INNER JOIN ai_sessions s
        ON s.id = r.ai_session_id
      INNER JOIN ai_result_shares sh
        ON sh.ai_session_id = s.id
      INNER JOIN users u
        ON u.id = r.user_id
      WHERE r.uuid = ?
        AND sh.doctor_id = ?
        AND sh.share_status = 'active'
        AND s.status != 'deleted'
      LIMIT 1
      `,
      [resultUuid, doctorId]
    );

    if (rows.length === 0) {
      const error = new Error('AI result not found or not shared with this doctor');
      error.statusCode = 404;
      error.response = {
        success: false,
        message_ar: 'نتيجة الذكاء الاصطناعي غير موجودة أو غير مشتركة مع هذا الطبيب',
        message_en: 'AI result not found or not shared with this doctor'
      };
      throw error;
    }

    const target = rows[0];

    await db.execute(
      `
      UPDATE ai_analysis_results
      SET
        doctor_reviewed = 1,
        doctor_agreement = ?,
        reviewed_by_doctor_id = ?,
        doctor_notes = ?,
        reviewed_at = NOW()
      WHERE id = ?
      `,
      [
        doctorAgreement,
        doctorId,
        doctorNotes || null,
        target.result_id
      ]
    );

    const [updatedRows] = await db.execute(
      `
      SELECT
        id,
        uuid,
        result_type,
        case_summary,
        severity,
        recommended_next_step,
        confidence_level,
        needs_doctor_review,
        doctor_reviewed,
        doctor_agreement,
        reviewed_by_doctor_id,
        doctor_notes,
        reviewed_at,
        created_at
      FROM ai_analysis_results
      WHERE id = ?
      LIMIT 1
      `,
      [target.result_id]
    );

    const updatedResult = updatedRows[0];

    return {
      share: {
        id: target.share_id,
        uuid: target.share_uuid,
        share_status: target.share_status,
        shared_at: target.shared_at
      },
      session: {
        id: target.ai_session_id,
        uuid: target.ai_session_uuid,
        status: target.session_status,
        risk_level: target.session_risk_level
      },
      patient: {
        id: target.user_id,
        uuid: target.patient_uuid,
        email: target.patient_email
      },
      result: {
        id: updatedResult.id,
        uuid: updatedResult.uuid,
        result_type: updatedResult.result_type,
        case_summary: updatedResult.case_summary,
        severity: updatedResult.severity,
        recommended_next_step: updatedResult.recommended_next_step,
        confidence_level: updatedResult.confidence_level,
        needs_doctor_review: Boolean(updatedResult.needs_doctor_review),
        created_at: updatedResult.created_at
      },
      doctor_review: {
        doctor_reviewed: Boolean(updatedResult.doctor_reviewed),
        doctor_agreement: updatedResult.doctor_agreement,
        reviewed_by_doctor_id: updatedResult.reviewed_by_doctor_id,
        doctor_notes: updatedResult.doctor_notes,
        reviewed_at: updatedResult.reviewed_at
      }
    };
  }

}

module.exports = AIShareService;
















































// const db = require('../../config/db');
// const { v4: uuidv4 } = require('uuid');
// const fs = require('fs');
// const path = require('path');

// class AIShareService {
//   static normalizePositiveInteger(value) {
//     if (value === null || value === undefined || value === '') return null;

//     const numberValue = Number(value);

//     if (!Number.isInteger(numberValue) || numberValue <= 0) {
//       return null;
//     }

//     return numberValue;
//   }

//   static async getOwnedSession(userId, sessionUuid) {
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

//     return sessions.length > 0 ? sessions[0] : null;
//   }

//   static async getLatestShareableResult(aiSessionId, requestedResultUuid = null) {
//     if (requestedResultUuid) {
//       const [results] = await db.execute(
//         `
//         SELECT *
//         FROM ai_analysis_results
//         WHERE uuid = ?
//           AND ai_session_id = ?
//         LIMIT 1
//         `,
//         [requestedResultUuid, aiSessionId]
//       );

//       return results.length > 0 ? results[0] : null;
//     }

//     const [results] = await db.execute(
//       `
//       SELECT *
//       FROM ai_analysis_results
//       WHERE ai_session_id = ?
//       ORDER BY
//         CASE
//           WHEN result_type = 'final_summary' THEN 1
//           WHEN result_type = 'document_analysis' THEN 2
//           WHEN result_type = 'image_analysis' THEN 3
//           WHEN result_type = 'chat_response' THEN 4
//           ELSE 5
//         END,
//         created_at DESC,
//         id DESC
//       LIMIT 1
//       `,
//       [aiSessionId]
//     );

//     return results.length > 0 ? results[0] : null;
//   }

//   static async getDoctorById(doctorId) {
//     const [doctors] = await db.execute(
//       `
//       SELECT
//         d.id,
//         d.uuid,
//         d.email,
//         d.status,
//         d.is_active,
//         dp.id AS doctor_profile_id,
//         dp.approval_status,
//         dp.is_verified,
//         dp.is_available,
//         dpt.full_name,
//         dpt.specialty,
//         dpt.sub_specialty
//       FROM doctors d
//       LEFT JOIN doctor_profiles dp
//         ON dp.doctor_id = d.id
//       LEFT JOIN doctor_profile_translations dpt
//         ON dpt.doctor_profile_id = dp.id
//       WHERE d.id = ?
//       LIMIT 1
//       `,
//       [doctorId]
//     );

//     return doctors.length > 0 ? doctors[0] : null;
//   }

//   static async getAppointmentForUser(userId, appointmentId) {
//     const [appointments] = await db.execute(
//       `
//       SELECT
//         id,
//         uuid,
//         patient_id,
//         doctor_id,
//         status,
//         scheduled_date,
//         actual_start_time,
//         appointment_type
//       FROM appointments
//       WHERE id = ?
//         AND patient_id = ?
//       LIMIT 1
//       `,
//       [appointmentId, userId]
//     );

//     return appointments.length > 0 ? appointments[0] : null;
//   }

//   static async createShare(userId, sessionUuid, payload = {}) {
//     const doctorIdFromPayload = this.normalizePositiveInteger(payload.doctor_id);
//     const appointmentId = this.normalizePositiveInteger(payload.appointment_id);
//     const requestedResultUuid = payload.result_uuid || null;

//     if (!doctorIdFromPayload && !appointmentId) {
//       const error = new Error('doctor_id or appointment_id is required');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'يجب إرسال doctor_id أو appointment_id لمشاركة نتيجة الذكاء الاصطناعي',
//         message_en: 'doctor_id or appointment_id is required to share AI result'
//       };
//       throw error;
//     }

//     const session = await this.getOwnedSession(userId, sessionUuid);

//     if (!session) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
//         message_en: 'AI session not found'
//       };
//       throw error;
//     }

//     const result = await this.getLatestShareableResult(session.id, requestedResultUuid);

//     if (!result) {
//       const error = new Error('No AI result found to share');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'لا توجد نتيجة ذكاء اصطناعي قابلة للمشاركة داخل هذه الجلسة',
//         message_en: 'No shareable AI result found in this session'
//       };
//       throw error;
//     }

//     let appointment = null;
//     let doctorId = doctorIdFromPayload;

//     if (appointmentId) {
//       appointment = await this.getAppointmentForUser(userId, appointmentId);

//       if (!appointment) {
//         const error = new Error('Appointment not found');
//         error.statusCode = 404;
//         error.response = {
//           success: false,
//           message_ar: 'الموعد غير موجود أو لا يخص هذا المستخدم',
//           message_en: 'Appointment not found or does not belong to this user'
//         };
//         throw error;
//       }

//       doctorId = appointment.doctor_id;
//     }

//     const doctor = await this.getDoctorById(doctorId);

//     if (!doctor) {
//       const error = new Error('Doctor not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'الطبيب غير موجود',
//         message_en: 'Doctor not found'
//       };
//       throw error;
//     }

//     if (Number(doctor.is_active) !== 1) {
//       const error = new Error('Doctor is not active');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'لا يمكن مشاركة نتيجة الذكاء الاصطناعي مع طبيب غير نشط',
//         message_en: 'Cannot share AI result with an inactive doctor'
//       };
//       throw error;
//     }

//     const [existingShares] = await db.execute(
//       `
//       SELECT *
//       FROM ai_result_shares
//       WHERE ai_session_id = ?
//         AND user_id = ?
//         AND doctor_id = ?
//         AND (
//           (? IS NULL AND appointment_id IS NULL)
//           OR appointment_id = ?
//         )
//         AND share_status = 'active'
//       LIMIT 1
//       `,
//       [
//         session.id,
//         userId,
//         doctorId,
//         appointmentId,
//         appointmentId
//       ]
//     );

//     if (existingShares.length > 0) {
//       const existingShare = existingShares[0];

//       return {
//         already_shared: true,
//         share: {
//           id: existingShare.id,
//           uuid: existingShare.uuid,
//           share_status: existingShare.share_status,
//           shared_at: existingShare.shared_at,
//           revoked_at: existingShare.revoked_at
//         },
//         session: {
//           id: session.id,
//           uuid: session.uuid,
//           status: session.status,
//           risk_level: session.risk_level
//         },
//         result: {
//           id: result.id,
//           uuid: result.uuid,
//           result_type: result.result_type,
//           severity: result.severity,
//           recommended_next_step: result.recommended_next_step
//         },
//         doctor: {
//           id: doctor.id,
//           uuid: doctor.uuid,
//           email: doctor.email,
//           full_name: doctor.full_name,
//           specialty: doctor.specialty,
//           sub_specialty: doctor.sub_specialty
//         },
//         appointment: appointment
//           ? {
//               id: appointment.id,
//               uuid: appointment.uuid,
//               status: appointment.status,
//               scheduled_date: appointment.scheduled_date,
//               appointment_type: appointment.appointment_type
//             }
//           : null
//       };
//     }

//     const shareUuid = uuidv4();

//     const [insertResult] = await db.execute(
//       `
//       INSERT INTO ai_result_shares (
//         uuid,
//         ai_session_id,
//         ai_result_id,
//         user_id,
//         doctor_id,
//         appointment_id,
//         share_status
//       )
//       VALUES (?, ?, ?, ?, ?, ?, 'active')
//       `,
//       [
//         shareUuid,
//         session.id,
//         result.id,
//         userId,
//         doctorId,
//         appointmentId
//       ]
//     );

//     return {
//       already_shared: false,
//       share: {
//         id: insertResult.insertId,
//         uuid: shareUuid,
//         share_status: 'active'
//       },
//       session: {
//         id: session.id,
//         uuid: session.uuid,
//         status: session.status,
//         risk_level: session.risk_level
//       },
//       result: {
//         id: result.id,
//         uuid: result.uuid,
//         result_type: result.result_type,
//         severity: result.severity,
//         recommended_next_step: result.recommended_next_step
//       },
//       doctor: {
//         id: doctor.id,
//         uuid: doctor.uuid,
//         email: doctor.email,
//         full_name: doctor.full_name,
//         specialty: doctor.specialty,
//         sub_specialty: doctor.sub_specialty
//       },
//       appointment: appointment
//         ? {
//             id: appointment.id,
//             uuid: appointment.uuid,
//             status: appointment.status,
//             scheduled_date: appointment.scheduled_date,
//             appointment_type: appointment.appointment_type
//           }
//         : null
//     };
//   }

//   static async getSessionShares(userId, sessionUuid) {
//     const session = await this.getOwnedSession(userId, sessionUuid);

//     if (!session) {
//       const error = new Error('AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي غير موجودة',
//         message_en: 'AI session not found'
//       };
//       throw error;
//     }

//     const [shares] = await db.execute(
//       `
//       SELECT
//         s.id,
//         s.uuid,
//         s.share_status,
//         s.shared_at,
//         s.revoked_at,

//         r.uuid AS result_uuid,
//         r.result_type,
//         r.severity,
//         r.recommended_next_step,
//         r.confidence_level,

//         d.id AS doctor_id,
//         d.uuid AS doctor_uuid,
//         d.email AS doctor_email,

//         dp.approval_status,
//         dp.is_verified,
//         dp.is_available,

//         dpt.full_name AS doctor_full_name,
//         dpt.specialty,
//         dpt.sub_specialty,

//         a.id AS appointment_id,
//         a.uuid AS appointment_uuid,
//         a.status AS appointment_status,
//         a.scheduled_date,
//         a.appointment_type
//       FROM ai_result_shares s
//       LEFT JOIN ai_analysis_results r
//         ON r.id = s.ai_result_id
//       LEFT JOIN doctors d
//         ON d.id = s.doctor_id
//       LEFT JOIN doctor_profiles dp
//         ON dp.doctor_id = d.id
//       LEFT JOIN doctor_profile_translations dpt
//         ON dpt.doctor_profile_id = dp.id
//       LEFT JOIN appointments a
//         ON a.id = s.appointment_id
//       WHERE s.ai_session_id = ?
//         AND s.user_id = ?
//       ORDER BY s.shared_at DESC, s.id DESC
//       `,
//       [session.id, userId]
//     );

//     return {
//       session: {
//         id: session.id,
//         uuid: session.uuid,
//         status: session.status,
//         risk_level: session.risk_level
//       },
//       shares: shares.map((share) => ({
//         id: share.id,
//         uuid: share.uuid,
//         share_status: share.share_status,
//         shared_at: share.shared_at,
//         revoked_at: share.revoked_at,
//         result: {
//           uuid: share.result_uuid,
//           result_type: share.result_type,
//           severity: share.severity,
//           recommended_next_step: share.recommended_next_step,
//           confidence_level: share.confidence_level
//         },
//         doctor: share.doctor_id
//           ? {
//               id: share.doctor_id,
//               uuid: share.doctor_uuid,
//               email: share.doctor_email,
//               full_name: share.doctor_full_name,
//               specialty: share.specialty,
//               sub_specialty: share.sub_specialty,
//               approval_status: share.approval_status,
//               is_verified: share.is_verified,
//               is_available: share.is_available
//             }
//           : null,
//         appointment: share.appointment_id
//           ? {
//               id: share.appointment_id,
//               uuid: share.appointment_uuid,
//               status: share.appointment_status,
//               scheduled_date: share.scheduled_date,
//               appointment_type: share.appointment_type
//             }
//           : null
//       }))
//     };
//   }

//   static async revokeShare(userId, shareUuid) {
//     const [shares] = await db.execute(
//       `
//       SELECT s.*
//       FROM ai_result_shares s
//       INNER JOIN ai_sessions ai
//         ON ai.id = s.ai_session_id
//       WHERE s.uuid = ?
//         AND s.user_id = ?
//         AND ai.user_id = ?
//       LIMIT 1
//       `,
//       [shareUuid, userId, userId]
//     );

//     if (shares.length === 0) {
//       const error = new Error('AI share not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'المشاركة غير موجودة',
//         message_en: 'AI share not found'
//       };
//       throw error;
//     }

//     const share = shares[0];

//     if (share.share_status === 'revoked') {
//       return {
//         uuid: share.uuid,
//         share_status: 'revoked',
//         already_revoked: true,
//         revoked_at: share.revoked_at
//       };
//     }

//     await db.execute(
//       `
//       UPDATE ai_result_shares
//       SET
//         share_status = 'revoked',
//         revoked_at = NOW()
//       WHERE id = ?
//       `,
//       [share.id]
//     );

//     return {
//       uuid: share.uuid,
//       share_status: 'revoked',
//       already_revoked: false
//     };
//   }

//   static parseJsonField(value) {
//     if (value === null || value === undefined) return null;

//     if (typeof value === 'object') {
//       return value;
//     }

//     try {
//       return JSON.parse(value);
//     } catch (error) {
//       return value;
//     }
//   }

//   static buildDoctorSecureFileUrl(fileUuid) {
//     if (!fileUuid) return null;
//     return `/api/ai-dermatology/doctor/files/${fileUuid}`;
//   }

//   static async getDoctorSharedSessions(doctorId) {
//     const [shares] = await db.execute(
//       `
//       SELECT
//         sh.id AS share_id,
//         sh.uuid AS share_uuid,
//         sh.share_status,
//         sh.shared_at,
//         sh.revoked_at,

//         s.id AS ai_session_id,
//         s.uuid AS ai_session_uuid,
//         s.title,
//         s.status AS session_status,
//         s.input_mode,
//         s.specialty,
//         s.language_code,
//         s.risk_level,
//         s.last_message_at,
//         s.created_at AS session_created_at,

//         u.id AS patient_user_id,
//         u.uuid AS patient_uuid,
//         u.email AS patient_email,
//         ucp.full_name AS patient_full_name,
//         ucp.phone AS patient_phone,
//         ucp.gender AS patient_gender,
//         ucp.profile_picture_url AS patient_profile_picture_url,

//         r.uuid AS result_uuid,
//         r.result_type,
//         r.severity,
//         r.recommended_next_step,
//         r.confidence_level,
//         r.needs_doctor_review,
//         r.created_at AS result_created_at,

//         a.id AS appointment_id,
//         a.uuid AS appointment_uuid,
//         a.status AS appointment_status,
//         a.scheduled_date,
//         a.appointment_type,

//         (
//           SELECT COUNT(*)
//           FROM ai_session_messages m
//           WHERE m.ai_session_id = s.id
//         ) AS messages_count,

//         (
//           SELECT COUNT(*)
//           FROM ai_session_files sf
//           WHERE sf.ai_session_id = s.id
//         ) AS files_count,

//         (
//           SELECT COUNT(*)
//           FROM ai_analysis_results ar
//           WHERE ar.ai_session_id = s.id
//         ) AS results_count

//       FROM ai_result_shares sh
//       INNER JOIN ai_sessions s
//         ON s.id = sh.ai_session_id
//       INNER JOIN users u
//         ON u.id = sh.user_id
//       LEFT JOIN user_complete_profiles ucp
//         ON ucp.id = u.id
//       LEFT JOIN ai_analysis_results r
//         ON r.id = sh.ai_result_id
//       LEFT JOIN appointments a
//         ON a.id = sh.appointment_id
//       WHERE sh.doctor_id = ?
//         AND sh.share_status = 'active'
//         AND s.status != 'deleted'
//       ORDER BY sh.shared_at DESC, sh.id DESC
//       `,
//       [doctorId]
//     );

//     return {
//       shares: shares.map((share) => ({
//         share: {
//           id: share.share_id,
//           uuid: share.share_uuid,
//           share_status: share.share_status,
//           shared_at: share.shared_at,
//           revoked_at: share.revoked_at
//         },
//         session: {
//           id: share.ai_session_id,
//           uuid: share.ai_session_uuid,
//           title: share.title,
//           status: share.session_status,
//           input_mode: share.input_mode,
//           specialty: share.specialty,
//           language_code: share.language_code,
//           risk_level: share.risk_level,
//           last_message_at: share.last_message_at,
//           created_at: share.session_created_at
//         },
//         patient: {
//           id: share.patient_user_id,
//           uuid: share.patient_uuid,
//           email: share.patient_email,
//           full_name: share.patient_full_name,
//           phone: share.patient_phone,
//           gender: share.patient_gender,
//           profile_picture_url: share.patient_profile_picture_url
//         },
//         result: {
//           uuid: share.result_uuid,
//           result_type: share.result_type,
//           severity: share.severity,
//           recommended_next_step: share.recommended_next_step,
//           confidence_level: share.confidence_level,
//           needs_doctor_review: Boolean(share.needs_doctor_review),
//           created_at: share.result_created_at
//         },
//         appointment: share.appointment_id
//           ? {
//               id: share.appointment_id,
//               uuid: share.appointment_uuid,
//               status: share.appointment_status,
//               scheduled_date: share.scheduled_date,
//               appointment_type: share.appointment_type
//             }
//           : null,
//         stats: {
//           messages_count: share.messages_count,
//           files_count: share.files_count,
//           results_count: share.results_count
//         }
//       }))
//     };
//   }

//   static async getDoctorSharedSessionByShareUuid(doctorId, shareUuid) {
//     const [shares] = await db.execute(
//       `
//       SELECT
//         sh.*,

//         s.uuid AS ai_session_uuid,
//         s.title,
//         s.status AS session_status,
//         s.input_mode,
//         s.specialty,
//         s.language_code,
//         s.patient_consent,
//         s.risk_level,
//         s.summary_json,
//         s.last_message_at,
//         s.created_at AS session_created_at,
//         s.updated_at AS session_updated_at,

//         u.uuid AS patient_uuid,
//         u.email AS patient_email,
//         ucp.full_name AS patient_full_name,
//         ucp.phone AS patient_phone,
//         ucp.gender AS patient_gender,
//         ucp.date_of_birth AS patient_date_of_birth,
//         ucp.profile_picture_url AS patient_profile_picture_url,

//         a.uuid AS appointment_uuid,
//         a.status AS appointment_status,
//         a.scheduled_date,
//         a.appointment_type

//       FROM ai_result_shares sh
//       INNER JOIN ai_sessions s
//         ON s.id = sh.ai_session_id
//       INNER JOIN users u
//         ON u.id = sh.user_id
//       LEFT JOIN user_complete_profiles ucp
//         ON ucp.id = u.id
//       LEFT JOIN appointments a
//         ON a.id = sh.appointment_id
//       WHERE sh.uuid = ?
//         AND sh.doctor_id = ?
//         AND sh.share_status = 'active'
//         AND s.status != 'deleted'
//       LIMIT 1
//       `,
//       [shareUuid, doctorId]
//     );

//     if (shares.length === 0) {
//       const error = new Error('Shared AI session not found');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'جلسة الذكاء الاصطناعي المشتركة غير موجودة أو غير مصرح لك بالوصول إليها',
//         message_en: 'Shared AI session not found or you are not allowed to access it'
//       };
//       throw error;
//     }

//     const share = shares[0];

//     const [messages] = await db.execute(
//       `
//       SELECT
//         m.id,
//         m.uuid,
//         m.sender_type,
//         m.message_type,
//         m.content,
//         m.structured_content,
//         m.file_id,
//         m.prompt_tokens,
//         m.completion_tokens,
//         m.total_tokens,
//         m.created_at,

//         f.uuid AS file_uuid,
//         f.original_filename,
//         f.file_category,
//         f.mime_type,
//         f.file_size,
//         f.file_url,
//         f.is_public
//       FROM ai_session_messages m
//       LEFT JOIN files f
//         ON f.id = m.file_id
//         AND f.is_deleted = 0
//       WHERE m.ai_session_id = ?
//       ORDER BY m.created_at ASC, m.id ASC
//       `,
//       [share.ai_session_id]
//     );

//     const [files] = await db.execute(
//       `
//       SELECT
//         asf.id AS ai_session_file_id,
//         asf.file_role,
//         asf.analysis_status,
//         asf.metadata AS ai_file_metadata,
//         asf.created_at,
//         asf.updated_at,

//         f.id AS file_id,
//         f.uuid,
//         f.file_category,
//         f.original_filename,
//         f.stored_filename,
//         f.file_path,
//         f.file_url,
//         f.mime_type,
//         f.file_size,
//         f.file_extension,
//         f.is_public,
//         f.metadata AS file_metadata,
//         f.access_count,
//         f.last_accessed_at
//       FROM ai_session_files asf
//       INNER JOIN files f
//         ON f.id = asf.file_id
//       WHERE asf.ai_session_id = ?
//         AND f.is_deleted = 0
//       ORDER BY asf.created_at ASC, asf.id ASC
//       `,
//       [share.ai_session_id]
//     );

//     const [results] = await db.execute(
//       `
//       SELECT
//         id,
//         uuid,
//         result_type,
//         language_code,
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
//         processing_time_ms,
//         doctor_reviewed,
//         doctor_agreement,
//         reviewed_by_doctor_id,
//         doctor_notes,
//         reviewed_at,
//         created_at
//       FROM ai_analysis_results
//       WHERE ai_session_id = ?
//       ORDER BY created_at DESC, id DESC
//       `,
//       [share.ai_session_id]
//     );

//     const formattedFiles = files.map((file) => ({
//       ai_session_file_id: file.ai_session_file_id,
//       file_id: file.file_id,
//       uuid: file.uuid,
//       file_role: file.file_role,
//       analysis_status: file.analysis_status,
//       file_category: file.file_category,
//       original_filename: file.original_filename,
//       stored_filename: file.stored_filename,
//       mime_type: file.mime_type,
//       file_size: file.file_size,
//       file_extension: file.file_extension,
//       is_public: file.is_public,

//       file_url: file.file_url,
//       secure_file_url: this.buildDoctorSecureFileUrl(file.uuid),

//       metadata: {
//         ai_file_metadata: this.parseJsonField(file.ai_file_metadata),
//         file_metadata: this.parseJsonField(file.file_metadata)
//       },

//       access: {
//         access_count: file.access_count,
//         last_accessed_at: file.last_accessed_at
//       },

//       created_at: file.created_at,
//       updated_at: file.updated_at
//     }));

//     const fileById = new Map();
//     formattedFiles.forEach((file) => fileById.set(file.file_id, file));

//     const formattedMessages = messages.map((message) => {
//       const attachedFile = message.file_id ? fileById.get(message.file_id) : null;

//       return {
//         id: message.id,
//         uuid: message.uuid,
//         sender_type: message.sender_type,
//         message_type: message.message_type,
//         content: message.content,
//         structured_content: this.parseJsonField(message.structured_content),
//         file_id: message.file_id,

//         file: attachedFile
//           ? {
//               file_id: attachedFile.file_id,
//               uuid: attachedFile.uuid,
//               file_role: attachedFile.file_role,
//               file_category: attachedFile.file_category,
//               original_filename: attachedFile.original_filename,
//               mime_type: attachedFile.mime_type,
//               file_size: attachedFile.file_size,
//               secure_file_url: attachedFile.secure_file_url
//             }
//           : null,

//         tokens: {
//           prompt_tokens: message.prompt_tokens,
//           completion_tokens: message.completion_tokens,
//           total_tokens: message.total_tokens
//         },

//         created_at: message.created_at
//       };
//     });

//     const formattedResults = results.map((result) => ({
//       id: result.id,
//       uuid: result.uuid,
//       result_type: result.result_type,
//       language_code: result.language_code,
//       case_summary: result.case_summary,
//       possible_conditions: this.parseJsonField(result.possible_conditions),
//       severity: result.severity,
//       red_flags: this.parseJsonField(result.red_flags),
//       safe_advice: this.parseJsonField(result.safe_advice),
//       avoid: this.parseJsonField(result.avoid),
//       recommended_next_step: result.recommended_next_step,
//       confidence_level: result.confidence_level,
//       needs_doctor_review: Boolean(result.needs_doctor_review),
//       ai_response_json: this.parseJsonField(result.ai_response_json),
//       processing_time_ms: result.processing_time_ms,

//       doctor_review: {
//         doctor_reviewed: Boolean(result.doctor_reviewed),
//         doctor_agreement: result.doctor_agreement,
//         reviewed_by_doctor_id: result.reviewed_by_doctor_id,
//         doctor_notes: result.doctor_notes,
//         reviewed_at: result.reviewed_at
//       },

//       created_at: result.created_at
//     }));

//     return {
//       share: {
//         id: share.id,
//         uuid: share.uuid,
//         share_status: share.share_status,
//         shared_at: share.shared_at,
//         revoked_at: share.revoked_at
//       },
//       session: {
//         id: share.ai_session_id,
//         uuid: share.ai_session_uuid,
//         title: share.title,
//         status: share.session_status,
//         input_mode: share.input_mode,
//         specialty: share.specialty,
//         language_code: share.language_code,
//         patient_consent: Boolean(share.patient_consent),
//         risk_level: share.risk_level,
//         summary_json: this.parseJsonField(share.summary_json),
//         last_message_at: share.last_message_at,
//         created_at: share.session_created_at,
//         updated_at: share.session_updated_at
//       },
//       patient: {
//         id: share.user_id,
//         uuid: share.patient_uuid,
//         email: share.patient_email,
//         full_name: share.patient_full_name,
//         phone: share.patient_phone,
//         gender: share.patient_gender,
//         date_of_birth: share.patient_date_of_birth,
//         profile_picture_url: share.patient_profile_picture_url
//       },
//       appointment: share.appointment_id
//         ? {
//             id: share.appointment_id,
//             uuid: share.appointment_uuid,
//             status: share.appointment_status,
//             scheduled_date: share.scheduled_date,
//             appointment_type: share.appointment_type
//           }
//         : null,
//       messages: formattedMessages,
//       files: formattedFiles,
//       results: formattedResults,
//       latest_result: formattedResults.length > 0 ? formattedResults[0] : null,
//       stats: {
//         messages_count: formattedMessages.length,
//         files_count: formattedFiles.length,
//         results_count: formattedResults.length
//       }
//     };
//   }

//   static async getSecureSharedAIFileForDoctor(doctorId, fileUuid) {
//     const [files] = await db.execute(
//       `
//       SELECT
//         f.*,
//         asf.ai_session_id,
//         asf.file_role,
//         asf.analysis_status,
//         sh.uuid AS share_uuid,
//         sh.doctor_id
//       FROM files f
//       INNER JOIN ai_session_files asf
//         ON asf.file_id = f.id
//       INNER JOIN ai_result_shares sh
//         ON sh.ai_session_id = asf.ai_session_id
//       INNER JOIN ai_sessions s
//         ON s.id = asf.ai_session_id
//       WHERE f.uuid = ?
//         AND sh.doctor_id = ?
//         AND sh.share_status = 'active'
//         AND f.is_deleted = 0
//         AND s.status != 'deleted'
//       LIMIT 1
//       `,
//       [fileUuid, doctorId]
//     );

//     if (files.length === 0) {
//       return null;
//     }

//     const file = files[0];

//     const allowedCategories = ['medical_image', 'document', 'other'];

//     if (!allowedCategories.includes(file.file_category)) {
//       const error = new Error('File category is not allowed for doctor AI secure access');
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

//   static async reviewSharedAIResult(doctorId, resultUuid, payload = {}) {
//     const allowedAgreements = ['agree', 'partially_agree', 'disagree'];

//     const doctorAgreement = String(payload.doctor_agreement || '').trim();
//     const doctorNotes = String(payload.doctor_notes || '').trim();

//     if (!allowedAgreements.includes(doctorAgreement)) {
//       const error = new Error('Invalid doctor_agreement');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'قيمة doctor_agreement غير صحيحة. القيم المسموحة: agree, partially_agree, disagree',
//         message_en: 'Invalid doctor_agreement. Allowed values: agree, partially_agree, disagree'
//       };
//       throw error;
//     }

//     if (doctorNotes.length > 5000) {
//       const error = new Error('Doctor notes are too long');
//       error.statusCode = 400;
//       error.response = {
//         success: false,
//         message_ar: 'ملاحظات الطبيب طويلة جدًا. الحد الأقصى 5000 حرف',
//         message_en: 'Doctor notes are too long. Maximum is 5000 characters'
//       };
//       throw error;
//     }

//     const [rows] = await db.execute(
//       `
//       SELECT
//         r.id AS result_id,
//         r.uuid AS result_uuid,
//         r.ai_session_id,
//         r.user_id,
//         r.result_type,
//         r.case_summary,
//         r.severity,
//         r.recommended_next_step,
//         r.confidence_level,
//         r.needs_doctor_review,
//         r.doctor_reviewed,
//         r.doctor_agreement,
//         r.reviewed_by_doctor_id,
//         r.doctor_notes,
//         r.reviewed_at,

//         s.uuid AS ai_session_uuid,
//         s.status AS session_status,
//         s.risk_level AS session_risk_level,

//         sh.id AS share_id,
//         sh.uuid AS share_uuid,
//         sh.share_status,
//         sh.shared_at,

//         u.uuid AS patient_uuid,
//         u.email AS patient_email

//       FROM ai_analysis_results r
//       INNER JOIN ai_sessions s
//         ON s.id = r.ai_session_id
//       INNER JOIN ai_result_shares sh
//         ON sh.ai_session_id = s.id
//       INNER JOIN users u
//         ON u.id = r.user_id
//       WHERE r.uuid = ?
//         AND sh.doctor_id = ?
//         AND sh.share_status = 'active'
//         AND s.status != 'deleted'
//       LIMIT 1
//       `,
//       [resultUuid, doctorId]
//     );

//     if (rows.length === 0) {
//       const error = new Error('AI result not found or not shared with this doctor');
//       error.statusCode = 404;
//       error.response = {
//         success: false,
//         message_ar: 'نتيجة الذكاء الاصطناعي غير موجودة أو غير مشتركة مع هذا الطبيب',
//         message_en: 'AI result not found or not shared with this doctor'
//       };
//       throw error;
//     }

//     const target = rows[0];

//     await db.execute(
//       `
//       UPDATE ai_analysis_results
//       SET
//         doctor_reviewed = 1,
//         doctor_agreement = ?,
//         reviewed_by_doctor_id = ?,
//         doctor_notes = ?,
//         reviewed_at = NOW()
//       WHERE id = ?
//       `,
//       [
//         doctorAgreement,
//         doctorId,
//         doctorNotes || null,
//         target.result_id
//       ]
//     );

//     const [updatedRows] = await db.execute(
//       `
//       SELECT
//         id,
//         uuid,
//         result_type,
//         case_summary,
//         severity,
//         recommended_next_step,
//         confidence_level,
//         needs_doctor_review,
//         doctor_reviewed,
//         doctor_agreement,
//         reviewed_by_doctor_id,
//         doctor_notes,
//         reviewed_at,
//         created_at
//       FROM ai_analysis_results
//       WHERE id = ?
//       LIMIT 1
//       `,
//       [target.result_id]
//     );

//     const updatedResult = updatedRows[0];

//     return {
//       share: {
//         id: target.share_id,
//         uuid: target.share_uuid,
//         share_status: target.share_status,
//         shared_at: target.shared_at
//       },
//       session: {
//         id: target.ai_session_id,
//         uuid: target.ai_session_uuid,
//         status: target.session_status,
//         risk_level: target.session_risk_level
//       },
//       patient: {
//         id: target.user_id,
//         uuid: target.patient_uuid,
//         email: target.patient_email
//       },
//       result: {
//         id: updatedResult.id,
//         uuid: updatedResult.uuid,
//         result_type: updatedResult.result_type,
//         case_summary: updatedResult.case_summary,
//         severity: updatedResult.severity,
//         recommended_next_step: updatedResult.recommended_next_step,
//         confidence_level: updatedResult.confidence_level,
//         needs_doctor_review: Boolean(updatedResult.needs_doctor_review),
//         created_at: updatedResult.created_at
//       },
//       doctor_review: {
//         doctor_reviewed: Boolean(updatedResult.doctor_reviewed),
//         doctor_agreement: updatedResult.doctor_agreement,
//         reviewed_by_doctor_id: updatedResult.reviewed_by_doctor_id,
//         doctor_notes: updatedResult.doctor_notes,
//         reviewed_at: updatedResult.reviewed_at
//       }
//     };
//   }

// }

// module.exports = AIShareService;
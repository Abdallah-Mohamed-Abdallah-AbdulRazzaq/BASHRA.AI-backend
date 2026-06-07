const db = require('../config/db');
const { validationResult } = require('express-validator');
const { getClientInfo } = require('../middleware/authMiddleware');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'admin-ai-usage.log' })
  ]
});

class AdminAIUsageController {
  static normalizeLanguage(langHeader, userPreference) {
    if (langHeader) {
      const lang = langHeader.toLowerCase().split(',')[0].split('-')[0].trim();
      if (lang === 'ar' || lang === 'en') {
        return lang;
      }
    }

    return userPreference || 'ar';
  }

  static parseBoolean(value) {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0) return false;
    return undefined;
  }

  static toNullablePositiveInt(value) {
    if (value === undefined || value === null || value === '') return null;

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      return null;
    }

    return numberValue;
  }

  static toNonNegativeInt(value, fallback = 0) {
    if (value === undefined || value === null || value === '') return fallback;

    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return fallback;
    }

    return numberValue;
  }

  static formatPolicy(policy) {
    return {
      id: policy.id,
      policy_name: policy.policy_name,
      scope_type: policy.scope_type,
      user_id: policy.user_id,
      package_id: policy.package_id,

      limits: {
        max_total_requests_per_month: policy.max_total_requests_per_month,
        max_chat_messages_per_month: policy.max_chat_messages_per_month,
        max_image_analyses_per_month: policy.max_image_analyses_per_month,
        max_document_analyses_per_month: policy.max_document_analyses_per_month,
        max_files_per_session: policy.max_files_per_session,
        max_tokens_per_request: policy.max_tokens_per_request
      },

      is_active: Boolean(policy.is_active),
      priority: policy.priority,

      created_by_admin_id: policy.created_by_admin_id,
      updated_by_admin_id: policy.updated_by_admin_id,
      created_at: policy.created_at,
      updated_at: policy.updated_at
    };
  }

  static validatePolicyScope(scopeType, userId, packageId) {
    if (scopeType === 'global') {
      return {
        valid: true,
        normalizedUserId: null,
        normalizedPackageId: null
      };
    }

    if (scopeType === 'user') {
      if (!userId) {
        return {
          valid: false,
          message: 'user_id is required when scope_type is user',
          message_ar: 'يجب إرسال user_id عندما يكون scope_type = user'
        };
      }

      return {
        valid: true,
        normalizedUserId: userId,
        normalizedPackageId: null
      };
    }

    if (scopeType === 'package') {
      if (!packageId) {
        return {
          valid: false,
          message: 'package_id is required when scope_type is package',
          message_ar: 'يجب إرسال package_id عندما يكون scope_type = package'
        };
      }

      return {
        valid: true,
        normalizedUserId: null,
        normalizedPackageId: packageId
      };
    }

    return {
      valid: false,
      message: 'Invalid scope_type',
      message_ar: 'نوع النطاق غير صحيح'
    };
  }

  static async insertAdminLog({
    adminId,
    action,
    targetId,
    description,
    oldValues = null,
    newValues = null,
    req,
    severity = 'medium'
  }) {
    try {
      const clientInfo = getClientInfo(req) || {};

      const ipAddress =
        clientInfo.ip_address ||
        req.ip ||
        req.socket?.remoteAddress ||
        req.connection?.remoteAddress ||
        null;

      const userAgent =
        clientInfo.user_agent ||
        req.headers?.['user-agent'] ||
        null;

      await db.execute(
        `
        INSERT INTO admin_logs (
          admin_id,
          action,
          target_type,
          target_id,
          description,
          old_values,
          new_values,
          ip_address,
          user_agent,
          severity,
          created_at
        )
        VALUES (?, ?, 'AIUsagePolicy', ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          adminId || null,
          action || null,
          targetId || null,
          description || null,
          oldValues ? JSON.stringify(oldValues) : null,
          newValues ? JSON.stringify(newValues) : null,
          ipAddress,
          userAgent,
          severity || 'medium'
        ]
      );
    } catch (error) {
      logger.warn('Failed to insert AI usage admin log', {
        error: error.message,
        action,
        targetId,
        adminId
      });
    }
  }

  static async getPolicies(req, res) {
    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const rawPage = Number(req.query.page);
      const rawLimit = Number(req.query.limit);

      const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
      const limit = Number.isInteger(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, 100)
        : 20;

      const offset = (page - 1) * limit;

      const scopeType = req.query.scope_type;
      const isActive = AdminAIUsageController.parseBoolean(req.query.is_active);

      const allowedScopeTypes = ['global', 'user', 'package'];

      const where = [];
      const params = [];

      if (scopeType) {
        if (!allowedScopeTypes.includes(scopeType)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid scope_type',
            message_ar: 'نوع النطاق غير صحيح'
          });
        }

        where.push('scope_type = ?');
        params.push(scopeType);
      }

      if (req.query.is_active !== undefined && isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Invalid is_active value',
          message_ar: 'قيمة is_active غير صحيحة'
        });
      }

      if (isActive !== undefined) {
        where.push('is_active = ?');
        params.push(isActive ? 1 : 0);
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

      const [countRows] = await db.execute(
        `
        SELECT COUNT(*) AS total
        FROM ai_usage_policies
        ${whereSql}
        `,
        params
      );

      const totalItems = Number(countRows[0]?.total || 0);
      const totalPages = Math.ceil(totalItems / limit);

      // Important:
      // LIMIT/OFFSET are interpolated only after strict numeric validation.
      // This avoids mysql2 "Incorrect arguments to mysqld_stmt_execute".
      const [policies] = await db.execute(
        `
        SELECT *
        FROM ai_usage_policies
        ${whereSql}
        ORDER BY is_active DESC, priority ASC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
        `,
        params
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم جلب سياسات استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage policies retrieved successfully',
        data: {
          policies: policies.map(AdminAIUsageController.formatPolicy),
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_items: totalItems,
            items_per_page: limit,
            has_next: page < totalPages,
            has_previous: page > 1
          }
        }
      });
    } catch (error) {
      logger.error('Get AI usage policies error', {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI usage policies',
        message_ar: 'فشل في جلب سياسات استخدام الذكاء الاصطناعي',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async getPolicyById(req, res) {
    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const policyId = parseInt(req.params.id);

      const [policies] = await db.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      if (policies.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'AI usage policy not found',
          message_ar: 'سياسة استخدام الذكاء الاصطناعي غير موجودة'
        });
      }

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم جلب سياسة استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage policy retrieved successfully',
        data: {
          policy: AdminAIUsageController.formatPolicy(policies[0])
        }
      });
    } catch (error) {
      logger.error('Get AI usage policy by ID error', {
        error: error.message,
        policy_id: req.params.id,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI usage policy',
        message_ar: 'فشل في جلب سياسة استخدام الذكاء الاصطناعي'
      });
    }
  }

  static async createPolicy(req, res) {
    const connection = await db.getConnection();

    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        connection.release();

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          message_ar: 'خطأ في التحقق من البيانات',
          errors: errors.array()
        });
      }

      const policyName = String(req.body.policy_name || '').trim();
      const scopeType = req.body.scope_type || 'global';
      const userId = AdminAIUsageController.toNullablePositiveInt(req.body.user_id);
      const packageId = AdminAIUsageController.toNullablePositiveInt(req.body.package_id);

      const scopeValidation = AdminAIUsageController.validatePolicyScope(
        scopeType,
        userId,
        packageId
      );

      if (!scopeValidation.valid) {
        connection.release();

        return res.status(400).json({
          success: false,
          message: scopeValidation.message,
          message_ar: scopeValidation.message_ar
        });
      }

      await connection.beginTransaction();

      const [insertResult] = await connection.execute(
        `
        INSERT INTO ai_usage_policies (
          policy_name,
          scope_type,
          user_id,
          package_id,
          max_total_requests_per_month,
          max_chat_messages_per_month,
          max_image_analyses_per_month,
          max_document_analyses_per_month,
          max_files_per_session,
          max_tokens_per_request,
          is_active,
          priority,
          created_by_admin_id,
          updated_by_admin_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          policyName,
          scopeType,
          scopeValidation.normalizedUserId,
          scopeValidation.normalizedPackageId,
          AdminAIUsageController.toNonNegativeInt(req.body.max_total_requests_per_month, 30),
          AdminAIUsageController.toNonNegativeInt(req.body.max_chat_messages_per_month, 30),
          AdminAIUsageController.toNonNegativeInt(req.body.max_image_analyses_per_month, 10),
          AdminAIUsageController.toNonNegativeInt(req.body.max_document_analyses_per_month, 5),
          Math.max(AdminAIUsageController.toNonNegativeInt(req.body.max_files_per_session, 5), 1),
          Math.max(AdminAIUsageController.toNonNegativeInt(req.body.max_tokens_per_request, 4000), 1),
          AdminAIUsageController.parseBoolean(req.body.is_active) === false ? 0 : 1,
          AdminAIUsageController.toNonNegativeInt(req.body.priority, 100),
          req.user.id,
          req.user.id
        ]
      );

      const policyId = insertResult.insertId;

      const [policies] = await connection.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      await connection.commit();

      await AdminAIUsageController.insertAdminLog({
        adminId: req.user.id,
        action: 'AI_USAGE_POLICY_CREATE',
        targetId: policyId,
        description: language === 'ar'
          ? `تم إنشاء سياسة استخدام ذكاء اصطناعي: ${policyName}`
          : `Created AI usage policy: ${policyName}`,
        newValues: policies[0],
        req,
        severity: 'medium'
      });

      return res.status(201).json({
        success: true,
        message: language === 'ar'
          ? 'تم إنشاء سياسة استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage policy created successfully',
        data: {
          policy: AdminAIUsageController.formatPolicy(policies[0])
        }
      });
    } catch (error) {
      await connection.rollback();

      logger.error('Create AI usage policy error', {
        error: error.message,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to create AI usage policy',
        message_ar: 'فشل في إنشاء سياسة استخدام الذكاء الاصطناعي'
      });
    } finally {
      connection.release();
    }
  }

  static async updatePolicy(req, res) {
    const connection = await db.getConnection();

    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        connection.release();

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          message_ar: 'خطأ في التحقق من البيانات',
          errors: errors.array()
        });
      }

      const policyId = parseInt(req.params.id);

      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      if (existingRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'AI usage policy not found',
          message_ar: 'سياسة استخدام الذكاء الاصطناعي غير موجودة'
        });
      }

      const existing = existingRows[0];

      const nextScopeType = req.body.scope_type || existing.scope_type;
      const nextUserId = req.body.user_id !== undefined
        ? AdminAIUsageController.toNullablePositiveInt(req.body.user_id)
        : existing.user_id;
      const nextPackageId = req.body.package_id !== undefined
        ? AdminAIUsageController.toNullablePositiveInt(req.body.package_id)
        : existing.package_id;

      const scopeValidation = AdminAIUsageController.validatePolicyScope(
        nextScopeType,
        nextUserId,
        nextPackageId
      );

      if (!scopeValidation.valid) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: scopeValidation.message,
          message_ar: scopeValidation.message_ar
        });
      }

      const nextValues = {
        policy_name: req.body.policy_name !== undefined
          ? String(req.body.policy_name || '').trim()
          : existing.policy_name,

        scope_type: nextScopeType,
        user_id: scopeValidation.normalizedUserId,
        package_id: scopeValidation.normalizedPackageId,

        max_total_requests_per_month: req.body.max_total_requests_per_month !== undefined
          ? AdminAIUsageController.toNonNegativeInt(req.body.max_total_requests_per_month, existing.max_total_requests_per_month)
          : existing.max_total_requests_per_month,

        max_chat_messages_per_month: req.body.max_chat_messages_per_month !== undefined
          ? AdminAIUsageController.toNonNegativeInt(req.body.max_chat_messages_per_month, existing.max_chat_messages_per_month)
          : existing.max_chat_messages_per_month,

        max_image_analyses_per_month: req.body.max_image_analyses_per_month !== undefined
          ? AdminAIUsageController.toNonNegativeInt(req.body.max_image_analyses_per_month, existing.max_image_analyses_per_month)
          : existing.max_image_analyses_per_month,

        max_document_analyses_per_month: req.body.max_document_analyses_per_month !== undefined
          ? AdminAIUsageController.toNonNegativeInt(req.body.max_document_analyses_per_month, existing.max_document_analyses_per_month)
          : existing.max_document_analyses_per_month,

        max_files_per_session: req.body.max_files_per_session !== undefined
          ? Math.max(AdminAIUsageController.toNonNegativeInt(req.body.max_files_per_session, existing.max_files_per_session), 1)
          : existing.max_files_per_session,

        max_tokens_per_request: req.body.max_tokens_per_request !== undefined
          ? Math.max(AdminAIUsageController.toNonNegativeInt(req.body.max_tokens_per_request, existing.max_tokens_per_request), 1)
          : existing.max_tokens_per_request,

        is_active: req.body.is_active !== undefined
          ? (AdminAIUsageController.parseBoolean(req.body.is_active) ? 1 : 0)
          : existing.is_active,

        priority: req.body.priority !== undefined
          ? AdminAIUsageController.toNonNegativeInt(req.body.priority, existing.priority)
          : existing.priority
      };

      await connection.execute(
        `
        UPDATE ai_usage_policies
        SET
          policy_name = ?,
          scope_type = ?,
          user_id = ?,
          package_id = ?,
          max_total_requests_per_month = ?,
          max_chat_messages_per_month = ?,
          max_image_analyses_per_month = ?,
          max_document_analyses_per_month = ?,
          max_files_per_session = ?,
          max_tokens_per_request = ?,
          is_active = ?,
          priority = ?,
          updated_by_admin_id = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [
          nextValues.policy_name,
          nextValues.scope_type,
          nextValues.user_id,
          nextValues.package_id,
          nextValues.max_total_requests_per_month,
          nextValues.max_chat_messages_per_month,
          nextValues.max_image_analyses_per_month,
          nextValues.max_document_analyses_per_month,
          nextValues.max_files_per_session,
          nextValues.max_tokens_per_request,
          nextValues.is_active,
          nextValues.priority,
          req.user.id,
          policyId
        ]
      );

      const [updatedRows] = await connection.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      await connection.commit();

      await AdminAIUsageController.insertAdminLog({
        adminId: req.user.id,
        action: 'AI_USAGE_POLICY_UPDATE',
        targetId: policyId,
        description: language === 'ar'
          ? `تم تعديل سياسة استخدام الذكاء الاصطناعي رقم ${policyId}`
          : `Updated AI usage policy ${policyId}`,
        oldValues: existing,
        newValues: updatedRows[0],
        req,
        severity: 'medium'
      });

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم تحديث سياسة استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage policy updated successfully',
        data: {
          policy: AdminAIUsageController.formatPolicy(updatedRows[0])
        }
      });
    } catch (error) {
      await connection.rollback();

      logger.error('Update AI usage policy error', {
        error: error.message,
        policy_id: req.params.id,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to update AI usage policy',
        message_ar: 'فشل في تحديث سياسة استخدام الذكاء الاصطناعي'
      });
    } finally {
      connection.release();
    }
  }

  static async updatePolicyStatus(req, res) {
    const connection = await db.getConnection();

    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        connection.release();

        return res.status(400).json({
          success: false,
          message: 'Validation error',
          message_ar: 'خطأ في التحقق من البيانات',
          errors: errors.array()
        });
      }

      const policyId = parseInt(req.params.id);
      const isActive = AdminAIUsageController.parseBoolean(req.body.is_active);

      if (isActive === undefined) {
        connection.release();

        return res.status(400).json({
          success: false,
          message: 'is_active must be true or false',
          message_ar: 'يجب أن تكون is_active بقيمة true أو false'
        });
      }

      await connection.beginTransaction();

      const [existingRows] = await connection.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      if (existingRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: 'AI usage policy not found',
          message_ar: 'سياسة استخدام الذكاء الاصطناعي غير موجودة'
        });
      }

      const existing = existingRows[0];

      await connection.execute(
        `
        UPDATE ai_usage_policies
        SET
          is_active = ?,
          updated_by_admin_id = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [isActive ? 1 : 0, req.user.id, policyId]
      );

      const [updatedRows] = await connection.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE id = ?
        LIMIT 1
        `,
        [policyId]
      );

      await connection.commit();

      await AdminAIUsageController.insertAdminLog({
        adminId: req.user.id,
        action: isActive ? 'AI_USAGE_POLICY_ACTIVATE' : 'AI_USAGE_POLICY_DEACTIVATE',
        targetId: policyId,
        description: language === 'ar'
          ? `${isActive ? 'تم تفعيل' : 'تم تعطيل'} سياسة استخدام الذكاء الاصطناعي رقم ${policyId}`
          : `${isActive ? 'Activated' : 'Deactivated'} AI usage policy ${policyId}`,
        oldValues: existing,
        newValues: updatedRows[0],
        req,
        severity: isActive ? 'medium' : 'high'
      });

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم تحديث حالة سياسة استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage policy status updated successfully',
        data: {
          policy: AdminAIUsageController.formatPolicy(updatedRows[0])
        }
      });
    } catch (error) {
      await connection.rollback();

      logger.error('Update AI usage policy status error', {
        error: error.message,
        policy_id: req.params.id,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to update AI usage policy status',
        message_ar: 'فشل في تحديث حالة سياسة استخدام الذكاء الاصطناعي'
      });
    } finally {
      connection.release();
    }
  }

  static async getUserAIUsage(req, res) {
    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const userId = parseInt(req.params.userId);

      const [users] = await db.execute(
        `
        SELECT
          u.id,
          u.uuid,
          u.email,
          u.phone,
          u.status,
          u.is_active,
          ucp.full_name,
          ucp.profile_picture_url
        FROM users u
        LEFT JOIN user_complete_profiles ucp
          ON ucp.id = u.id
        WHERE u.id = ?
        LIMIT 1
        `,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          message_ar: 'المستخدم غير موجود'
        });
      }

      const [counters] = await db.execute(
        `
        SELECT *
        FROM ai_usage_counters
        WHERE user_id = ?
        ORDER BY period_key DESC, period_type ASC
        LIMIT 24
        `,
        [userId]
      );

      const [events] = await db.execute(
        `
        SELECT
          e.id,
          e.ai_session_id,
          e.ai_result_id,
          e.event_type,
          e.status,
          e.counted_units,
          e.prompt_tokens,
          e.completion_tokens,
          e.total_tokens,
          e.metadata,
          e.created_at,
          s.uuid AS ai_session_uuid,
          r.uuid AS ai_result_uuid,
          r.result_type
        FROM ai_usage_events e
        LEFT JOIN ai_sessions s
          ON s.id = e.ai_session_id
        LEFT JOIN ai_analysis_results r
          ON r.id = e.ai_result_id
        WHERE e.user_id = ?
        ORDER BY e.created_at DESC, e.id DESC
        LIMIT 50
        `,
        [userId]
      );

      const [policies] = await db.execute(
        `
        SELECT *
        FROM ai_usage_policies
        WHERE is_active = 1
          AND (
            scope_type = 'global'
            OR (scope_type = 'user' AND user_id = ?)
          )
        ORDER BY
          CASE
            WHEN scope_type = 'user' THEN 1
            WHEN scope_type = 'global' THEN 2
            ELSE 3
          END,
          priority ASC,
          created_at DESC
        `,
        [userId]
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم جلب استخدام المستخدم للذكاء الاصطناعي بنجاح'
          : 'User AI usage retrieved successfully',
        data: {
          user: {
            id: users[0].id,
            uuid: users[0].uuid,
            email: users[0].email,
            phone: users[0].phone,
            status: users[0].status,
            is_active: Boolean(users[0].is_active),
            full_name: users[0].full_name,
            profile_picture_url: users[0].profile_picture_url
          },
          active_policies: policies.map(AdminAIUsageController.formatPolicy),
          counters,
          recent_events: events.map((event) => ({
            ...event,
            metadata: typeof event.metadata === 'string'
              ? JSON.parse(event.metadata || '{}')
              : event.metadata
          }))
        }
      });
    } catch (error) {
      logger.error('Get user AI usage error', {
        error: error.message,
        user_id: req.params.userId,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve user AI usage',
        message_ar: 'فشل في جلب استخدام المستخدم للذكاء الاصطناعي'
      });
    }
  }

  static async getOverview(req, res) {
    try {
      const language = AdminAIUsageController.normalizeLanguage(
        req.headers['accept-language'],
        req.user?.language_preference
      );

      const periodKey = req.query.period_key || new Date().toISOString().slice(0, 7);

      const [counterSummary] = await db.execute(
        `
        SELECT
          COUNT(DISTINCT user_id) AS active_users,
          COALESCE(SUM(total_requests), 0) AS total_requests,
          COALESCE(SUM(chat_messages_count), 0) AS chat_messages_count,
          COALESCE(SUM(image_analyses_count), 0) AS image_analyses_count,
          COALESCE(SUM(document_analyses_count), 0) AS document_analyses_count,
          COALESCE(SUM(tokens_used), 0) AS tokens_used
        FROM ai_usage_counters
        WHERE period_type = 'monthly'
          AND period_key = ?
        `,
        [periodKey]
      );

      const [providerSummary] = await db.execute(
        `
        SELECT
          provider,
          model,
          request_type,
          status,
          COUNT(*) AS requests_count,
          COALESCE(SUM(total_tokens), 0) AS total_tokens,
          ROUND(AVG(latency_ms), 2) AS avg_latency_ms
        FROM ai_provider_logs
        GROUP BY provider, model, request_type, status
        ORDER BY requests_count DESC
        LIMIT 20
        `
      );

      const [policiesSummary] = await db.execute(
        `
        SELECT
          scope_type,
          is_active,
          COUNT(*) AS count
        FROM ai_usage_policies
        GROUP BY scope_type, is_active
        ORDER BY scope_type ASC, is_active DESC
        `
      );

      return res.status(200).json({
        success: true,
        message: language === 'ar'
          ? 'تم جلب نظرة عامة على استخدام الذكاء الاصطناعي بنجاح'
          : 'AI usage overview retrieved successfully',
        data: {
          period_key: periodKey,
          counters: counterSummary[0],
          provider_summary: providerSummary,
          policies_summary: policiesSummary
        }
      });
    } catch (error) {
      logger.error('Get AI usage overview error', {
        error: error.message,
        admin_id: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI usage overview',
        message_ar: 'فشل في جلب نظرة عامة على استخدام الذكاء الاصطناعي'
      });
    }
  }
}

module.exports = AdminAIUsageController;
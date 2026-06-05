const db = require('../../config/db');

class AIUsageService {
  static getCurrentMonthlyPeriodKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  static async getActivePolicyForUser(userId) {
    const [policies] = await db.execute(
      `
      SELECT *
      FROM ai_usage_policies
      WHERE is_active = 1
        AND (
          (scope_type = 'user' AND user_id = ?)
          OR scope_type = 'global'
        )
      ORDER BY
        CASE
          WHEN scope_type = 'user' THEN 1
          WHEN scope_type = 'global' THEN 2
          ELSE 3
        END,
        priority ASC,
        id DESC
      LIMIT 1
      `,
      [userId]
    );

    if (policies.length === 0) {
      throw new Error('No active AI usage policy found');
    }

    return policies[0];
  }

  static async getOrCreateMonthlyCounter(userId) {
    const periodKey = this.getCurrentMonthlyPeriodKey();

    const [existing] = await db.execute(
      `
      SELECT *
      FROM ai_usage_counters
      WHERE user_id = ?
        AND period_type = 'monthly'
        AND period_key = ?
      LIMIT 1
      `,
      [userId, periodKey]
    );

    if (existing.length > 0) {
      return existing[0];
    }

    await db.execute(
      `
      INSERT INTO ai_usage_counters (
        user_id,
        period_type,
        period_key,
        total_requests,
        chat_messages_count,
        image_analyses_count,
        document_analyses_count,
        tokens_used
      )
      VALUES (?, 'monthly', ?, 0, 0, 0, 0, 0)
      `,
      [userId, periodKey]
    );

    const [created] = await db.execute(
      `
      SELECT *
      FROM ai_usage_counters
      WHERE user_id = ?
        AND period_type = 'monthly'
        AND period_key = ?
      LIMIT 1
      `,
      [userId, periodKey]
    );

    return created[0];
  }

  static async getUsageSummary(userId) {
    const policy = await this.getActivePolicyForUser(userId);
    const counter = await this.getOrCreateMonthlyCounter(userId);

    return {
      period: {
        type: counter.period_type,
        key: counter.period_key
      },
      policy: {
        id: policy.id,
        policy_name: policy.policy_name,
        scope_type: policy.scope_type,
        max_total_requests_per_month: policy.max_total_requests_per_month,
        max_chat_messages_per_month: policy.max_chat_messages_per_month,
        max_image_analyses_per_month: policy.max_image_analyses_per_month,
        max_document_analyses_per_month: policy.max_document_analyses_per_month,
        max_files_per_session: policy.max_files_per_session,
        max_tokens_per_request: policy.max_tokens_per_request
      },
      used: {
        total_requests: counter.total_requests,
        chat_messages_count: counter.chat_messages_count,
        image_analyses_count: counter.image_analyses_count,
        document_analyses_count: counter.document_analyses_count,
        tokens_used: counter.tokens_used
      },
      remaining: {
        total_requests: Math.max(policy.max_total_requests_per_month - counter.total_requests, 0),
        chat_messages: Math.max(policy.max_chat_messages_per_month - counter.chat_messages_count, 0),
        image_analyses: Math.max(policy.max_image_analyses_per_month - counter.image_analyses_count, 0),
        document_analyses: Math.max(policy.max_document_analyses_per_month - counter.document_analyses_count, 0)
      }
    };
  }

  static async assertCanUse(userId, eventType) {
    const usage = await this.getUsageSummary(userId);

    if (usage.remaining.total_requests <= 0) {
      return {
        allowed: false,
        reason: 'monthly_total_limit_exceeded',
        message_ar: 'لقد وصلت إلى الحد الشهري لاستخدام الذكاء الاصطناعي',
        message_en: 'You have reached your monthly AI usage limit',
        usage
      };
    }

    if (eventType === 'chat_message' && usage.remaining.chat_messages <= 0) {
      return {
        allowed: false,
        reason: 'monthly_chat_limit_exceeded',
        message_ar: 'لقد وصلت إلى الحد الشهري لرسائل الذكاء الاصطناعي',
        message_en: 'You have reached your monthly AI chat message limit',
        usage
      };
    }

    if (eventType === 'image_analysis' && usage.remaining.image_analyses <= 0) {
      return {
        allowed: false,
        reason: 'monthly_image_limit_exceeded',
        message_ar: 'لقد وصلت إلى الحد الشهري لتحليل الصور',
        message_en: 'You have reached your monthly image analysis limit',
        usage
      };
    }

    if (eventType === 'document_analysis' && usage.remaining.document_analyses <= 0) {
      return {
        allowed: false,
        reason: 'monthly_document_limit_exceeded',
        message_ar: 'لقد وصلت إلى الحد الشهري لتحليل المستندات',
        message_en: 'You have reached your monthly document analysis limit',
        usage
      };
    }

    return {
      allowed: true,
      usage
    };
  }

  static async recordUsageEvent({
    userId,
    aiSessionId = null,
    aiResultId = null,
    eventType,
    status = 'success',
    countedUnits = 1,
    promptTokens = null,
    completionTokens = null,
    totalTokens = null,
    metadata = null
  }) {
    const periodKey = this.getCurrentMonthlyPeriodKey();

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
        INSERT INTO ai_usage_counters (
          user_id,
          period_type,
          period_key,
          total_requests,
          chat_messages_count,
          image_analyses_count,
          document_analyses_count,
          tokens_used,
          last_request_at
        )
        VALUES (?, 'monthly', ?, 0, 0, 0, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE
          last_request_at = NOW()
        `,
        [userId, periodKey]
      );

      if (status === 'success') {
        let counterField = null;

        if (eventType === 'chat_message') counterField = 'chat_messages_count';
        if (eventType === 'image_analysis') counterField = 'image_analyses_count';
        if (eventType === 'document_analysis') counterField = 'document_analyses_count';

        const tokensToAdd = Number(totalTokens || 0);

        if (counterField) {
          await connection.execute(
            `
            UPDATE ai_usage_counters
            SET
              total_requests = total_requests + ?,
              ${counterField} = ${counterField} + ?,
              tokens_used = tokens_used + ?,
              last_request_at = NOW()
            WHERE user_id = ?
              AND period_type = 'monthly'
              AND period_key = ?
            `,
            [countedUnits, countedUnits, tokensToAdd, userId, periodKey]
          );
        } else {
          await connection.execute(
            `
            UPDATE ai_usage_counters
            SET
              total_requests = total_requests + ?,
              tokens_used = tokens_used + ?,
              last_request_at = NOW()
            WHERE user_id = ?
              AND period_type = 'monthly'
              AND period_key = ?
            `,
            [countedUnits, tokensToAdd, userId, periodKey]
          );
        }
      }

      await connection.execute(
        `
        INSERT INTO ai_usage_events (
          user_id,
          ai_session_id,
          ai_result_id,
          event_type,
          counted_units,
          prompt_tokens,
          completion_tokens,
          total_tokens,
          status,
          metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          userId,
          aiSessionId,
          aiResultId,
          eventType,
          countedUnits,
          promptTokens,
          completionTokens,
          totalTokens,
          status,
          metadata ? JSON.stringify(metadata) : null
        ]
      );

      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = AIUsageService;
# 12 - Deployment Checklist

## Purpose

This checklist should be completed before deploying the AI Dermatology feature to production.

---

## 1. Environment variables

Required:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
AI_ENABLE_IMAGE_ANALYSIS=true
AI_ENABLE_DOCUMENT_ANALYSIS=true
AI_REQUIRE_PATIENT_CONSENT=true
AI_DEFAULT_LANGUAGE=ar
OPENAI_API_KEY=sk-...
AI_USE_MOCK=false
AI_TEMPERATURE=0.2
```

Verify:

- `OPENAI_API_KEY` is not committed to Git.
- Env validator masks secrets.
- Production uses production database credentials.
- Production `NODE_ENV=production`.

---

## 2. Database migration

Run AI migration before deployment:

```text
scripts/ai-dermatology-migration.sql
```

Verify tables:

```sql
SHOW TABLES LIKE 'ai_%';
```

Expected:

```text
ai_analysis_results
ai_diagnosis
ai_diagnosis_translations
ai_provider_logs
ai_result_shares
ai_session_files
ai_session_messages
ai_sessions
ai_usage_counters
ai_usage_events
ai_usage_policies
```

Verify default policy:

```sql
SELECT * FROM ai_usage_policies;
```

---

## 3. File directories

Verify these directories exist:

```text
upload/files/medical-image
upload/files/document
upload/files/other
```

Important:

- Do not expose `upload/files/medical-image` as public static folder.
- Use secure endpoints for AI files.

---

## 4. Static files security

Public static middleware should not expose medical AI images.

Allowed public static folders may include:

```text
location-images
profile-picture
health-tips
clinic-images
id-document
license
document
```

AI medical images must use:

```http
GET /api/ai-dermatology/files/:fileUuid
GET /api/ai-dermatology/doctor/files/:fileUuid
```

---

## 5. OpenAI account setup

Before production:

1. Create a dedicated OpenAI project.
2. Create production API key.
3. Set budget limits in OpenAI dashboard.
4. Monitor usage daily during launch.
5. Rotate keys periodically.
6. Store keys in secure environment manager.

---

## 6. Admin policies

Create or verify global policy:

```text
Default Free AI Usage
```

Recommended starter limits:

```text
max_total_requests_per_month = 30
max_chat_messages_per_month = 30
max_image_analyses_per_month = 10
max_document_analyses_per_month = 5
max_files_per_session = 5
max_tokens_per_request = 4000
```

For special users, create user-specific policy:

```json
{
  "policy_name": "VIP User AI Usage",
  "scope_type": "user",
  "user_id": 1,
  "max_total_requests_per_month": 120,
  "max_chat_messages_per_month": 80,
  "max_image_analyses_per_month": 40,
  "max_document_analyses_per_month": 15,
  "max_files_per_session": 10,
  "max_tokens_per_request": 8000,
  "is_active": true,
  "priority": 5
}
```

---

## 7. Authentication tests

Test:

- User routes with user token.
- User routes with doctor token should fail.
- Doctor routes with doctor token.
- Doctor routes with user token should fail.
- Admin read routes with admin token.
- Admin mutation routes with super admin token.
- Admin mutation routes with non-super admin should fail.

---

## 8. User flow tests

Test complete user flow:

1. Create session.
2. Send text message.
3. Upload image.
4. Upload PDF/TXT.
5. Get session details.
6. Get secure file.
7. Complete session.
8. Try sending message to completed session.

---

## 9. Doctor flow tests

Test complete doctor flow:

1. User shares session with doctor.
2. Doctor gets shared sessions.
3. Doctor opens shared session details.
4. Doctor opens secure AI file.
5. Doctor reviews AI result.
6. User sees doctor review.
7. User revokes share.
8. Doctor can no longer access revoked share.

---

## 10. Admin flow tests

Test:

1. Get usage overview.
2. Get user AI usage.
3. List policies.
4. Create policy.
5. Update policy.
6. Activate/deactivate policy.
7. Verify `/api/ai-dermatology/usage` reflects active policy.
8. Verify admin logs.

---

## 11. Logging and monitoring

Monitor:

```text
ai_provider_logs
ai_usage_events
ai_usage_counters
admin_logs
server logs
```

Key metrics:

- total AI requests
- image analyses count
- document analyses count
- token usage
- failed provider requests
- average latency
- top users by usage
- policies changed by admin

---

## 12. Cost monitoring

Important query:

```sql
SELECT
  provider,
  model,
  request_type,
  status,
  COUNT(*) AS requests_count,
  SUM(total_tokens) AS total_tokens,
  AVG(latency_ms) AS avg_latency_ms
FROM ai_provider_logs
GROUP BY provider, model, request_type, status;
```

Add alerts if:

- total tokens exceed expected monthly usage
- document requests are too large
- provider failures spike

---

## 13. Privacy and compliance

Before launch:

- Update privacy policy to mention AI processing.
- Add AI consent screen.
- Add medical disclaimer in UI.
- Add doctor review disclaimer.
- Decide retention policy for AI files and sessions.
- Restrict production DB access.
- Review OpenAI data handling settings.

---

## 14. Medical disclaimer

Recommended display in app:

```text
This AI analysis is not a final medical diagnosis. It is an assistive tool and does not replace consultation with a licensed dermatologist.
```

Arabic:

```text
هذا التحليل بالذكاء الاصطناعي ليس تشخيصًا طبيًا نهائيًا، ولا يغني عن استشارة طبيب جلدية مختص.
```

---

## 15. Known production risks

| Risk | Mitigation |
|---|---|
| High OpenAI cost | Usage policies, token logging, admin overview |
| Medical liability | Clear disclaimer, doctor review workflow |
| Private image exposure | Secure file endpoints only |
| Unauthorized doctor access | Active share validation |
| Large PDF token usage | Add max size and summarization pipeline |
| API key leakage | Env masking and secret storage |

---

## 16. Recommended next improvements

1. Add notifications when doctor reviews AI result.
2. Add share by appointment as preferred flow.
3. Add doctor approval verification before sharing.
4. Add daily limits.
5. Add AI cost dashboard.
6. Add exportable medical summary PDF.
7. Add retention and deletion policy.
8. Add audit logs for file viewing.
9. Add automated tests.
10. Add Postman CI/Newman collection.

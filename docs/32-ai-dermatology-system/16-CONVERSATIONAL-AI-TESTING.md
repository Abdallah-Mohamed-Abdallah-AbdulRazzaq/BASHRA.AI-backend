# 16 - Conversational AI Chat Testing Guide

## 1. Purpose

This guide documents how to test the final conversational update for the Bashra AI Dermatology feature.

The focus is to verify that:

- the backend starts correctly
- syntax is valid
- the AI visible reply is conversational
- structured medical fields are still stored
- follow-up context works
- small talk is handled correctly
- out-of-scope messages are handled safely
- session risk is not downgraded by small talk
- sharing does not select small-talk results by default
- image/document/final-summary flows still work

---

## 2. Required Setup

Make sure the following environment values exist:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
AI_ENABLE_IMAGE_ANALYSIS=true
AI_ENABLE_DOCUMENT_ANALYSIS=true
AI_REQUIRE_PATIENT_CONSENT=true
AI_DEFAULT_LANGUAGE=ar
OPENAI_API_KEY=...
AI_USE_MOCK=false
AI_TEMPERATURE=0.2
```

For local testing, expected server base URL:

```text
http://localhost:3006
```

Required tokens:

```text
USER_ACCESS_TOKEN
DOCTOR_ACCESS_TOKEN
ADMIN_ACCESS_TOKEN
SUPER_ADMIN_ACCESS_TOKEN
```

For this specific conversational update, the most important token is the user token.

---

## 3. Static Syntax Checks

Run these commands from the project root:

```powershell
node --check services/ai/dermatologyPrompt.js
node --check services/ai/OpenAIProvider.js
node --check services/ai/AIDermatologyService.js
node --check services/ai/AIShareService.js
node --check services/ai/AIUsageService.js
node --check services/ai/AIProviderFactory.js
node --check services/ai/AISessionService.js
node --check controllers/AIDermatologyController.js
node --check routes/aiDermatologyRoutes.js
```

Expected result:

```text
No output
```

No output means the files passed Node syntax validation.

---

## 4. Start Server

```powershell
nodemon app.js
```

Expected logs:

```text
Validating environment variables...
Environment validation passed
Server is running on port 3006
```

Expected AI-related values in logs:

```text
AI_PROVIDER: openai
AI_MODEL: gpt-4.1-mini
AI_ENABLE_IMAGE_ANALYSIS: true
AI_ENABLE_DOCUMENT_ANALYSIS: true
AI_REQUIRE_PATIENT_CONSENT: true
AI_DEFAULT_LANGUAGE: ar
OPENAI_API_KEY: Set
AI_USE_MOCK: false
AI_TEMPERATURE: 0.2
```

---

## 5. Health Check

```http
GET http://localhost:3006/health
```

Expected:

```json
{
  "status": "OK"
}
```

The exact response may include more fields depending on your current health endpoint.

---

## 6. Create New AI Session

```http
POST http://localhost:3006/api/ai-dermatology/sessions
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "title": "اختبار الشات المحادثي",
  "input_mode": "chat",
  "language_code": "ar",
  "patient_consent": true
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "uuid": "SESSION_UUID",
    "status": "active",
    "input_mode": "chat",
    "specialty": "dermatology",
    "language_code": "ar",
    "patient_consent": 1
  }
}
```

Save:

```text
SESSION_UUID
```

---

## 7. Test Main Dermatology Chat Reply

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/messages
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "message": "عندي حكة واحمرار خفيف في الرقبة منذ يومين"
}
```

Expected status:

```text
201 Created
```

Expected response checks:

```text
success = true
result.result_type = chat_response
ai_message.content exists
ai_message.structured_content.response_kind exists
ai_message.structured_content.conversation_reply exists
ai_message.structured_content.case_summary exists
ai_message.structured_content.possible_conditions exists
ai_message.structured_content.severity exists
```

Important conversational check:

```text
ai_message.content should be similar to conversation_reply, not only a rigid case_summary.
```

Good expected style:

```text
فهمت عليك... ممكن يكون تهيج أو حساسية... هل استخدمت منتج جديد؟
```

Bad old style:

```text
المريض يعاني من حكة واحمرار خفيف في منطقة الرقبة منذ يومين.
```

Acceptable `response_kind` values for this test:

```text
dermatology_chat
dermatology_assessment
follow_up
safety_triage
```

Save:

```text
RESULT_UUID
```

---

## 8. Verify Database After Main Chat

Run:

```sql
SELECT
  id,
  sender_type,
  message_type,
  LEFT(content, 200) AS content_preview,
  JSON_EXTRACT(structured_content, '$.response_kind') AS response_kind,
  JSON_EXTRACT(structured_content, '$.conversation_reply') AS conversation_reply,
  JSON_EXTRACT(structured_content, '$.case_summary') AS case_summary,
  created_at
FROM ai_session_messages
WHERE ai_session_id = (
  SELECT id FROM ai_sessions WHERE uuid = 'SESSION_UUID'
)
ORDER BY id DESC
LIMIT 5;
```

Expected:

- Latest AI message has `structured_content.response_kind`.
- Latest AI message has `structured_content.conversation_reply`.
- Latest AI message has `structured_content.case_summary`.
- `content_preview` should be conversational.

Also run:

```sql
SELECT
  id,
  uuid,
  result_type,
  case_summary,
  JSON_EXTRACT(ai_response_json, '$.response_kind') AS response_kind,
  JSON_EXTRACT(ai_response_json, '$.conversation_reply') AS conversation_reply,
  severity,
  recommended_next_step,
  confidence_level,
  needs_doctor_review,
  created_at
FROM ai_analysis_results
WHERE ai_session_id = (
  SELECT id FROM ai_sessions WHERE uuid = 'SESSION_UUID'
)
ORDER BY id DESC
LIMIT 5;
```

Expected:

- `case_summary` remains clinical.
- `ai_response_json.conversation_reply` exists.
- `response_kind` exists.

---

## 9. Test Follow-Up Context

Send a follow-up message without repeating the full case.

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/messages
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "message": "الحكة بتزيد مع العرق"
}
```

Expected:

- AI should understand this as a follow-up to the previous neck itching/redness case.
- AI should not behave as if this is a totally new case.
- `response_kind` can be `follow_up`, `dermatology_chat`, or `dermatology_assessment`.
- `conversation_reply` should mention the existing context.

Response checks:

```text
structured_content.conversation_reply exists
structured_content.case_summary exists
structured_content.follow_up_questions exists
```

---

## 10. Test Small Talk

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/messages
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "message": "تمام شكرا"
}
```

Expected:

```text
success = true
result.result_type = chat_response
structured_content.response_kind = small_talk
ai_message.content is short and natural
```

Good expected style:

```text
العفو، أتمنى لك السلامة. لو لاحظت زيادة في الاحمرار أو ظهور ألم أو إفرازات، الأفضل حجز كشف مع طبيب جلدية.
```

Risk check:

Small talk must not downgrade the existing session `risk_level`.

SQL:

```sql
SELECT id, uuid, risk_level, last_message_at, updated_at
FROM ai_sessions
WHERE uuid = 'SESSION_UUID';
```

Expected:

- If previous risk was `medium`, it should not become `low` just because the user said thank you.
- If previous risk was `urgent`, it must remain `urgent`.

---

## 11. Test Out-of-Scope Message

Create a new session or use the same active session.

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/messages
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "message": "عندي ألم في الأسنان"
}
```

Expected:

```text
response_kind = out_of_scope
conversation_reply explains that this is outside dermatology scope
AI recommends the suitable clinician, such as dentist
AI should not invent dermatology analysis
```

Expected structured behavior:

```text
possible_conditions may be empty or minimal
severity should not create false dermatology risk
recommended_next_step may be doctor_review or book_dermatologist only if wording requires safe fallback, but response should clearly redirect outside dermatology
```

---

## 12. Test Red Flag / Safety Triage

Use a message with urgent symptoms.

```json
{
  "message": "عندي طفح جلدي بينتشر بسرعة ومعاه حرارة وتورم في الوجه"
}
```

Expected:

```text
response_kind = safety_triage or dermatology_assessment
severity = urgent or severe
recommended_next_step = urgent_care
red_flags contains only mentioned or strongly implied red flags
conversation_reply clearly recommends urgent medical care
```

SQL:

```sql
SELECT uuid, risk_level
FROM ai_sessions
WHERE uuid = 'SESSION_UUID';
```

Expected:

```text
risk_level = urgent or high
```

---

## 13. Test Share After Small Talk

This is a critical regression test.

Steps:

1. Create active session.
2. Send real dermatology symptom message.
3. Send small talk message: `تمام شكرا`.
4. Share session without sending `result_uuid`.

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/share
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "doctor_id": 1
}
```

Expected:

```text
success = true
share.share_status = active
result.result_type = chat_response
```

Important check:

The shared result should be the meaningful medical chat result, not the small-talk result.

SQL:

```sql
SELECT
  sh.id,
  sh.uuid AS share_uuid,
  sh.ai_result_id,
  r.uuid AS result_uuid,
  r.result_type,
  r.case_summary,
  JSON_EXTRACT(r.ai_response_json, '$.response_kind') AS response_kind,
  sh.share_status,
  sh.shared_at
FROM ai_result_shares sh
JOIN ai_analysis_results r ON r.id = sh.ai_result_id
WHERE sh.ai_session_id = (
  SELECT id FROM ai_sessions WHERE uuid = 'SESSION_UUID'
)
ORDER BY sh.id DESC
LIMIT 5;
```

Expected:

```text
response_kind should not be small_talk
response_kind should not be out_of_scope when a meaningful medical result exists
```

---

## 14. Test Get Session Details After Conversational Messages

```http
GET http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID
Authorization: Bearer USER_ACCESS_TOKEN
```

Expected:

```text
success = true
messages[] includes user and AI messages
AI message content is conversational
AI message structured_content contains conversation_reply and case_summary
results[] contains response_kind inside ai_response_json
latest_result exists
stats exists
```

Important UI checks:

- Chat UI should use `messages[].content`.
- Medical details UI should use `results[]` and `structured_content`.

---

## 15. Test Image Analysis Still Works

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/images
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: multipart/form-data
```

Form-data:

| Key | Type | Value |
|---|---|---|
| image | File | PNG/JPG/WebP image |
| description | Text | عندي بقعة حمراء في الرقبة مع حكة منذ أسبوع |

Expected:

```text
success = true
uploaded_file.secure_file_url exists
ai_message.content is patient-facing
structured_content.conversation_reply exists
structured_content.response_kind = image_analysis or dermatology_assessment
result.result_type = image_analysis
```

SQL:

```sql
SELECT
  m.id,
  m.sender_type,
  m.message_type,
  LEFT(m.content, 200) AS content_preview,
  JSON_EXTRACT(m.structured_content, '$.conversation_reply') AS conversation_reply,
  m.file_id
FROM ai_session_messages m
WHERE m.ai_session_id = (
  SELECT id FROM ai_sessions WHERE uuid = 'SESSION_UUID'
)
ORDER BY m.id DESC
LIMIT 5;
```

---

## 16. Test Document Analysis Still Works

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/documents
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: multipart/form-data
```

Form-data:

| Key | Type | Value |
|---|---|---|
| document | File | PDF or TXT |
| description | Text | هذا تقرير طبي متعلق بحالة جلدية |

Expected:

```text
success = true
uploaded_file.secure_file_url exists
ai_message.content is patient-facing
structured_content.conversation_reply exists
structured_content.response_kind = document_analysis or dermatology_assessment
result.result_type = document_analysis
```

---

## 17. Test Final Summary Still Works

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/complete
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{}
```

Expected:

```text
success = true
status = completed
result.result_type = final_summary
ai_message.structured_content.response_kind = final_summary
ai_message.structured_content.conversation_reply exists
ai_message.structured_content.case_summary exists
```

SQL:

```sql
SELECT
  id,
  uuid,
  status,
  risk_level,
  JSON_EXTRACT(summary_json, '$.response_kind') AS response_kind,
  JSON_EXTRACT(summary_json, '$.conversation_reply') AS conversation_reply,
  JSON_EXTRACT(summary_json, '$.case_summary') AS case_summary,
  updated_at
FROM ai_sessions
WHERE uuid = 'SESSION_UUID';
```

Expected:

```text
status = completed
response_kind = final_summary
summary_json is not null
```

---

## 18. Test Completed Session Rejects New Messages

```http
POST http://localhost:3006/api/ai-dermatology/sessions/SESSION_UUID/messages
Authorization: Bearer USER_ACCESS_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "message": "هل ممكن أكمل؟"
}
```

Expected:

```json
{
  "success": false,
  "message_ar": "جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة",
  "message_en": "AI session not found or inactive"
}
```

Expected status:

```text
404
```

---

## 19. Usage Counter Checks

After successful requests, check usage:

```http
GET http://localhost:3006/api/ai-dermatology/usage
Authorization: Bearer USER_ACCESS_TOKEN
```

Expected:

```text
total_requests increases
chat_messages_count increases for text chat
image_analyses_count increases for image analysis
document_analyses_count increases for document analysis
tokens_used increases when OpenAI is used
```

SQL:

```sql
SELECT
  user_id,
  period_key,
  total_requests,
  chat_messages_count,
  image_analyses_count,
  document_analyses_count,
  tokens_used,
  last_request_at
FROM ai_usage_counters
WHERE user_id = 1
ORDER BY id DESC;
```

---

## 20. Provider Log Checks

```sql
SELECT
  id,
  provider,
  model,
  request_type,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  latency_ms,
  status,
  JSON_EXTRACT(response_metadata, '$.response_kind') AS response_kind,
  created_at
FROM ai_provider_logs
ORDER BY id DESC
LIMIT 10;
```

Expected:

```text
request_type = chat / image / document / summary
status = success
provider = openai or mock
total_tokens populated for OpenAI mode
```

If `response_kind` is not stored in `response_metadata` in your current version, it is enough that it exists in `ai_response_json` and `structured_content`.

---

## 21. Regression Checklist

Mark each item after testing:

```text
[ ] Server starts successfully
[ ] All node --check commands pass
[ ] Create session works
[ ] Main chat response is conversational
[ ] structured_content.conversation_reply exists
[ ] structured_content.case_summary exists
[ ] response_kind exists
[ ] Follow-up message uses previous context
[ ] Small talk returns small_talk and does not downgrade risk
[ ] Out-of-scope message redirects safely
[ ] Red flags trigger urgent/severe behavior
[ ] Share after small talk does not select small-talk result
[ ] Get session details still works
[ ] Image analysis still works
[ ] Document analysis still works
[ ] Final summary still works
[ ] Completed session rejects new messages
[ ] Usage counters still update
[ ] Provider logs still update
[ ] Doctor shared session flow still works
[ ] Doctor review still works
```

---

## 22. Common Issues

### `conversation_reply` missing

Possible causes:

- Old `OpenAIProvider.js` is still deployed.
- Server was not restarted after replacing files.
- Mock response was not updated.

Fix:

- Replace all final files.
- Restart server.
- Re-run syntax checks.

### AI message still looks like a report

Possible causes:

- `AIDermatologyService.js` still saves `case_summary` into message content.
- `getUserFacingReply()` is not being used.

Fix:

- Confirm text message save logic uses `conversation_reply` first.

### Share selects thank-you message

Possible causes:

- Old `AIShareService.js` is still deployed.
- `response_kind` is not stored in `ai_response_json`.

Fix:

- Replace `AIShareService.js`.
- Verify SQL result has `response_kind` in `ai_response_json`.

### Node syntax passes but server crashes

Possible causes:

- Missing dependency.
- Wrong require path.
- File copied to wrong folder.
- Environment variable missing.

Fix:

```powershell
npm install
node --check app.js
nodemon app.js
```

---

## 23. Final Expected Result

After this update, the AI Dermatology feature should behave as follows:

- Patient receives a natural chat reply.
- Backend still stores full structured medical JSON.
- Doctor sharing remains medically meaningful.
- Small talk does not corrupt risk level or shared result selection.
- No database migration is needed.
- Existing API paths remain unchanged.
- Image, document, final summary, doctor review, and admin usage flows remain working.

# 10 - Testing Guide

## Purpose

This guide documents the full testing flow for the Bashra AI Dermatology feature.

It follows the actual implementation order and validates:

- environment setup
- user AI sessions
- text analysis
- image analysis
- document analysis
- secure file access
- final summary
- sharing with doctor
- doctor access
- doctor review
- admin usage policies
- error cases

---

## 1. Static checks

Run:

```powershell
node --check services/ai/AIDermatologyService.js
node --check services/ai/AISessionService.js
node --check services/ai/AIUsageService.js
node --check services/ai/AIShareService.js
node --check services/ai/OpenAIProvider.js
node --check controllers/AIDermatologyController.js
node --check controllers/AdminAIUsageController.js
node --check routes/aiDermatologyRoutes.js
node --check routes/adminAIUsageRoutes.js
node --check routes/index.js
```

Expected:

```text
No output
```

No output means syntax is valid.

---

## 2. Start server

```powershell
nodemon app.js
```

Expected logs:

```text
Environment validation passed
Server is running on port 3006
```

Important env values should show as set:

```text
AI_PROVIDER: openai
AI_MODEL: gpt-4.1-mini
OPENAI_API_KEY: Set
AI_USE_MOCK: false
```

---

## 3. Health check

```http
GET http://localhost:3006/health
```

Expected:

```json
{
  "status": "OK",
  "environment": "development"
}
```

---

## 4. Create AI session

User Token required.

```http
POST http://localhost:3006/api/ai-dermatology/sessions
```

Body:

```json
{
  "title": "تحليل حالة جلدية",
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
    "uuid": "...",
    "status": "active",
    "specialty": "dermatology",
    "patient_consent": 1
  }
}
```

Save:

```text
session_uuid
```

---

## 5. Send text message

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/messages
```

Body:

```json
{
  "message": "عندي حكة واحمرار خفيف في الرقبة منذ يومين"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "ai_message": {
      "structured_content": {
        "case_summary": "...",
        "possible_conditions": [],
        "severity": "mild",
        "recommended_next_step": "book_dermatologist"
      }
    },
    "result": {
      "result_type": "chat_response"
    }
  }
}
```

---

## 6. Check usage

```http
GET http://localhost:3006/api/ai-dermatology/usage
```

Expected:

```json
{
  "success": true,
  "data": {
    "used": {
      "total_requests": 1,
      "chat_messages_count": 1
    },
    "remaining": {}
  }
}
```

---

## 7. Upload and analyze image

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/images
```

Body form-data:

| Key | Type | Value |
|---|---|---|
| image | File | PNG/JPG skin image |
| description | Text | عندي بقعة حمراء في الرقبة مع حكة منذ أسبوع |

Expected:

```json
{
  "success": true,
  "data": {
    "uploaded_file": {
      "uuid": "...",
      "file_category": "medical_image",
      "secure_file_url": "/api/ai-dermatology/files/..."
    },
    "result": {
      "result_type": "image_analysis"
    }
  }
}
```

Save:

```text
file_uuid
```

---

## 8. Secure user file access

```http
GET http://localhost:3006/api/ai-dermatology/files/:fileUuid
```

User Token required.

Expected:

- The image is returned directly.
- `access_count` increases.

SQL:

```sql
SELECT id, uuid, access_count, last_accessed_at
FROM files
WHERE uuid = 'FILE_UUID';
```

---

## 9. Upload and analyze PDF/TXT document

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/documents
```

Body form-data:

| Key | Type | Value |
|---|---|---|
| document | File | PDF or TXT |
| description | Text | هذا تقرير طبي متعلق بحالة جلدية |

Expected:

```json
{
  "success": true,
  "data": {
    "uploaded_file": {
      "file_category": "document",
      "secure_file_url": "/api/ai-dermatology/files/..."
    },
    "result": {
      "result_type": "document_analysis"
    }
  }
}
```

---

## 10. Get full session details

```http
GET http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid
```

Expected:

```json
{
  "success": true,
  "data": {
    "session": {},
    "messages": [],
    "files": [],
    "results": [],
    "latest_result": {},
    "stats": {}
  }
}
```

Check:

- `files[].secure_file_url`
- `messages[].file.secure_file_url`
- `results[].doctor_review`

---

## 11. Complete session

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/complete
```

Expected:

```json
{
  "success": true,
  "data": {
    "status": "completed",
    "result": {
      "result_type": "final_summary"
    }
  }
}
```

SQL:

```sql
SELECT id, uuid, status, risk_level, summary_json
FROM ai_sessions
WHERE uuid = 'SESSION_UUID';
```

Expected:

```text
status = completed
summary_json is not null
```

---

## 12. Try sending message to completed session

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:completedSessionUuid/messages
```

Expected:

```json
{
  "success": false,
  "message_ar": "جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة"
}
```

---

## 13. Share session with doctor

First create a new active session and send at least one message.

Then:

```http
POST http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/share
```

Body:

```json
{
  "doctor_id": 1
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "share": {
      "uuid": "...",
      "share_status": "active"
    },
    "doctor": {},
    "result": {}
  }
}
```

Save:

```text
share_uuid
result_uuid
```

---

## 14. Get user session shares

```http
GET http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid/shares
```

Expected:

```json
{
  "success": true,
  "data": {
    "shares": [
      {
        "share_status": "active",
        "doctor": {}
      }
    ]
  }
}
```

---

## 15. Doctor gets shared sessions

Doctor Token required.

```http
GET http://localhost:3006/api/ai-dermatology/doctor/shared-sessions
```

Expected:

```json
{
  "success": true,
  "data": {
    "shares": [
      {
        "share": {},
        "session": {},
        "patient": {},
        "result": {},
        "stats": {}
      }
    ]
  }
}
```

---

## 16. Doctor gets shared session details

```http
GET http://localhost:3006/api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

Expected:

```json
{
  "success": true,
  "data": {
    "messages": [],
    "files": [],
    "results": [],
    "latest_result": {}
  }
}
```

---

## 17. Doctor reviews AI result

```http
PATCH http://localhost:3006/api/ai-dermatology/doctor/results/:resultUuid/review
```

Body:

```json
{
  "doctor_agreement": "partially_agree",
  "doctor_notes": "أوافق جزئيًا مع تحليل الذكاء الاصطناعي، لكن يلزم فحص سريري مباشر."
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "doctor_review": {
      "doctor_reviewed": true,
      "doctor_agreement": "partially_agree",
      "reviewed_by_doctor_id": 1,
      "doctor_notes": "...",
      "reviewed_at": "..."
    }
  }
}
```

---

## 18. User sees doctor review

```http
GET http://localhost:3006/api/ai-dermatology/sessions/:sessionUuid
```

Expected inside result:

```json
"doctor_review": {
  "doctor_reviewed": true,
  "doctor_agreement": "partially_agree",
  "reviewed_by_doctor_id": 1,
  "doctor_notes": "...",
  "reviewed_at": "..."
}
```

---

## 19. Admin gets AI usage overview

Admin Token required.

```http
GET http://localhost:3006/api/admin/ai-usage/overview?period_key=2026-06
```

Expected:

```json
{
  "success": true,
  "data": {
    "counters": {},
    "provider_summary": [],
    "policies_summary": []
  }
}
```

---

## 20. Admin gets user AI usage

```http
GET http://localhost:3006/api/admin/ai-usage/users/1
```

Expected:

```json
{
  "success": true,
  "data": {
    "user": {},
    "active_policies": [],
    "counters": [],
    "recent_events": []
  }
}
```

---

## 21. Super admin creates user policy

Super Admin Token required.

```http
POST http://localhost:3006/api/admin/ai-usage/policies
```

Body:

```json
{
  "policy_name": "VIP User AI Usage",
  "scope_type": "user",
  "user_id": 1,
  "max_total_requests_per_month": 100,
  "max_chat_messages_per_month": 80,
  "max_image_analyses_per_month": 30,
  "max_document_analyses_per_month": 15,
  "max_files_per_session": 10,
  "max_tokens_per_request": 8000,
  "is_active": true,
  "priority": 10
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "policy": {
      "scope_type": "user",
      "user_id": 1
    }
  }
}
```

---

## 22. Super admin updates policy

```http
PATCH http://localhost:3006/api/admin/ai-usage/policies/2
```

Body:

```json
{
  "max_total_requests_per_month": 120,
  "max_image_analyses_per_month": 40,
  "priority": 5
}
```

---

## 23. Super admin activates/deactivates policy

```http
PATCH http://localhost:3006/api/admin/ai-usage/policies/2/status
```

Body:

```json
{
  "is_active": true
}
```

Then check user usage:

```http
GET http://localhost:3006/api/ai-dermatology/usage
```

Expected policy:

```json
{
  "id": 2,
  "policy_name": "VIP User AI Usage",
  "scope_type": "user",
  "max_total_requests_per_month": 120
}
```

---

## 24. SQL verification queries

### Sessions

```sql
SELECT id, uuid, user_id, status, risk_level, last_message_at
FROM ai_sessions
ORDER BY id DESC;
```

### Messages

```sql
SELECT id, ai_session_id, user_id, sender_type, message_type, file_id, LEFT(content, 120) AS content_preview
FROM ai_session_messages
ORDER BY id DESC
LIMIT 20;
```

### Results

```sql
SELECT id, uuid, ai_session_id, user_id, result_type, severity, recommended_next_step, confidence_level, doctor_reviewed
FROM ai_analysis_results
ORDER BY id DESC
LIMIT 20;
```

### Files

```sql
SELECT id, uuid, file_category, original_filename, file_path, mime_type, file_size, is_public, related_to_type, related_to_id
FROM files
ORDER BY id DESC
LIMIT 20;
```

### Shares

```sql
SELECT *
FROM ai_result_shares
ORDER BY id DESC;
```

### Usage counters

```sql
SELECT user_id, period_key, total_requests, chat_messages_count, image_analyses_count, document_analyses_count, tokens_used
FROM ai_usage_counters;
```

### Provider logs

```sql
SELECT id, provider, model, request_type, prompt_tokens, completion_tokens, total_tokens, latency_ms, status, created_at
FROM ai_provider_logs
ORDER BY id DESC
LIMIT 20;
```

### Admin logs

```sql
SELECT id, admin_id, action, target_type, target_id, description, severity, created_at
FROM admin_logs
WHERE target_type = 'AIUsagePolicy'
ORDER BY id DESC
LIMIT 10;
```

---

## 25. Negative tests

### Missing token

Expected:

```json
{
  "error": "Authorization header missing"
}
```

### User token on doctor route

Expected:

```json
{
  "error": "Insufficient permissions"
}
```

### Doctor token on user route

Expected permission rejection.

### Invalid doctor agreement

```json
{
  "doctor_agreement": "maybe"
}
```

Expected:

```json
{
  "success": false,
  "message_ar": "قيمة doctor_agreement غير صحيحة. القيم المسموحة: agree, partially_agree, disagree"
}
```

### Upload non-image to image endpoint

Expected 400.

### Upload unsupported document type

Expected 400.

### Send message to completed session

Expected:

```json
{
  "success": false,
  "message_ar": "جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة"
}
```

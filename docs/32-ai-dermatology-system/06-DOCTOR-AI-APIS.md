# 06 - Doctor AI Dermatology APIs

This document describes the AI Dermatology APIs available to doctors.

Doctors can only access AI sessions explicitly shared with them by users/patients through `ai_result_shares`.

---

## Base URL

```http
http://localhost:3006/api/ai-dermatology
```

---

## Authentication

All doctor APIs require a doctor JWT.

```http
Authorization: Bearer DOCTOR_ACCESS_TOKEN
```

Doctor routes must be protected by:

```text
authenticateJWT
authorizeDoctor
```

User tokens must not be accepted on doctor routes.

---

## Doctor Permissions Model

A doctor can access an AI session only when:

1. `ai_result_shares.doctor_id` equals the authenticated doctor id.
2. `ai_result_shares.share_status = active`.
3. The related `ai_sessions.status != deleted`.
4. The file/result belongs to the shared session.

If a share is revoked, doctor access must stop.

---

# 1. Get Shared AI Sessions

Get all active AI sessions shared with the authenticated doctor.

```http
GET /api/ai-dermatology/doctor/shared-sessions
```

## Auth

Doctor token required.

## Success response

```json
{
  "success": true,
  "message_ar": "تم جلب جلسات الذكاء الاصطناعي المشتركة مع الطبيب بنجاح",
  "message_en": "Doctor shared AI sessions retrieved successfully",
  "data": {
    "shares": [
      {
        "share": {
          "id": 1,
          "uuid": "f7161635-845d-4044-920d-c0899f743bd0",
          "share_status": "active",
          "shared_at": "2026-06-02T21:16:41.000Z",
          "revoked_at": null
        },
        "session": {
          "id": 2,
          "uuid": "daf5bb5f-965f-4187-af0b-fad305df8239",
          "title": "تحليل حالة جلدية",
          "status": "active",
          "input_mode": "chat",
          "specialty": "dermatology",
          "language_code": "ar",
          "risk_level": "low",
          "last_message_at": "2026-06-02T20:45:55.000Z",
          "created_at": "2026-06-02T20:24:55.000Z"
        },
        "patient": {
          "id": 1,
          "uuid": "ab5c7031-396b-4383-89b9-1d630fe39e47",
          "email": "safnks0@gmail.com",
          "full_name": "Abdallah Mohamed Abdallah",
          "phone": "+20 10 03226502",
          "gender": null,
          "profile_picture_url": null
        },
        "result": {
          "uuid": "eca49b1d-bdf8-4a66-8f0b-c68f8a67e9e2",
          "result_type": "chat_response",
          "severity": "mild",
          "recommended_next_step": "book_dermatologist",
          "confidence_level": "medium",
          "needs_doctor_review": true,
          "created_at": "2026-06-02T20:45:55.000Z"
        },
        "appointment": null,
        "stats": {
          "messages_count": 2,
          "files_count": 0,
          "results_count": 1
        }
      }
    ]
  }
}
```

## Usage in doctor dashboard

Use this endpoint for the doctor's AI shared cases list screen.

Recommended UI columns/cards:

- patient name
- session title
- risk level
- latest result severity
- recommended next step
- needs doctor review
- shared date
- files count
- messages count

## Common errors

| Status | Reason |
|---:|---|
| 401 | missing/invalid doctor token |
| 403 | token is not doctor token |

---

# 2. Get Shared AI Session Details

Get full details for one shared AI session using the share UUID.

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

## Auth

Doctor token required.

## Example

```http
GET /api/ai-dermatology/doctor/shared-sessions/f7161635-845d-4044-920d-c0899f743bd0
```

## Success response shape

```json
{
  "success": true,
  "message_ar": "تم جلب تفاصيل جلسة الذكاء الاصطناعي المشتركة بنجاح",
  "message_en": "Shared AI session details retrieved successfully",
  "data": {
    "share": {},
    "session": {},
    "patient": {},
    "appointment": null,
    "messages": [],
    "files": [],
    "results": [],
    "latest_result": {},
    "stats": {}
  }
}
```

## Important fields

### `share`

```json
{
  "uuid": "f7161635-845d-4044-920d-c0899f743bd0",
  "share_status": "active",
  "shared_at": "...",
  "revoked_at": null
}
```

### `session`

```json
{
  "uuid": "daf5bb5f-965f-4187-af0b-fad305df8239",
  "title": "تحليل حالة جلدية",
  "status": "active",
  "input_mode": "chat",
  "specialty": "dermatology",
  "patient_consent": true,
  "risk_level": "low",
  "summary_json": null
}
```

### `patient`

```json
{
  "id": 1,
  "uuid": "ab5c7031-396b-4383-89b9-1d630fe39e47",
  "email": "safnks0@gmail.com",
  "full_name": "Abdallah Mohamed Abdallah",
  "phone": "+20 10 03226502",
  "gender": null,
  "date_of_birth": null
}
```

### `messages[]`

Contains all user and AI messages in the shared session.

```json
{
  "uuid": "...",
  "sender_type": "ai",
  "message_type": "text",
  "content": "...",
  "structured_content": {},
  "file": null,
  "tokens": {
    "prompt_tokens": 666,
    "completion_tokens": 375,
    "total_tokens": 1041
  }
}
```

### `files[]`

When the session includes files, each file has a doctor-specific secure URL:

```json
{
  "uuid": "FILE_UUID",
  "file_role": "skin_image",
  "file_category": "medical_image",
  "original_filename": "image.png",
  "mime_type": "image/png",
  "secure_file_url": "/api/ai-dermatology/doctor/files/FILE_UUID"
}
```

### `results[]`

Each result includes doctor review state:

```json
{
  "uuid": "eca49b1d-bdf8-4a66-8f0b-c68f8a67e9e2",
  "result_type": "chat_response",
  "severity": "mild",
  "confidence_level": "medium",
  "doctor_review": {
    "doctor_reviewed": true,
    "doctor_agreement": "partially_agree",
    "reviewed_by_doctor_id": 1,
    "doctor_notes": "...",
    "reviewed_at": "..."
  }
}
```

## Common errors

| Status | Reason |
|---:|---|
| 404 | share not found |
| 404 | share not active |
| 404 | share belongs to another doctor |
| 403 | not doctor token |

---

# 3. Secure AI File Access For Doctor

Display a private AI file from a shared session.

```http
GET /api/ai-dermatology/doctor/files/:fileUuid
```

## Auth

Doctor token required.

## Example

```http
GET /api/ai-dermatology/doctor/files/e2ed9336-efa1-4937-ab0b-f2cc49544629
```

## Success response

Returns the file binary with secure headers:

```http
Content-Type: image/png
Content-Disposition: inline; filename="fpj98z6.png"
Cache-Control: private, no-store, max-age=0
Pragma: no-cache
X-Content-Type-Options: nosniff
```

## Authorization rule

The doctor can access the file only if:

- file belongs to an AI session
- AI session is shared with this doctor
- share is active
- file is not deleted
- file exists on disk

## Common errors

| Status | Reason |
|---:|---|
| 404 | file not found or not shared with this doctor |
| 403 | invalid file category or path |
| 403 | user token used instead of doctor token |

## Important security note

Doctor file access uses a different endpoint from user file access:

```text
User:   /api/ai-dermatology/files/:fileUuid
Doctor: /api/ai-dermatology/doctor/files/:fileUuid
```

This keeps user ownership checks separate from doctor share checks.

---

# 4. Doctor Review AI Result

Allow a doctor to review an AI result shared with them.

```http
PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
```

## Auth

Doctor token required.

## Body

```json
{
  "doctor_agreement": "partially_agree",
  "doctor_notes": "أوافق جزئيًا مع تحليل الذكاء الاصطناعي. الاحتمالات المذكورة مناسبة كبداية، لكن يلزم فحص سريري مباشر وسؤال المريض عن وجود منتجات جديدة أو حساسية سابقة."
}
```

## Body fields

| Field | Type | Required | Values |
|---|---:|---:|---|
| `doctor_agreement` | enum | yes | `agree`, `partially_agree`, `disagree` |
| `doctor_notes` | string | no | Max 5000 chars. |

## Success response

```json
{
  "success": true,
  "message_ar": "تم حفظ مراجعة الطبيب لنتيجة الذكاء الاصطناعي بنجاح",
  "message_en": "Doctor review for AI result saved successfully",
  "data": {
    "share": {
      "uuid": "f7161635-845d-4044-920d-c0899f743bd0",
      "share_status": "active"
    },
    "session": {
      "uuid": "daf5bb5f-965f-4187-af0b-fad305df8239",
      "status": "active",
      "risk_level": "low"
    },
    "patient": {
      "id": 1,
      "uuid": "ab5c7031-396b-4383-89b9-1d630fe39e47",
      "email": "safnks0@gmail.com"
    },
    "result": {
      "uuid": "eca49b1d-bdf8-4a66-8f0b-c68f8a67e9e2",
      "result_type": "chat_response",
      "severity": "mild",
      "recommended_next_step": "book_dermatologist",
      "confidence_level": "medium",
      "needs_doctor_review": true
    },
    "doctor_review": {
      "doctor_reviewed": true,
      "doctor_agreement": "partially_agree",
      "reviewed_by_doctor_id": 1,
      "doctor_notes": "...",
      "reviewed_at": "2026-06-02T21:36:22.000Z"
    }
  }
}
```

## Database effect

Updates `ai_analysis_results`:

```text
doctor_reviewed = 1
doctor_agreement = agree | partially_agree | disagree
reviewed_by_doctor_id = doctor id
doctor_notes = text
reviewed_at = NOW()
```

## Visibility after review

Doctor review appears in:

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
GET /api/ai-dermatology/sessions/:uuid
```

This means both doctor and patient can see the review.

## Common errors

| Status | Reason |
|---:|---|
| 400 | invalid `doctor_agreement` |
| 400 | notes longer than 5000 chars |
| 404 | result not found or not shared with this doctor |
| 403 | not doctor token |

---

# Recommended Doctor Dashboard Flow

## Shared sessions list

1. Doctor logs in.
2. Dashboard calls:

```http
GET /api/ai-dermatology/doctor/shared-sessions
```

3. Doctor selects a shared case.
4. Dashboard calls:

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

5. Doctor reviews AI result:

```http
PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
```

---

# Negative Tests

## Use user token on doctor route

```http
GET /api/ai-dermatology/doctor/shared-sessions
```

Expected:

```json
{
  "error": "Insufficient permissions"
}
```

## Use invalid agreement

```json
{
  "doctor_agreement": "maybe",
  "doctor_notes": "test"
}
```

Expected:

```json
{
  "success": false,
  "message_ar": "قيمة doctor_agreement غير صحيحة. القيم المسموحة: agree, partially_agree, disagree"
}
```

## Review result not shared with doctor

Expected:

```json
{
  "success": false,
  "message_ar": "نتيجة الذكاء الاصطناعي غير موجودة أو غير مشتركة مع هذا الطبيب",
  "message_en": "AI result not found or not shared with this doctor"
}
```

---

# Production Recommendations

Currently, sharing with a doctor checks active doctor state. For production, it is recommended to also require:

```text
doctor_profiles.approval_status = approved
doctor_profiles.is_verified = 1
```

This prevents users from sharing medical AI cases with unverified doctors.

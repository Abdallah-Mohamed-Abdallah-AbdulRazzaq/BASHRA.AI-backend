# 08 - Security and Privacy

## Purpose

This document explains the security and privacy model for the Bashra AI Dermatology feature.

The AI feature handles sensitive medical data such as symptoms, skin images, medical reports, AI-generated summaries, and doctor reviews. Because of that, the implementation intentionally separates AI data from the normal app chat and protects files through authenticated APIs instead of public static links.

---

## Core security decisions

### 1. AI chat is separated from the normal app chat

The AI system uses its own tables and routes:

- `ai_sessions`
- `ai_session_messages`
- `ai_session_files`
- `ai_analysis_results`
- `ai_result_shares`

This prevents mixing user-to-user or user-to-doctor chat messages with AI diagnostic assistance.

### 2. User identity is based on `users.id`

The system does not require `medical_record_id` or `patient_id` for AI sessions.

Reason:

- Any registered app user can use AI.
- In this project, the normal app user is also the patient context for AI usage.
- AI results may later be shared with a doctor or appointment, but the session ownership starts with `users.id`.

### 3. Patient consent is stored

AI sessions include:

- `patient_consent`
- `consent_at`

If `AI_REQUIRE_PATIENT_CONSENT=true`, the application should require explicit consent before creating or using AI sessions.

Recommended consent copy:

> This AI analysis is not a final medical diagnosis. It is an assistive tool and does not replace consultation with a dermatologist.

---

## Authentication and authorization model

### User routes

User AI routes are protected with:

- `authenticateJWT`
- `authorizeUser`

Examples:

```http
POST /api/ai-dermatology/sessions
POST /api/ai-dermatology/sessions/:uuid/messages
POST /api/ai-dermatology/sessions/:uuid/images
POST /api/ai-dermatology/sessions/:uuid/documents
GET  /api/ai-dermatology/sessions/:uuid
GET  /api/ai-dermatology/files/:fileUuid
```

A user can only access AI sessions and files where `ai_sessions.user_id = req.user.id`.

### Doctor routes

Doctor AI routes are protected with:

- `authenticateJWT`
- `authorizeDoctor`

Examples:

```http
GET   /api/ai-dermatology/doctor/shared-sessions
GET   /api/ai-dermatology/doctor/shared-sessions/:shareUuid
GET   /api/ai-dermatology/doctor/files/:fileUuid
PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
```

A doctor can only see sessions or files if there is an active share row:

```text
ai_result_shares.doctor_id = req.user.id
ai_result_shares.share_status = active
```

### Admin routes

Admin AI usage routes are protected with:

- `authenticateJWT`
- `authorizeAdmin` for read operations
- `authorizeSuperAdmin` for create/update/status operations

Examples:

```http
GET   /api/admin/ai-usage/overview
GET   /api/admin/ai-usage/users/:userId
GET   /api/admin/ai-usage/policies
POST  /api/admin/ai-usage/policies
PATCH /api/admin/ai-usage/policies/:id
PATCH /api/admin/ai-usage/policies/:id/status
```

---

## File security model

### Medical images are not public

Skin images are stored under:

```text
upload/files/medical-image
```

This directory must not be added to public static middleware.

The app should never rely on this public URL:

```text
/upload/files/medical-image/...
```

Instead, use:

```http
GET /api/ai-dermatology/files/:fileUuid
```

for users, or:

```http
GET /api/ai-dermatology/doctor/files/:fileUuid
```

for doctors.

### Difference between `file_url` and `secure_file_url`

Some responses keep `file_url` for backward compatibility, but apps should use `secure_file_url`.

Example:

```json
{
  "file_url": "http://localhost:3006/upload/files/medical-image/...",
  "secure_file_url": "/api/ai-dermatology/files/e2ed9336-efa1-4937-ab0b-f2cc49544629"
}
```

The mobile app and dashboards should use `secure_file_url` with the correct JWT token.

### User secure file access

Endpoint:

```http
GET /api/ai-dermatology/files/:fileUuid
```

Checks:

1. File exists.
2. File is linked to `ai_session_files`.
3. Session belongs to the authenticated user.
4. File is not deleted.
5. File category is allowed.
6. File path is inside `upload/files`.
7. File exists on disk.

### Doctor secure file access

Endpoint:

```http
GET /api/ai-dermatology/doctor/files/:fileUuid
```

Checks:

1. Doctor is authenticated as doctor.
2. File belongs to an AI session.
3. AI session is shared with this doctor.
4. Share status is `active`.
5. File is not deleted.
6. File path is safe and exists on disk.

### Path traversal protection

Secure file endpoints normalize the file path and ensure it remains inside:

```text
process.cwd()/upload/files
```

If the resolved file path escapes this root, the request is rejected.

---

## Sharing security

### Share creation

Endpoint:

```http
POST /api/ai-dermatology/sessions/:uuid/share
```

A user can share a session with:

- `doctor_id`
- or `appointment_id`

If `appointment_id` is provided, the backend validates that the appointment belongs to the user and uses the appointment doctor.

### Share revocation

Endpoint:

```http
PATCH /api/ai-dermatology/shares/:shareUuid/revoke
```

Revoking a share sets:

```text
share_status = revoked
revoked_at = NOW()
```

After revocation, the doctor should no longer be able to access that session or its files.

---

## Doctor review security

Endpoint:

```http
PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
```

A doctor can review an AI result only if the result belongs to a session actively shared with that doctor.

Allowed values:

```text
agree
partially_agree
disagree
```

Doctor notes are limited to 5000 characters.

The review is stored in:

```text
ai_analysis_results.doctor_reviewed
ai_analysis_results.doctor_agreement
ai_analysis_results.reviewed_by_doctor_id
ai_analysis_results.doctor_notes
ai_analysis_results.reviewed_at
```

---

## OpenAI API key security

`OPENAI_API_KEY` must be stored only in `.env`.

Do not commit `.env` to Git.

The env validator should mask sensitive values. It should show:

```text
OPENAI_API_KEY: Set
```

not the full key.

Sensitive variables include:

- `OPENAI_API_KEY`
- `DB_PASSWORD`
- `SESSION_SECRET`
- `SECRET_KEY`

---

## Provider logs and privacy

`ai_provider_logs` stores operational metadata such as:

- provider
- model
- request type
- token counts
- latency
- status
- error message

Avoid storing full raw patient text or full image/document content in provider logs.

Recommended provider log metadata:

```json
{
  "mode": "openai",
  "file_uuid": "...",
  "mime_type": "image/png",
  "file_size": 2222457
}
```

---

## Medical safety rules

All AI responses should include:

- clear disclaimer
- no final diagnosis
- safest next step
- red flags when present
- recommendation to book dermatologist when appropriate
- urgent care recommendation when urgent red flags appear

Recommended disclaimer:

```text
This AI analysis is assistive and is not a final medical diagnosis. It does not replace consultation with a dermatologist.
```

---

## Recommended production improvements

Before production, consider adding:

1. File encryption at rest for medical images and reports.
2. Automatic retention policy for AI files.
3. Audit logs for file views by user and doctor.
4. More strict doctor sharing policy:
   - require `approval_status = approved`
   - require `is_verified = 1`
5. Consent versioning.
6. Admin controls for AI provider/model.
7. Per-user daily limits in addition to monthly limits.
8. Cost alerts based on token usage.
9. Terms of use for AI medical assistance.
10. Privacy policy update covering AI processing.

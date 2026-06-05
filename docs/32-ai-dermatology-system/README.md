# Bashra AI - AI Dermatology System Documentation

> **Version:** 1.0.0  
> **Last Updated:** 2026-06-03  
> **Scope:** Backend AI Dermatology Feature for Bashra AI  
> **Audience:** Backend Developers, Mobile Developers, Doctor Dashboard Developers, Admin Dashboard Developers, QA/Testers

---

## 1. Purpose

This documentation describes the complete **AI Dermatology System** implemented in the Bashra AI backend.

The feature allows normal users/patients to use AI assistance for dermatology-related cases through:

- Text chat symptoms.
- Skin image analysis.
- Medical report / document analysis.
- Secure private file viewing.
- AI session history.
- Final AI summary.
- Sharing AI results with doctors.
- Doctor review of AI results.
- Admin-controlled usage limits.

The system is intentionally separated from the existing application chat system. The AI chat has its own sessions, messages, files, results, shares, usage counters, and provider logs.

---

## 2. Main Feature Goals

The AI Dermatology System was built to achieve the following goals:

1. Provide AI-assisted dermatology triage and case summarization.
2. Support text, image, and document inputs.
3. Keep medical images and reports private and accessible only through authenticated secure endpoints.
4. Track user usage and enforce monthly limits.
5. Allow admins to control usage limits dynamically from APIs.
6. Allow users to share AI sessions/results with doctors.
7. Allow doctors to review AI results and add their professional opinion.
8. Keep all AI outputs structured as JSON to support mobile and dashboard UI.
9. Log OpenAI provider usage, latency, token consumption, and failures.
10. Avoid presenting AI output as a final medical diagnosis.

---

## 3. High-Level System Flow

```text
User logs in
   |
   v
Create AI dermatology session
   |
   +--> Send text symptoms
   |       |
   |       v
   |   OpenAI chat analysis
   |
   +--> Upload skin image
   |       |
   |       v
   |   Store file privately + OpenAI image analysis
   |
   +--> Upload PDF/TXT report
   |       |
   |       v
   |   Store file privately + OpenAI document analysis
   |
   v
AI results are stored in database
   |
   +--> User views full session details
   |
   +--> User completes session and generates final summary
   |
   +--> User shares session/result with doctor
           |
           v
       Doctor views shared AI session
           |
           v
       Doctor reviews AI result
           |
           v
       User sees doctor review inside session details
```

---

## 4. Implemented API Groups

### User AI APIs

Base path:

```http
/api/ai-dermatology
```

Implemented user-facing APIs:

```http
POST  /sessions
GET   /sessions
GET   /sessions/:uuid
POST  /sessions/:uuid/messages
POST  /sessions/:uuid/images
POST  /sessions/:uuid/documents
POST  /sessions/:uuid/complete
GET   /files/:fileUuid
GET   /usage
POST  /sessions/:uuid/share
GET   /sessions/:uuid/shares
PATCH /shares/:shareUuid/revoke
```

### Doctor AI APIs

Doctor-only APIs:

```http
GET   /doctor/shared-sessions
GET   /doctor/shared-sessions/:shareUuid
GET   /doctor/files/:fileUuid
PATCH /doctor/results/:resultUuid/review
```

### Admin AI Usage APIs

Admin base path:

```http
/api/admin/ai-usage
```

Implemented admin APIs:

```http
GET   /overview
GET   /users/:userId
GET   /policies
GET   /policies/:id
POST  /policies
PATCH /policies/:id
PATCH /policies/:id/status
```

---

## 5. Main Backend Files

### Controllers

```text
controllers/AIDermatologyController.js
controllers/AdminAIUsageController.js
```

### Routes

```text
routes/aiDermatologyRoutes.js
routes/adminAIUsageRoutes.js
routes/index.js
```

### AI Services

```text
services/ai/AIDermatologyService.js
services/ai/AISessionService.js
services/ai/AIUsageService.js
services/ai/AIShareService.js
services/ai/AIProviderFactory.js
services/ai/OpenAIProvider.js
services/ai/dermatologyPrompt.js
```

### Supporting Files

```text
utils/envValidator.js
middleware/authMiddleware.js
middleware/uploadMiddleware.js
middleware/fileUploadMiddleware.js
middleware/formDataMiddleware.js
services/fileService.js
scripts/ai-dermatology-migration.sql
```

---

## 6. Database Tables

Main AI tables:

```text
ai_sessions
ai_session_messages
ai_session_files
ai_analysis_results
ai_usage_policies
ai_usage_counters
ai_usage_events
ai_provider_logs
ai_result_shares
```

Related existing tables:

```text
users
doctors
appointments
files
admin_logs
```

---

## 7. Environment Variables

Required AI environment variables:

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4.1-mini
AI_ENABLE_IMAGE_ANALYSIS=true
AI_ENABLE_DOCUMENT_ANALYSIS=true
AI_REQUIRE_PATIENT_CONSENT=true
AI_DEFAULT_LANGUAGE=ar
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
AI_USE_MOCK=false
AI_TEMPERATURE=0.2
```

Important security note:

- `OPENAI_API_KEY` must never be printed in full logs.
- `envValidator.js` must mask sensitive environment variables and print `Set` instead of the actual key.

---

## 8. Current Supported Input Types

| Type | Supported | Notes |
|---|---:|---|
| Text chat | Yes | Arabic/English structured dermatology response |
| Skin image | Yes | Images are private and accessible only through secure endpoints |
| PDF report | Yes | Sent to OpenAI document analysis |
| TXT report | Yes | Text content is sent as input_text |
| DOCX | Not yet | Can be added later with text extraction |
| OCR image report | Not yet | Can be added later if needed |

---

## 9. Security Model Summary

- AI medical images are **not public static files**.
- AI files are accessed through secure endpoints only.
- Users can access only their own AI files.
- Doctors can access only files from sessions actively shared with them.
- Admin usage management requires admin/super admin authorization.
- Doctor review requires doctor authorization and an active share.
- User routes require user authorization.

---

## 10. Medical Safety Principles

The AI Dermatology System is designed as an assistance and triage tool only.

It must always communicate that:

- AI output is not a final diagnosis.
- A dermatologist review is recommended when appropriate.
- Urgent red flags require urgent medical care.
- AI should not recommend unsafe prescription medications or strong topical treatments without doctor review.

---

## 11. Documentation Map

This folder is planned as follows:

```text
README.md
01-ARCHITECTURE.md
02-IMPLEMENTATION-SUMMARY.md
03-DATABASE-SCHEMA.md
04-DATABASE-RELATIONS.md
05-USER-AI-APIS.md
06-DOCTOR-AI-APIS.md
07-ADMIN-AI-USAGE-APIS.md
08-SECURITY-AND-PRIVACY.md
09-OPENAI-INTEGRATION.md
10-TESTING-GUIDE.md
11-ERRORS-REFERENCE.md
12-DEPLOYMENT-CHECKLIST.md
13-FINAL-SUMMARY.md
ai-dermatology-postman-collection.json
ai-dermatology-postman-environment.json
```

This first batch includes files 1 to 5.

---

## 12. Current Completion Status

| Area | Status |
|---|---|
| User AI session | Completed |
| Text AI chat | Completed |
| Image analysis | Completed |
| Document analysis | Completed |
| Secure user file access | Completed |
| Final summary | Completed |
| Share with doctor | Completed |
| Doctor shared sessions | Completed |
| Doctor secure file access | Completed |
| Doctor review | Completed |
| User sees doctor review | Completed |
| Admin AI usage policies | Completed |
| Admin usage overview | Completed |
| Admin logs for AI policy changes | Completed |
| Postman collection | Planned in batch 4 |

# 01 - AI Dermatology System Architecture

> **System:** Bashra AI Backend  
> **Feature:** AI Dermatology Assistant  
> **Architecture Type:** Modular Express.js service with AI provider abstraction

---

## 1. Design Decision: Separate AI Chat From App Chat

The AI Dermatology chat was intentionally separated from the normal app chat.

The existing application chat is for user-doctor or user-staff communication. The AI chat is different because it needs:

- AI-specific sessions.
- AI-specific messages.
- Medical image/report upload and analysis.
- Token and usage tracking.
- AI provider logs.
- Structured medical JSON results.
- Doctor review integration.
- Admin-controlled usage limits.

Therefore, the AI system uses its own database tables and routes instead of reusing the normal chat tables.

---

## 2. Main Modules

```text
routes/aiDermatologyRoutes.js
        |
        v
controllers/AIDermatologyController.js
        |
        +--> services/ai/AISessionService.js
        +--> services/ai/AIDermatologyService.js
        +--> services/ai/AIUsageService.js
        +--> services/ai/AIShareService.js
        +--> services/ai/AIProviderFactory.js
                 |
                 v
          services/ai/OpenAIProvider.js
```

Admin usage control is separated:

```text
routes/adminAIUsageRoutes.js
        |
        v
controllers/AdminAIUsageController.js
        |
        v
ai_usage_policies / ai_usage_counters / ai_usage_events / ai_provider_logs
```

---

## 3. Route Architecture

### AI Dermatology Routes

File:

```text
routes/aiDermatologyRoutes.js
```

This file contains both user and doctor AI routes.

Important rule:

> Doctor routes must be registered before `router.use(authenticateJWT, authorizeUser)`.

Reason:

If doctor routes are placed after the user-only middleware, doctor tokens will be rejected by `authorizeUser` before reaching `authorizeDoctor`.

Correct order:

```js
// Doctor routes first
router.get('/doctor/shared-sessions', authenticateJWT, authorizeDoctor, ...);
router.get('/doctor/shared-sessions/:shareUuid', authenticateJWT, authorizeDoctor, ...);
router.get('/doctor/files/:fileUuid', authenticateJWT, authorizeDoctor, ...);
router.patch('/doctor/results/:resultUuid/review', authenticateJWT, authorizeDoctor, parseFormData, ...);

// User routes after that
router.use(authenticateJWT, authorizeUser);
```

---

## 4. User Flow Architecture

### 4.1 Create Session

```http
POST /api/ai-dermatology/sessions
```

Flow:

```text
Controller
   -> AISessionService.createSession
      -> Insert ai_sessions
      -> Return session
```

Session belongs to `users.id` through `ai_sessions.user_id`.

No `patient_id` is used because the project treats the normal user as the patient for AI feature purposes.

---

### 4.2 Send Text Message

```http
POST /api/ai-dermatology/sessions/:uuid/messages
```

Flow:

```text
Controller
   -> AIDermatologyService.sendTextMessage
      -> Check session ownership and active status
      -> Check usage limits
      -> Store user message
      -> Call OpenAIProvider.analyzeChatMessage
      -> Store AI message
      -> Store ai_analysis_results row
      -> Update ai_sessions risk/last_message_at
      -> Insert ai_provider_logs
      -> Record ai_usage_events
      -> Update ai_usage_counters
```

---

### 4.3 Analyze Skin Image

```http
POST /api/ai-dermatology/sessions/:uuid/images
```

Flow:

```text
Upload middleware receives image
   -> AIDermatologyService.analyzeImage
      -> Check active session ownership
      -> Check image usage limit
      -> Check max_files_per_session
      -> FileService.uploadFile with file_category = medical_image
      -> Insert ai_session_files with file_role = skin_image
      -> Insert user image message
      -> OpenAI image analysis
      -> Insert AI image message
      -> Insert ai_analysis_results result_type = image_analysis
      -> Mark ai_session_files as processed
      -> Insert provider log
      -> Record usage
      -> Return secure_file_url
```

Important:

- `medical-image` folder is not exposed through public static middleware.
- Image response returns `secure_file_url`.

---

### 4.4 Analyze Document / Report

```http
POST /api/ai-dermatology/sessions/:uuid/documents
```

Flow:

```text
Upload middleware receives document
   -> AIDermatologyService.analyzeDocument
      -> Check PDF/TXT type
      -> Check active session ownership
      -> Check document usage limit
      -> Check max_files_per_session
      -> FileService.uploadFile
      -> Insert ai_session_files with file_role = medical_report
      -> Insert user document message
      -> OpenAI document analysis
      -> Insert AI document message
      -> Insert ai_analysis_results result_type = document_analysis
      -> Mark ai_session_files as processed
      -> Insert provider log
      -> Record usage
      -> Return secure_file_url
```

Supported currently:

```text
application/pdf
text/plain
```

---

### 4.5 Secure File Access

User endpoint:

```http
GET /api/ai-dermatology/files/:fileUuid
```

Flow:

```text
AIDermatologyService.getSecureAIFileForUser
   -> Find file by uuid
   -> Join ai_session_files
   -> Join ai_sessions
   -> Check s.user_id = req.user.id
   -> Check file is not deleted
   -> Check category allowed
   -> Resolve disk path safely
   -> Check file exists
   -> Increment access_count
   -> sendFile
```

---

### 4.6 Complete Session

```http
POST /api/ai-dermatology/sessions/:uuid/complete
```

Flow:

```text
AIDermatologyService.completeSession
   -> Check session belongs to user
   -> Check session is active
   -> Check there is at least one AI result
   -> Load messages/results/files
   -> OpenAI final summary
   -> Insert AI message
   -> Insert ai_analysis_results result_type = final_summary
   -> Update ai_sessions.status = completed
   -> Store summary_json
   -> Insert provider log request_type = summary
   -> Record usage event final_summary
```

After completion, the same session cannot accept new messages/images/documents because send/analyze logic requires an active session.

---

## 5. Share With Doctor Architecture

### 5.1 User Shares AI Session

```http
POST /api/ai-dermatology/sessions/:uuid/share
```

Flow:

```text
AIShareService.createShare
   -> Validate doctor_id or appointment_id
   -> Check session belongs to user
   -> Select latest shareable result
   -> If appointment_id given, validate appointment belongs to user
   -> Resolve doctor_id
   -> Validate doctor exists and is active
   -> Check duplicate active share
   -> Insert ai_result_shares
```

The system can share either:

- Directly with `doctor_id`.
- Through `appointment_id`.

If appointment is used, doctor is derived from the appointment.

---

### 5.2 Doctor Views Shared Sessions

```http
GET /api/ai-dermatology/doctor/shared-sessions
```

Flow:

```text
AIShareService.getDoctorSharedSessions
   -> Find active shares where doctor_id = req.user.id
   -> Join ai_sessions
   -> Join users and user_complete_profiles
   -> Join ai_analysis_results
   -> Return summary list
```

---

### 5.3 Doctor Views Shared Session Details

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

Flow:

```text
AIShareService.getDoctorSharedSessionByShareUuid
   -> Validate active share belongs to doctor
   -> Load session
   -> Load patient info
   -> Load messages
   -> Load files with doctor secure_file_url
   -> Load results with doctor_review
```

---

### 5.4 Doctor Secure File Access

```http
GET /api/ai-dermatology/doctor/files/:fileUuid
```

Flow:

```text
AIShareService.getSecureSharedAIFileForDoctor
   -> Find file by uuid
   -> Join ai_session_files
   -> Join active ai_result_shares
   -> Ensure share.doctor_id = req.user.id
   -> Ensure file/session valid
   -> Resolve disk path safely
   -> Increment access_count
   -> sendFile
```

---

### 5.5 Doctor Reviews AI Result

```http
PATCH /api/ai-dermatology/doctor/results/:resultUuid/review
```

Flow:

```text
AIShareService.reviewSharedAIResult
   -> Validate doctor_agreement
   -> Check result belongs to a session shared with doctor
   -> Update ai_analysis_results doctor review fields
   -> Return updated review
```

Allowed values:

```text
agree
partially_agree
disagree
```

---

## 6. Admin Usage Architecture

### 6.1 Admin AI Usage Controller

File:

```text
controllers/AdminAIUsageController.js
```

Responsibilities:

- List usage policies.
- Create usage policies.
- Update usage policies.
- Activate/deactivate usage policies.
- Show user usage.
- Show AI usage overview.
- Insert admin logs for policy changes.

---

### 6.2 Usage Policy Resolution

Policy priority is handled by `AIUsageService`.

Typical priority order:

```text
1. User-specific active policy
2. Package-specific active policy, if implemented in user subscription logic
3. Global active policy
```

Within policies, lower `priority` number means higher priority.

Example:

```text
VIP User AI Usage
scope_type = user
user_id = 1
priority = 5
```

This overrides:

```text
Default Free AI Usage
scope_type = global
priority = 100
```

---

## 7. OpenAI Provider Architecture

Files:

```text
services/ai/AIProviderFactory.js
services/ai/OpenAIProvider.js
services/ai/dermatologyPrompt.js
```

Flow:

```text
AIDermatologyService
   -> AIProviderFactory.createProvider()
      -> OpenAIProvider
         -> OpenAI Responses API
         -> Structured JSON schema response
```

Supported provider request types:

```text
chat
image
document
summary
```

All provider calls are logged in:

```text
ai_provider_logs
```

---

## 8. File Storage Architecture

AI images and documents use the existing `files` table and file storage service.

### Medical images

```text
upload/files/medical-image
file_category = medical_image
is_public = 0
related_to_type = ai_session
```

### AI documents/reports

Initially reports were stored as:

```text
file_category = document
```

A security recommendation was later added to use a non-public category for AI documents where possible, while keeping support for older records.

Allowed secure categories:

```text
medical_image
document
other
```

---

## 9. Response Structure Strategy

AI responses are stored and returned in structured JSON.

Core fields:

```json
{
  "language": "ar",
  "case_summary": "...",
  "possible_conditions": [],
  "severity": "mild",
  "red_flags": [],
  "safe_advice": [],
  "avoid": [],
  "recommended_next_step": "book_dermatologist",
  "follow_up_questions": [],
  "needs_doctor_review": true,
  "confidence_level": "medium",
  "disclaimer": "..."
}
```

This enables:

- Mobile cards.
- Doctor dashboard review panels.
- Admin reports.
- Safer UI logic.
- Consistent medical disclaimers.

---

## 10. Key Architectural Constraints

1. AI session must belong to `users.id`.
2. AI files must not be served as public static assets.
3. Doctor access requires an active share.
4. Doctor review requires an active share.
5. Admin policy modification requires super admin.
6. Usage is monthly and stored in counters.
7. Provider tokens and latency must be logged.
8. AI output must never be presented as final diagnosis.
9. Patient consent is required when configured.
10. Completed sessions are read-only for new AI inputs.

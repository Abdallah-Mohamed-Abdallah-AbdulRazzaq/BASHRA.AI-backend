# 04 - AI Dermatology Database Relations

> This document explains how the AI Dermatology tables relate to each other and to the existing Bashra AI database.

---

## 1. Main Relationship Diagram

```text
users
  |
  | 1:N
  v
ai_sessions
  |
  +-- 1:N --> ai_session_messages
  |
  +-- 1:N --> ai_session_files -- N:1 --> files
  |
  +-- 1:N --> ai_analysis_results
  |
  +-- 1:N --> ai_provider_logs
  |
  +-- 1:N --> ai_usage_events
  |
  +-- 1:N --> ai_result_shares -- N:1 --> doctors
                                      |
                                      +-- optional N:1 --> appointments
```

Usage limits:

```text
users
  |
  +-- 1:N --> ai_usage_counters
  |
  +-- 1:N --> ai_usage_events
  |
  +-- matched by --> ai_usage_policies
```

Doctor review:

```text
doctors
  |
  +-- 1:N --> ai_analysis_results.reviewed_by_doctor_id
```

---

## 2. User to AI Session

```text
users.id = ai_sessions.user_id
```

Meaning:

- The normal app user owns the AI session.
- The same user is treated as the patient for AI flows.
- We intentionally do not require `patient_id` or `medical_record_id` in AI sessions.

Reason:

The feature is available to any registered user, even before booking a doctor or creating a medical record.

---

## 3. AI Session to Messages

```text
ai_sessions.id = ai_session_messages.ai_session_id
```

Each AI session can have multiple messages:

```text
user/text
ai/text
user/image
ai/image
user/document
ai/document
ai/text final summary
```

Messages keep a chronological record of the AI interaction.

---

## 4. AI Session to Files

```text
ai_sessions.id = ai_session_files.ai_session_id
ai_session_files.file_id = files.id
```

This relationship links uploaded files to AI sessions.

Examples:

```text
Skin image:
  ai_session_files.file_role = skin_image
  files.file_category = medical_image

Medical report:
  ai_session_files.file_role = medical_report
  files.file_category = document / other
```

---

## 5. AI Message to File

```text
ai_session_messages.file_id = files.id
```

When a user uploads an image or document, a user message is stored with `file_id`.

Example:

```text
sender_type = user
message_type = image
file_id = files.id
```

Then the AI response is also stored with same `file_id` for easy UI mapping.

---

## 6. AI Session to Analysis Results

```text
ai_sessions.id = ai_analysis_results.ai_session_id
```

Each AI interaction can create one structured result.

Examples:

```text
Text message     -> chat_response
Image upload     -> image_analysis
Document upload  -> document_analysis
Complete session -> final_summary
```

The latest result is usually used when sharing a session with a doctor.

Priority for selecting latest shareable result:

```text
1. final_summary
2. document_analysis
3. image_analysis
4. chat_response
```

---

## 7. AI Result to Doctor Review

Doctor review fields are stored directly inside `ai_analysis_results`.

```text
ai_analysis_results.doctor_reviewed
ai_analysis_results.doctor_agreement
ai_analysis_results.reviewed_by_doctor_id
ai_analysis_results.doctor_notes
ai_analysis_results.reviewed_at
```

Relation:

```text
doctors.id = ai_analysis_results.reviewed_by_doctor_id
```

Why no separate table?

- Current requirement needs one review state per AI result.
- Existing columns are enough.
- It keeps the result and review together.

If future needs require multiple doctor reviews per result, a separate `ai_result_doctor_reviews` table can be added.

---

## 8. AI Session / Result to Share

```text
ai_sessions.id = ai_result_shares.ai_session_id
ai_analysis_results.id = ai_result_shares.ai_result_id
users.id = ai_result_shares.user_id
doctors.id = ai_result_shares.doctor_id
appointments.id = ai_result_shares.appointment_id
```

A share grants doctor access to a user AI session.

A share can point to:

- A full AI session.
- A specific/latest AI result.
- A doctor directly.
- An appointment context if available.

Share status:

```text
active
revoked
```

Doctor access is allowed only if:

```text
ai_result_shares.doctor_id = authenticated doctor id
ai_result_shares.share_status = active
```

---

## 9. AI Session to Provider Logs

```text
ai_sessions.id = ai_provider_logs.ai_session_id
users.id = ai_provider_logs.user_id
```

Each real or failed provider call is logged.

Request types:

```text
chat
image
document
summary
```

This allows admin/operator visibility into:

- Token usage.
- Latency.
- Provider/model.
- Failure reasons.

---

## 10. User to Usage Counters

```text
users.id = ai_usage_counters.user_id
```

Usage is counted per period.

Common period:

```text
period_type = monthly
period_key = YYYY-MM
```

Example:

```text
period_key = 2026-06
```

Counters:

```text
total_requests
chat_messages_count
image_analyses_count
document_analyses_count
tokens_used
```

---

## 11. User to Usage Events

```text
users.id = ai_usage_events.user_id
ai_sessions.id = ai_usage_events.ai_session_id
ai_analysis_results.id = ai_usage_events.ai_result_id
```

Usage events are more detailed than counters.

They keep each event:

```text
chat_message
image_analysis
document_analysis
final_summary
```

Statuses:

```text
success
failed
blocked_limit
```

---

## 12. Usage Policy Matching

`ai_usage_policies` can be global, user-specific, or package-specific.

### Global Policy

```text
scope_type = global
user_id = NULL
package_id = NULL
```

Applies to everyone unless overridden.

### User Policy

```text
scope_type = user
user_id = users.id
```

Overrides global if active and higher priority.

### Package Policy

```text
scope_type = package
package_id = packages.id
```

Prepared for future package/subscription integration.

### Priority

Lower priority value wins.

Example:

```text
VIP User AI Usage priority 5
Default Free AI Usage priority 100
```

The VIP user policy wins for user ID 1.

---

## 13. File Security Relationship

### User file access

User can access a file only when:

```text
files.uuid = :fileUuid
files.id = ai_session_files.file_id
ai_session_files.ai_session_id = ai_sessions.id
ai_sessions.user_id = authenticated user id
files.is_deleted = 0
```

### Doctor file access

Doctor can access a file only when:

```text
files.uuid = :fileUuid
files.id = ai_session_files.file_id
ai_session_files.ai_session_id = ai_result_shares.ai_session_id
ai_result_shares.doctor_id = authenticated doctor id
ai_result_shares.share_status = active
files.is_deleted = 0
```

This ensures the doctor can only see files from sessions shared with him.

---

## 14. Admin Logs Relationship

Admin usage policy changes are stored in `admin_logs`.

```text
admin_logs.admin_id = admins.id
admin_logs.target_type = AIUsagePolicy
admin_logs.target_id = ai_usage_policies.id
```

Actions:

```text
AI_USAGE_POLICY_CREATE
AI_USAGE_POLICY_UPDATE
AI_USAGE_POLICY_ACTIVATE
AI_USAGE_POLICY_DEACTIVATE
```

---

## 15. Lifecycle Example

### Step 1: User creates session

```text
users.id = 1
ai_sessions.id = 2
ai_sessions.user_id = 1
```

### Step 2: User sends text

```text
ai_session_messages:
  user text message
  ai text response

ai_analysis_results:
  result_type = chat_response
```

### Step 3: User shares with doctor

```text
ai_result_shares:
  ai_session_id = 2
  ai_result_id = latest result
  user_id = 1
  doctor_id = 1
  share_status = active
```

### Step 4: Doctor reviews result

```text
ai_analysis_results:
  doctor_reviewed = 1
  doctor_agreement = partially_agree
  reviewed_by_doctor_id = 1
  doctor_notes = ...
  reviewed_at = NOW()
```

### Step 5: User sees review

`GET /api/ai-dermatology/sessions/:uuid` returns:

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

## 16. Recommended Indexes

Already implemented indexes include session/user/result/share lookups.

Recommended important indexes:

```sql
idx_ai_sessions_user
idx_ai_session_messages_session
idx_ai_session_files_session
idx_ai_analysis_results_session
idx_ai_result_shares_session
idx_ai_result_shares_doctor
idx_ai_result_shares_user
idx_ai_usage_counters_user_period
idx_ai_usage_events_user
idx_ai_provider_logs_session
```

---

## 17. Data Integrity Rules

1. `ai_sessions.user_id` must always reference the owner user.
2. `ai_session_messages.ai_session_id` must belong to same user context.
3. `ai_session_files.file_id` must reference a private file for AI uploads.
4. `ai_analysis_results.user_id` must match the session owner.
5. `ai_result_shares.user_id` must match the session owner.
6. Doctor review should be allowed only when active share exists.
7. Secure file endpoints must validate ownership/share before `sendFile`.
8. Usage counters must be updated only for successful counted events.
9. Failed events should be logged but not necessarily counted in counters.
10. Revoked shares should immediately block doctor session/file access.

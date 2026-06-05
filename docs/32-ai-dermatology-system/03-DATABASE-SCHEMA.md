# 03 - AI Dermatology Database Schema

> This document describes the database tables used by the AI Dermatology System.

---

## 1. Main AI Tables

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

## 2. `ai_sessions`

Stores AI dermatology sessions created by users.

### Purpose

Each session represents one AI dermatology conversation/case owned by a normal app user.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Internal primary key |
| `uuid` | Public session identifier used in APIs |
| `user_id` | Owner user ID; the app user is treated as patient |
| `title` | Session title |
| `status` | `active`, `completed`, `archived`, `deleted` |
| `input_mode` | `chat`, `image`, `document`, `mixed` |
| `specialty` | Currently `dermatology` |
| `language_code` | Usually `ar` |
| `patient_consent` | Whether user consented to AI analysis |
| `consent_at` | Consent timestamp |
| `risk_level` | `low`, `medium`, `high`, `urgent` |
| `ai_provider` | Example: `openai` |
| `ai_model` | Example: `gpt-4.1-mini` |
| `last_message_at` | Last AI/user interaction time |
| `summary_json` | Final session summary after completion |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

### Notes

- No `patient_id` is required.
- `user_id` is the patient/user identity for AI feature.
- A completed session becomes read-only for new AI inputs.

---

## 3. `ai_session_messages`

Stores user and AI messages inside AI sessions.

### Purpose

Tracks chat messages, image messages, document messages, and AI responses.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Internal primary key |
| `uuid` | Public message UUID |
| `ai_session_id` | Linked AI session |
| `user_id` | Owner user |
| `sender_type` | `user` or `ai` |
| `message_type` | `text`, `image`, `document` |
| `content` | Human-readable message content or case summary |
| `structured_content` | JSON AI response for AI messages |
| `file_id` | Optional file attached to this message |
| `prompt_tokens` | Input tokens used by AI response |
| `completion_tokens` | Output tokens used by AI response |
| `total_tokens` | Total tokens |
| `created_at` | Created timestamp |

### Notes

- User messages usually have token fields `NULL`.
- AI messages contain token usage when OpenAI is used.
- AI structured JSON is stored in `structured_content`.

---

## 4. `ai_session_files`

Links uploaded files to AI sessions.

### Purpose

Associates uploaded skin images or medical reports with an AI session.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Internal primary key |
| `ai_session_id` | Linked AI session |
| `user_id` | Owner user |
| `file_id` | Linked `files.id` |
| `file_role` | `skin_image`, `medical_report`, etc. |
| `analysis_status` | `pending`, `processed`, `failed` |
| `extracted_text` | Optional extracted text, future use |
| `metadata` | JSON metadata |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

### Used Roles

```text
skin_image
medical_report
```

### Used Statuses

```text
pending
processed
failed
```

---

## 5. `ai_analysis_results`

Stores structured AI analysis results and doctor reviews.

### Purpose

This is the main table for AI outputs.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Internal primary key |
| `uuid` | Public result UUID |
| `ai_session_id` | Linked AI session |
| `user_id` | Owner user |
| `result_type` | `chat_response`, `image_analysis`, `document_analysis`, `final_summary` |
| `language_code` | Response language |
| `case_summary` | Main AI summary |
| `possible_conditions` | JSON array |
| `severity` | `mild`, `moderate`, `severe`, `urgent` |
| `red_flags` | JSON array |
| `safe_advice` | JSON array |
| `avoid` | JSON array |
| `recommended_next_step` | Next recommended user action |
| `confidence_level` | `low`, `medium`, `high` |
| `needs_doctor_review` | Boolean |
| `ai_response_json` | Full AI response JSON |
| `processing_time_ms` | Provider processing time |
| `doctor_reviewed` | Whether doctor reviewed this result |
| `doctor_agreement` | `agree`, `partially_agree`, `disagree`, `not_reviewed` |
| `reviewed_by_doctor_id` | Reviewing doctor ID |
| `doctor_notes` | Doctor notes |
| `reviewed_at` | Review timestamp |
| `created_at` | Created timestamp |

### Result Types

```text
chat_response
image_analysis
document_analysis
final_summary
```

### Doctor Agreement Values

```text
agree
partially_agree
disagree
not_reviewed
```

---

## 6. `ai_usage_policies`

Stores AI usage limit policies.

### Purpose

Allows admins to control how many AI requests a user/package/global plan can use.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `policy_name` | Human-readable policy name |
| `scope_type` | `global`, `user`, `package` |
| `user_id` | Used when scope is `user` |
| `package_id` | Used when scope is `package` |
| `max_total_requests_per_month` | Monthly total AI requests |
| `max_chat_messages_per_month` | Monthly chat messages |
| `max_image_analyses_per_month` | Monthly image analyses |
| `max_document_analyses_per_month` | Monthly document analyses |
| `max_files_per_session` | Files allowed in one AI session |
| `max_tokens_per_request` | Token limit setting |
| `is_active` | Policy active flag |
| `priority` | Lower number means higher priority |
| `created_by_admin_id` | Creator admin |
| `updated_by_admin_id` | Last updater admin |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

### Example Policies

Default global policy:

```text
Default Free AI Usage
scope_type = global
priority = 100
```

VIP user policy:

```text
VIP User AI Usage
scope_type = user
user_id = 1
priority = 5
```

---

## 7. `ai_usage_counters`

Stores monthly/daily counters for each user.

### Purpose

Fast usage retrieval and limit checks.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `user_id` | User |
| `period_type` | `daily` or `monthly` |
| `period_key` | Example: `2026-06` |
| `total_requests` | Total counted AI requests |
| `chat_messages_count` | Chat count |
| `image_analyses_count` | Image count |
| `document_analyses_count` | Document count |
| `tokens_used` | Total tokens used |
| `last_request_at` | Last counted request time |
| `created_at` | Created timestamp |
| `updated_at` | Updated timestamp |

### Notes

- `final_summary` increases `total_requests` and `tokens_used`.
- It does not have a dedicated counter field.

---

## 8. `ai_usage_events`

Stores detailed usage events.

### Purpose

Audit trail for each usage-affecting event.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `user_id` | User |
| `ai_session_id` | Optional session |
| `ai_result_id` | Optional result |
| `event_type` | Event type |
| `status` | `success`, `failed`, `blocked_limit` |
| `counted_units` | Counted units |
| `prompt_tokens` | Input tokens |
| `completion_tokens` | Output tokens |
| `total_tokens` | Total tokens |
| `metadata` | JSON details |
| `created_at` | Created timestamp |

### Event Types Used

```text
chat_message
image_analysis
document_analysis
final_summary
```

---

## 9. `ai_provider_logs`

Stores OpenAI/provider calls.

### Purpose

Operational logging for provider calls, latency, status, and token usage.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `ai_session_id` | Session |
| `user_id` | User |
| `provider` | Example: `openai` |
| `model` | Example: `gpt-4.1-mini` |
| `request_type` | `chat`, `image`, `document`, `summary` |
| `prompt_tokens` | Input tokens |
| `completion_tokens` | Output tokens |
| `total_tokens` | Total tokens |
| `latency_ms` | Provider latency |
| `status` | `success` or `failed` |
| `error_message` | Error if failed |
| `request_metadata` | JSON request metadata |
| `response_metadata` | JSON response metadata |
| `created_at` | Timestamp |

---

## 10. `ai_result_shares`

Stores user shares of AI sessions/results with doctors.

### Purpose

Controls doctor access to AI session details and files.

### Important Columns

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `uuid` | Public share UUID |
| `ai_session_id` | Shared AI session |
| `ai_result_id` | Shared/latest AI result |
| `user_id` | Owner user |
| `doctor_id` | Doctor receiving access |
| `appointment_id` | Optional appointment context |
| `share_status` | `active`, `revoked` |
| `shared_at` | Share timestamp |
| `revoked_at` | Revoked timestamp |

### Notes

- Doctors can only view sessions/files through active shares.
- Revoked shares must block doctor access.

---

## 11. Existing `files` Table Usage

AI feature uses existing `files` table.

### AI Images

```text
file_category = medical_image
is_public = 0
related_to_type = ai_session
related_to_id = ai_sessions.id
```

### AI Documents

```text
file_category = document or other
is_public = 0
related_to_type = ai_session
related_to_id = ai_sessions.id
```

### Access Tracking

Secure file endpoints update:

```text
access_count
last_accessed_at
```

---

## 12. Existing `users` Table Usage

`users.id` is the AI session owner.

The AI system uses:

```text
ai_sessions.user_id
ai_session_messages.user_id
ai_session_files.user_id
ai_analysis_results.user_id
ai_usage_counters.user_id
ai_usage_events.user_id
ai_result_shares.user_id
```

---

## 13. Existing `doctors` Table Usage

Doctors are used for:

```text
ai_result_shares.doctor_id
ai_analysis_results.reviewed_by_doctor_id
```

Doctor APIs require a doctor token and `authorizeDoctor`.

---

## 14. Existing `appointments` Table Usage

Sharing can optionally use appointment context:

```text
ai_result_shares.appointment_id
```

When `appointment_id` is provided:

- The appointment must belong to the user.
- The doctor is resolved from `appointments.doctor_id`.

---

## 15. Existing `admin_logs` Table Usage

Admin policy changes are logged as:

```text
target_type = AIUsagePolicy
```

Actions include:

```text
AI_USAGE_POLICY_CREATE
AI_USAGE_POLICY_UPDATE
AI_USAGE_POLICY_ACTIVATE
AI_USAGE_POLICY_DEACTIVATE
```

---

## 16. Example SQL Checks

### List AI tables

```sql
SHOW TABLES LIKE 'ai_%';
```

### Check policy selection

```sql
SELECT
  id,
  policy_name,
  scope_type,
  user_id,
  is_active,
  priority
FROM ai_usage_policies
ORDER BY priority ASC;
```

### Check user counters

```sql
SELECT
  user_id,
  period_key,
  total_requests,
  chat_messages_count,
  image_analyses_count,
  document_analyses_count,
  tokens_used
FROM ai_usage_counters;
```

### Check doctor review

```sql
SELECT
  id,
  uuid,
  result_type,
  doctor_reviewed,
  doctor_agreement,
  reviewed_by_doctor_id,
  doctor_notes,
  reviewed_at
FROM ai_analysis_results
WHERE uuid = '<result_uuid>';
```

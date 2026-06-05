# 09 - OpenAI Integration

## Purpose

This document explains how the Bashra AI Dermatology feature integrates with OpenAI.

The integration supports:

- Text chat analysis
- Skin image analysis
- PDF/TXT medical report analysis
- Final AI session summary
- Structured JSON output
- Token usage tracking
- Provider logging
- Mock mode for local development

---

## Environment variables

Required AI variables:

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

### Variable details

| Variable | Purpose |
|---|---|
| `AI_PROVIDER` | Current AI provider. Currently `openai`. |
| `AI_MODEL` | Model used for AI requests. Tested with `gpt-4.1-mini`. |
| `OPENAI_API_KEY` | API key from OpenAI dashboard. |
| `AI_USE_MOCK` | If `true`, the system uses mock AI response without OpenAI call. |
| `AI_TEMPERATURE` | Model temperature. Low value is recommended for medical structured output. |
| `AI_ENABLE_IMAGE_ANALYSIS` | Enables image analysis endpoint. |
| `AI_ENABLE_DOCUMENT_ANALYSIS` | Enables document analysis endpoint. |
| `AI_REQUIRE_PATIENT_CONSENT` | Requires consent before AI usage. |
| `AI_DEFAULT_LANGUAGE` | Default output language, usually `ar`. |

---

## Installed dependency

The OpenAI Node SDK is required:

```powershell
npm install openai
```

---

## Provider architecture

Main files:

```text
services/ai/AIProviderFactory.js
services/ai/OpenAIProvider.js
services/ai/dermatologyPrompt.js
```

### `AIProviderFactory.js`

Responsible for selecting the configured AI provider.

Current provider:

```text
openai
```

### `OpenAIProvider.js`

Responsible for actual OpenAI calls.

It includes methods for:

```text
analyzeTextMessage
analyzeImageMessage
analyzeDocumentMessage
generateFinalSummary
```

### `dermatologyPrompt.js`

Contains the system prompt used to keep AI focused on dermatology and medical safety.

---

## Request types

The system logs provider calls using `request_type`:

| Request Type | Endpoint source | Result type |
|---|---|---|
| `chat` | Text message | `chat_response` |
| `image` | Image analysis | `image_analysis` |
| `document` | PDF/TXT analysis | `document_analysis` |
| `summary` | Complete session | `final_summary` |

Stored in:

```text
ai_provider_logs.request_type
```

---

## Structured JSON response

All OpenAI responses are expected to follow a structured schema.

Main fields:

```json
{
  "language": "ar",
  "case_summary": "...",
  "possible_conditions": [
    {
      "name": "...",
      "likelihood": "medium",
      "reasoning": "..."
    }
  ],
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

### Severity values

```text
mild
moderate
severe
urgent
```

### Confidence values

```text
low
medium
high
```

### Recommended next step values

```text
self_care
book_dermatologist
urgent_care
doctor_review
```

---

## Text analysis flow

Endpoint:

```http
POST /api/ai-dermatology/sessions/:uuid/messages
```

Flow:

1. Validate user owns active session.
2. Check usage policy.
3. Save user message.
4. Build context from previous messages.
5. Call OpenAI.
6. Save AI message.
7. Save `ai_analysis_results` row with `result_type = chat_response`.
8. Save provider log.
9. Increment usage counter.

---

## Image analysis flow

Endpoint:

```http
POST /api/ai-dermatology/sessions/:uuid/images
```

Input:

```text
form-data
image: file
description: optional text
```

Flow:

1. Validate image exists.
2. Validate MIME type and size.
3. Save file under `upload/files/medical-image`.
4. Save file row in `files` with `file_category = medical_image`.
5. Link file to AI session in `ai_session_files` with `file_role = skin_image`.
6. Save user image message.
7. Send image and description to OpenAI.
8. Save AI image analysis message.
9. Save result as `image_analysis`.
10. Update file analysis status to `processed`.
11. Save provider log.
12. Increment image usage.

The response includes:

```json
"secure_file_url": "/api/ai-dermatology/files/:fileUuid"
```

---

## Document analysis flow

Endpoint:

```http
POST /api/ai-dermatology/sessions/:uuid/documents
```

Input:

```text
form-data
document: file
description: optional text
```

Supported initially:

```text
application/pdf
text/plain
```

Flow:

1. Validate document exists.
2. Validate MIME type.
3. Save file.
4. Link file as `medical_report`.
5. Save user document message.
6. Send PDF/TXT content to OpenAI.
7. Save AI document analysis message.
8. Save result as `document_analysis`.
9. Update file analysis status.
10. Save provider log.
11. Increment document usage.

---

## Final summary flow

Endpoint:

```http
POST /api/ai-dermatology/sessions/:uuid/complete
```

Flow:

1. Validate session exists and is active.
2. Load messages, files, and previous results.
3. Generate final structured summary with OpenAI.
4. Save AI message.
5. Save result as `final_summary`.
6. Update `ai_sessions.status = completed`.
7. Store `summary_json` in `ai_sessions`.
8. Save provider log with `request_type = summary`.
9. Increment total usage.

After completion, the session is no longer active for new messages/images/documents.

---

## Token tracking

Token usage is saved in:

```text
ai_session_messages.prompt_tokens
ai_session_messages.completion_tokens
ai_session_messages.total_tokens
ai_provider_logs.prompt_tokens
ai_provider_logs.completion_tokens
ai_provider_logs.total_tokens
ai_usage_events.prompt_tokens
ai_usage_events.completion_tokens
ai_usage_events.total_tokens
ai_usage_counters.tokens_used
```

Tested examples:

- Chat request: around 1041 tokens in one test.
- Image request: around 3700 tokens in tests.
- PDF document request: around 10918 tokens in one test.
- Final summary: around 4669 tokens in one test.

---

## Provider logs

Provider logs are stored in:

```text
ai_provider_logs
```

Important columns:

```text
provider
model
request_type
prompt_tokens
completion_tokens
total_tokens
latency_ms
status
error_message
request_metadata
response_metadata
```

Example:

```text
provider = openai
model = gpt-4.1-mini
request_type = image
status = success
```

---

## Mock mode

Set:

```env
AI_USE_MOCK=true
```

Uses mock response without calling OpenAI.

Useful for:

- local development
- testing database flow
- testing API response structure
- avoiding token cost

Set:

```env
AI_USE_MOCK=false
```

for real OpenAI calls.

---

## Error handling

Typical OpenAI-related errors:

- Missing API key
- Empty output
- JSON parse error
- Unsupported document type
- API timeout
- Provider rate limit
- File too large

Recommended response pattern:

```json
{
  "success": false,
  "message_ar": "فشل تحليل الحالة بالذكاء الاصطناعي",
  "message_en": "Failed to analyze case with AI",
  "error": "..."
}
```

---

## Cost control recommendations

1. Keep `AI_TEMPERATURE` low.
2. Limit PDF size.
3. Add document text extraction and summarization before sending very large files.
4. Add daily limits, not only monthly limits.
5. Monitor `ai_provider_logs.total_tokens`.
6. Add admin dashboard charts later.
7. Add cost estimation based on token usage.
8. Consider shorter context windows for long sessions.

---

## Production recommendations

Before production:

- Use a dedicated OpenAI project key.
- Set monthly OpenAI budget limits in OpenAI dashboard.
- Rotate keys regularly.
- Never log full API key.
- Add fallback for provider outage.
- Add user-friendly error messages when provider fails.
- Review compliance requirements for medical data.

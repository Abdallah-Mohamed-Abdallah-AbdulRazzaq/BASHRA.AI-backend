# 15 - Conversational AI Chat Update

## 1. Purpose

This document describes the final update applied to the Bashra AI Dermatology feature to make the AI chat more natural and conversational for the patient, while preserving the structured medical analysis required for storage, sharing, doctor review, and admin auditing.

The previous AI response was technically correct, but the visible chat message felt too rigid because the patient-facing message was using `case_summary`. That made every AI reply look like a clinical report instead of a normal conversation.

The goal of this update is:

- Keep the AI focused on dermatology.
- Keep all medical safety rules.
- Allow natural conversation between the patient and AI.
- Support follow-up messages without restarting the case every time.
- Handle thanks/small talk gracefully.
- Handle out-of-scope medical messages safely.
- Preserve the existing database schema and API structure.
- Avoid breaking image analysis, document analysis, final summary, sharing, doctor access, and doctor review.

---

## 2. Main Design Decision

The AI response now separates two different concepts:

```json
{
  "conversation_reply": "Patient-facing natural chat message",
  "case_summary": "Clinical summary stored for medical/review/audit flows"
}
```

### `conversation_reply`

This is the message shown to the patient inside the chat UI.

It should be:

- natural
- friendly
- concise
- conversational
- in the user's language
- medically safe
- not a final diagnosis

Example:

```text
فهمت عليك. الحكة والاحمرار الخفيف في الرقبة منذ يومين ممكن يكونوا بسبب تهيج أو حساسية جلدية بسيطة، خصوصًا لو استخدمت منتج جديد أو حصل تعرق واحتكاك. هل ظهر تقشير أو بثور؟
```

### `case_summary`

This remains the clinical summary used internally.

It should be:

- concise
- structured
- useful for doctor review
- useful for final summary
- useful for audit/logging

Example:

```text
المريض يعاني من حكة واحمرار خفيف في الرقبة منذ يومين دون ذكر علامات خطورة واضحة.
```

---

## 3. New AI JSON Shape

The structured AI output now includes two new fields:

```json
{
  "language": "ar",
  "response_kind": "dermatology_chat",
  "conversation_reply": "رد طبيعي يظهر للمريض داخل الشات",
  "case_summary": "ملخص طبي مختصر للتخزين ومراجعة الطبيب",
  "possible_conditions": [
    {
      "name": "التهاب الجلد التماسي",
      "likelihood": "medium",
      "reasoning": "الحكة والاحمرار في الرقبة قد يرتبطان بتهيج أو حساسية من منتج أو احتكاك."
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
  "disclaimer": "هذه المعلومات لا تغني عن استشارة طبيب الجلدية."
}
```

---

## 4. Supported `response_kind` Values

The new field `response_kind` helps the backend and UI understand what kind of AI response was generated.

| Value | Meaning |
|---|---|
| `dermatology_chat` | Normal dermatology conversation reply. |
| `dermatology_assessment` | More structured symptom assessment. |
| `follow_up` | Follow-up reply based on previous context. |
| `small_talk` | Thanks, greeting, or non-medical conversational reply. |
| `out_of_scope` | Message is outside dermatology scope. |
| `safety_triage` | Message includes urgent or safety-sensitive signs. |
| `image_analysis` | AI response for image analysis. |
| `document_analysis` | AI response for document/report analysis. |
| `final_summary` | Final session summary. |

---

## 5. Files Modified

### 5.1 `services/ai/dermatologyPrompt.js`

Updated the system prompt to make the AI behave like a conversational dermatology assistant.

Main changes:

- Added instruction that AI should converse naturally with the patient.
- Kept dermatology as the primary scope.
- Kept strict medical safety rules.
- Added handling for follow-up messages.
- Added handling for small talk.
- Added handling for out-of-scope messages.
- Required `conversation_reply` and `response_kind` in JSON output.
- Kept rule that AI must not provide a final diagnosis.
- Kept rule that AI must not prescribe prescription-only medication.

Expected effect:

- The AI can answer naturally instead of only producing a clinical report.
- The AI remains safe and dermatology-focused.

---

### 5.2 `services/ai/OpenAIProvider.js`

Updated the OpenAI JSON schema and prompts.

Main changes:

- Added `response_kind` to the schema.
- Added `conversation_reply` to the schema.
- Required both fields in all AI outputs.
- Updated text prompt to allow natural conversation.
- Updated image prompt to return a patient-friendly image explanation.
- Updated document prompt to return a patient-friendly document explanation.
- Updated final summary prompt to include previous `response_kind` and `conversation_reply` context.
- Preserved all existing OpenAI methods:
  - `analyzeTextMessage`
  - `analyzeImageMessage`
  - `analyzeDocumentMessage`
  - `generateFinalSummary`

Expected effect:

- OpenAI now returns both the display text and the medical summary.
- Final summaries can ignore small talk better.
- No existing AI flow is removed.

---

### 5.3 `services/ai/AIDermatologyService.js`

Updated how AI responses are normalized, stored, and displayed.

Main changes:

- Added `normalizeAIResponse()`.
- Added `getUserFacingReply()`.
- Chat messages now store `conversation_reply` in `ai_session_messages.content`.
- `case_summary` continues to be stored in `ai_analysis_results.case_summary`.
- Mock response now supports the new fields.
- Image response is normalized before saving.
- Document response is normalized before saving.
- Final summary response is normalized before saving.
- `small_talk` and `out_of_scope` text messages no longer downgrade the session `risk_level`.

Before this update:

```js
content = aiResponse.case_summary
```

After this update:

```js
content = this.getUserFacingReply(aiResponse)
```

Expected effect:

- The chat UI displays a natural AI response.
- Clinical storage still receives structured medical fields.
- Existing response shape remains backward-compatible.

---

### 5.4 `services/ai/AIShareService.js`

Updated default share-result selection.

Main change:

- `small_talk` and `out_of_scope` chat results are deprioritized when selecting the latest shareable result.

Reason:

If the patient sends a useful symptom message, then later says:

```text
تمام شكرا
```

The system should not share the small-talk result with the doctor by default.

The share logic should prefer meaningful medical results such as:

- `final_summary`
- `document_analysis`
- `image_analysis`
- meaningful `chat_response`

Expected effect:

- Sharing remains medically useful.
- Doctor receives the latest meaningful medical context, not a thank-you message.

---

## 6. Files Included But Not Functionally Changed

The final package includes these files to preserve a full drop-in replacement set:

```text
services/ai/AIUsageService.js
services/ai/AIProviderFactory.js
services/ai/AISessionService.js
controllers/AIDermatologyController.js
routes/aiDermatologyRoutes.js
```

These files were included because they are part of the same AI Dermatology feature, but the conversational behavior update is concentrated in the four files listed above.

---

## 7. Database Impact

No new SQL migration is required for this update.

Reason:

The new fields are stored inside existing JSON columns:

```text
ai_session_messages.structured_content
ai_analysis_results.ai_response_json
```

The visible chat content still uses the existing column:

```text
ai_session_messages.content
```

The clinical summary still uses the existing column:

```text
ai_analysis_results.case_summary
```

---

## 8. API Compatibility

The existing API endpoints remain unchanged.

No endpoint path changed.

No request body changed.

The response is backward-compatible because existing fields still exist:

```json
{
  "ai_message": {
    "content": "...",
    "structured_content": {
      "case_summary": "...",
      "possible_conditions": [],
      "severity": "mild"
    }
  }
}
```

New fields are added inside `structured_content`:

```json
{
  "response_kind": "dermatology_chat",
  "conversation_reply": "..."
}
```

---

## 9. UI / Mobile Notes

### Chat UI

Use:

```text
data.ai_message.content
```

as the visible message.

This now contains the conversational response.

### Structured details screen

Use:

```text
data.ai_message.structured_content.case_summary
```

for the medical summary section.

Use:

```text
data.ai_message.structured_content.possible_conditions
```

for possible conditions.

Use:

```text
data.ai_message.structured_content.safe_advice
```

for advice.

Use:

```text
data.ai_message.structured_content.follow_up_questions
```

for suggested follow-up questions.

### Doctor dashboard

Continue using:

```text
results[].case_summary
results[].possible_conditions
results[].doctor_review
```

The doctor review flow is unchanged.

---

## 10. Expected Before / After Behavior

### Before

User:

```text
عندي حكة واحمرار خفيف في الرقبة منذ يومين
```

AI visible message:

```text
المريض يعاني من حكة واحمرار خفيف في منطقة الرقبة منذ يومين.
```

This feels like a report.

### After

User:

```text
عندي حكة واحمرار خفيف في الرقبة منذ يومين
```

AI visible message:

```text
فهمت عليك. الحكة والاحمرار الخفيف في الرقبة منذ يومين ممكن يكونوا بسبب تهيج بسيط أو حساسية جلدية، خصوصًا لو حصل تعرق أو استخدمت منتج جديد. هل ظهر تقشير أو بثور؟
```

This feels like a conversation.

The database still stores:

```text
المريض يعاني من حكة واحمرار خفيف في منطقة الرقبة منذ يومين دون ذكر علامات خطورة واضحة.
```

as `case_summary`.

---

## 11. Safety Rules Preserved

The update does not relax medical safety.

The AI must still:

- avoid final diagnosis
- avoid certainty
- avoid prescription-only medication recommendations
- avoid telling the user to stop prescribed medication
- detect red flags
- recommend urgent care when red flags are present
- encourage dermatologist review when unclear, persistent, worsening, or severe
- mention AI/remote-assessment limitations
- stay focused on dermatology

---

## 12. Deployment Notes

After replacing the files, restart the backend.

Recommended order:

1. Backup old files.
2. Replace the modified files.
3. Run syntax checks.
4. Start the server.
5. Run Postman conversational tests.
6. Verify database storage.
7. Verify share behavior after small talk.
8. Verify image/document/final summary still work.

---

## 13. Files Delivered In Final Package

```text
ai-chat-conversational-final-full.zip

services/ai/dermatologyPrompt.js
services/ai/OpenAIProvider.js
services/ai/AIDermatologyService.js
services/ai/AIShareService.js
services/ai/AIUsageService.js
services/ai/AIProviderFactory.js
services/ai/AISessionService.js
controllers/AIDermatologyController.js
routes/aiDermatologyRoutes.js
README-AI-CHAT-CONVERSATIONAL-FINAL.md
```

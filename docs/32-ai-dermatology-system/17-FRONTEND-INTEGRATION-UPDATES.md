# Bashra AI Dermatology - Frontend Integration Updates

## Purpose

This document explains the latest backend changes that affect the frontend/mobile integration for the AI Dermatology feature.

These changes were added after completing the Conversational AI Chat update.

---

## Update 1: Full Secure File URLs

### What changed

Previously, AI file responses returned `secure_file_url` as a relative path:

```json
{
  "secure_file_url": "/api/ai-dermatology/files/FILE_UUID"
}
```

Now, `secure_file_url` returns the full backend URL using `BACKEND_URL` from `.env`:

```json
{
  "secure_file_url": "http://localhost:3006/api/ai-dermatology/files/FILE_UUID"
}
```

A new field was also added:

```json
{
  "secure_file_path": "/api/ai-dermatology/files/FILE_UUID"
}
```

---

## Why this change was added

The frontend/mobile app needs a full URL when running against different environments:

- Local development
- Staging server
- Live production server

The backend now uses:

```env
BACKEND_URL=http://localhost:3006
```

On production, this should become something like:

```env
BACKEND_URL=https://api.bashra.ai
```

Do not add a trailing slash. The backend already normalizes the value.

Correct:

```env
BACKEND_URL=https://api.bashra.ai
```

Not preferred:

```env
BACKEND_URL=https://api.bashra.ai/
```

---

## Affected Responses

### 1. Upload Image Analysis

Endpoint:

```http
POST /api/ai-dermatology/sessions/:sessionUuid/images
```

Response now includes:

```json
{
  "uploaded_file": {
    "uuid": "FILE_UUID",
    "file_url": "http://localhost:3006/upload/files/medical-image/file.png",
    "secure_file_url": "http://localhost:3006/api/ai-dermatology/files/FILE_UUID",
    "secure_file_path": "/api/ai-dermatology/files/FILE_UUID"
  }
}
```

---

### 2. Upload Document Analysis

Endpoint:

```http
POST /api/ai-dermatology/sessions/:sessionUuid/documents
```

Response now includes:

```json
{
  "uploaded_file": {
    "uuid": "FILE_UUID",
    "file_url": "http://localhost:3006/upload/files/other/file.pdf",
    "secure_file_url": "http://localhost:3006/api/ai-dermatology/files/FILE_UUID",
    "secure_file_path": "/api/ai-dermatology/files/FILE_UUID"
  }
}
```

---

### 3. Get User AI Session Details

Endpoint:

```http
GET /api/ai-dermatology/sessions/:sessionUuid
```

Inside `messages[].file` and `files[]`, the response now includes:

```json
{
  "secure_file_url": "http://localhost:3006/api/ai-dermatology/files/FILE_UUID",
  "secure_file_path": "/api/ai-dermatology/files/FILE_UUID"
}
```

---

### 4. Get Doctor Shared AI Session Details

Endpoint:

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

For doctor file access, the response uses the doctor-secured endpoint:

```json
{
  "secure_file_url": "http://localhost:3006/api/ai-dermatology/doctor/files/FILE_UUID",
  "secure_file_path": "/api/ai-dermatology/doctor/files/FILE_UUID"
}
```

---

## Frontend Integration Notes

### Recommended usage

Use:

```js
file.secure_file_url
```

for opening AI medical files.

Example:

```js
openFile(file.secure_file_url)
```

The request must include the correct auth token:

- User token for:
  ```http
  /api/ai-dermatology/files/:fileUuid
  ```

- Doctor token for:
  ```http
  /api/ai-dermatology/doctor/files/:fileUuid
  ```

---

## Important Security Note

Do not use `file_url` for private AI medical files in the app.

Use `secure_file_url` instead.

`file_url` may point to the static upload path, while `secure_file_url` is protected by authentication and authorization.

---

# Update 2: `shared_result` in Doctor Shared Session Details

## What changed

The doctor shared session details endpoint now returns a new field:

```json
{
  "shared_result": {}
}
```

Endpoint:

```http
GET /api/ai-dermatology/doctor/shared-sessions/:shareUuid
```

---

## Why this change was added

Before this update, the doctor dashboard could rely on:

```json
{
  "latest_result": {}
}
```

But `latest_result` is the latest chronological AI result in the session.

This can be misleading if the patient sends a later message like:

- `تمام شكرا`
- A small talk message
- An out-of-scope question
- A non-dermatology follow-up

The actual shared result is stored in:

```text
ai_result_shares.ai_result_id
```

So the backend now returns:

```json
{
  "shared_result": {}
}
```

which points exactly to the AI result that was selected when the patient shared the session.

---

## Example Response Structure

```json
{
  "success": true,
  "data": {
    "share": {
      "uuid": "SHARE_UUID",
      "share_status": "active"
    },
    "session": {
      "uuid": "SESSION_UUID",
      "status": "active"
    },
    "results": [],
    "shared_result": {
      "uuid": "RESULT_UUID",
      "result_type": "chat_response",
      "severity": "mild",
      "recommended_next_step": "self_care",
      "ai_response_json": {
        "response_kind": "dermatology_chat"
      }
    },
    "latest_result": {
      "uuid": "LATEST_RESULT_UUID",
      "ai_response_json": {
        "response_kind": "out_of_scope"
      }
    }
  }
}
```

---

## Frontend Integration Rule

In the doctor dashboard, use:

```js
const resultToDisplay = data.shared_result || data.latest_result;
```

Do not depend only on:

```js
data.latest_result
```

because it may not be the same result that the patient shared.

---

## Recommended Doctor Dashboard Display

Use `shared_result` for the main AI result card:

```js
const aiResult = response.data.shared_result || response.data.latest_result;
```

Then display:

```js
aiResult.case_summary
aiResult.possible_conditions
aiResult.severity
aiResult.recommended_next_step
aiResult.confidence_level
aiResult.doctor_review
```

---

## Backward Compatibility

The backend keeps `latest_result` for backward compatibility.

Existing frontend screens using `latest_result` will still work, but the recommended integration is now:

```js
data.shared_result || data.latest_result
```

---

# Quick Frontend Checklist

## User App

- Use `secure_file_url` to open uploaded AI images/documents.
- Keep `secure_file_path` only if the app needs to build URLs manually.
- Do not use public/static `file_url` for medical AI files.
- Send user auth token when opening secure files.

## Doctor Dashboard

- Use `shared_result` as the main displayed AI result.
- Fallback to `latest_result` only if `shared_result` is null.
- Use doctor `secure_file_url` for files.
- Send doctor auth token when opening secure files.

## Environment

Backend `.env` must include:

```env
BACKEND_URL=http://localhost:3006
```

Production example:

```env
BACKEND_URL=https://api.bashra.ai
```

---

# Summary

The latest backend integration changes are:

1. `secure_file_url` is now a full URL based on `BACKEND_URL`.
2. `secure_file_path` was added as a relative path fallback.
3. Doctor shared session details now include `shared_result`.
4. Doctor dashboard should display `shared_result || latest_result`.
5. AI medical files should be opened only through secure authenticated endpoints.

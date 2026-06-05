# Postman Collection Usage Guide

This guide explains how to use the Bashra AI Dermatology Postman collection.

## Files

- `ai-dermatology-postman-collection.json`
- `ai-dermatology-postman-environment.json`

## Import Steps

1. Open Postman.
2. Import the collection JSON file.
3. Import the environment JSON file.
4. Select `Bashra AI - AI Dermatology Local Environment`.
5. Set these variables manually:
   - `user_token`
   - `doctor_token`
   - `admin_token`
   - `super_admin_token`
6. Confirm `base_url` is `http://localhost:3006`.

## Suggested Test Order

1. `00 - Setup Notes / Health Check - Root`
2. `01 - User AI Sessions / Create AI Session`
3. `02 - User AI Messages, Images, Documents / Send Text Message`
4. `03 - User AI Sharing / Share AI Session with Doctor`
5. `04 - Doctor AI Access and Review / Doctor - List Shared AI Sessions`
6. `04 - Doctor AI Access and Review / Doctor - Get Shared AI Session Details`
7. `04 - Doctor AI Access and Review / Doctor - Review AI Result`
8. `05 - Admin AI Usage Management / Admin - AI Usage Overview`
9. `06 - Super Admin AI Usage Policy Management / Super Admin - Activate AI Usage Policy`
10. `01 - User AI Sessions / Get My AI Usage`

## File Upload Requests

For image and document upload requests, manually select the file in Postman before sending.

Supported document types in the current implementation:

- PDF
- TXT

## Security Notes

- Do not use public `file_url` for medical AI files.
- Use:
  - User: `/api/ai-dermatology/files/:fileUuid`
  - Doctor: `/api/ai-dermatology/doctor/files/:fileUuid`
- Never commit real tokens or OpenAI API keys.
- The collection stores runtime UUIDs in the selected Postman environment.

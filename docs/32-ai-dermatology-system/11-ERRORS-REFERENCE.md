# 11 - Errors Reference

## Purpose

This file documents common error responses for the AI Dermatology system.

---

## Authentication errors

### Missing Authorization header

Status:

```text
401
```

Example:

```json
{
  "error": "Authorization header missing"
}
```

Typical causes:

- Request sent without `Authorization: Bearer TOKEN`.
- Token variable missing in Postman.

---

### Invalid or expired token

Status:

```text
401
```

Example:

```json
{
  "error": "Invalid token"
}
```

---

### Insufficient permissions

Status:

```text
403
```

Example:

```json
{
  "error": "Insufficient permissions"
}
```

Typical causes:

- User token used on doctor endpoint.
- Doctor token used on user endpoint.
- Admin token without `super_admin` used on mutation endpoint.

---

## AI session errors

### AI session not found

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "جلسة الذكاء الاصطناعي غير موجودة",
  "message_en": "AI session not found"
}
```

---

### AI session not found or inactive

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "جلسة الذكاء الاصطناعي غير موجودة أو غير نشطة",
  "message_en": "AI session not found or inactive"
}
```

Typical causes:

- Session UUID is invalid.
- Session belongs to another user.
- Session has status `completed`, `archived`, or `deleted`.

---

### Session already completed

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "تم إنهاء هذه الجلسة مسبقًا",
  "message_en": "This AI session is already completed"
}
```

---

### No AI result found to summarize

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "لا توجد نتائج تحليل داخل الجلسة لإنشاء ملخص نهائي",
  "message_en": "No AI analysis results found to create a final summary"
}
```

---

## Usage limit errors

### Monthly total limit exceeded

Status:

```text
429
```

Example:

```json
{
  "success": false,
  "reason": "total_limit_exceeded",
  "message_ar": "تم الوصول إلى الحد الأقصى لاستخدام الذكاء الاصطناعي لهذا الشهر",
  "message_en": "AI monthly usage limit exceeded"
}
```

---

### Chat limit exceeded

Status:

```text
429
```

---

### Image analysis limit exceeded

Status:

```text
429
```

---

### Document analysis limit exceeded

Status:

```text
429
```

---

### Max files per session exceeded

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "تم الوصول إلى الحد الأقصى للملفات في هذه الجلسة وهو 5",
  "message_en": "Maximum files per session reached: 5"
}
```

---

## Image upload errors

### Image file is required

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "الصورة مطلوبة",
  "message_en": "Image file is required"
}
```

---

### Unsupported image type

Status:

```text
400
```

Typical cause:

- PDF/TXT uploaded to image endpoint.
- Unsupported MIME type.

---

### Image too large

Status:

```text
400
```

Typical cause:

- Image exceeds configured upload limit.

---

## Document upload errors

### Document file is required

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "ملف التقرير مطلوب",
  "message_en": "Document file is required"
}
```

---

### Unsupported document type

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "نوع الملف غير مدعوم حاليًا. الأنواع المسموحة: PDF و TXT",
  "message_en": "Unsupported document type. Currently allowed: PDF and TXT"
}
```

---

## Secure file access errors

### File not found or not allowed

Status:

```text
404
```

User endpoint:

```json
{
  "success": false,
  "message_ar": "الملف غير موجود أو غير مصرح لك بالوصول إليه",
  "message_en": "File not found or you are not allowed to access it"
}
```

Doctor endpoint:

```json
{
  "success": false,
  "message_ar": "الملف غير موجود أو غير مصرح للطبيب بالوصول إليه",
  "message_en": "File not found or doctor is not allowed to access it"
}
```

---

### Invalid file path

Status:

```text
403
```

Typical cause:

- File path does not resolve inside `upload/files`.
- Path traversal protection blocked the request.

---

### File not found on disk

Status:

```text
404
```

Typical cause:

- Database row exists but physical file is missing.

---

## Sharing errors

### doctor_id or appointment_id required

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "يجب إرسال doctor_id أو appointment_id لمشاركة نتيجة الذكاء الاصطناعي",
  "message_en": "doctor_id or appointment_id is required to share AI result"
}
```

---

### Doctor not found

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "الطبيب غير موجود",
  "message_en": "Doctor not found"
}
```

---

### Appointment not found or does not belong to user

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "الموعد غير موجود أو لا يخص هذا المستخدم",
  "message_en": "Appointment not found or does not belong to this user"
}
```

---

### No shareable AI result

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "لا توجد نتيجة ذكاء اصطناعي قابلة للمشاركة داخل هذه الجلسة",
  "message_en": "No shareable AI result found in this session"
}
```

---

### Share not found

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "المشاركة غير موجودة",
  "message_en": "AI share not found"
}
```

---

## Doctor review errors

### Invalid doctor agreement

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "قيمة doctor_agreement غير صحيحة. القيم المسموحة: agree, partially_agree, disagree",
  "message_en": "Invalid doctor_agreement. Allowed values: agree, partially_agree, disagree"
}
```

---

### Doctor notes too long

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message_ar": "ملاحظات الطبيب طويلة جدًا. الحد الأقصى 5000 حرف",
  "message_en": "Doctor notes are too long. Maximum is 5000 characters"
}
```

---

### AI result not shared with doctor

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message_ar": "نتيجة الذكاء الاصطناعي غير موجودة أو غير مشتركة مع هذا الطبيب",
  "message_en": "AI result not found or not shared with this doctor"
}
```

---

## Admin policy errors

### Validation error

Status:

```text
400
```

Example:

```json
{
  "success": false,
  "message": "Validation error",
  "message_ar": "خطأ في التحقق من البيانات",
  "errors": []
}
```

---

### AI usage policy not found

Status:

```text
404
```

Example:

```json
{
  "success": false,
  "message": "AI usage policy not found",
  "message_ar": "سياسة استخدام الذكاء الاصطناعي غير موجودة"
}
```

---

### Invalid policy scope

Status:

```text
400
```

Examples:

```json
{
  "success": false,
  "message": "user_id is required when scope_type is user",
  "message_ar": "يجب إرسال user_id عندما يكون scope_type = user"
}
```

```json
{
  "success": false,
  "message": "package_id is required when scope_type is package",
  "message_ar": "يجب إرسال package_id عندما يكون scope_type = package"
}
```

---

## OpenAI/provider errors

### Missing API key

Status:

```text
500
```

Typical cause:

- `OPENAI_API_KEY` is missing.
- `AI_USE_MOCK=false` and no valid key exists.

---

### OpenAI returned empty output

Status:

```text
500
```

---

### Failed to parse OpenAI JSON response

Status:

```text
500
```

Typical cause:

- Model did not follow strict JSON schema.
- Schema or prompt needs adjustment.

---

## Debugging checklist

When an error happens:

1. Check server console logs.
2. Check JWT role and token.
3. Check request method and URL.
4. Check request body type: JSON vs form-data.
5. Check DB rows:
   - `ai_sessions`
   - `ai_session_messages`
   - `ai_analysis_results`
   - `ai_session_files`
   - `ai_result_shares`
   - `ai_provider_logs`
   - `ai_usage_events`
6. Check `ai_provider_logs.status` and `error_message`.
7. Check file exists on disk if file endpoint fails.

# تغيير كلمة المرور من داخل التطبيق
# Change Password In-App API

## نظرة عامة | Overview

هذا النظام يسمح للمستخدمين المسجلين بتغيير كلمة المرور الخاصة بهم من داخل التطبيق بشكل آمن. يتطلب النظام:
- أن يكون المستخدم مسجل دخول (لديه Token صالح)
- التحقق من كلمة المرور القديمة قبل السماح بالتغيير
- كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة

This system allows authenticated users to securely change their password from within the app. The system requires:
- User must be logged in (valid authentication token)
- Verification of old password before allowing change
- New password must be different from old password

---

## الميزات الأمنية | Security Features

### 1. التحقق من الهوية | Authentication Required
- يجب أن يكون المستخدم مسجل دخول
- يتم التحقق من صحة الـ Token قبل السماح بالعملية
- Must be logged in with valid token
- Token verification before allowing operation

### 2. التحقق من كلمة المرور القديمة | Old Password Verification
- يتم التحقق من صحة كلمة المرور الحالية قبل التغيير
- منع التغيير غير المصرح به
- Verifies current password before change
- Prevents unauthorized changes

### 3. التحقق من صحة كلمة المرور الجديدة | New Password Validation
- يجب أن تكون 8 أحرف على الأقل
- يجب أن تكون مختلفة عن كلمة المرور القديمة
- Must be at least 8 characters
- Must be different from old password

### 4. إلغاء جميع الجلسات | Session Revocation
- بعد تغيير كلمة المرور، يتم إلغاء جميع الجلسات النشطة
- يجب على المستخدم تسجيل الدخول مرة أخرى على جميع الأجهزة
- After password change, all active sessions are revoked
- User must re-login on all devices

### 5. تسجيل الأحداث الأمنية | Security Logging
- يتم تسجيل جميع محاولات تغيير كلمة المرور
- تسجيل IP Address و User Agent
- All password change attempts are logged
- IP Address and User Agent are recorded

---

## API Endpoints

### تغيير كلمة المرور | Change Password

**Endpoint:** `POST /api/auth-{entityType}/change-password-in-app`

حيث `{entityType}` يمكن أن يكون:
- `user` - للمستخدمين العاديين
- `doctor` - للأطباء
- `assistant` - للمساعدين

Where `{entityType}` can be:
- `user` - For regular users
- `doctor` - For doctors
- `assistant` - For assistants

**Authentication:** Required (Bearer Token)

**Request Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword456"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message_en": "Password changed successfully. Please login again on all devices.",
  "message_ar": "تم تغيير كلمة المرور بنجاح. يرجى تسجيل الدخول مرة أخرى على جميع الأجهزة."
}
```

**Error Responses:**

1. **Missing Fields (400 Bad Request):**
```json
{
  "success": false,
  "message_en": "Current password and new password are required",
  "message_ar": "كلمة المرور الحالية وكلمة المرور الجديدة مطلوبة"
}
```

2. **Password Too Short (400 Bad Request):**
```json
{
  "success": false,
  "message_en": "New password must be at least 8 characters long",
  "message_ar": "كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف"
}
```

3. **Same Password (400 Bad Request):**
```json
{
  "success": false,
  "message_en": "New password must be different from current password",
  "message_ar": "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية"
}
```

4. **Incorrect Old Password (400 Bad Request):**
```json
{
  "success": false,
  "message_en": "Current password is incorrect",
  "message_ar": "كلمة المرور الحالية غير صحيحة"
}
```

5. **Unauthorized (401 Unauthorized):**
```json
{
  "success": false,
  "message_en": "Authentication required",
  "message_ar": "يجب تسجيل الدخول"
}
```

6. **User Not Found (400 Bad Request):**
```json
{
  "success": false,
  "message_en": "User not found",
  "message_ar": "المستخدم غير موجود"
}
```

7. **Server Error (500 Internal Server Error):**
```json
{
  "success": false,
  "message_en": "Failed to change password",
  "message_ar": "فشل تغيير كلمة المرور"
}
```

---

## آلية العمل | How It Works

### خطوات تغيير كلمة المرور | Password Change Flow

```
1. المستخدم يرسل طلب مع Token + كلمة المرور القديمة + الجديدة
   User sends request with Token + old password + new password
   ↓
2. التحقق من صحة الـ Token
   Verify authentication token
   ↓
3. التحقق من صحة البيانات المدخلة
   Validate input data
   ↓
4. جلب بيانات المستخدم من قاعدة البيانات
   Fetch user data from database
   ↓
5. التحقق من صحة كلمة المرور القديمة
   Verify old password using bcrypt
   ↓
6. التحقق من أن كلمة المرور الجديدة مختلفة
   Check new password is different
   ↓
7. تشفير كلمة المرور الجديدة (bcrypt with 12 rounds)
   Hash new password (bcrypt with 12 rounds)
   ↓
8. تحديث كلمة المرور في قاعدة البيانات
   Update password in database
   ↓
9. إلغاء جميع الجلسات النشطة (Tokens & Sessions)
   Revoke all active sessions (Tokens & Sessions)
   ↓
10. تسجيل الحدث في Security Logs
    Log event in security logs
    ↓
11. إرجاع رسالة نجاح
    Return success message
```

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: تغيير كلمة المرور للمستخدم العادي
### Example 1: Change Password for Regular User

```bash
curl -X POST http://localhost:3000/api/auth-user/change-password-in-app \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldPassword123",
    "newPassword": "NewSecurePassword456"
  }'
```

### مثال 2: تغيير كلمة المرور للطبيب
### Example 2: Change Password for Doctor

```bash
curl -X POST http://localhost:3000/api/auth-doctor/change-password-in-app \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "DoctorOldPass123",
    "newPassword": "DoctorNewPass456"
  }'
```

### مثال 3: تغيير كلمة المرور للمساعد
### Example 3: Change Password for Assistant

```bash
curl -X POST http://localhost:3000/api/auth-assistant/change-password-in-app \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "AssistantOldPass123",
    "newPassword": "AssistantNewPass456"
  }'
```

---

## الفرق بين تغيير كلمة المرور وإعادة تعيينها
## Difference Between Change Password and Reset Password

### تغيير كلمة المرور (Change Password)
- يتطلب تسجيل دخول (Token)
- يتطلب معرفة كلمة المرور القديمة
- يستخدم عندما يريد المستخدم تحديث كلمة المرور
- Requires login (Token)
- Requires knowing old password
- Used when user wants to update password

### إعادة تعيين كلمة المرور (Reset Password)
- لا يتطلب تسجيل دخول
- يستخدم OTP أو Token مرسل للبريد الإلكتروني
- يستخدم عندما ينسى المستخدم كلمة المرور
- No login required
- Uses OTP or email token
- Used when user forgets password

---

## ملاحظات مهمة | Important Notes

### للمطورين | For Developers

1. **التشفير | Encryption:**
   - يتم استخدام bcrypt مع 12 rounds للتشفير
   - لا يتم تخزين كلمات المرور بشكل نصي
   - Uses bcrypt with 12 rounds for hashing
   - Passwords are never stored in plain text

2. **الجلسات | Sessions:**
   - بعد تغيير كلمة المرور، يتم إلغاء جميع الجلسات
   - المستخدم يحتاج لتسجيل دخول جديد
   - After password change, all sessions are revoked
   - User needs to login again

3. **السجلات | Logs:**
   - جميع محاولات تغيير كلمة المرور يتم تسجيلها
   - يمكن مراجعة السجلات من `/security-logs`
   - All password change attempts are logged
   - Logs can be reviewed via `/security-logs`

4. **الأمان | Security:**
   - لا يتم الكشف عن سبب فشل التغيير بالتفصيل
   - يتم تسجيل IP و User Agent لكل محاولة
   - Detailed failure reasons are not exposed
   - IP and User Agent are logged for each attempt

### للمستخدمين | For Users

1. تأكد من حفظ كلمة المرور الجديدة في مكان آمن
2. بعد تغيير كلمة المرور، ستحتاج لتسجيل الدخول مرة أخرى على جميع الأجهزة
3. اختر كلمة مرور قوية (8 أحرف على الأقل)
4. لا تستخدم نفس كلمة المرور القديمة

1. Make sure to save new password in a secure place
2. After changing password, you'll need to login again on all devices
3. Choose a strong password (at least 8 characters)
4. Don't reuse old password

---

## استكشاف الأخطاء | Troubleshooting

### المشكلة: "Current password is incorrect"
**الحل:**
- تأكد من إدخال كلمة المرور الحالية بشكل صحيح
- تحقق من عدم وجود مسافات إضافية
- Verify you're entering current password correctly
- Check for extra spaces

### المشكلة: "Authentication required"
**الحل:**
- تأكد من إرسال Token في الـ Header
- تحقق من صلاحية الـ Token
- Make sure to send token in header
- Verify token is valid

### المشكلة: "New password must be different"
**الحل:**
- اختر كلمة مرور جديدة مختلفة عن القديمة
- Choose a different password from old one

---

## الملفات المتأثرة | Affected Files

1. `utils/SecurityService.js` - إضافة method `changePasswordInApp`
2. `controllers/AuthController.js` - إضافة method `changePasswordInApp`
3. `routes/authUserRoutes.js` - إضافة route للمستخدمين
4. `routes/authDoctorRoutes.js` - إضافة route للأطباء
5. `routes/authAssistantRoutes.js` - إضافة route للمساعدين

---

## التحديثات المستقبلية | Future Enhancements

1. إضافة متطلبات قوة كلمة المرور (أحرف كبيرة، صغيرة، أرقام، رموز)
2. إضافة تاريخ لكلمات المرور السابقة لمنع إعادة الاستخدام
3. إضافة إشعارات عند تغيير كلمة المرور
4. إضافة خيار "تذكرني" لعدم إلغاء الجلسة الحالية

1. Add password strength requirements (uppercase, lowercase, numbers, symbols)
2. Add password history to prevent reuse
3. Add notifications when password is changed
4. Add "remember me" option to not revoke current session

---

## الدعم | Support

للمزيد من المعلومات أو الإبلاغ عن مشاكل، يرجى مراجعة:
- ملف التوثيق الرئيسي: `docs/01-authentication/README.md`
- ملف الاختبار: `docs/01-authentication/CHANGE_PASSWORD_IN_APP_TESTING.json`

For more information or to report issues, please refer to:
- Main documentation: `docs/01-authentication/README.md`
- Testing file: `docs/01-authentication/CHANGE_PASSWORD_IN_APP_TESTING.json`

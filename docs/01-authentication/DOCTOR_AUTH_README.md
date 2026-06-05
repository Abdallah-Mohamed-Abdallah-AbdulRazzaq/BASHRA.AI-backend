# Doctor Authentication System - Quick Guide
# نظام مصادقة الأطباء - دليل سريع

## 📋 Overview | نظرة عامة

Doctor authentication system now matches the user system completely. Doctors can self-register without admin intervention.

نظام مصادقة الأطباء الآن يطابق نظام المستخدمين بالكامل. يمكن للأطباء التسجيل الذاتي دون تدخل المسؤول.

---

## 🚀 Quick Start | البدء السريع

### 1. Doctor Registration | تسجيل الطبيب

**Endpoint:** `POST http://localhost:3006/api/auth-doctor/register`

**Required Fields:**
```json
{
  "email": "doctor@example.com",
  "password": "SecurePassword123!",
  "license_number": "MED-12345-2024",
  "full_name": "د. أحمد محمد",
  "language_code": "ar"
}
```

**Optional Fields:**
```json
{
  "phone": "+966500000000",
  "specialty": "طب القلب",
  "sub_specialty": "جراحة القلب",
  "years_of_experience": 10,
  "date_of_birth": "1985-05-15",
  "gender": "male",
  "nationality": "Saudi Arabia"
}
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم التسجيل بنجاح. يرجى التحقق من بريدك الإلكتروني",
  "userId": 1,
  "profileId": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "requiresVerification": {
    "email": true,
    "phone": false
  }
}
```

---

### 2. Verify Email OTP | التحقق من OTP البريد الإلكتروني

**Endpoint:** `POST http://localhost:3006/api/auth-doctor/verify-otp`

**Request:**
```json
{
  "userId": 1,
  "otp": "123456",
  "type": "email"
}
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم التحقق من البريد الإلكتروني بنجاح"
}
```

---

### 3. Login | تسجيل الدخول

**Endpoint:** `POST http://localhost:3006/api/auth-doctor/login`

**Request:**
```json
{
  "email": "doctor@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم تسجيل الدخول بنجاح",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "doctor": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "doctor@example.com",
    "entityType": "doctor"
  }
}
```

---

### 4. Get Profile | الحصول على الملف الشخصي

**Endpoint:** `GET http://localhost:3006/api/profile-doctor`

**Headers:**
```
Authorization: Bearer <accessToken>
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "doctor_id": 1,
    "license_number": "MED-12345-2024",
    "full_name": "د. أحمد محمد",
    "specialty": "طب القلب",
    "years_of_experience": 10,
    "rating_average": 4.5,
    "total_consultations": 150
  }
}
```

---

### 5. Update Profile | تحديث الملف الشخصي

**Endpoint:** `PUT http://localhost:3006/api/profile-doctor`

**Single Language Update:**
```json
{
  "years_of_experience": 12,
  "specialty": "طب الأطفال",
  "biography": "طبيب متخصص في طب الأطفال",
  "consultation_fee": 250.00
}
```

**Multi-Language Update:**
```json
{
  "years_of_experience": 12,
  "consultation_fee": 250.00,
  "translations": {
    "ar": {
      "full_name": "د. أحمد محمد",
      "specialty": "طب الأطفال",
      "biography": "طبيب متخصص في طب الأطفال"
    },
    "en": {
      "full_name": "Dr. Ahmed Mohammed",
      "specialty": "Pediatrics",
      "biography": "Specialist in Pediatric Medicine"
    }
  }
}
```

---

## 🔐 Account Deactivation & Reactivation | إلغاء وإعادة تفعيل الحساب

### Deactivate Account | إلغاء تفعيل الحساب

**Endpoint:** `DELETE http://localhost:3006/api/profile-doctor`

```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم إلغاء تفعيل الحساب بنجاح. يمكنك إعادة تفعيله في أي وقت"
}
```

**What happens:**
- ✅ Sets `is_active = 0` in doctors table
- ✅ Doctor can still login
- ❌ Doctor cannot use any API except `/reactivate`

---

### Reactivate Account | إعادة تفعيل الحساب

**Endpoint:** `PATCH http://localhost:3006/api/profile-doctor/reactivate`

```
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم إعادة تفعيل الحساب بنجاح"
}
```

**What happens:**
- ✅ Sets `is_active = 1`
- ✅ Doctor can use all APIs normally

---

## 📊 Complete API List | قائمة APIs الكاملة

### Authentication Routes | مسارات المصادقة
Base: `/api/auth-doctor`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | تسجيل طبيب جديد |
| POST | `/login` | Public | تسجيل الدخول |
| POST | `/verify-otp` | Public | التحقق من OTP |
| POST | `/resend-otp` | Public | إعادة إرسال OTP |
| POST | `/refresh-token` | Public | تحديث Token |
| POST | `/request-password-reset-otp` | Public | طلب إعادة تعيين كلمة المرور |
| POST | `/verify-password-reset-otp` | Public | التحقق من OTP إعادة التعيين |
| POST | `/reset-password-otp` | Public | إعادة تعيين كلمة المرور |
| POST | `/logout` | Private | تسجيل الخروج |
| GET | `/sessions` | Private | الحصول على الجلسات النشطة |
| GET | `/security-logs` | Private | سجلات الأمان |

### Profile Routes | مسارات الملف الشخصي
Base: `/api/profile-doctor`

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Private | الحصول على الملف الشخصي |
| GET | `/basic` | Private | بيانات أساسية |
| GET | `/complete` | Private | بيانات كاملة مع كل الترجمات |
| PUT | `/` | Private | تحديث الملف الشخصي |
| DELETE | `/` | Private | إلغاء تفعيل الحساب |
| PATCH | `/reactivate` | Private | إعادة تفعيل الحساب |

---

## 🔑 Key Differences from User System | الاختلافات الرئيسية عن نظام المستخدمين

### Required Fields | الحقول المطلوبة

**User Registration:**
- ✅ email, password, full_name

**Doctor Registration:**
- ✅ email, password, **license_number**, full_name

### Profile Tables | جداول الملفات الشخصية

**User:**
- `user_profiles`
- `user_profile_translations`

**Doctor:**
- `doctor_profiles` (includes license_number, specialty, consultation_fee, etc.)
- `doctor_profile_translations`

### Approval System | نظام الموافقة

**User:**
- No approval needed after email verification

**Doctor:**
- `approval_status` in `doctor_profiles` table
- Can be: `pending`, `approved`, `rejected`, `suspended`
- *Note: Currently not enforced in API, future feature for admin approval*

---

## ⚙️ Database Columns | أعمدة قاعدة البيانات

### doctors table | جدول الأطباء
```sql
- id, uuid, email, phone, password_hash
- status: ENUM('active','inactive','suspended','pending_verification')
- is_active: TINYINT(1) -- User self-deactivation
- email_verified_at, phone_verified_at
- last_login_at, last_activity_at
- created_at, updated_at
```

### doctor_profiles table | جدول ملفات الأطباء
```sql
- id, doctor_id, license_number (UNIQUE)
- years_of_experience, medical_school, graduation_year
- consultation_fee, consultation_duration
- approval_status: ENUM('pending','approved','rejected','suspended')
- is_verified, rating_average, total_consultations
- date_of_birth, gender, nationality
- timezone, language_preference
```

### doctor_profile_translations table | جدول ترجمات ملفات الأطباء
```sql
- id, doctor_profile_id, language_code
- full_name, specialty, sub_specialty, biography
- emergency_contact_name, emergency_contact_relationship
```

---

## 🛡️ Security & Middleware | الأمان والوسائط

### Middleware Flow | تدفق الوسائط

1. **parseFormData** - Parse JSON and form-data
2. **authenticateJWT** - Verify JWT token
3. **authorizeDoctor** - Check entityType === 'doctor'
4. **checkAccountActive** - Check is_active === 1 (except `/reactivate`)

### Status vs is_active | حالة مقابل is_active

| Column | Controlled By | Purpose |
|--------|---------------|---------|
| `status` | Admin/System | Admin suspension (cannot login) |
| `is_active` | Doctor (self) | Temporary deactivation (can login) |

---

## 📝 Testing Checklist | قائمة الاختبار

- [ ] Doctor registration with all fields
- [ ] Email OTP verification
- [ ] Login after verification
- [ ] Get profile with different languages
- [ ] Update profile (single language)
- [ ] Update profile (multi-language)
- [ ] Deactivate account
- [ ] Try to use API with deactivated account (should fail)
- [ ] Reactivate account
- [ ] Use APIs after reactivation (should work)
- [ ] Password reset flow
- [ ] Refresh token

---

## 🚨 Common Errors | الأخطاء الشائعة

### Error: "Medical license number is required"
**Solution:** Include `license_number` in registration request.

### Error: "Medical license number already registered"
**Solution:** Use a unique license number.

### Error: "Account is deactivated"
**Solution:** Use `/reactivate` endpoint to reactivate account.

### Error: "Account is suspended"
**Solution:** Contact admin. This is admin suspension, not user deactivation.

---

## 📚 Documentation Files | ملفات التوثيق

1. **doctor-authentication-system.json** - Complete technical documentation
2. **account-deactivation-reactivation-logic.json** - Deactivation logic (same for users and doctors)
3. **DOCTOR_AUTH_README.md** - This file (quick guide)

---

## ✅ Summary | الملخص

- ✅ Doctor registration is now **public** (no admin required)
- ✅ Same authentication flow as users
- ✅ Supports **multi-language** profiles
- ✅ Same **deactivation/reactivation** logic as users
- ✅ `license_number` is **required** and **unique**
- ✅ `approval_status` exists for future admin approval feature

---

## 🔗 Base URL | الرابط الأساسي

```
http://localhost:3006/api
```

### Example Registration Request | مثال طلب التسجيل

```bash
curl -X POST http://localhost:3006/api/auth-doctor/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "SecurePassword123!",
    "license_number": "MED-12345-2024",
    "full_name": "د. أحمد محمد",
    "specialty": "طب القلب",
    "years_of_experience": 10,
    "language_code": "ar"
  }'
```

---

**Last Updated:** November 4, 2025  
**Version:** 1.0.0  
**Author:** BASHRA.AI Development Team

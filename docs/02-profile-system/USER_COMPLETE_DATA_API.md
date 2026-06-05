# Get Complete User Data API
# API جلب البيانات الكاملة للمستخدم

## 📋 نظرة عامة | Overview

API شامل لجلب **جميع بيانات المستخدم** من الجداول الثلاثة:
- ✅ `users` - بيانات الحساب
- ✅ `user_profiles` - الملف الشخصي
- ✅ `user_profile_translations` - جميع الترجمات

---

## 🔗 Endpoint

```
GET /api/profile-user/complete
```

**Base URL:** `http://localhost:3006`

---

## 🔒 Authentication

**Required:** ✅ Yes

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📥 Request

### Headers:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: ar (optional: ar or en)
```

### Example:
```bash
GET http://localhost:3006/api/profile-user/complete
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
```

---

## 📤 Response Structure

### Success Response:
```json
{
  "success": true,
  "message": "تم جلب البيانات الكاملة بنجاح",
  "data": {
    "account": { /* من جدول users */ },
    "profile": { /* من جدول user_profiles */ },
    "translations": { /* من جدول user_profile_translations */ }
  }
}
```

---

## 📊 Data Structure Details

### 1. `account` (من جدول `users`)

**الحقول المُرجعة:**
```json
{
  "id": 24,
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "email_verified_at": "2025-11-01T10:00:00.000Z",
  "phone_verified_at": "2025-11-01T10:05:00.000Z",
  "status": "active",
  "last_login_at": "2025-11-03T20:30:00.000Z",
  "last_activity_at": "2025-11-03T21:00:00.000Z",
  "is_email_otp": 0,
  "is_phone_otp": 0,
  "is_id_verified": 1,
  "created_at": "2025-11-01T09:00:00.000Z",
  "updated_at": "2025-11-03T20:30:00.000Z"
}
```

**الحقول المُستبعدة (للأمان):**
- ❌ `password_hash`
- ❌ `email_otp`
- ❌ `phone_otp`
- ❌ `email_otp_expiry`
- ❌ `phone_otp_expiry`
- ❌ `login_attempts`
- ❌ `locked_until`

---

### 2. `profile` (من جدول `user_profiles`)

**جميع الحقول:**
```json
{
  "id": 23,
  "user_id": 24,
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "nationality": "Egyptian",
  "profile_picture_url": "http://localhost:3006/upload/files/...",
  "emergency_contact_phone": "+20123456789",
  "timezone": "Africa/Cairo",
  "language_preference": "ar",
  "created_at": "2025-11-01T09:00:00.000Z",
  "updated_at": "2025-11-03T20:45:00.000Z"
}
```

**إذا لم يكن هناك profile:**
```json
"profile": null
```

---

### 3. `translations` (من جدول `user_profile_translations`)

**جميع اللغات مُنظمة:**
```json
{
  "ar": {
    "full_name": "أحمد محمد علي",
    "emergency_contact_name": "فاطمة أحمد",
    "emergency_contact_relationship": "أخت"
  },
  "en": {
    "full_name": "Ahmed Mohamed Ali",
    "emergency_contact_name": "Fatima Ahmed",
    "emergency_contact_relationship": "Sister"
  }
}
```

**إذا لم تكن هناك ترجمات:**
```json
"translations": {}
```

---

## 📋 Response Examples

### ✅ مستخدم مع profile كامل:
```json
{
  "success": true,
  "message": "تم جلب البيانات الكاملة بنجاح",
  "data": {
    "account": {
      "id": 24,
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "ahmed@example.com",
      "phone": "+201234567890",
      "email_verified_at": "2025-11-01T10:00:00.000Z",
      "phone_verified_at": "2025-11-01T10:05:00.000Z",
      "status": "active",
      "last_login_at": "2025-11-03T20:30:00.000Z",
      "last_activity_at": "2025-11-03T21:00:00.000Z",
      "is_email_otp": 0,
      "is_phone_otp": 0,
      "is_id_verified": 1,
      "created_at": "2025-11-01T09:00:00.000Z",
      "updated_at": "2025-11-03T20:30:00.000Z"
    },
    "profile": {
      "id": 23,
      "user_id": 24,
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "nationality": "Egyptian",
      "profile_picture_url": "http://localhost:3006/upload/files/profile-picture/...",
      "emergency_contact_phone": "+20123456789",
      "timezone": "Africa/Cairo",
      "language_preference": "ar",
      "created_at": "2025-11-01T09:00:00.000Z",
      "updated_at": "2025-11-03T20:45:00.000Z"
    },
    "translations": {
      "ar": {
        "full_name": "أحمد محمد علي",
        "emergency_contact_name": "فاطمة أحمد",
        "emergency_contact_relationship": "أخت"
      },
      "en": {
        "full_name": "Ahmed Mohamed Ali",
        "emergency_contact_name": "Fatima Ahmed",
        "emergency_contact_relationship": "Sister"
      }
    }
  }
}
```

### ✅ مستخدم جديد بدون profile:
```json
{
  "success": true,
  "message": "Complete data retrieved successfully",
  "data": {
    "account": {
      "id": 25,
      "uuid": "b2c3d4e5-f6g7-8901-bcde-fg2345678901",
      "email": "newuser@example.com",
      "phone": "+201098765432",
      "email_verified_at": null,
      "phone_verified_at": null,
      "status": "pending_verification",
      "last_login_at": null,
      "last_activity_at": null,
      "is_email_otp": 0,
      "is_phone_otp": 0,
      "is_id_verified": 0,
      "created_at": "2025-11-04T01:00:00.000Z",
      "updated_at": "2025-11-04T01:00:00.000Z"
    },
    "profile": null,
    "translations": {}
  }
}
```

### ❌ User not found:
```json
{
  "success": false,
  "message": "المستخدم غير موجود"
}
```

---

## 🔄 Comparison with Other Endpoints

| Endpoint | Data Returned | Use Case |
|----------|--------------|----------|
| `GET /api/profile-user` | Profile + **one** translation (merged) | عرض Profile بلغة واحدة |
| `GET /api/profile-user/complete` | Account + Profile + **all** translations (separate) | البيانات الكاملة من جميع الجداول |

---

## 🎯 Use Cases

### 1. **Profile Screen في Mobile App**
```javascript
// جلب البيانات الكاملة عند فتح Profile
const response = await fetch('http://localhost:3006/api/profile-user/complete', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const { data } = await response.json();
// عرض account info
console.log('Email:', data.account.email);
console.log('Status:', data.account.status);

// عرض profile info
console.log('Birthday:', data.profile?.date_of_birth);

// عرض الأسماء بجميع اللغات
console.log('Arabic Name:', data.translations.ar?.full_name);
console.log('English Name:', data.translations.en?.full_name);
```

### 2. **Admin Dashboard**
```javascript
// Admin يرى البيانات الكاملة للمستخدم
// (سيتطلب إضافة endpoint خاص بالـ Admin لاحقاً)
```

### 3. **Data Export**
```javascript
// تصدير بيانات المستخدم
const { data } = await getUserCompleteData();
downloadAsJSON(data, 'my-profile-data.json');
```

### 4. **Multi-language Display**
```javascript
const { translations } = data;

// عرض الاسم بجميع اللغات
Object.keys(translations).forEach(lang => {
  console.log(`Name (${lang}):`, translations[lang].full_name);
});
```

---

## 🧪 Testing

### Postman:
```
1. Login أولاً:
   POST http://localhost:3006/api/auth-user/login
   Body: { email, password }
   
2. Copy token من response

3. Get Complete Data:
   GET http://localhost:3006/api/profile-user/complete
   Headers:
   - Authorization: Bearer YOUR_TOKEN
   - Accept-Language: ar
```

### cURL:
```bash
curl -X GET 'http://localhost:3006/api/profile-user/complete' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Accept-Language: ar'
```

### JavaScript Fetch:
```javascript
fetch('http://localhost:3006/api/profile-user/complete', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'ar'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Complete User Data:', data);
});
```

---

## ⚠️ Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Token غير موجود أو منتهي |
| 404 | المستخدم غير موجود | User ID في token غير موجود |
| 500 | خطأ في جلب البيانات الكاملة | خطأ في السيرفر |

---

## 🔒 Security Notes

- ✅ يتطلب JWT token صالح
- ✅ المستخدم يجلب بياناته فقط (من token)
- ✅ لا يتم إرجاع `password_hash`
- ✅ لا يتم إرجاع OTP codes
- ✅ لا يتم إرجاع `login_attempts` أو `locked_until`
- ⚠️ `email` و `phone` يتم إرجاعهما (المستخدم يرى بياناته)

---

## 📝 Notes

1. **المستخدم الحالي فقط:**
   - الـ API يعمل للمستخدم المُسجل دخوله (من JWT token)
   - لا يمكن جلب بيانات مستخدم آخر

2. **Null Values:**
   - إذا لم يكن لدى المستخدم profile: `profile: null`
   - إذا لم تكن هناك ترجمات: `translations: {}`

3. **جميع الترجمات:**
   - يتم إرجاع **جميع** اللغات المتاحة
   - `Accept-Language` يؤثر فقط على رسالة الـ response

4. **Performance:**
   - الـ API يقوم بـ 3 queries منفصلة
   - للـ performance الأفضل، استخدم `GET /api/profile-user` إذا كنت تحتاج لغة واحدة فقط

---

**Status:** ✅ Ready  
**Version:** 1.0  
**Created:** November 2025

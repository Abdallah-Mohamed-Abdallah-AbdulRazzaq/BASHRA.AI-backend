# Test Basic User Data API
# اختبار API البيانات الأساسية

## 🧪 خطوات الاختبار | Test Steps

### 1️⃣ اختبر GET أولاً

```bash
GET http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: en
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Basic data retrieved successfully",
  "data": {
    "id": 24,
    "uuid": "734de6dc-4c3a-459c-ab23-b9f12245b9ac",
    "email": "safnks0@gmail.com",
    "phone": "+20 10 03226222",
    "date_of_birth": "1990-05-14T21:00:00.000Z",
    "gender": "male",
    "nationality": "Egyptian",
    "profile_picture_url": "http://localhost:3006/upload/...",
    "emergency_contact_phone": "+20123456789",
    "timezone": "Africa/Cairo",
    "language_preference": "en",
    "full_name": null,  // ← سيظهر الآن!
    "emergency_contact_name": null,  // ← سيظهر الآن!
    "emergency_contact_relationship": null  // ← سيظهر الآن!
  }
}
```

---

### 2️⃣ قم بإنشاء Translation باستخدام PUT

#### Test A: إنشاء ترجمة عربية (Arabic)

```bash
PUT http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "full_name": "أحمد محمد علي",
  "emergency_contact_name": "فاطمة أحمد",
  "emergency_contact_relationship": "أخت"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "تم تحديث البيانات الأساسية بنجاح",
  "data": {
    "id": 24,
    "uuid": "734de6dc-4c3a-459c-ab23-b9f12245b9ac",
    "email": "safnks0@gmail.com",
    "phone": "+20 10 03226222",
    "date_of_birth": "1990-05-14T21:00:00.000Z",
    "gender": "male",
    "nationality": "Egyptian",
    "profile_picture_url": "http://localhost:3006/upload/...",
    "emergency_contact_phone": "+20123456789",
    "timezone": "Africa/Cairo",
    "language_preference": "en",
    "full_name": "أحمد محمد علي",
    "emergency_contact_name": "فاطمة أحمد",
    "emergency_contact_relationship": "أخت"
  }
}
```

**في Terminal سترى:**
```
=== Update Basic User Data ===
User ID: 24
Language: ar
Request Body: { full_name: 'أحمد محمد علي', ... }
=============================
Updating translations for language: ar
Translation fields: { full_name: 'أحمد محمد علي', ... }
```

---

#### Test B: إنشاء ترجمة إنجليزية (English)

```bash
PUT http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: en
Content-Type: application/json

{
  "full_name": "Ahmed Mohamed Ali",
  "emergency_contact_name": "Fatima Ahmed",
  "emergency_contact_relationship": "Sister"
}
```

---

### 3️⃣ اختبر GET مع اللغات المختلفة

#### GET بالعربي:
```bash
GET http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: ar
```

**Expected:** سيظهر الـ translation العربي

#### GET بالإنجليزي:
```bash
GET http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: en
```

**Expected:** سيظهر الـ translation الإنجليزي

---

### 4️⃣ اختبر تحديث جميع البيانات معاً

```bash
PUT http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "email": "newemail@example.com",
  "phone": "+201111111111",
  "date_of_birth": "1992-08-20",
  "gender": "male",
  "nationality": "مصري",
  "emergency_contact_phone": "+20123456789",
  "timezone": "Africa/Cairo",
  "language_preference": "ar",
  "full_name": "أحمد محمد علي الجديد",
  "emergency_contact_name": "فاطمة أحمد محمد",
  "emergency_contact_relationship": "أخت"
}
```

**Expected:** 
- ✅ تحديث email و phone في `users`
- ✅ تحديث profile fields في `user_profiles`
- ✅ تحديث أو إنشاء translation في `user_profile_translations`

---

### 5️⃣ اختبر Form-Data

```bash
PUT http://localhost:3006/api/profile-user/basic
Authorization: Bearer YOUR_USER_TOKEN
Accept-Language: ar
Content-Type: multipart/form-data

Form-data:
- full_name: أحمد محمد المحدث
- gender: male
- nationality: مصري
```

---

## 🔍 التحقق من Database | Verify in Database

### 1. Check `users` table:
```sql
SELECT id, uuid, email, phone FROM users WHERE id = 24;
```

### 2. Check `user_profiles` table:
```sql
SELECT * FROM user_profiles WHERE user_id = 24;
```

### 3. Check `user_profile_translations` table:
```sql
SELECT * FROM user_profile_translations 
WHERE profile_id = (SELECT id FROM user_profiles WHERE user_id = 24);
```

**Expected Result:**
```
+----+------------+---------------+--------------------+...
| id | profile_id | language_code | full_name          |...
+----+------------+---------------+--------------------+...
| 1  | 23         | ar            | أحمد محمد علي     |...
| 2  | 23         | en            | Ahmed Mohamed Ali  |...
+----+------------+---------------+--------------------+...
```

---

## 🐛 استكشاف الأخطاء | Troubleshooting

### المشكلة: translation fields لا تظهر في GET
**الحل:** 
- تأكد من وجود بيانات في `user_profile_translations`
- الآن الـ API يعرض `null` إذا لم توجد ترجمة ✅

### المشكلة: PUT لا يُحدث translations
**السبب المحتمل:**
1. `Accept-Language` header غير موجود → يستخدم اللغة الافتراضية
2. profile_id غير موجود
3. البيانات لم تُرسل بشكل صحيح

**الحل:**
- راجع Terminal logs - سترى debug output
- تأكد من إرسال `Accept-Language` header

---

## ✅ Checklist

- [ ] GET يُرجع translation fields (حتى لو null)
- [ ] PUT بـ JSON يعمل
- [ ] PUT بـ form-data يعمل
- [ ] إنشاء translation جديد يعمل
- [ ] تحديث translation موجود يعمل
- [ ] اللغات المختلفة تعمل (ar/en)
- [ ] تحديث email يتحقق من التكرار
- [ ] تحديث phone يتحقق من التكرار
- [ ] Validation يعمل (date format, gender, phone)

---

## 📝 Notes

1. **Translation fields تُحدث للغة المحددة في `Accept-Language` فقط**
2. **إذا لم توجد ترجمة، GET سيُرجع fallback من أي لغة متاحة**
3. **Debug logs تساعدك في معرفة ما يحدث**

---

**Status:** Ready for Testing ✅  
**Date:** November 2025

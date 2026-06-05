# 🐛 Bug Fix Notes - Patient Profiles APIs
# ملاحظات إصلاح الأخطاء - APIs ملفات المرضى

> **تاريخ الإصلاح:** 24 نوفمبر 2025  
> **الإصدار:** 1.0.1

---

## 🔍 المشكلة | Problem

عند استخدام الـ APIs الجديدة للطاقم الطبي والإداري، ظهرت أخطاء في قاعدة البيانات:

```
Unknown column 'first_name' in 'field list'
Unknown column 'u.first_name' in 'field list'
```

### الـ APIs المتأثرة:
- `GET /api/patient-profiles/all`
- `GET /api/patient-profiles/patient/:userId`

---

## 🔎 السبب | Root Cause

### هيكل قاعدة البيانات الفعلي:

جدول `users` **لا يحتوي** على الأعمدة التالية:
- ❌ `first_name`
- ❌ `last_name`
- ❌ `date_of_birth`
- ❌ `gender`

هذه البيانات موجودة في جداول منفصلة:
- ✅ `user_profiles` - يحتوي على `date_of_birth`, `gender`
- ✅ `user_profile_translations` - يحتوي على `full_name`

### العلاقات بين الجداول:
```
users (id, email, phone)
  ↓ (ONE-TO-ONE)
user_profiles (user_id, date_of_birth, gender)
  ↓ (ONE-TO-MANY)
user_profile_translations (profile_id, language_code, full_name)
```

---

## ✅ الحل | Solution

### 1. تعديل SQL Queries

#### قبل التعديل:
```sql
SELECT u.id, u.email, u.phone, u.first_name, u.last_name, u.date_of_birth, u.gender 
FROM users u 
WHERE u.id = ?
```

#### بعد التعديل:
```sql
SELECT u.id, u.email, u.phone, 
       up.date_of_birth, up.gender,
       upt.full_name
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
WHERE u.id = ?
```

### 2. تعديل شرط البحث

#### قبل التعديل:
```sql
WHERE u.email LIKE ? OR u.phone LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?
```

#### بعد التعديل:
```sql
WHERE u.email LIKE ? OR u.phone LIKE ? OR upt.full_name LIKE ?
```

### 3. تعديل Response Structure

#### قبل التعديل:
```json
{
  "first_name": "أحمد",
  "last_name": "محمد"
}
```

#### بعد التعديل:
```json
{
  "full_name": "أحمد محمد"
}
```

---

## 📝 الملفات المعدلة | Modified Files

### 1. Controller
**الملف:** `controllers/patientProfileController.js`

**الدوال المعدلة:**
- ✅ `getAllPatientProfiles()` - Lines 747-867
  - تعديل query العد
  - تعديل query الجلب
  - تعديل شرط البحث
  - تعديل merge البيانات

- ✅ `getPatientProfileByUserId()` - Lines 875-983
  - تعديل query جلب المستخدم
  - تعديل merge البيانات

### 2. Documentation
**الملفات المحدثة:**
- ✅ `docs/13-patient-profiles/PATIENT_PROFILES_API_GUIDE.md`
  - تحديث أمثلة الاستجابة
  - استبدال `first_name` و `last_name` بـ `full_name`

- ✅ `docs/13-patient-profiles/STAFF_ACCESS_API.md`
  - تحديث جميع الأمثلة
  - تحديث TypeScript interface
  - تحديث Response examples

---

## 🧪 الاختبار | Testing

### Test Case 1: Get All Profiles
```bash
GET /api/patient-profiles/all?page=1&limit=10
Authorization: Bearer ADMIN_TOKEN
Accept-Language: ar

Expected Response:
{
  "success": true,
  "data": [
    {
      "full_name": "أحمد محمد",  ✅
      "email": "patient@example.com",
      "date_of_birth": "1990-01-01",
      "gender": "male"
    }
  ]
}
```

### Test Case 2: Get Patient by User ID
```bash
GET /api/patient-profiles/patient/123
Authorization: Bearer DOCTOR_TOKEN
Accept-Language: ar

Expected Response:
{
  "success": true,
  "data": {
    "full_name": "أحمد محمد",  ✅
    "email": "patient@example.com",
    "blood_type": "A+"
  }
}
```

### Test Case 3: Search by Name
```bash
GET /api/patient-profiles/all?search=أحمد
Authorization: Bearer ADMIN_TOKEN

Expected: Results filtered by full_name ✅
```

---

## 💡 ملاحظات مهمة | Important Notes

### 1. دعم متعدد اللغات:
- الآن يتم جلب `full_name` بناءً على `language_code` المطلوب
- إذا كان `Accept-Language: ar` → يجلب الاسم العربي
- إذا كان `Accept-Language: en` → يجلب الاسم الإنجليزي

### 2. البحث:
- البحث الآن يعمل على `full_name` من جدول `user_profile_translations`
- يدعم البحث بأي جزء من الاسم الكامل

### 3. الأداء:
- استخدام `LEFT JOIN` لضمان عرض جميع المرضى حتى لو لم يكن لديهم profile
- استخدام `COUNT(DISTINCT pp.id)` لتجنب العد المكرر

---

## ⚠️ Breaking Changes

### للمطورين الذين يستخدمون هذه الـ APIs:

**تغيير في Response Structure:**

❌ **القديم:**
```json
{
  "first_name": "أحمد",
  "last_name": "محمد"
}
```

✅ **الجديد:**
```json
{
  "full_name": "أحمد محمد"
}
```

**الإجراء المطلوب:**
- تحديث Frontend code لاستخدام `full_name` بدلاً من `first_name` و `last_name`
- تحديث أي Integration tests

---

## 🔄 Migration Guide

إذا كنت تستخدم الـ APIs القديمة:

### Frontend Code:

#### Before:
```javascript
const fullName = `${patient.first_name} ${patient.last_name}`;
```

#### After:
```javascript
const fullName = patient.full_name;
```

### API Calls:

لا حاجة لتغيير API calls - فقط تحديث معالجة الاستجابة.

---

## ✅ Status

- [x] تم إصلاح جميع الأخطاء
- [x] تم تحديث التوثيق
- [x] تم اختبار الـ APIs
- [x] متوافق مع هيكل قاعدة البيانات الفعلي

---

<div align="center">

**🐛 Bug Fixed Successfully! ✅**

**تم إصلاح الخطأ بنجاح!**

**التاريخ:** 24 نوفمبر 2025  
**الإصدار:** 1.0.1

</div>

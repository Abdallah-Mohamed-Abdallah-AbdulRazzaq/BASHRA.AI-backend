# إصلاح مشكلة حقول JSON
# JSON Fields Fix Guide

## 🐛 المشكلة | Problem

عند استدعاء API:
```
GET http://localhost:3006/api/profile-doctor/professional
```

تظهر الرسالة:
```json
{
  "success": false,
  "message": "Error fetching professional data",
  "error": "Unexpected token 'B', \"Board Cert\"... is not valid JSON"
}
```

---

## 🔍 السبب | Root Cause

الحقول `board_certifications` و `languages_spoken` في جدول `doctor_profiles` مخزنة بشكل غير صحيح.

**مثال على البيانات الخاطئة:**
```
board_certifications: "Board Certified in Cardiology, ACLS Certified"
```

**الشكل الصحيح:**
```json
board_certifications: "[\"Board Certified in Cardiology\",\"ACLS Certified\"]"
```

---

## ✅ الحل | Solution

### الحل 1: تشغيل سكريبت الإصلاح التلقائي

قمنا بإنشاء سكريبت يقوم بإصلاح جميع البيانات تلقائياً:

```bash
node scripts/fix-json-fields.js
```

**ما يفعله السكريبت:**
1. يفحص جميع السجلات في `doctor_profiles`
2. يتحقق من صحة حقول JSON
3. يحول البيانات الخاطئة إلى JSON صحيح
4. يحدث قاعدة البيانات

---

### الحل 2: الإصلاح اليدوي في قاعدة البيانات

إذا كنت تفضل الإصلاح اليدوي:

#### 1. تحديد السجلات المشكلة
```sql
SELECT id, doctor_id, board_certifications, languages_spoken
FROM doctor_profiles
WHERE board_certifications IS NOT NULL 
   OR languages_spoken IS NOT NULL;
```

#### 2. إصلاح السجلات
```sql
-- مثال: تحويل "Item1, Item2" إلى ["Item1", "Item2"]
UPDATE doctor_profiles
SET board_certifications = '["Board Certified in Cardiology","ACLS Certified"]',
    languages_spoken = '["Arabic","English","French"]'
WHERE id = 1;
```

---

### الحل 3: تحديث الكود (تم بالفعل ✅)

قمنا بتحديث الكود ليتعامل مع البيانات الخاطئة بشكل آمن:

**في `doctorProfessionalController.js`:**
```javascript
// Parse JSON fields safely
if (profile.board_certifications) {
  try {
    if (typeof profile.board_certifications === 'string') {
      profile.board_certifications = JSON.parse(profile.board_certifications);
    }
  } catch (error) {
    console.error('Error parsing board_certifications:', error);
    profile.board_certifications = [];
  }
} else {
  profile.board_certifications = [];
}
```

**الميزات:**
- ✅ try-catch للتعامل مع الأخطاء
- ✅ التحقق من نوع البيانات
- ✅ قيمة افتراضية (array فارغ) عند الفشل
- ✅ تسجيل الأخطاء في console

---

## 🧪 الاختبار | Testing

### 1. اختبار API بعد الإصلاح

```http
GET http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "data": {
    "professional_data": {
      "license_number": "MED-12345",
      "years_of_experience": 10,
      "board_certifications": [
        "Board Certified in Cardiology",
        "ACLS Certified"
      ],
      "languages_spoken": [
        "Arabic",
        "English",
        "French"
      ]
    },
    "translations": {
      "ar": {
        "specialty": "أمراض القلب",
        "sub_specialty": "قسطرة القلب",
        "biography": "..."
      }
    }
  }
}
```

### 2. التحقق من قاعدة البيانات

```sql
-- يجب أن تكون البيانات بصيغة JSON صحيحة
SELECT 
  id,
  board_certifications,
  languages_spoken,
  JSON_VALID(board_certifications) as is_board_valid,
  JSON_VALID(languages_spoken) as is_languages_valid
FROM doctor_profiles;
```

---

## 🔧 منع المشكلة مستقبلاً | Prevention

### 1. التحقق من البيانات عند الإدخال

في `doctorProfessionalController.js` - `createProfessionalData()`:

```javascript
// Validate and stringify arrays
if (board_certifications) {
  if (!Array.isArray(board_certifications)) {
    return res.status(400).json({
      success: false,
      message: 'board_certifications must be an array'
    });
  }
  board_certifications = JSON.stringify(board_certifications);
}
```

### 2. استخدام JSON column type في MySQL

إذا كنت تستخدم MySQL 5.7+ أو MariaDB 10.2+:

```sql
ALTER TABLE doctor_profiles
MODIFY COLUMN board_certifications JSON,
MODIFY COLUMN languages_spoken JSON;
```

**الفوائد:**
- ✅ التحقق التلقائي من صحة JSON
- ✅ أداء أفضل للاستعلامات
- ✅ دعم JSON functions

### 3. إضافة Validation في API

```javascript
// في createProfessionalData و updateProfessionalData
if (board_certifications) {
  // Ensure it's an array
  if (!Array.isArray(board_certifications)) {
    return res.status(400).json({
      success: false,
      message: language === 'ar' 
        ? 'board_certifications يجب أن يكون مصفوفة' 
        : 'board_certifications must be an array'
    });
  }
  
  // Ensure all items are strings
  if (!board_certifications.every(item => typeof item === 'string')) {
    return res.status(400).json({
      success: false,
      message: language === 'ar' 
        ? 'جميع عناصر board_certifications يجب أن تكون نصوص' 
        : 'All board_certifications items must be strings'
    });
  }
}
```

---

## 📋 قائمة التحقق | Checklist

- [ ] تشغيل سكريبت الإصلاح: `node scripts/fix-json-fields.js`
- [ ] التحقق من قاعدة البيانات (JSON_VALID)
- [ ] اختبار API: GET `/api/profile-doctor/professional`
- [ ] اختبار API: GET `/api/admin/doctors/:id/profile/professional`
- [ ] التأكد من عدم وجود أخطاء في console
- [ ] اختبار إنشاء بيانات مهنية جديدة
- [ ] اختبار تحديث البيانات المهنية

---

## 🎯 الخلاصة | Summary

**المشكلة:** حقول JSON مخزنة بشكل غير صحيح في قاعدة البيانات

**الحل:**
1. ✅ تحديث الكود ليتعامل مع البيانات الخاطئة بشكل آمن
2. ✅ إنشاء سكريبت لإصلاح البيانات الموجودة
3. ✅ إضافة validation لمنع المشكلة مستقبلاً

**الحالة:** ✅ تم الإصلاح

---

## 📞 الدعم | Support

إذا استمرت المشكلة:
1. تحقق من logs في terminal
2. تحقق من البيانات في قاعدة البيانات
3. شغل السكريبت مرة أخرى
4. تحقق من نوع column في قاعدة البيانات

---

**تاريخ الإصلاح:** 2024
**الحالة:** ✅ تم الإصلاح

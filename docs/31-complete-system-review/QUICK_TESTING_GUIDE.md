# دليل الاختبار السريع
# Quick Testing Guide

## 🚀 نظرة عامة | Overview

هذا الدليل يوفر خطوات سريعة لاختبار جميع الأنظمة المضافة.

---

## 📋 المتطلبات الأساسية | Prerequisites

1. ✅ تشغيل الخادم: `npm start` أو `node app.js`
2. ✅ قاعدة البيانات متصلة وجاهزة
3. ✅ Postman أو أي أداة لاختبار APIs
4. ✅ حساب طبيب مسجل (Doctor Account)
5. ✅ حساب أدمن مسجل (Admin Account)

---

## 🔑 الحصول على Tokens

### 1. تسجيل دخول الطبيب
```http
POST http://localhost:3006/api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**احفظ:** `doctorToken` من الاستجابة

### 2. تسجيل دخول الأدمن
```http
POST http://localhost:3006/api/auth-admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**احفظ:** `adminToken` من الاستجابة

---

## 🧪 اختبار نظام البيانات المهنية | Testing Professional Data System

### 1. إنشاء البيانات المهنية
```http
POST http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
Content-Type: application/json

{
  "license_number": "MED-12345",
  "years_of_experience": 10,
  "medical_school": "Cairo University",
  "graduation_year": 2014,
  "board_certifications": ["Board Certified in Cardiology", "ACLS Certified"],
  "languages_spoken": ["Arabic", "English", "French"],
  "translations": {
    "ar": {
      "specialty": "أمراض القلب",
      "sub_specialty": "قسطرة القلب",
      "biography": "طبيب قلب متخصص مع خبرة 10 سنوات"
    },
    "en": {
      "specialty": "Cardiology",
      "sub_specialty": "Cardiac Catheterization",
      "biography": "Specialized cardiologist with 10 years of experience"
    }
  }
}
```

**النتيجة المتوقعة:** ✅ Status 201 - تم إنشاء البيانات المهنية

### 2. جلب البيانات المهنية
```http
GET http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - عرض البيانات المهنية

### 3. تحديث البيانات المهنية
```http
PUT http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
Content-Type: application/json

{
  "years_of_experience": 11,
  "translations": {
    "ar": {
      "biography": "طبيب قلب متخصص مع خبرة 11 سنة"
    }
  }
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم التحديث

---

## 🧪 اختبار نظام مستندات التحقق | Testing Verification Documents System

### 1. رفع مستند التحقق
```http
POST http://localhost:3006/api/profile-doctor/verification-documents
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
Content-Type: multipart/form-data

document_type: medical_license
file: [اختر ملف PDF أو صورة]
```

**النتيجة المتوقعة:** ✅ Status 201 - تم رفع المستند

**ملاحظة:** المستند يتم تسجيله في:
- جدول `doctor_verification_documents`
- جدول `files` (عبر FileService)

### 2. جلب جميع المستندات
```http
GET http://localhost:3006/api/profile-doctor/verification-documents
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - قائمة المستندات

### 3. جلب مستند محدد
```http
GET http://localhost:3006/api/profile-doctor/verification-documents/1
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - تفاصيل المستند

### 4. جلب ملخص المستندات
```http
GET http://localhost:3006/api/profile-doctor/verification-documents/summary
Authorization: Bearer {{doctorToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - إحصائيات المستندات

---

## 🧪 اختبار نظام إدارة الأدمن | Testing Admin Management System

### 1. جلب الملف الكامل للطبيب
```http
GET http://localhost:3006/api/admin/doctors/1/profile/complete
Authorization: Bearer {{adminToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - الملف الكامل (حساب + ملف شخصي + بيانات مهنية + مستندات)

### 2. جلب البيانات الشخصية فقط
```http
GET http://localhost:3006/api/admin/doctors/1/profile/personal
Authorization: Bearer {{adminToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - البيانات الشخصية فقط

### 3. جلب البيانات المهنية فقط
```http
GET http://localhost:3006/api/admin/doctors/1/profile/professional
Authorization: Bearer {{adminToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - البيانات المهنية فقط

### 4. جلب المستندات
```http
GET http://localhost:3006/api/admin/doctors/1/profile/documents
Authorization: Bearer {{adminToken}}
Accept-Language: ar
```

**النتيجة المتوقعة:** ✅ Status 200 - قائمة المستندات

### 5. الموافقة على مستند
```http
PUT http://localhost:3006/api/admin/doctors/1/profile/documents/1
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "status": "approved"
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم الموافقة على المستند

### 6. رفض مستند
```http
PUT http://localhost:3006/api/admin/doctors/1/profile/documents/1
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "status": "rejected",
  "rejection_reason": "الصورة غير واضحة، يرجى رفع صورة أوضح"
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم رفض المستند

### 7. الموافقة الكاملة على ملف الطبيب
```http
POST http://localhost:3006/api/admin/doctors/1/profile/approve
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "reason": "جميع المستندات صحيحة والبيانات مكتملة"
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم الموافقة على الملف

**ما يحدث:**
- ✅ `is_verified` = 1
- ✅ `verification_date` = الآن
- ✅ `verified_by` = adminId
- ✅ `approval_status` = 'approved'
- ✅ `doctors.status` = 'active' (إذا كان pending_verification)

### 8. رفض ملف الطبيب
```http
POST http://localhost:3006/api/admin/doctors/1/profile/reject
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "reason": "بيانات غير مكتملة أو مستندات غير صحيحة"
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم رفض الملف

**ما يحدث:**
- ✅ `approval_status` = 'rejected'
- ✅ `doctors.status` = 'inactive'

### 9. تحديث البيانات الشخصية
```http
PUT http://localhost:3006/api/admin/doctors/1/profile/personal
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "email": "newemail@example.com",
  "phone": "+201234567890",
  "translations": {
    "ar": {
      "full_name": "د. أحمد محمد"
    }
  }
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم التحديث

### 10. تحديث البيانات المهنية
```http
PUT http://localhost:3006/api/admin/doctors/1/profile/professional
Authorization: Bearer {{adminToken}}
Accept-Language: ar
Content-Type: application/json

{
  "years_of_experience": 12,
  "translations": {
    "ar": {
      "specialty": "جراحة القلب"
    }
  }
}
```

**النتيجة المتوقعة:** ✅ Status 200 - تم التحديث

---

## 🔍 التحقق من النتائج | Verifying Results

### 1. التحقق من تسجيل الملفات في `files` table
```sql
SELECT * FROM files 
WHERE file_category = 'verification_document' 
ORDER BY created_at DESC;
```

**يجب أن ترى:**
- ✅ UUID فريد لكل ملف
- ✅ `uploaded_by_doctor_id` = doctorId
- ✅ `file_category` = 'verification_document'
- ✅ `file_url` يحتوي على المسار الكامل

### 2. التحقق من تسجيل المستندات في `doctor_verification_documents`
```sql
SELECT * FROM doctor_verification_documents 
WHERE doctor_id = 1 
ORDER BY uploaded_at DESC;
```

**يجب أن ترى:**
- ✅ `document_type` صحيح
- ✅ `file_url` يطابق الملف في جدول `files`
- ✅ `status` = 'pending' (في البداية)

### 3. التحقق من حقول الموافقة في `doctor_profiles`
```sql
SELECT 
  id, doctor_id, 
  is_verified, verification_date, verified_by, approval_status
FROM doctor_profiles 
WHERE doctor_id = 1;
```

**بعد الموافقة يجب أن ترى:**
- ✅ `is_verified` = 1
- ✅ `verification_date` = تاريخ الموافقة
- ✅ `verified_by` = adminId
- ✅ `approval_status` = 'approved'

### 4. التحقق من Audit Trail
```sql
SELECT * FROM admin_actions 
WHERE entity_type = 'doctor_profile' 
ORDER BY created_at DESC 
LIMIT 10;
```

**يجب أن ترى:**
- ✅ جميع عمليات الأدمن مسجلة
- ✅ `old_data` و `new_data` موجودة
- ✅ `client_info` يحتوي على IP و User Agent

---

## 📊 سيناريوهات الاختبار الكاملة | Complete Test Scenarios

### سيناريو 1: طبيب جديد يسجل ويرفع مستنداته
1. ✅ الطبيب يسجل حساب جديد
2. ✅ الطبيب يملأ البيانات الشخصية
3. ✅ الطبيب يملأ البيانات المهنية
4. ✅ الطبيب يرفع مستندات التحقق (رخصة، شهادة، إلخ)
5. ✅ الأدمن يراجع الملف الكامل
6. ✅ الأدمن يوافق على المستندات واحدة تلو الأخرى
7. ✅ الأدمن يوافق على الملف بشكل كامل
8. ✅ حالة الطبيب تتغير إلى 'active'

### سيناريو 2: رفض مستند وإعادة رفعه
1. ✅ الطبيب يرفع مستند
2. ✅ الأدمن يرفض المستند مع سبب
3. ✅ الطبيب يرى سبب الرفض
4. ✅ الطبيب يحدث المستند (يرفع مستند جديد)
5. ✅ الأدمن يوافق على المستند الجديد

### سيناريو 3: تحديث البيانات من قبل الأدمن
1. ✅ الأدمن يجلب البيانات الحالية
2. ✅ الأدمن يحدث البيانات الشخصية
3. ✅ الأدمن يحدث البيانات المهنية
4. ✅ جميع التحديثات مسجلة في Audit Trail

---

## 🐛 استكشاف الأخطاء | Troubleshooting

### مشكلة: "File not uploaded"
**الحل:**
- تأكد من استخدام `Content-Type: multipart/form-data`
- تأكد من اسم الحقل: `file` (للمستندات) أو `profile_picture` (للصور الشخصية)

### مشكلة: "Invalid document type"
**الحل:**
- استخدم أحد الأنواع الصحيحة:
  - `national_id`
  - `passport`
  - `medical_license`
  - `board_certificate`
  - `university_degree`
  - `other`

### مشكلة: "Profile not found"
**الحل:**
- تأكد من أن الطبيب قام بإنشاء ملفه الشخصي أولاً
- تأكد من استخدام `doctorId` الصحيح

### مشكلة: "Unauthorized"
**الحل:**
- تأكد من إضافة `Authorization: Bearer {{token}}`
- تأكد من أن الـ token صالح وغير منتهي

---

## ✅ قائمة التحقق النهائية | Final Checklist

- [ ] جميع APIs تعمل بشكل صحيح
- [ ] الملفات يتم رفعها وتسجيلها في `files` table
- [ ] المستندات يتم تسجيلها في `doctor_verification_documents`
- [ ] حقول الموافقة (`is_verified`, `verification_date`, `verified_by`, `approval_status`) تعمل
- [ ] Audit Trail يسجل جميع عمليات الأدمن
- [ ] Multi-Language يعمل (العربية والإنجليزية)
- [ ] Transactions تحمي من البيانات الجزئية
- [ ] Error Handling يعمل بشكل صحيح

---

## 🎉 النتيجة | Result

إذا نجحت جميع الاختبارات أعلاه، فإن النظام:
- ✅ جاهز للاستخدام في الإنتاج
- ✅ متوافق تماماً مع البنية الأساسية
- ✅ آمن ومحمي بشكل صحيح
- ✅ موثق بشكل كامل

**مبروك! 🎊 النظام جاهز! 🚀**

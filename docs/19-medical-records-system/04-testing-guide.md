# Medical Records API Testing Guide
# دليل اختبار APIs السجلات الطبية

---

## 📋 نظرة عامة | Overview

هذا الدليل يشرح كيفية اختبار جميع APIs الخاصة بالسجلات الطبية باستخدام:
- **Postman** - الأداة الأكثر شيوعاً
- **cURL** - من سطر الأوامر
- **Thunder Client** - امتداد VS Code

---

## 🔑 المتطلبات الأساسية | Prerequisites

### 1. الحصول على Token

قبل اختبار أي API، تحتاج إلى الحصول على JWT Token:

#### للطبيب (Doctor)
```bash
POST http://localhost:3006/api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "your_password"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

#### للمريض (Patient)
```bash
POST http://localhost:3006/api/auth-user/login
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "your_password"
}
```

#### للإداري (Admin)
```bash
POST http://localhost:3006/api/auth-admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**احفظ الـ Token** لاستخدامه في جميع الطلبات التالية.

---

## 🧪 اختبار APIs - الأطباء (Doctor APIs)

### 1️⃣ إنشاء سجل طبي جديد

#### باستخدام JSON (application/json)

**Postman:**
```
Method: POST
URL: http://localhost:3006/api/doctor/medical-records
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
  Content-Type: application/json

Body (raw - JSON):
{
  "appointment_id": 1,
  "patient_id": 5,
  "next_appointment_recommended": true,
  "follow_up_date": "2024-12-20",
  "vital_signs": {
    "blood_pressure": "120/80",
    "heart_rate": 75,
    "temperature": 37.0,
    "weight": 70,
    "height": 170,
    "respiratory_rate": 16,
    "oxygen_saturation": 98
  },
  "skin_condition_severity": "moderate",
  "affected_body_areas": ["face", "arms", "back"],
  "treatment_response": "good",
  "patient_consent": true,
  "record_status": "final",
  "translations": {
    "ar": {
      "chief_complaint": "صداع مستمر منذ 3 أيام",
      "history_of_present_illness": "بدأ الصداع تدريجياً ويزداد مع الوقت",
      "physical_examination": "فحص عام طبيعي، لا توجد علامات عصبية",
      "assessment": "صداع نصفي محتمل",
      "diagnosis": "صداع نصفي",
      "differential_diagnosis": "صداع توتري، صداع عنقودي",
      "treatment_plan": "أدوية مسكنة للألم، راحة، تجنب المحفزات",
      "follow_up_instructions": "مراجعة بعد أسبوع إذا استمرت الأعراض",
      "doctor_notes": "المريض يستجيب جيداً للعلاج الأولي"
    },
    "en": {
      "chief_complaint": "Persistent headache for 3 days",
      "history_of_present_illness": "Headache started gradually and worsening",
      "physical_examination": "Normal general examination, no neurological signs",
      "assessment": "Possible migraine",
      "diagnosis": "Migraine",
      "differential_diagnosis": "Tension headache, cluster headache",
      "treatment_plan": "Pain relievers, rest, avoid triggers",
      "follow_up_instructions": "Follow up after one week if symptoms persist",
      "doctor_notes": "Patient responding well to initial treatment"
    }
  }
}
```

**cURL:**
```bash
curl -X POST http://localhost:3006/api/doctor/medical-records \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -H "Accept-Language: ar" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": 1,
    "patient_id": 5,
    "vital_signs": {
      "blood_pressure": "120/80",
      "heart_rate": 75,
      "temperature": 37.0
    },
    "record_status": "final",
    "translations": {
      "ar": {
        "chief_complaint": "صداع مستمر",
        "diagnosis": "صداع نصفي",
        "treatment_plan": "أدوية مسكنة"
      }
    }
  }'
```

---

#### باستخدام form-data (multipart/form-data)

**Postman:**
```
Method: POST
URL: http://localhost:3006/api/doctor/medical-records
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
  Content-Type: multipart/form-data (سيتم تعيينه تلقائياً)

Body (form-data):
Key                              | Value
--------------------------------|----------------------------------
appointment_id                   | 1
patient_id                       | 5
next_appointment_recommended     | true
follow_up_date                   | 2024-12-20
vital_signs                      | {"blood_pressure":"120/80","heart_rate":75,"temperature":37.0,"weight":70,"height":170}
skin_condition_severity          | moderate
affected_body_areas              | ["face","arms","back"]
treatment_response               | good
patient_consent                  | true
record_status                    | final
translations[ar][chief_complaint]              | صداع مستمر منذ 3 أيام
translations[ar][history_of_present_illness]   | بدأ الصداع تدريجياً
translations[ar][physical_examination]         | فحص عام طبيعي
translations[ar][assessment]                   | صداع نصفي محتمل
translations[ar][diagnosis]                    | صداع نصفي
translations[ar][differential_diagnosis]       | صداع توتري، صداع عنقودي
translations[ar][treatment_plan]               | أدوية مسكنة وراحة
translations[ar][follow_up_instructions]       | مراجعة بعد أسبوع
translations[ar][doctor_notes]                 | المريض يستجيب جيداً للعلاج
translations[en][chief_complaint]              | Persistent headache for 3 days
translations[en][diagnosis]                    | Migraine
translations[en][treatment_plan]               | Pain relievers and rest
```

**ملاحظات مهمة عن form-data:**
1. ✅ الـ JSON objects (مثل `vital_signs`) يجب أن تكون strings
2. ✅ الـ Arrays (مثل `affected_body_areas`) يجب أن تكون JSON strings
3. ✅ الترجمات تستخدم notation مثل `translations[ar][diagnosis]`
4. ✅ Boolean values تكون `true` أو `false` كـ text

**cURL مع form-data:**
```bash
curl -X POST http://localhost:3006/api/doctor/medical-records \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -H "Accept-Language: ar" \
  -F "appointment_id=1" \
  -F "patient_id=5" \
  -F "vital_signs={\"blood_pressure\":\"120/80\",\"heart_rate\":75}" \
  -F "record_status=final" \
  -F "translations[ar][chief_complaint]=صداع مستمر" \
  -F "translations[ar][diagnosis]=صداع نصفي" \
  -F "translations[ar][treatment_plan]=أدوية مسكنة"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "تم إنشاء السجل الطبي بنجاح",
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_id": 1,
    "patient_id": 5,
    "doctor_id": 2,
    "visit_date": "2024-12-05T10:30:00.000Z",
    "record_status": "final",
    "chief_complaint": "صداع مستمر منذ 3 أيام",
    "diagnosis": "صداع نصفي",
    "treatment_plan": "أدوية مسكنة وراحة"
  }
}
```

---

### 2️⃣ جلب سجلاتي الطبية

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/doctor/medical-records?page=1&limit=20
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
```

**مع فلاتر:**
```
URL: http://localhost:3006/api/doctor/medical-records?patient_id=5&record_status=final&from_date=2024-01-01&to_date=2024-12-31&page=1&limit=10
```

**cURL:**
```bash
curl -X GET "http://localhost:3006/api/doctor/medical-records?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -H "Accept-Language: ar"
```

**Expected Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "id": 25,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "appointment_id": 1,
      "patient_id": 5,
      "patient_name": "محمد أحمد",
      "patient_email": "patient@example.com",
      "visit_date": "2024-12-05T10:30:00.000Z",
      "record_status": "final",
      "chief_complaint": "صداع مستمر",
      "diagnosis": "صداع نصفي"
    }
  ]
}
```

---

### 3️⃣ جلب تفاصيل سجل طبي

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/doctor/medical-records/25
أو
URL: http://localhost:3006/api/doctor/medical-records/550e8400-e29b-41d4-a716-446655440000
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
```

**cURL:**
```bash
curl -X GET http://localhost:3006/api/doctor/medical-records/25 \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### 4️⃣ تحديث سجل طبي

**Postman (JSON):**
```
Method: PUT
URL: http://localhost:3006/api/doctor/medical-records/25
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
  Content-Type: application/json

Body (raw - JSON):
{
  "record_status": "amended",
  "vital_signs": {
    "blood_pressure": "125/82",
    "heart_rate": 78
  },
  "translations": {
    "ar": {
      "doctor_notes": "تحديث: المريض يتحسن بشكل ملحوظ"
    },
    "en": {
      "doctor_notes": "Update: Patient improving significantly"
    }
  }
}
```

**Postman (form-data):**
```
Method: PUT
URL: http://localhost:3006/api/doctor/medical-records/25
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar

Body (form-data):
Key                                    | Value
--------------------------------------|----------------------------------
record_status                          | amended
vital_signs                            | {"blood_pressure":"125/82","heart_rate":78}
translations[ar][doctor_notes]         | تحديث: المريض يتحسن بشكل ملحوظ
translations[en][doctor_notes]         | Update: Patient improving significantly
```

---

### 5️⃣ حذف سجل طبي (مسودة فقط)

**Postman:**
```
Method: DELETE
URL: http://localhost:3006/api/doctor/medical-records/25
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
```

**cURL:**
```bash
curl -X DELETE http://localhost:3006/api/doctor/medical-records/25 \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### 6️⃣ جلب التاريخ الطبي للمريض

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/doctor/medical-records/patient/5/history
Headers:
  Authorization: Bearer {your_doctor_token}
  Accept-Language: ar
```

---

## 🧪 اختبار APIs - المرضى (Patient APIs)

### 1️⃣ جلب ملخص السجلات

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/patient/medical-records/summary
Headers:
  Authorization: Bearer {your_patient_token}
  Accept-Language: ar
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_records": 12,
      "total_doctors": 3,
      "last_visit_date": "2024-12-05T10:30:00.000Z",
      "follow_ups_recommended": 2
    },
    "recent_records": [
      {
        "id": 25,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "visit_date": "2024-12-05T10:30:00.000Z",
        "doctor_name": "د. أحمد محمد",
        "doctor_specialty": "طب الجلدية",
        "diagnosis": "صداع نصفي"
      }
    ]
  }
}
```

---

### 2️⃣ جلب سجلاتي الطبية

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/patient/medical-records?page=1&limit=20
Headers:
  Authorization: Bearer {your_patient_token}
  Accept-Language: ar
```

**مع فلاتر:**
```
URL: http://localhost:3006/api/patient/medical-records?doctor_id=2&from_date=2024-01-01&to_date=2024-12-31
```

---

### 3️⃣ جلب تفاصيل سجل طبي

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/patient/medical-records/25
Headers:
  Authorization: Bearer {your_patient_token}
  Accept-Language: ar
```

---

## 🧪 اختبار APIs - الإداريين (Admin APIs)

### 1️⃣ جلب الإحصائيات

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/admin/medical-records/statistics
Headers:
  Authorization: Bearer {your_admin_token}
  Accept-Language: ar
```

**مع فلاتر:**
```
URL: http://localhost:3006/api/admin/medical-records/statistics?from_date=2024-01-01&to_date=2024-12-31&doctor_id=2
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "draft": 10,
    "final": 130,
    "amended": 10,
    "follow_ups_recommended": 25,
    "unique_patients": 80,
    "unique_doctors": 15
  }
}
```

---

### 2️⃣ جلب جميع السجلات

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/admin/medical-records?page=1&limit=20
Headers:
  Authorization: Bearer {your_admin_token}
  Accept-Language: ar
```

**مع فلاتر:**
```
URL: http://localhost:3006/api/admin/medical-records?patient_id=5&doctor_id=2&record_status=final&from_date=2024-01-01&to_date=2024-12-31
```

---

### 3️⃣ جلب التاريخ الطبي الكامل للمريض

**Postman:**
```
Method: GET
URL: http://localhost:3006/api/admin/medical-records/patient/5/history
Headers:
  Authorization: Bearer {your_admin_token}
  Accept-Language: ar
```

---

### 4️⃣ حذف سجل طبي نهائياً

**Postman:**
```
Method: DELETE
URL: http://localhost:3006/api/admin/medical-records/25
Headers:
  Authorization: Bearer {your_admin_token}
  Accept-Language: ar
```

---

## 📝 أمثلة عملية كاملة | Complete Examples

### مثال 1: سيناريو كامل للطبيب

```bash
# 1. تسجيل الدخول
POST http://localhost:3006/api/auth-doctor/login
{
  "email": "doctor@example.com",
  "password": "password123"
}
# احفظ الـ token

# 2. إنشاء سجل طبي
POST http://localhost:3006/api/doctor/medical-records
Authorization: Bearer {token}
{
  "appointment_id": 1,
  "patient_id": 5,
  "vital_signs": {...},
  "translations": {...}
}

# 3. عرض السجلات
GET http://localhost:3006/api/doctor/medical-records
Authorization: Bearer {token}

# 4. تحديث سجل
PUT http://localhost:3006/api/doctor/medical-records/25
Authorization: Bearer {token}
{
  "record_status": "final"
}
```

---

### مثال 2: سيناريو كامل للمريض

```bash
# 1. تسجيل الدخول
POST http://localhost:3006/api/auth-user/login
{
  "email": "patient@example.com",
  "password": "password123"
}

# 2. عرض الملخص
GET http://localhost:3006/api/patient/medical-records/summary
Authorization: Bearer {token}

# 3. عرض جميع السجلات
GET http://localhost:3006/api/patient/medical-records
Authorization: Bearer {token}

# 4. عرض تفاصيل سجل
GET http://localhost:3006/api/patient/medical-records/25
Authorization: Bearer {token}
```

---

## 🔴 اختبار حالات الخطأ | Error Testing

### 1. بدون Token
```
GET http://localhost:3006/api/doctor/medical-records

Expected Response (401):
{
  "success": false,
  "message": "لا يوجد رمز مصادقة"
}
```

### 2. Token خاطئ
```
GET http://localhost:3006/api/doctor/medical-records
Authorization: Bearer invalid_token

Expected Response (401):
{
  "success": false,
  "message": "رمز مصادقة غير صالح"
}
```

### 3. بيانات ناقصة
```
POST http://localhost:3006/api/doctor/medical-records
{
  "patient_id": 5
  // appointment_id مفقود
}

Expected Response (400):
{
  "success": false,
  "message": "معرف الموعد والمريض مطلوبان"
}
```

### 4. سجل غير موجود
```
GET http://localhost:3006/api/doctor/medical-records/99999

Expected Response (404):
{
  "success": false,
  "message": "السجل الطبي غير موجود"
}
```

### 5. محاولة حذف سجل نهائي
```
DELETE http://localhost:3006/api/doctor/medical-records/25
# السجل حالته final

Expected Response (403):
{
  "success": false,
  "message": "لا يمكن حذف السجلات النهائية أو المعدلة"
}
```

---

## 📋 Postman Collection

### إنشاء Collection في Postman

1. افتح Postman
2. اضغط على "New" → "Collection"
3. اسم الـ Collection: "Medical Records APIs"
4. أضف المتغيرات:
   ```
   base_url: http://localhost:3006/api
   doctor_token: {your_doctor_token}
   patient_token: {your_patient_token}
   admin_token: {your_admin_token}
   ```

5. أضف الـ Requests:

```
Medical Records APIs/
├── Doctor/
│   ├── Login
│   ├── Create Medical Record (JSON)
│   ├── Create Medical Record (form-data)
│   ├── Get My Records
│   ├── Get Record Details
│   ├── Update Record
│   ├── Delete Record
│   └── Get Patient History
├── Patient/
│   ├── Login
│   ├── Get Summary
│   ├── Get My Records
│   └── Get Record Details
└── Admin/
    ├── Login
    ├── Get Statistics
    ├── Get All Records
    ├── Get Record Details
    ├── Get Patient History
    └── Delete Record
```

---

## 🎯 نصائح للاختبار | Testing Tips

### 1. استخدم Environment Variables
```
{{base_url}}/doctor/medical-records
{{doctor_token}}
```

### 2. احفظ الـ Responses
```javascript
// في Postman Tests
pm.environment.set("record_id", pm.response.json().data.id);
```

### 3. اختبر بترتيب منطقي
```
1. Login
2. Create
3. Read
4. Update
5. Delete
```

### 4. اختبر اللغتين
```
Accept-Language: ar
Accept-Language: en
```

### 5. اختبر الـ Pagination
```
?page=1&limit=10
?page=2&limit=10
```

---

## ✅ Checklist للاختبار

### Doctor APIs
- [ ] تسجيل دخول ناجح
- [ ] إنشاء سجل طبي (JSON)
- [ ] إنشاء سجل طبي (form-data)
- [ ] جلب السجلات مع pagination
- [ ] جلب تفاصيل سجل
- [ ] تحديث سجل
- [ ] حذف مسودة
- [ ] محاولة حذف سجل نهائي (يجب أن تفشل)
- [ ] جلب تاريخ مريض

### Patient APIs
- [ ] تسجيل دخول ناجح
- [ ] جلب الملخص
- [ ] جلب السجلات (final فقط)
- [ ] جلب تفاصيل سجل
- [ ] محاولة رؤية draft (يجب أن لا يظهر)

### Admin APIs
- [ ] تسجيل دخول ناجح
- [ ] جلب الإحصائيات
- [ ] جلب جميع السجلات
- [ ] جلب تفاصيل سجل
- [ ] حذف سجل
- [ ] جلب تاريخ مريض

---

## 🔧 استكشاف الأخطاء | Troubleshooting

### المشكلة: "لا يوجد رمز مصادقة"
**الحل:** تأكد من إضافة Header:
```
Authorization: Bearer {your_token}
```

### المشكلة: "رمز مصادقة غير صالح"
**الحل:** 
1. تحقق من صحة الـ Token
2. تأكد من عدم انتهاء صلاحيته
3. سجل دخول مرة أخرى

### المشكلة: form-data لا يعمل
**الحل:**
1. تأكد من عدم تعيين `Content-Type` يدوياً
2. استخدم JSON strings للـ objects
3. استخدم notation صحيح: `translations[ar][diagnosis]`

### المشكلة: "السجل الطبي غير موجود"
**الحل:**
1. تحقق من صحة الـ ID
2. تأكد من أن السجل يخص هذا الطبيب/المريض

---

**Status:** ✅ Ready for Testing  
**Version:** 1.0.0  
**Date:** December 5, 2024

**جاهز للاختبار!** 🚀

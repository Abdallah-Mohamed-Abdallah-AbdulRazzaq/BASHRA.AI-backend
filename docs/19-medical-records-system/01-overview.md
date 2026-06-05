# Medical Records System - نظام السجلات الطبية
## نظام إدارة السجلات الطبية الشامل

---

## 📋 نظرة عامة | Overview

نظام متكامل لإدارة السجلات الطبية يدعم ثلاثة أطراف رئيسية:
1. **الأطباء (Doctors)** - إنشاء وإدارة السجلات الطبية
2. **المرضى (Patients/Users)** - عرض سجلاتهم الطبية
3. **الإداريين (Admins)** - إدارة شاملة لجميع السجلات

---

## 🗄️ بنية قاعدة البيانات | Database Structure

### 1. جدول medical_records

```sql
CREATE TABLE `medical_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `appointment_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `visit_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  
  -- معلومات المتابعة
  `next_appointment_recommended` tinyint(1) DEFAULT '0',
  `follow_up_date` date DEFAULT NULL,
  
  -- البيانات الطبية (JSON)
  `vital_signs` json DEFAULT NULL,
  `affected_body_areas` json DEFAULT NULL,
  
  -- التقييمات
  `skin_condition_severity` enum('mild','moderate','severe') DEFAULT 'mild',
  `treatment_response` enum('excellent','good','fair','poor','unknown') DEFAULT 'unknown',
  
  -- الموافقات والحالة
  `patient_consent` tinyint(1) DEFAULT '0',
  `record_status` enum('draft','final','amended') DEFAULT 'draft',
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. جدول medical_record_translations

```sql
CREATE TABLE `medical_record_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medical_record_id` int NOT NULL,
  `language_code` varchar(10) NOT NULL,
  
  -- التفاصيل الطبية (Text)
  `chief_complaint` text,
  `history_of_present_illness` text,
  `physical_examination` text,
  `assessment` text,
  `diagnosis` text,
  `differential_diagnosis` text,
  `treatment_plan` text,
  `follow_up_instructions` text,
  `doctor_notes` text,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY (`medical_record_id`, `language_code`),
  FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔄 دورة حياة السجل الطبي | Medical Record Lifecycle

```
draft → final → amended
  ↓       ↓
delete  permanent
```

### حالات السجل | Record Status

1. **draft** - مسودة (يمكن التعديل والحذف)
2. **final** - نهائي (يمكن التعديل فقط)
3. **amended** - معدل (تم تعديله بعد أن كان نهائياً)

---

## 👥 الأطراف والصلاحيات | Parties & Permissions

### 1. الأطباء (Doctors)

**الصلاحيات:**
- ✅ إنشاء سجل طبي جديد
- ✅ عرض سجلاتهم الطبية
- ✅ تحديث سجل طبي
- ✅ حذف سجل (draft فقط)
- ✅ عرض التاريخ الطبي للمريض

**القيود:**
- ❌ يرى فقط سجلاته الخاصة
- ❌ لا يمكن حذف السجلات النهائية

### 2. المرضى (Patients/Users)

**الصلاحيات:**
- ✅ عرض سجلاتهم الطبية (final فقط)
- ✅ عرض تفاصيل سجل طبي
- ✅ عرض ملخص السجلات

**القيود:**
- ❌ يرى فقط سجلاته الخاصة
- ❌ لا يمكن إنشاء أو تعديل السجلات
- ❌ يرى فقط السجلات النهائية (final)

### 3. الإداريين (Admins)

**الصلاحيات:**
- ✅ عرض جميع السجلات الطبية
- ✅ عرض تفاصيل أي سجل
- ✅ حذف أي سجل نهائياً
- ✅ عرض إحصائيات شاملة
- ✅ عرض التاريخ الطبي الكامل لأي مريض

**القيود:**
- ❌ لا قيود (صلاحيات كاملة للعرض والحذف)

---

## 📁 الملفات المنشأة | Created Files

### Controllers
```
controllers/
├── doctorMedicalRecordsController.js     (6 methods)
├── patientMedicalRecordsController.js    (3 methods)
└── adminMedicalRecordsController.js      (5 methods)
```

### Routes
```
routes/
├── doctorMedicalRecordsRoutes.js
├── patientMedicalRecordsRoutes.js
└── adminMedicalRecordsRoutes.js
```

### Documentation
```
docs/19-medical-records-system/
├── 01-overview.md              (هذا الملف)
├── 02-api-documentation.md     (توثيق API)
└── 03-final-summary.md         (ملخص نهائي)
```

---

## 🔑 الميزات الرئيسية | Key Features

### 1. دعم متعدد اللغات
- ✅ العربية والإنجليزية
- ✅ ترجمة جميع التفاصيل الطبية
- ✅ رسائل خطأ بلغتين

### 2. بيانات منظمة
- ✅ العلامات الحيوية في JSON
- ✅ المناطق المتأثرة في JSON
- ✅ النصوص الطويلة في جدول الترجمات

### 3. ربط بالمواعيد
- ✅ كل سجل مرتبط بموعد
- ✅ سجل واحد لكل موعد
- ✅ حذف تلقائي عند حذف الموعد (CASCADE)

### 4. تتبع شامل
- ✅ تاريخ الزيارة
- ✅ توصية بمتابعة
- ✅ تاريخ المتابعة المقترح
- ✅ موافقة المريض

### 5. أمان وصلاحيات
- ✅ JWT Authentication
- ✅ Role-based Authorization
- ✅ فحص حالة الحساب
- ✅ دعم form-data

---

## 🔗 العلاقات مع الجداول الأخرى | Relations

```
medical_records
├── appointment_id → appointments.id (CASCADE)
├── patient_id → users.id (CASCADE)
└── doctor_id → doctors.id (CASCADE)

medical_record_translations
└── medical_record_id → medical_records.id (CASCADE)
```

---

## 🎯 حالات الاستخدام | Use Cases

### 1. الطبيب ينشئ سجل طبي

```
1. الطبيب يكمل الموعد
2. ينشئ سجل طبي للموعد
3. يدخل العلامات الحيوية
4. يكتب التشخيص والعلاج
5. يحفظ كمسودة أو نهائي
```

### 2. المريض يعرض سجلاته

```
1. المريض يسجل دخول
2. يعرض قائمة سجلاته الطبية
3. يختار سجل لعرض التفاصيل
4. يرى التشخيص والعلاج
```

### 3. الإداري يراجع النظام

```
1. الإداري يعرض جميع السجلات
2. يصفي حسب الطبيب أو المريض
3. يعرض الإحصائيات
4. يحذف سجلات إذا لزم الأمر
```

---

## 📊 البيانات المخزنة | Stored Data

### في medical_records (JSON/Enums)
```json
{
  "vital_signs": {
    "blood_pressure": "120/80",
    "heart_rate": 75,
    "temperature": 37.0,
    "weight": 70,
    "height": 170
  },
  "affected_body_areas": ["face", "arms", "back"],
  "skin_condition_severity": "moderate",
  "treatment_response": "good"
}
```

### في medical_record_translations (Text)
```json
{
  "ar": {
    "chief_complaint": "صداع مستمر",
    "diagnosis": "صداع نصفي",
    "treatment_plan": "أدوية مسكنة"
  },
  "en": {
    "chief_complaint": "Persistent headache",
    "diagnosis": "Migraine",
    "treatment_plan": "Pain relievers"
  }
}
```

---

## 🔒 الأمان | Security

### Authentication
- JWT tokens
- Role-based access
- Account status check

### Authorization
- Doctor: Own records only
- Patient: Own records only (final)
- Admin: All records

### Validation
- Required fields check
- Appointment verification
- Status validation
- Duplicate prevention

---

## 🌐 دعم اللغات | Language Support

```javascript
// في الـ Headers
Accept-Language: ar  // العربية
Accept-Language: en  // English
```

**يؤثر على:**
- رسائل الخطأ
- أسماء الأطباء والمرضى
- التفاصيل الطبية
- الترجمات

---

## 📝 ملاحظات مهمة | Important Notes

### 1. سجل واحد لكل موعد
- لا يمكن إنشاء أكثر من سجل لنفس الموعد
- يتم التحقق تلقائياً عند الإنشاء

### 2. الحذف
- الطبيب: يمكنه حذف المسودات فقط
- الإداري: يمكنه حذف أي سجل
- الحذف يحذف الترجمات تلقائياً (CASCADE)

### 3. الحالات
```
draft → يمكن التعديل والحذف
final → يمكن التعديل فقط (يصبح amended)
amended → يمكن التعديل
```

### 4. Triggers
```sql
-- Auto-generate UUID
TRIGGER `generate_medical_record_uuid`
```

---

## 🚀 الخطوات التالية | Next Steps

### Phase 1 ✅
- [x] إنشاء Controllers
- [x] إنشاء Routes
- [x] تسجيل المسارات
- [x] التوثيق الأساسي

### Phase 2 📝
- [ ] اختبار شامل
- [ ] إضافة ملفات مرفقة (صور، تقارير)
- [ ] تكامل مع الوصفات الطبية
- [ ] تصدير PDF

### Phase 3 📝
- [ ] تحليلات متقدمة
- [ ] تقارير طبية
- [ ] مشاركة السجلات
- [ ] نظام الأرشفة

---

## 📊 الإحصائيات | Statistics

| المقياس | القيمة |
|---------|--------|
| **APIs** | 14 endpoint |
| **Controllers** | 3 files |
| **Methods** | 14 methods |
| **Routes** | 3 files |
| **Documentation** | 3 files |
| **Total Files** | 6 files |
| **Languages** | 2 (AR/EN) |
| **User Roles** | 3 (Patient/Doctor/Admin) |

---

**Status:** ✅ Core System Completed  
**Version:** 1.0.0  
**Date:** December 5, 2024

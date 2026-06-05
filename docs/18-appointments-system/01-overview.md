# Appointments System - نظام المواعيد
## نظام إدارة المواعيد الطبية الشامل

---

## 📋 نظرة عامة | Overview

نظام متكامل لإدارة المواعيد الطبية يدعم ثلاثة أطراف رئيسية:
1. **المرضى (Patients/Users)** - حجز وإدارة مواعيدهم
2. **الأطباء (Doctors)** - إدارة جداولهم ومواعيدهم
3. **الإداريين (Admins)** - إدارة شاملة لجميع المواعيد

---

## 🗄️ بنية قاعدة البيانات | Database Structure

### 1. جدول appointments

```sql
CREATE TABLE `appointments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `clinic_id` int DEFAULT NULL,
  
  -- من قام بالإنشاء
  `created_by_user_id` int DEFAULT NULL,
  `created_by_admin_id` int DEFAULT NULL,
  `created_by_assistant_id` int DEFAULT NULL,
  
  -- تفاصيل الموعد
  `appointment_type` enum('consultation','follow_up','urgent','routine') DEFAULT 'consultation',
  `scheduled_date` date NOT NULL,
  `scheduled_time` time NOT NULL,
  `duration_minutes` int DEFAULT '30',
  `status` enum('pending','confirmed','in_progress','completed','cancelled','no_show','rescheduled') DEFAULT 'pending',
  
  -- من قام بالإلغاء
  `cancelled_by_user_id` int DEFAULT NULL,
  `cancelled_by_admin_id` int DEFAULT NULL,
  `cancelled_by_doctor_id` int DEFAULT NULL,
  `cancelled_by_assistant_id` int DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  
  -- تفاصيل إضافية
  `urgency_level` enum('low','medium','high','emergency') DEFAULT 'medium',
  `consultation_fee` decimal(10,2) DEFAULT NULL,
  `currency_code` char(3) DEFAULT NULL,
  `payment_status` enum('pending','paid','refunded','failed') DEFAULT 'pending',
  `reminder_sent` tinyint(1) DEFAULT '0',
  
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. جدول appointment_translations

```sql
CREATE TABLE `appointment_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `appointment_id` int NOT NULL,
  `language_code` varchar(10) NOT NULL,
  `chief_complaint` text,
  `symptoms_description` text,
  `cancellation_reason` text,
  `notes` text,
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `appointment_id` (`appointment_id`,`language_code`),
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 🔄 دورة حياة الموعد | Appointment Lifecycle

```
pending → confirmed → in_progress → completed
   ↓          ↓            ↓
cancelled  cancelled   cancelled
   ↓          ↓            ↓
no_show   no_show     no_show
   ↓
rescheduled
```

### حالات الموعد | Appointment Status

1. **pending** - في انتظار التأكيد
2. **confirmed** - تم التأكيد من الطبيب
3. **in_progress** - جاري الآن
4. **completed** - مكتمل
5. **cancelled** - ملغى
6. **no_show** - لم يحضر المريض
7. **rescheduled** - تم إعادة الجدولة

---

## 👥 الأطراف والصلاحيات | Parties & Permissions

### 1. المرضى (Patients/Users)

**الصلاحيات:**
- ✅ عرض المواعيد المتاحة للطبيب
- ✅ حجز موعد جديد
- ✅ عرض مواعيدهم
- ✅ إلغاء موعد
- ✅ إعادة جدولة موعد

**القيود:**
- ❌ لا يمكن حجز موعد محجوز مسبقاً
- ❌ لا يمكن إلغاء موعد مكتمل
- ❌ يرى فقط مواعيده الخاصة

### 2. الأطباء (Doctors)

**الصلاحيات:**
- ✅ عرض جميع مواعيدهم
- ✅ تأكيد موعد
- ✅ بدء موعد
- ✅ إكمال موعد
- ✅ تسجيل عدم حضور
- ✅ إلغاء موعد
- ✅ عرض إحصائيات المواعيد
- ✅ عرض مواعيد اليوم

**القيود:**
- ❌ يرى فقط مواعيده الخاصة
- ❌ لا يمكن إلغاء موعد مكتمل

### 3. الإداريين (Admins)

**الصلاحيات:**
- ✅ عرض جميع المواعيد (لجميع الأطباء والمرضى)
- ✅ إنشاء موعد لأي مريض
- ✅ تحديث أي موعد
- ✅ إلغاء أي موعد
- ✅ حذف موعد نهائياً
- ✅ عرض إحصائيات شاملة
- ✅ تصفية متقدمة

**القيود:**
- ❌ لا قيود (صلاحيات كاملة)

---

## 📁 الملفات المنشأة | Created Files

### Controllers
```
controllers/
├── patientAppointmentsController.js    (6 methods)
├── doctorAppointmentsController.js     (9 methods)
└── adminAppointmentsController.js      (7 methods)
```

### Routes
```
routes/
├── patientAppointmentsRoutes.js
├── doctorAppointmentsRoutes.js
└── adminAppointmentsRoutes.js
```

### Documentation
```
docs/18-appointments-system/
├── 01-overview.md              (هذا الملف)
├── 02-api-documentation.md     (توثيق API)
├── 03-testing-guide.md         (دليل الاختبار)
└── 04-implementation-details.md (تفاصيل التنفيذ)
```

---

## 🔑 الميزات الرئيسية | Key Features

### 1. نظام حجز ذكي
- ✅ فحص المواعيد المتاحة تلقائياً
- ✅ منع التعارضات في المواعيد
- ✅ حساب الفترات الزمنية المتاحة
- ✅ دعم المواعيد الأونلاين والعيادة

### 2. دعم متعدد اللغات
- ✅ العربية والإنجليزية
- ✅ ترجمة الشكاوى والأعراض
- ✅ ترجمة أسباب الإلغاء
- ✅ رسائل خطأ بلغتين

### 3. تتبع شامل
- ✅ تسجيل من قام بالإنشاء
- ✅ تسجيل من قام بالإلغاء
- ✅ وقت الإلغاء
- ✅ سبب الإلغاء

### 4. إحصائيات متقدمة
- ✅ عدد المواعيد حسب الحالة
- ✅ الإيرادات المتوقعة
- ✅ معدل الحضور
- ✅ تصفية حسب الفترة

### 5. أمان وصلاحيات
- ✅ JWT Authentication
- ✅ Role-based Authorization
- ✅ فحص حالة الحساب
- ✅ دعم form-data

---

## 🔗 العلاقات مع الجداول الأخرى | Relations

```
appointments
├── patient_id → users.id
├── doctor_id → doctors.id
├── clinic_id → clinics.id
├── created_by_user_id → users.id
├── created_by_admin_id → admins.id
├── created_by_assistant_id → assistants.id
├── cancelled_by_user_id → users.id
├── cancelled_by_admin_id → admins.id
├── cancelled_by_doctor_id → doctors.id
└── cancelled_by_assistant_id → assistants.id

appointment_translations
└── appointment_id → appointments.id
```

---

## 🎯 حالات الاستخدام | Use Cases

### 1. المريض يحجز موعد
```
1. المريض يبحث عن طبيب
2. يعرض المواعيد المتاحة
3. يختار موعد ويحجزه
4. يتلقى تأكيد الحجز
```

### 2. الطبيب يدير يومه
```
1. الطبيب يعرض مواعيد اليوم
2. يؤكد المواعيد المعلقة
3. يبدأ الموعد عند وصول المريض
4. يكمل الموعد بعد الفحص
```

### 3. الإداري يدير النظام
```
1. الإداري يعرض جميع المواعيد
2. يحجز موعد لمريض عبر الهاتف
3. يعدل موعد بناءً على طلب
4. يعرض الإحصائيات
```

---

## 📊 الإحصائيات المتاحة | Available Statistics

### للأطباء
- إجمالي المواعيد
- المواعيد حسب الحالة
- معدل الإكمال
- معدل الإلغاء

### للإداريين
- جميع إحصائيات الأطباء
- الإيرادات الإجمالية
- الإيرادات المعلقة
- إحصائيات حسب طبيب معين

---

## 🔒 الأمان | Security

### Authentication
- JWT tokens
- Role-based access
- Account status check

### Authorization
- Patient: Own appointments only
- Doctor: Own appointments only
- Admin: All appointments

### Validation
- Required fields check
- Conflict detection
- Status validation
- Date/time validation

---

## 🌐 دعم اللغات | Language Support

```javascript
// في الـ Headers
Accept-Language: ar  // العربية
Accept-Language: en  // English
```

**يؤثر على:**
- رسائل الخطأ
- أسماء الأطباء
- أسماء المرضى
- تفاصيل العيادات
- الترجمات

---

## 📝 ملاحظات مهمة | Important Notes

### 1. المواعيد المتاحة
- يتم حسابها من `doctor_schedules`
- يتم استبعاد المواعيد المحجوزة
- يتم فحص التعارضات تلقائياً

### 2. الإلغاء
- يمكن للمريض إلغاء موعده
- يمكن للطبيب إلغاء موعد
- يمكن للإداري إلغاء أي موعد
- يتم تسجيل من قام بالإلغاء

### 3. الحذف
- الإداري فقط يمكنه الحذف النهائي
- الحذف يحذف الترجمات تلقائياً (CASCADE)

### 4. Triggers
```sql
-- Auto-generate UUID
TRIGGER `generate_appointment_uuid`

-- Increment doctor consultations
TRIGGER `increment_doctor_consultations`
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
- [ ] إضافة Notifications
- [ ] إضافة Reminders
- [ ] تكامل مع Payment

### Phase 3 📝
- [ ] Dashboard للإحصائيات
- [ ] تقارير متقدمة
- [ ] تصدير البيانات
- [ ] تحليلات متقدمة

---

**Status:** ✅ Core System Completed  
**Version:** 1.0.0  
**Date:** December 5, 2024

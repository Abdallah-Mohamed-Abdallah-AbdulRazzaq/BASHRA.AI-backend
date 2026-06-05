# Doctor Schedules System - نظام جداول مواعيد الأطباء

## نظرة عامة | Overview

نظام شامل لإدارة جداول مواعيد الأطباء يدعم الكشف الأونلاين والكشف في العيادات.

A comprehensive system for managing doctor schedules supporting both online and in-clinic consultations.

---

## الهدف من النظام | System Purpose

### الأهداف الرئيسية | Main Objectives

1. **إدارة أوقات العمل** - تمكين الأطباء من تحديد أوقات عملهم
2. **دعم الأونلاين والعيادات** - نظام مرن يدعم نوعي الكشف
3. **تحديد الأسعار** - تحديد سعر ومدة الجلسة لكل فترة
4. **منع التعارض** - منع تداخل المواعيد تلقائياً
5. **عرض عام** - إتاحة الجداول للمستخدمين للاستعلام

---

## بنية قاعدة البيانات | Database Structure

### جدول doctor_schedules

```sql
CREATE TABLE `doctor_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `clinic_id` int DEFAULT NULL,  -- NULL = Online consultation
  `day_of_week` enum('saturday','sunday','monday','tuesday','wednesday','thursday','friday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `session_price` decimal(10,2) NOT NULL,
  `session_duration` int NOT NULL DEFAULT '30',  -- بالدقائق
  `consultation_type` enum('online', 'in_clinic') NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_doctor` (`doctor_id`),
  KEY `idx_schedules_clinic` (`clinic_id`),
  KEY `idx_schedules_day` (`day_of_week`),
  KEY `idx_schedules_type` (`consultation_type`),
  CONSTRAINT `fk_schedules_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_schedules_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### الحقول الرئيسية | Main Fields

| Field | Type | Description (AR) | Description (EN) |
|-------|------|------------------|------------------|
| `doctor_id` | int | معرف الطبيب | Doctor ID |
| `clinic_id` | int/NULL | معرف العيادة (NULL للأونلاين) | Clinic ID (NULL for online) |
| `day_of_week` | enum | يوم الأسبوع | Day of week |
| `start_time` | time | وقت البداية | Start time |
| `end_time` | time | وقت النهاية | End time |
| `session_price` | decimal | سعر الجلسة | Session price |
| `session_duration` | int | مدة الجلسة بالدقائق | Session duration in minutes |
| `consultation_type` | enum | نوع الكشف (online/in_clinic) | Consultation type |
| `is_active` | boolean | هل الجدول فعال | Is schedule active |

---

## اللوجيك الأساسي | Core Logic

### 1. الكشف الأونلاين | Online Consultation
- `clinic_id` = NULL
- `consultation_type` = 'online'
- لا يحتاج إلى عيادة محددة

### 2. الكشف في العيادة | In-Clinic Consultation
- `clinic_id` = رقم العيادة
- `consultation_type` = 'in_clinic'
- يجب أن تكون العيادة مملوكة للطبيب

### 3. منع التعارض | Conflict Prevention
النظام يمنع إنشاء جداول متداخلة:
- نفس الطبيب
- نفس اليوم
- نفس العيادة (أو كلاهما أونلاين)
- أوقات متداخلة

---

## الملفات المنشأة | Created Files

### Controllers
- `controllers/doctorSchedulesController.js` - معالج جداول المواعيد

### Routes
- `routes/doctorSchedulesRoutes.js` - مسارات الطبيب (خاصة)
- `routes/publicDoctorSchedulesRoutes.js` - مسارات عامة

### Documentation
- `docs/16-doctor-schedules/` - مجلد التوثيق الكامل

---

## التعديلات على الملفات الموجودة | Modifications to Existing Files

### 1. profileDoctorController.js
تم إزالة الحقول التالية التي تم حذفها من جدول `doctor_profiles`:
- `consultation_fee`
- `consultation_duration`
- `working_hours`

### 2. profileDoctorRoutes.js
تم تحديث التوثيق لإزالة الحقول المحذوفة

### 3. routes/index.js
تم إضافة المسارات الجديدة:
```javascript
router.use("/doctor-schedules", doctorSchedulesRoutes);
router.use("/public/doctor-schedules", publicDoctorSchedulesRoutes);
```

---

## الميزات الرئيسية | Key Features

### ✅ للأطباء | For Doctors
1. إنشاء جداول مواعيد متعددة
2. تحديد أسعار مختلفة لكل فترة
3. إدارة الأونلاين والعيادات بشكل منفصل
4. تعطيل/تفعيل الجداول
5. تحديث وحذف الجداول

### ✅ للمستخدمين | For Users
1. الاستعلام عن مواعيد الأطباء
2. فلترة حسب نوع الكشف
3. فلترة حسب اليوم
4. رؤية الأسعار والمدة

### ✅ للنظام | For System
1. منع التعارض التلقائي
2. التحقق من ملكية العيادات
3. الحذف الناعم (soft delete)
4. الحذف النهائي (permanent delete)

---

## الأمان | Security

### التحقق من الصلاحيات | Authorization
- جميع عمليات الإدارة تتطلب تسجيل دخول كطبيب
- التحقق من ملكية الجداول قبل التعديل/الحذف
- التحقق من ملكية العيادات

### التحقق من البيانات | Data Validation
- التحقق من صحة أوقات العمل
- التحقق من عدم التداخل
- التحقق من نوع الكشف
- التحقق من وجود clinic_id للكشف في العيادة

---

## الخطوات التالية | Next Steps

1. ✅ تم إنشاء جميع الـ API
2. ✅ تم التوثيق الكامل
3. 📝 اختبار الـ API (انظر ملف testing-guide.md)
4. 📝 دمج مع نظام الحجوزات (appointments)

---

## الدعم | Support

للمزيد من المعلومات، راجع:
- `02-api-documentation.md` - توثيق الـ API الكامل
- `03-testing-guide.md` - دليل الاختبار
- `04-examples.md` - أمثلة عملية

---

**تاريخ الإنشاء:** 5 ديسمبر 2024  
**الإصدار:** 1.0.0  
**المطور:** Abdallah Mohamed

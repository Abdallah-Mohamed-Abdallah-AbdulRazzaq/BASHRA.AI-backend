# Appointments System - Bug Fixes

## تاريخ التحديث: 2026-03-08

## المشاكل التي تم حلها

### 1. مشكلة LIMIT و OFFSET في الاستعلامات

**المشكلة:**
```
Error: Incorrect arguments to mysqld_stmt_execute
```

**السبب:**
استخدام placeholders (?) مع LIMIT و OFFSET في MySQL لا يعمل بشكل صحيح مع prepared statements.

**الحل:**
تم تحويل LIMIT و OFFSET إلى قيم مباشرة في الاستعلام بدلاً من استخدام placeholders:

```javascript
// قبل التعديل
query += ' ORDER BY a.scheduled_date DESC, a.actual_start_time DESC LIMIT ? OFFSET ?';
params.push(parseInt(limit), parseInt(offset));

// بعد التعديل
const limitNum = parseInt(limit);
const offsetNum = parseInt(offset);
query += ` ORDER BY a.scheduled_date DESC, a.actual_start_time DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
```

**الملفات المعدلة:**
- `controllers/patientAppointmentsController.js`
- `controllers/doctorAppointmentsController.js`
- `controllers/adminAppointmentsController.js`

---

### 2. مشكلة أسماء الأعمدة في جدول clinics

**المشكلة:**
```
Error: Unknown column 'c.phone' in 'field list'
Error: Unknown column 'c.email' in 'field list'
```

**السبب:**
جدول `clinics` يحتوي على:
- `phone_number` وليس `phone`
- لا يحتوي على عمود `email`

**الحل:**
تم تصحيح أسماء الأعمدة في جميع الاستعلامات:

```javascript
// قبل التعديل
c.phone as clinic_phone,
c.email as clinic_email

// بعد التعديل
c.phone_number as clinic_phone,
c.address_line_1 as clinic_address
```

**الملفات المعدلة:**
- `controllers/patientAppointmentsController.js` - دالة `getAppointmentById`
- `controllers/doctorAppointmentsController.js` - دالة `getAppointmentById`
- `controllers/adminAppointmentsController.js` - دالة `getAppointmentById`

---

## الاختبار

بعد هذه التعديلات، يجب أن تعمل جميع الـ APIs التالية بشكل صحيح:

### Patient Appointments
- ✅ `GET /api/patient/appointments` - جلب مواعيد المريض
- ✅ `GET /api/patient/appointments/:id` - جلب موعد واحد

### Doctor Appointments
- ✅ `GET /api/doctor/appointments` - جلب مواعيد الطبيب
- ✅ `GET /api/doctor/appointments/:id` - جلب موعد واحد

### Admin Appointments
- ✅ `GET /api/admin/appointments` - جلب جميع المواعيد
- ✅ `GET /api/admin/appointments/:id` - جلب موعد واحد

---

## ملاحظات مهمة

1. **LIMIT و OFFSET**: تم استخدام string interpolation بدلاً من prepared statement parameters لأن MySQL لا يدعم placeholders مع LIMIT و OFFSET بشكل موثوق.

2. **أمان الكود**: القيم يتم تحويلها إلى integers باستخدام `parseInt()` قبل الاستخدام لضمان الأمان.

3. **بنية جدول clinics**: 
   - العمود الصحيح للهاتف: `phone_number`
   - لا يوجد عمود email في جدول clinics
   - يمكن استخدام `address_line_1` للعنوان

---

## التحديثات المستقبلية

إذا كنت بحاجة إلى إضافة email للعيادات، يجب:
1. إضافة عمود `email` إلى جدول `clinics` في قاعدة البيانات
2. تحديث الاستعلامات لتشمل `c.email as clinic_email`

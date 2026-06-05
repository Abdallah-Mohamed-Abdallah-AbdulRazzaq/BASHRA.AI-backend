# Doctor Schedules System - Complete Documentation
# نظام جداول مواعيد الأطباء - التوثيق الكامل

---

## 📋 جدول المحتويات | Table of Contents

1. [نظرة عامة](#نظرة-عامة--overview)
2. [الملفات](#الملفات--files)
3. [البدء السريع](#البدء-السريع--quick-start)
4. [APIs المتاحة](#apis-المتاحة--available-apis)
5. [الاختبار](#الاختبار--testing)
6. [التحديثات الأخيرة](#التحديثات-الأخيرة--recent-updates)

---

## نظرة عامة | Overview

نظام شامل ومتطور لإدارة جداول مواعيد الأطباء يدعم:

✅ الكشف الأونلاين والكشف في العيادات  
✅ أسعار ومدد مختلفة لكل فترة  
✅ منع التعارض التلقائي  
✅ عرض متنوع للبيانات (مجمعة، ملخصات، أوقات متاحة)  
✅ إنشاء متعدد (Bulk Create)  
✅ دعم كامل للغتين العربية والإنجليزية  

**الإصدار الحالي:** 2.0.0  
**آخر تحديث:** 8 مارس 2026  
**الحالة:** ✅ جاهز للإنتاج

---

## الملفات | Files

### 📁 ملفات التوثيق

| الملف | الوصف | الحالة |
|------|-------|--------|
| `01-overview.md` | نظرة عامة على النظام | ✅ محدّث |
| `02-api-documentation.md` | توثيق الـ APIs الأساسية | ✅ محدّث |
| `03-testing-guide.md` | دليل الاختبار الشامل | ✅ محدّث |
| `04-implementation-summary.md` | ملخص التنفيذ | ✅ محدّث |
| `05-new-apis-documentation.md` | توثيق الـ APIs الجديدة | ✅ جديد |
| `06-bug-fixes-and-enhancements.md` | إصلاحات وتحسينات | ✅ جديد |
| `doctor-schedules-testing.postman_collection.json` | مجموعة اختبارات Postman | ✅ جديد |
| `README.md` | هذا الملف | ✅ جديد |

### 📁 ملفات الكود

| الملف | الوصف | الحالة |
|------|-------|--------|
| `controllers/doctorSchedulesController.js` | معالج الجداول (14 دالة) | ✅ محدّث |
| `routes/doctorSchedulesRoutes.js` | مسارات الطبيب | ✅ محدّث |
| `routes/publicDoctorSchedulesRoutes.js` | مسارات عامة | ✅ موجود |

---

## البدء السريع | Quick Start

### 1. تسجيل الدخول كطبيب

```bash
POST http://localhost:3006/api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "your_password"
}
```

احفظ الـ `token` من الاستجابة.

### 2. إنشاء جدول أونلاين

```bash
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "day_of_week": "sunday",
  "start_time": "18:00:00",
  "end_time": "22:00:00",
  "session_price": 150.00,
  "session_duration": 30,
  "consultation_type": "online"
}
```

### 3. إنشاء جدول في عيادة

```bash
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "clinic_id": 1,
  "day_of_week": "saturday",
  "start_time": "09:00:00",
  "end_time": "13:00:00",
  "session_price": 200.00,
  "session_duration": 30,
  "consultation_type": "in_clinic"
}
```

### 4. عرض جميع الجداول

```bash
GET http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
```

---

## APIs المتاحة | Available APIs

### 📌 APIs الأساسية (Basic APIs)

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/doctor-schedules` | إنشاء جدول |
| GET | `/api/doctor-schedules` | جلب جميع الجداول |
| GET | `/api/doctor-schedules/:id` | جلب جدول واحد |
| PUT | `/api/doctor-schedules/:id` | تحديث جدول |
| DELETE | `/api/doctor-schedules/:id` | حذف ناعم |
| DELETE | `/api/doctor-schedules/:id/permanent` | حذف نهائي |

**التوثيق الكامل:** `02-api-documentation.md`

---

### 🆕 APIs الجديدة (New APIs - v2.0)

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/doctor-schedules/grouped/by-day` | عرض مجمع حسب اليوم |
| GET | `/api/doctor-schedules/grouped/by-type` | عرض مجمع حسب النوع |
| GET | `/api/doctor-schedules/grouped/by-clinic` | عرض مجمع حسب العيادة |
| GET | `/api/doctor-schedules/summary/weekly` | ملخص أسبوعي |
| GET | `/api/doctor-schedules/available-slots/:day` | الأوقات المتاحة |
| POST | `/api/doctor-schedules/bulk` | إنشاء متعدد |
| PATCH | `/api/doctor-schedules/:id/toggle` | تبديل الحالة |

**التوثيق الكامل:** `05-new-apis-documentation.md`

---

### 🌐 APIs العامة (Public APIs)

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/public/doctor-schedules/:doctorId` | جداول طبيب (عام) |

**لا تحتاج إلى مصادقة**

---

## الاختبار | Testing

### استخدام Postman

1. افتح Postman
2. Import → Upload Files
3. اختر `doctor-schedules-testing.postman_collection.json`
4. عدّل المتغيرات:
   - `base_url`: `http://localhost:3006/api`
   - `doctor_token`: (سيتم ملؤه تلقائياً بعد Login)
   - `clinic_id`: (سيتم ملؤه تلقائياً)
5. ابدأ الاختبار من مجلد "1. Setup - Login"

### الاختبارات المتاحة

- ✅ 40+ اختبار شامل
- ✅ اختبارات تلقائية (Automated Tests)
- ✅ تغطية كاملة لجميع الـ APIs
- ✅ اختبارات الأخطاء والحالات الخاصة

**دليل الاختبار الكامل:** `03-testing-guide.md`

---

## التحديثات الأخيرة | Recent Updates

### الإصدار 2.0.0 (8 مارس 2026)

#### إصلاحات الأخطاء
- ✅ إصلاح خطأ `undefined` في معامل `clinic_id`
- ✅ تحسين التحقق من التعارض

#### ميزات جديدة
- ✅ 7 APIs جديدة للعرض والإدارة
- ✅ Postman Collection شاملة
- ✅ توثيق مفصل للـ APIs الجديدة

#### تحسينات
- ✅ تحسين أداء الاستعلامات
- ✅ تحسين تنسيق الاستجابات
- ✅ إضافة 21 اختبار جديد

**التفاصيل الكاملة:** `06-bug-fixes-and-enhancements.md`

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: إنشاء جدول أسبوعي كامل

```javascript
// استخدام Bulk Create
const schedules = [
  {
    day_of_week: 'saturday',
    start_time: '09:00:00',
    end_time: '13:00:00',
    session_price: 200,
    session_duration: 30,
    consultation_type: 'online'
  },
  {
    day_of_week: 'sunday',
    start_time: '14:00:00',
    end_time: '18:00:00',
    session_price: 180,
    session_duration: 30,
    consultation_type: 'online'
  },
  // ... المزيد من الجداول
];

const response = await fetch('/api/doctor-schedules/bulk', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ schedules })
});
```

### مثال 2: عرض جدول أسبوعي في التقويم

```javascript
// جلب الجداول مجمعة حسب اليوم
const response = await fetch('/api/doctor-schedules/grouped/by-day', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();

// data = {
//   saturday: [...schedules],
//   sunday: [...schedules],
//   ...
// }

// عرض في التقويم
Object.keys(data).forEach(day => {
  renderDayInCalendar(day, data[day]);
});
```

### مثال 3: عرض الأوقات المتاحة للحجز

```javascript
// جلب الأوقات المتاحة ليوم السبت
const response = await fetch('/api/doctor-schedules/available-slots/saturday', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();

// عرض الأوقات
data.forEach(schedule => {
  schedule.slots.forEach(slot => {
    renderTimeSlot(slot.start, slot.end, slot.price);
  });
});
```

---

## الأسئلة الشائعة | FAQ

### س: كيف أمنع التعارض في المواعيد؟
**ج:** النظام يمنع التعارض تلقائياً. لا يمكن إنشاء جدولين متداخلين لنفس الطبيب في نفس اليوم ونفس المكان.

### س: هل يمكن للطبيب العمل في عيادتين في نفس الوقت؟
**ج:** لا، النظام يمنع ذلك تلقائياً.

### س: ما الفرق بين الحذف الناعم والحذف النهائي؟
**ج:** 
- **الحذف الناعم:** يعطل الجدول فقط (is_active = 0) ويمكن إعادة تفعيله
- **الحذف النهائي:** يحذف الجدول نهائياً من قاعدة البيانات ولا يمكن التراجع عنه

### س: كيف أنشئ جدول أونلاين؟
**ج:** لا ترسل `clinic_id` أو اجعله `null`، واجعل `consultation_type = "online"`

### س: كيف أنشئ جدول في عيادة؟
**ج:** أرسل `clinic_id` مع رقم العيادة، واجعل `consultation_type = "in_clinic"`

---

## الدعم والمساعدة | Support

### للمطورين
- راجع التوثيق في هذا المجلد
- استخدم Postman Collection للاختبار
- تحقق من الأمثلة في الملفات

### للإبلاغ عن مشاكل
- تحقق من `06-bug-fixes-and-enhancements.md` للمشاكل المعروفة
- راجع `03-testing-guide.md` للاختبارات

---

## الخطوات التالية | Next Steps

### قريباً
1. **Schedule Templates** - قوالب جاهزة
2. **Recurring Exceptions** - استثناءات متكررة
3. **Auto-scheduling** - جدولة تلقائية

### قيد الدراسة
1. **AI-powered Scheduling** - جدولة ذكية
2. **Patient Preferences** - تفضيلات المرضى
3. **Dynamic Pricing** - تسعير ديناميكي

---

## المساهمون | Contributors

**Developer:** Kiro AI Assistant  
**Date:** March 8, 2026  
**Version:** 2.0.0

---

## الترخيص | License

هذا النظام جزء من مشروع BASHRA.AI

---

**آخر تحديث:** 8 مارس 2026  
**الإصدار:** 2.0.0  
**الحالة:** ✅ Production Ready

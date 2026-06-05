# Doctor Schedules Testing Guide
# دليل اختبار جداول مواعيد الأطباء

---

## المتطلبات | Prerequisites

1. ✅ تسجيل دخول كطبيب والحصول على Token
2. ✅ وجود عيادة واحدة على الأقل للطبيب
3. ✅ استخدام Postman أو أي أداة API testing

---

## 1. Setup - الإعداد

### 1.1 تسجيل دخول الطبيب

**Request:**
```http
POST http://localhost:3006/api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "your_password"
}
```

**احفظ الـ Token من الاستجابة:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.2 الحصول على معرف العيادة

**Request:**
```http
GET http://localhost:3006/api/clinics
Authorization: Bearer {your_token}
```

**احفظ `id` من الاستجابة**

---

## 2. Create Schedule Tests - اختبارات الإنشاء

### Test 2.1: إنشاء جدول أونلاين ✅

**Request:**
```http
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json
Accept-Language: ar

{
  "clinic_id": null,
  "day_of_week": "sunday",
  "start_time": "18:00:00",
  "end_time": "22:00:00",
  "session_price": 150.00,
  "session_duration": 30,
  "consultation_type": "online"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الجدول بنجاح",
  "data": {
    "id": 1,
    "doctor_id": 2,
    "clinic_id": null,
    "day_of_week": "sunday",
    "start_time": "18:00:00",
    "end_time": "22:00:00",
    "session_price": "150.00",
    "session_duration": 30,
    "consultation_type": "online",
    "is_active": 1
  }
}
```

---

### Test 2.2: إنشاء جدول في عيادة ✅

**Request:**
```http
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json
Accept-Language: ar

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

**Expected Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الجدول بنجاح",
  "data": {
    "id": 2,
    "clinic_id": 1,
    "consultation_type": "in_clinic"
  }
}
```

---

### Test 2.3: محاولة إنشاء جدول متعارض ❌

**Request:**
```http
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "clinic_id": 1,
  "day_of_week": "saturday",
  "start_time": "10:00:00",
  "end_time": "14:00:00",
  "session_price": 200.00,
  "session_duration": 30,
  "consultation_type": "in_clinic"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "يوجد تعارض في المواعيد المحددة"
}
```

---

### Test 2.4: محاولة إنشاء جدول أونلاين بعيادة ❌

**Request:**
```http
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "clinic_id": 1,
  "day_of_week": "monday",
  "start_time": "09:00:00",
  "end_time": "13:00:00",
  "session_price": 150.00,
  "session_duration": 30,
  "consultation_type": "online"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "الكشف الأونلاين لا يحتاج إلى رقم عيادة"
}
```

---

### Test 2.5: محاولة إنشاء جدول في عيادة بدون clinic_id ❌

**Request:**
```http
POST http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "clinic_id": null,
  "day_of_week": "tuesday",
  "start_time": "09:00:00",
  "end_time": "13:00:00",
  "session_price": 200.00,
  "session_duration": 30,
  "consultation_type": "in_clinic"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "رقم العيادة مطلوب للكشف في العيادة"
}
```

---

## 3. Read Schedule Tests - اختبارات القراءة

### Test 3.1: جلب جميع الجداول ✅

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules
Authorization: Bearer {your_token}
Accept-Language: ar
```

**Expected Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "day_of_week": "saturday",
      "consultation_type": "in_clinic",
      "clinic_name": "عيادة القاهرة"
    },
    {
      "id": 2,
      "day_of_week": "sunday",
      "consultation_type": "online",
      "clinic_name": null
    }
  ]
}
```

---

### Test 3.2: فلترة حسب نوع الكشف ✅

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules?consultation_type=online
Authorization: Bearer {your_token}
```

**Expected:** جداول الأونلاين فقط

---

### Test 3.3: فلترة حسب اليوم ✅

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules?day_of_week=saturday
Authorization: Bearer {your_token}
```

**Expected:** جداول يوم السبت فقط

---

### Test 3.4: فلترة حسب الحالة ✅

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules?is_active=true
Authorization: Bearer {your_token}
```

**Expected:** الجداول النشطة فقط

---

### Test 3.5: جلب جدول واحد ✅

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "doctor_id": 2,
    "clinic_id": 1,
    "day_of_week": "saturday",
    "start_time": "09:00:00",
    "end_time": "13:00:00",
    "session_price": "200.00",
    "session_duration": 30,
    "consultation_type": "in_clinic",
    "is_active": 1,
    "clinic_name": "عيادة القاهرة",
    "clinic_address": "شارع التحرير، القاهرة"
  }
}
```

---

## 4. Update Schedule Tests - اختبارات التحديث

### Test 4.1: تحديث السعر والمدة ✅

**Request:**
```http
PUT http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "session_price": 250.00,
  "session_duration": 45
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "تم تحديث الجدول بنجاح",
  "data": {
    "id": 1,
    "session_price": "250.00",
    "session_duration": 45
  }
}
```

---

### Test 4.2: تحديث الوقت ✅

**Request:**
```http
PUT http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "start_time": "10:00:00",
  "end_time": "14:00:00"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "تم تحديث الجدول بنجاح"
}
```

---

### Test 4.3: تعطيل جدول ✅

**Request:**
```http
PUT http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
Content-Type: application/json

{
  "is_active": false
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "تم تحديث الجدول بنجاح",
  "data": {
    "is_active": 0
  }
}
```

---

### Test 4.4: تحديث بدون حقول ❌

**Request:**
```http
PUT http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
Content-Type: application/json

{}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "لا توجد حقول للتحديث"
}
```

---

## 5. Delete Schedule Tests - اختبارات الحذف

### Test 5.1: حذف ناعم ✅

**Request:**
```http
DELETE http://localhost:3006/api/doctor-schedules/1
Authorization: Bearer {your_token}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "تم حذف الجدول بنجاح"
}
```

**Verify:** الجدول لا يزال موجوداً في قاعدة البيانات لكن `is_active = 0`

---

### Test 5.2: حذف نهائي ✅

**Request:**
```http
DELETE http://localhost:3006/api/doctor-schedules/1/permanent
Authorization: Bearer {your_token}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "تم حذف الجدول نهائياً"
}
```

**Verify:** الجدول تم حذفه نهائياً من قاعدة البيانات

---

### Test 5.3: محاولة حذف جدول غير موجود ❌

**Request:**
```http
DELETE http://localhost:3006/api/doctor-schedules/999
Authorization: Bearer {your_token}
```

**Expected Response (404):**
```json
{
  "success": false,
  "message": "الجدول غير موجود"
}
```

---

## 6. Public API Tests - اختبارات الـ API العامة

### Test 6.1: جلب جداول طبيب (عام) ✅

**Request:**
```http
GET http://localhost:3006/api/public/doctor-schedules/2
Accept-Language: ar
```

**Expected Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "day_of_week": "saturday",
      "start_time": "09:00:00",
      "end_time": "13:00:00",
      "session_price": "200.00",
      "session_duration": 30,
      "consultation_type": "in_clinic",
      "clinic_id": 1,
      "clinic_name": "عيادة القاهرة",
      "clinic_address": "شارع التحرير، القاهرة",
      "city_name_ar": "القاهرة",
      "city_name_en": "Cairo"
    }
  ]
}
```

---

### Test 6.2: فلترة جداول عامة حسب النوع ✅

**Request:**
```http
GET http://localhost:3006/api/public/doctor-schedules/2?consultation_type=online
```

**Expected:** جداول الأونلاين فقط للطبيب

---

### Test 6.3: محاولة الوصول لطبيب غير موجود ❌

**Request:**
```http
GET http://localhost:3006/api/public/doctor-schedules/999
```

**Expected Response (404):**
```json
{
  "success": false,
  "message": "الطبيب غير موجود"
}
```

---

## 7. Authorization Tests - اختبارات الصلاحيات

### Test 7.1: محاولة الوصول بدون Token ❌

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules
```

**Expected Response (401):**
```json
{
  "success": false,
  "message": "غير مصرح - يرجى تسجيل الدخول"
}
```

---

### Test 7.2: محاولة الوصول بـ Token مستخدم عادي ❌

**Request:**
```http
GET http://localhost:3006/api/doctor-schedules
Authorization: Bearer {user_token}
```

**Expected Response (403):**
```json
{
  "success": false,
  "message": "غير مصرح - يجب أن تكون طبيباً"
}
```

---

## 8. Edge Cases - حالات خاصة

### Test 8.1: إنشاء جداول متعددة لنفس اليوم في عيادات مختلفة ✅

يجب أن ينجح - لأن العيادات مختلفة

---

### Test 8.2: إنشاء جداول متعددة لأيام مختلفة في نفس العيادة ✅

يجب أن ينجح - لأن الأيام مختلفة

---

### Test 8.3: إنشاء جدول أونلاين وجدول في عيادة لنفس اليوم ✅

يجب أن ينجح - لأن الأماكن مختلفة (أونلاين vs عيادة)

---

## 9. Performance Tests - اختبارات الأداء

### Test 9.1: إنشاء 50 جدول

قم بإنشاء 50 جدول مختلف وقس الوقت

**Expected:** أقل من 5 ثواني

---

### Test 9.2: جلب جميع الجداول

**Expected:** أقل من 500ms

---

## 10. Checklist - قائمة التحقق النهائية

- [ ] جميع اختبارات الإنشاء تعمل
- [ ] جميع اختبارات القراءة تعمل
- [ ] جميع اختبارات التحديث تعمل
- [ ] جميع اختبارات الحذف تعمل
- [ ] الـ Public API يعمل بدون مصادقة
- [ ] منع التعارض يعمل بشكل صحيح
- [ ] التحقق من الصلاحيات يعمل
- [ ] رسائل الخطأ واضحة ومفيدة
- [ ] دعم اللغتين العربية والإنجليزية

---

## Notes - ملاحظات

1. **Soft Delete:** استخدم الحذف الناعم للحفاظ على السجل التاريخي
2. **Conflict Detection:** النظام يمنع التعارض تلقائياً
3. **Clinic Ownership:** يتم التحقق من ملكية العيادة تلقائياً
4. **Active Status:** الجداول غير النشطة لا تظهر في الـ Public API

---

**Last Updated:** December 5, 2024  
**Version:** 1.0.0

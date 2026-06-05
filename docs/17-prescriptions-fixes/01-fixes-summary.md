# Prescriptions & Doctor Schedules Fixes Summary
# ملخص إصلاحات الوصفات الطبية وجداول المواعيد

---

## التاريخ | Date
**5 ديسمبر 2024** | December 5, 2024

---

## المرحلة الأولى: إصلاح Doctor Schedules API

### 1. إضافة دعم form-data ✅

**المشكلة:**
- الـ API لا يستقبل البيانات من form-data

**الحل:**
- إضافة `parseFormData` middleware إلى `doctorSchedulesRoutes.js`

**الملفات المعدلة:**
```javascript
// routes/doctorSchedulesRoutes.js
const { parseFormData } = require('../middleware/formDataMiddleware');
router.use(authenticateJWT, authorizeDoctor, checkAccountActive, parseFormData);
```

---

### 2. إصلاح Public API لجلب جداول الطبيب ✅

**المشكلة:**
- الـ Public API لا تعمل بشكل صحيح
- لا تعرض العناوين التفصيلية
- رسائل الأخطاء غير واضحة

**الحل:**
تم إعادة كتابة `getPublicDoctorSchedules()` في `doctorSchedulesController.js`:

#### التحسينات:
1. **التحقق الصحيح من حالة الطبيب:**
```javascript
if (doctor.is_active !== 1 || doctor.status !== 'active' || doctor.approval_status !== 'approved') {
  return res.status(403).json({
    success: false,
    message: language === 'ar' 
      ? 'الطبيب غير متاح حالياً' 
      : 'Doctor is not available'
  });
}
```

2. **جلب العناوين التفصيلية:**
```sql
SELECT 
  ds.*,
  c.id as clinic_id,
  c.name as clinic_name,
  c.phone as clinic_phone,
  c.email as clinic_email,
  addr.id as address_id,
  addr.address_line1,
  addr.address_line2,
  addr.postal_code,
  addr.latitude,
  addr.longitude,
  cc.countries_cities_id,
  cc.city_name_ar,
  cc.city_name_en,
  cc.country_name_ar,
  cc.country_name_en
FROM doctor_schedules ds
LEFT JOIN clinics c ON ds.clinic_id = c.id
LEFT JOIN addressable adbl ON adbl.addressable_id = c.id AND adbl.addressable_type = 'Clinic'
LEFT JOIN addresses addr ON addr.id = adbl.address_id
LEFT JOIN countries_cities cc ON addr.countries_cities_id = cc.countries_cities_id
WHERE ds.doctor_id = ? AND ds.is_active = 1
```

3. **تنسيق الاستجابة:**
```javascript
const formattedSchedules = schedules.map(schedule => {
  const result = {
    id: schedule.id,
    day_of_week: schedule.day_of_week,
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    session_price: schedule.session_price,
    session_duration: schedule.session_duration,
    consultation_type: schedule.consultation_type
  };

  if (schedule.consultation_type === 'in_clinic' && schedule.clinic_id) {
    result.clinic = {
      id: schedule.clinic_id,
      name: schedule.clinic_name,
      phone: schedule.clinic_phone,
      email: schedule.clinic_email
    };

    if (schedule.address_id) {
      result.address = {
        id: schedule.address_id,
        address_line1: schedule.address_line1,
        address_line2: schedule.address_line2,
        postal_code: schedule.postal_code,
        latitude: schedule.latitude,
        longitude: schedule.longitude,
        city: language === 'ar' ? schedule.city_name_ar : schedule.city_name_en,
        country: language === 'ar' ? schedule.country_name_ar : schedule.country_name_en,
        full_address: language === 'ar' 
          ? `${schedule.address_line1 || ''}${schedule.address_line2 ? ', ' + schedule.address_line2 : ''}, ${schedule.city_name_ar || ''}, ${schedule.country_name_ar || ''}`
          : `${schedule.address_line1 || ''}${schedule.address_line2 ? ', ' + schedule.address_line2 : ''}, ${schedule.city_name_en || ''}, ${schedule.country_name_en || ''}`
      };
    }
  } else {
    result.clinic = null;
    result.address = null;
  }

  return result;
});
```

4. **معالجة الأخطاء:**
```javascript
return res.status(500).json({
  success: false,
  message: language === 'ar' 
    ? 'خطأ في جلب جداول المواعيد' 
    : 'Error fetching schedules',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined
});
```

---

## المرحلة الثانية: إصلاح Prescriptions Controller

### المشكلة الرئيسية ❌

**الـ queries تستخدم حقول غير موجودة:**
```sql
-- ❌ خطأ - هذه الحقول غير موجودة
SELECT 
  u.full_name as patient_name,
  d.full_name as doctor_name
FROM prescriptions p
INNER JOIN users u ON p.patient_id = u.id
INNER JOIN doctors d ON p.doctor_id = d.id
```

**السبب:**
- جداول `users` و `doctors` لا تحتوي على حقل `full_name`
- الأسماء موجودة في جداول الترجمة:
  - `user_profile_translations` للمستخدمين
  - `doctor_profile_translations` للأطباء

---

### الحل ✅

تم إصلاح جميع الـ queries في `prescriptionsController.js`:

#### 1. getAllPrescriptions()
```sql
SELECT 
  p.*,
  upt.full_name as patient_name,
  dpt.full_name as doctor_name
FROM prescriptions p
INNER JOIN users u ON p.patient_id = u.id
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
INNER JOIN doctors d ON p.doctor_id = d.id
INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.profile_id AND dpt.language_code = ?
WHERE 1=1
```

#### 2. getPrescriptionById()
```sql
SELECT 
  p.*,
  upt.full_name as patient_name,
  u.email as patient_email,
  u.phone as patient_phone,
  dpt.full_name as doctor_name,
  d.email as doctor_email
FROM prescriptions p
INNER JOIN users u ON p.patient_id = u.id
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
INNER JOIN doctors d ON p.doctor_id = d.id
INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.profile_id AND dpt.language_code = ?
WHERE ${isUUID ? 'p.uuid' : 'p.id'} = ?
```

#### 3. getPrescriptionsByMedicalRecord()
```sql
SELECT 
  p.*,
  upt.full_name as patient_name,
  dpt.full_name as doctor_name
FROM prescriptions p
INNER JOIN users u ON p.patient_id = u.id
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?
INNER JOIN doctors d ON p.doctor_id = d.id
INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.profile_id AND dpt.language_code = ?
WHERE p.medical_record_id = ?
```

---

### إصلاح Medications Controller ✅

**المشكلة:**
- الـ query لا يستخدم language parameter بشكل صحيح

**الحل:**
```javascript
// قبل
const params = [];

// بعد
const lang = req.headers['accept-language'] || 'ar';
const params = [lang];
```

```sql
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = ?
```

---

## بنية الجداول | Database Structure

### User Tables
```
users (id, email, phone, ...)
  └── user_profiles (id, user_id, ...)
        └── user_profile_translations (id, profile_id, language_code, full_name, ...)
```

### Doctor Tables
```
doctors (id, email, ...)
  └── doctor_profiles (id, doctor_id, ...)
        └── doctor_profile_translations (id, doctor_profile_id, language_code, full_name, specialty, ...)
```

### Address Tables
```
clinics (id, name, ...)
  └── addressable (address_id, addressable_type='Clinic', addressable_id=clinic.id)
        └── addresses (id, address_line1, address_line2, countries_cities_id, ...)
              └── countries_cities (countries_cities_id, city_name_ar, city_name_en, ...)
```

---

## الملفات المعدلة | Modified Files

### 1. Doctor Schedules
- ✅ `routes/doctorSchedulesRoutes.js` - إضافة parseFormData middleware
- ✅ `controllers/doctorSchedulesController.js` - إصلاح getPublicDoctorSchedules()

### 2. Prescriptions
- ✅ `controllers/prescriptionsController.js` - إصلاح جميع الـ queries (3 دوال)

### 3. Medications
- ✅ `controllers/medicationsController.js` - إصلاح query parameter

---

## الاختبار | Testing

### Doctor Schedules Public API
```http
GET /api/public/doctor-schedules/2
Accept-Language: ar
```

**Expected Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "day_of_week": "saturday",
      "start_time": "09:00:00",
      "end_time": "13:00:00",
      "session_price": "200.00",
      "session_duration": 30,
      "consultation_type": "in_clinic",
      "clinic": {
        "id": 1,
        "name": "عيادة القاهرة",
        "phone": "+20123456789",
        "email": "clinic@example.com"
      },
      "address": {
        "id": 1,
        "address_line1": "شارع التحرير",
        "address_line2": "الدور الثالث",
        "postal_code": "11511",
        "latitude": "30.0444",
        "longitude": "31.2357",
        "city": "القاهرة",
        "country": "مصر",
        "full_address": "شارع التحرير, الدور الثالث, القاهرة, مصر"
      }
    }
  ]
}
```

### Prescriptions API
```http
GET /api/prescriptions
Authorization: Bearer {token}
Accept-Language: ar
```

**Expected:** يجب أن تعرض أسماء المرضى والأطباء بشكل صحيح

---

## الخطوات التالية | Next Steps

### ✅ تم إكماله:
1. إصلاح doctor schedules form-data support
2. إصلاح doctor schedules public API
3. إصلاح prescriptions queries
4. إصلاح medications query

### 📝 قيد المراجعة:
1. مراجعة prescriptionTemplatesController
2. التحقق من جميع الـ APIs تعمل بشكل صحيح
3. إضافة APIs جديدة إذا لزم الأمر

---

## ملاحظات مهمة | Important Notes

### 1. Language Support
جميع الـ queries تدعم اللغتين العربية والإنجليزية عبر:
```javascript
const lang = req.headers['accept-language'] || 'ar';
```

### 2. JOIN Pattern
النمط الصحيح للـ JOIN مع جداول الترجمة:
```sql
-- For Users
INNER JOIN users u ON ...
INNER JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id AND upt.language_code = ?

-- For Doctors
INNER JOIN doctors d ON ...
INNER JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.profile_id AND dpt.language_code = ?
```

### 3. Error Handling
معالجة الأخطاء تتضمن:
- رسائل واضحة بالعربية والإنجليزية
- إخفاء تفاصيل الأخطاء في الإنتاج
- Status codes صحيحة

---

**Status:** ✅ Phase 1 & 2 Completed  
**Next:** Phase 3 - Review & Additional APIs  
**Developer:** Abdallah Mohamed

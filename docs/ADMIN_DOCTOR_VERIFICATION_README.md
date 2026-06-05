# نظام إدارة حالة التحقق من الأطباء - دليل سريع
## Admin Doctor Verification Status - Quick Guide

---

## 📋 نظرة عامة

تم إضافة endpoint جديد يتيح للأدمن إدارة حالة التحقق الشاملة للأطباء بشكل متكامل.

### ✨ الميزات الرئيسية

- ✅ تحديث حالة التحقق (`is_verified`)
- ✅ تسجيل تاريخ التحقق (`verification_date`)
- ✅ تسجيل الأدمن المسؤول (`verified_by`)
- ✅ تحديث حالة الموافقة (`approval_status`)
- ✅ تحديث حالة الطبيب تلقائياً (`doctor.status`)
- ✅ تسجيل جميع العمليات في `admin_action_logs`
- ✅ دعم اللغتين العربية والإنجليزية

---

## 🚀 البدء السريع

### 1. الـ Endpoint الجديد

```
PATCH /api/admin/doctors/:doctorId/verification-status
```

### 2. مثال بسيط

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم التحقق من جميع المستندات"
  }'
```

### 3. النتيجة

```json
{
  "success": true,
  "message_ar": "تم تحديث حالة التحقق بنجاح",
  "data": {
    "doctorId": 1,
    "newData": {
      "is_verified": true,
      "verification_date": "2024-01-15T10:30:00.000Z",
      "verified_by": 1,
      "approval_status": "approved",
      "doctor_status": "active"
    }
  }
}
```

---

## 📁 الملفات المضافة/المعدلة

### ملفات الكود

1. **`controllers/AdminDoctorManagementController.js`**
   - تمت إضافة دالة: `updateDoctorVerificationStatus()`
   - السطر: ~1200

2. **`routes/adminDoctorManagementRoutes.js`**
   - تمت إضافة route: `PATCH /:doctorId/verification-status`
   - مع middleware للتسجيل والصلاحيات

### ملفات التوثيق

3. **`docs/ADMIN_DOCTOR_VERIFICATION_STATUS.md`**
   - توثيق شامل للنظام
   - شرح جميع السيناريوهات
   - أمثلة كاملة

4. **`docs/ADMIN_DOCTOR_VERIFICATION_TESTING.md`**
   - دليل الاختبار خطوة بخطوة
   - 10 سيناريوهات اختبار
   - أمثلة curl جاهزة

5. **`docs/admin-doctor-verification-status.json`**
   - Postman Collection
   - 10 اختبارات جاهزة
   - متغيرات قابلة للتخصيص

6. **`docs/admin-doctor-verification-test-queries.sql`**
   - 15 استعلام SQL للاختبار
   - استعلامات الإحصائيات
   - استعلامات التحقق

---

## 🎯 السيناريوهات المدعومة

### 1️⃣ التحقق والموافقة

```json
{
  "is_verified": true,
  "approval_status": "approved"
}
```
**النتيجة:** طبيب نشط ومعتمد

---

### 2️⃣ الرفض

```json
{
  "is_verified": false,
  "approval_status": "rejected",
  "reason": "المستندات غير صحيحة"
}
```
**النتيجة:** طبيب غير نشط

---

### 3️⃣ التعليق

```json
{
  "is_verified": false,
  "approval_status": "suspended",
  "reason": "شكاوى متعددة"
}
```
**النتيجة:** طبيب معلق

---

### 4️⃣ إلغاء التحقق

```json
{
  "is_verified": false,
  "approval_status": "pending",
  "reason": "يتطلب مراجعة إضافية"
}
```
**النتيجة:** قيد المراجعة

---

## 📊 جدول الحالات

| is_verified | approval_status | doctor.status | الوصف |
|------------|----------------|---------------|--------|
| `true` | `approved` | `active` | ✅ نشط ومعتمد |
| `false` | `pending` | `pending_verification` | ⏳ قيد المراجعة |
| `false` | `rejected` | `inactive` | ❌ مرفوض |
| `false` | `suspended` | `suspended` | 🚫 معلق |

---

## 🧪 الاختبار

### استخدام Postman

1. استورد الملف: `docs/admin-doctor-verification-status.json`
2. عدّل المتغيرات:
   - `base_url`: عنوان السيرفر
   - `admin_token`: توكن الأدمن
3. شغّل الاختبارات

### استخدام cURL

راجع ملف: `docs/ADMIN_DOCTOR_VERIFICATION_TESTING.md`

### استخدام SQL

راجع ملف: `docs/admin-doctor-verification-test-queries.sql`

---

## 🔐 الصلاحيات المطلوبة

- **Authentication:** مطلوب توكن أدمن صالح
- **Authorization:** System Admin أو أعلى
- **Middleware:** 
  - `authenticateJWT`
  - `authorizeSystemAdmin`
  - `adminActionLogger`

---

## 📝 التسجيل والسجلات

### 1. جدول admin_action_logs

```sql
SELECT * FROM admin_action_logs 
WHERE action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
ORDER BY created_at DESC;
```

### 2. ملف Log

```bash
tail -f admin-doctor-management.log
```

---

## ⚠️ ملاحظات مهمة

1. **Transaction Safety:** جميع العمليات تتم داخل transaction
2. **Cascading Updates:** تحديث doctor_profiles يؤثر على doctors تلقائياً
3. **Validation:** يتم التحقق من صحة جميع المدخلات
4. **Logging:** يتم تسجيل كل عملية مع التفاصيل الكاملة
5. **Rollback:** في حالة الخطأ، يتم التراجع عن جميع التغييرات

---

## 🆚 الفرق بين الـ Endpoints

| Endpoint | الوظيفة | الحقول المحدثة |
|----------|---------|----------------|
| `/verify` | تحقق بسيط | `is_verified` فقط |
| `/approval` | حالة الموافقة | `approval_status` فقط |
| `/verification-status` | **شامل (موصى به)** | **جميع الحقول** |

---

## 🔍 أمثلة الاستخدام

### مثال 1: موافقة سريعة

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_verified": true, "approval_status": "approved"}'
```

### مثال 2: رفض مع سبب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/2/verification-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": false,
    "approval_status": "rejected",
    "reason": "المستندات منتهية الصلاحية"
  }'
```

### مثال 3: تعليق مؤقت

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/3/verification-status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": false,
    "approval_status": "suspended",
    "reason": "تحقيق جاري"
  }'
```

---

## 📚 المراجع

### التوثيق الكامل
- [`ADMIN_DOCTOR_VERIFICATION_STATUS.md`](./ADMIN_DOCTOR_VERIFICATION_STATUS.md)

### دليل الاختبار
- [`ADMIN_DOCTOR_VERIFICATION_TESTING.md`](./ADMIN_DOCTOR_VERIFICATION_TESTING.md)

### Postman Collection
- [`admin-doctor-verification-status.json`](./admin-doctor-verification-status.json)

### SQL Queries
- [`admin-doctor-verification-test-queries.sql`](./admin-doctor-verification-test-queries.sql)

### الكود المصدري
- `controllers/AdminDoctorManagementController.js`
- `routes/adminDoctorManagementRoutes.js`

---

## 🐛 استكشاف الأخطاء

### خطأ 400: is_verified مطلوب
**الحل:** تأكد من إرسال `is_verified` في الـ body

### خطأ 400: approval_status غير صحيح
**الحل:** استخدم فقط: `pending`, `approved`, `rejected`, `suspended`

### خطأ 404: طبيب غير موجود
**الحل:** تحقق من صحة `doctorId`

### خطأ 401: غير مصرح
**الحل:** تحقق من صحة التوكن

### خطأ 403: صلاحيات غير كافية
**الحل:** تحتاج صلاحيات System Admin

---

## ✅ قائمة التحقق

- [ ] تم تثبيت جميع التبعيات
- [ ] قاعدة البيانات محدثة
- [ ] السيرفر يعمل
- [ ] لديك توكن أدمن صالح
- [ ] لديك معرف طبيب للاختبار
- [ ] استوردت Postman Collection
- [ ] راجعت التوثيق

---

## 🎉 الخلاصة

تم إنشاء نظام متكامل لإدارة حالة التحقق من الأطباء يتضمن:

✅ Endpoint شامل وقوي  
✅ توثيق كامل بالعربية والإنجليزية  
✅ 10 اختبارات جاهزة في Postman  
✅ 15 استعلام SQL للتحقق  
✅ دليل اختبار خطوة بخطوة  
✅ تسجيل شامل للعمليات  
✅ معالجة أخطاء احترافية  

**جاهز للاستخدام الفوري! 🚀**

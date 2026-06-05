# دليل اختبار نظام إدارة حالة التحقق من الأطباء
## Admin Doctor Verification Status Testing Guide

---

## المتطلبات الأساسية

1. **توكن الأدمن:** احصل على توكن من endpoint تسجيل دخول الأدمن
2. **معرف الطبيب:** استخدم معرف طبيب موجود في قاعدة البيانات
3. **Base URL:** `http://localhost:3006` (أو حسب إعدادات السيرفر)

---

## الخطوة 1: الحصول على توكن الأدمن

```bash
curl -X POST http://localhost:3006/api/auth-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

**احفظ التوكن من الاستجابة:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## الخطوة 2: جلب قائمة الأطباء

```bash
curl -X GET "http://localhost:3006/api/admin/doctors?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

**احفظ `id` لأحد الأطباء للاختبار**

---

## الخطوة 3: اختبار التحقق والموافقة

### السيناريو 1: التحقق والموافقة الكاملة

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم التحقق من جميع المستندات والبيانات المهنية بنجاح"
  }'
```

**النتيجة المتوقعة:**
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

**التحقق من النتيجة:**
```bash
curl -X GET http://localhost:3006/api/admin/doctors/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### السيناريو 2: التحقق فقط (بدون تحديد approval_status)

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/2/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "reason": "تم التحقق من الهوية والمستندات الأساسية"
  }'
```

**النتيجة المتوقعة:**
- `is_verified` = `true`
- `approval_status` = `approved` (تلقائياً)
- `doctor_status` = `active`

---

### السيناريو 3: إلغاء التحقق

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "pending",
    "reason": "يتطلب مراجعة إضافية للمستندات"
  }'
```

**النتيجة المتوقعة:**
- `is_verified` = `false`
- `verification_date` = `null`
- `verified_by` = `null`
- `approval_status` = `pending`
- `doctor_status` = `pending_verification`

---

### السيناريو 4: رفض الطبيب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/3/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "rejected",
    "reason": "المستندات المقدمة غير صحيحة أو منتهية الصلاحية"
  }'
```

**النتيجة المتوقعة:**
- `is_verified` = `false`
- `approval_status` = `rejected`
- `doctor_status` = `inactive`

---

### السيناريو 5: تعليق حساب الطبيب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/4/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "suspended",
    "reason": "تم تعليق الحساب بسبب شكاوى متعددة من المرضى"
  }'
```

**النتيجة المتوقعة:**
- `is_verified` = `false`
- `approval_status` = `suspended`
- `doctor_status` = `suspended`

---

## الخطوة 4: اختبار الأخطاء

### خطأ 1: is_verified مفقود

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "approval_status": "approved",
    "reason": "محاولة بدون is_verified"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": false,
  "message_ar": "حالة التحقق مطلوبة (is_verified)"
}
```
**Status Code:** `400`

---

### خطأ 2: approval_status غير صحيح

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "invalid_status",
    "reason": "محاولة استخدام حالة غير صحيحة"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": false,
  "message_ar": "حالة الموافقة غير صحيحة. القيم المسموحة: pending, approved, rejected, suspended"
}
```
**Status Code:** `400`

---

### خطأ 3: طبيب غير موجود

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/99999/verification-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "محاولة تحديث طبيب غير موجود"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": false,
  "message_ar": "ملف الطبيب غير موجود"
}
```
**Status Code:** `404`

---

### خطأ 4: بدون توكن

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "approved"
  }'
```

**النتيجة المتوقعة:**
```json
{
  "success": false,
  "message_ar": "التوكن مطلوب"
}
```
**Status Code:** `401`

---

## الخطوة 5: التحقق من السجلات

### 1. فحص جدول admin_action_logs

```sql
SELECT * FROM admin_action_logs 
WHERE action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS' 
ORDER BY created_at DESC 
LIMIT 10;
```

**يجب أن تظهر:**
- `admin_id`: معرف الأدمن
- `action_type`: UPDATE_DOCTOR_VERIFICATION_STATUS
- `target_type`: doctor_profile
- `target_id`: معرف الملف الشخصي
- `old_values`: البيانات القديمة (JSON)
- `new_values`: البيانات الجديدة (JSON)
- `ip_address`: عنوان IP
- `user_agent`: معلومات المتصفح

---

### 2. فحص ملف Log

```bash
tail -f admin-doctor-management.log
```

**يجب أن تظهر رسائل مثل:**
```json
{
  "level": "info",
  "message": "Doctor verification status updated",
  "doctorId": 1,
  "profileId": 1,
  "oldData": {...},
  "newData": {...},
  "updatedBy": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## الخطوة 6: اختبار الفلترة

### جلب الأطباء المعتمدين فقط

```bash
curl -X GET "http://localhost:3006/api/admin/doctors?is_verified=true&approval_status=approved" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### جلب الأطباء قيد المراجعة

```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### جلب الأطباء المرفوضين

```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=rejected" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

---

### جلب الأطباء المعلقين

```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=suspended" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

---

## جدول الاختبار الشامل

| # | السيناريو | is_verified | approval_status | النتيجة المتوقعة | Status Code |
|---|-----------|-------------|-----------------|------------------|-------------|
| 1 | تحقق وموافقة | `true` | `approved` | doctor_status = active | 200 |
| 2 | تحقق فقط | `true` | - | approval_status = approved | 200 |
| 3 | إلغاء تحقق | `false` | `pending` | doctor_status = pending_verification | 200 |
| 4 | رفض | `false` | `rejected` | doctor_status = inactive | 200 |
| 5 | تعليق | `false` | `suspended` | doctor_status = suspended | 200 |
| 6 | is_verified مفقود | - | `approved` | خطأ | 400 |
| 7 | approval_status خطأ | `true` | `invalid` | خطأ | 400 |
| 8 | طبيب غير موجود | `true` | `approved` | خطأ | 404 |
| 9 | بدون توكن | `true` | `approved` | خطأ | 401 |
| 10 | توكن غير صحيح | `true` | `approved` | خطأ | 401 |

---

## استخدام Postman

### استيراد Collection

1. افتح Postman
2. اضغط على **Import**
3. اختر ملف `docs/admin-doctor-verification-status.json`
4. سيتم استيراد 10 اختبارات جاهزة

### إعداد المتغيرات

1. اذهب إلى **Variables** في Collection
2. عدّل:
   - `base_url`: عنوان السيرفر
   - `admin_token`: توكن الأدمن

### تشغيل الاختبارات

1. اختر أي اختبار من القائمة
2. اضغط **Send**
3. راجع النتيجة في **Response**

---

## نصائح الاختبار

1. **ابدأ بطبيب واحد:** اختبر جميع السيناريوهات على نفس الطبيب
2. **راقب السجلات:** تابع ملف admin-doctor-management.log
3. **تحقق من قاعدة البيانات:** استخدم SQL للتحقق من التحديثات
4. **اختبر الأخطاء:** تأكد من أن رسائل الخطأ واضحة
5. **اختبر الصلاحيات:** جرب بتوكن مستخدم عادي (يجب أن يفشل)

---

## الأسئلة الشائعة

### س: ماذا يحدث إذا لم أحدد approval_status؟
**ج:** إذا كان `is_verified = true`، سيتم تعيين `approval_status = approved` تلقائياً.

### س: هل يمكن التحقق من طبيب مرفوض؟
**ج:** نعم، يمكنك تحديث `is_verified = true` و `approval_status = approved` لإعادة تفعيله.

### س: ما الفرق بين `/verify` و `/verification-status`؟
**ج:** `/verification-status` أكثر شمولاً ويحدث جميع الحقول دفعة واحدة.

### س: هل يتم إرسال إشعار للطبيب؟
**ج:** حالياً لا، لكن يمكن إضافة هذه الميزة لاحقاً.

---

## الخلاصة

✅ تم إنشاء endpoint شامل لإدارة حالة التحقق  
✅ يدعم جميع السيناريوهات (موافقة، رفض، تعليق، إلغاء)  
✅ يسجل جميع العمليات في admin_action_logs  
✅ يحدث حالة الطبيب تلقائياً  
✅ يدعم اللغتين العربية والإنجليزية  
✅ يتضمن validation شامل  
✅ يستخدم transactions لضمان سلامة البيانات  

---

**للدعم والمساعدة، راجع:**
- `ADMIN_DOCTOR_VERIFICATION_STATUS.md`
- `admin-doctor-verification-status.json`

# نظام إدارة حالة التحقق من الأطباء للأدمن
## Admin Doctor Verification Status Management System

## نظرة عامة

هذا النظام يتيح للأدمن إدارة حالة التحقق الشاملة للأطباء في المنصة، بما في ذلك:
- حالة التحقق (`is_verified`)
- تاريخ التحقق (`verification_date`)
- الأدمن الذي قام بالتحقق (`verified_by`)
- حالة الموافقة (`approval_status`)

---

## الحقول المتأثرة في قاعدة البيانات

### جدول `doctor_profiles`

```sql
is_verified         TINYINT(1)      DEFAULT '0'
verification_date   TIMESTAMP       NULL DEFAULT NULL
verified_by         INT             DEFAULT NULL (FK -> admins.id)
approval_status     ENUM            ('pending','approved','rejected','suspended') DEFAULT 'pending'
```

### جدول `doctors`

```sql
status              ENUM            ('active','inactive','suspended','pending_verification')
```

---

## API Endpoint

### تحديث حالة التحقق الشاملة

**Endpoint:** `PATCH /api/admin/doctors/:doctorId/verification-status`

**Authentication:** مطلوب (Admin Token)

**Authorization:** System Admin فقط

---

## Request Body

### الحقول المطلوبة

| الحقل | النوع | مطلوب | الوصف |
|------|------|------|-------|
| `is_verified` | Boolean | نعم | حالة التحقق (true = تم التحقق، false = لم يتم التحقق) |
| `approval_status` | String | لا | حالة الموافقة (pending, approved, rejected, suspended) |
| `reason` | String | لا | سبب التحديث (للتوثيق والسجلات) |

### القيم المسموحة لـ `approval_status`

- `pending` - قيد المراجعة
- `approved` - تمت الموافقة
- `rejected` - مرفوض
- `suspended` - معلق

---

## سلوك النظام

### 1. عند التحقق (`is_verified: true`)

```javascript
{
  "is_verified": true,
  "approval_status": "approved",  // اختياري
  "reason": "تم التحقق من جميع المستندات"
}
```

**التحديثات:**
- `is_verified` = `1`
- `verification_date` = الوقت الحالي
- `verified_by` = معرف الأدمن الحالي
- `approval_status` = `approved` (إذا لم يتم تحديده، يتم تعيينه تلقائياً)
- `doctor.status` = `active` (إذا كانت approval_status = approved)

---

### 2. عند إلغاء التحقق (`is_verified: false`)

```javascript
{
  "is_verified": false,
  "approval_status": "pending",
  "reason": "يتطلب مراجعة إضافية"
}
```

**التحديثات:**
- `is_verified` = `0`
- `verification_date` = `NULL`
- `verified_by` = `NULL`
- `approval_status` = حسب القيمة المرسلة
- `doctor.status` = `pending_verification`

---

### 3. عند الرفض (`approval_status: rejected`)

```javascript
{
  "is_verified": false,
  "approval_status": "rejected",
  "reason": "المستندات غير صحيحة"
}
```

**التحديثات:**
- `is_verified` = `0`
- `verification_date` = `NULL`
- `verified_by` = `NULL`
- `approval_status` = `rejected`
- `doctor.status` = `inactive`

---

### 4. عند التعليق (`approval_status: suspended`)

```javascript
{
  "is_verified": false,
  "approval_status": "suspended",
  "reason": "شكاوى متعددة من المرضى"
}
```

**التحديثات:**
- `is_verified` = `0`
- `verification_date` = `NULL`
- `verified_by` = `NULL`
- `approval_status` = `suspended`
- `doctor.status` = `suspended`

---

## أمثلة الاستخدام

### مثال 1: التحقق والموافقة على الطبيب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم التحقق من جميع المستندات والبيانات المهنية"
  }'
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم تحديث حالة التحقق بنجاح",
  "message_en": "Verification status updated successfully",
  "data": {
    "doctorId": 1,
    "doctorUuid": "550e8400-e29b-41d4-a716-446655440000",
    "profileId": 1,
    "oldData": {
      "is_verified": 0,
      "verification_date": null,
      "verified_by": null,
      "approval_status": "pending"
    },
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

### مثال 2: رفض الطبيب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/2/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "rejected",
    "reason": "المستندات المقدمة غير صحيحة أو منتهية الصلاحية"
  }'
```

---

### مثال 3: تعليق حساب الطبيب

```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/3/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "suspended",
    "reason": "تم تعليق الحساب بسبب شكاوى متعددة من المرضى"
  }'
```

---

## رسائل الخطأ

### 1. حالة التحقق مطلوبة

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "message_ar": "حالة التحقق مطلوبة (is_verified)",
  "message_en": "Verification status is required (is_verified)"
}
```

---

### 2. حالة الموافقة غير صحيحة

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "message_ar": "حالة الموافقة غير صحيحة. القيم المسموحة: pending, approved, rejected, suspended",
  "message_en": "Invalid approval status. Allowed values: pending, approved, rejected, suspended"
}
```

---

### 3. ملف الطبيب غير موجود

**Status Code:** `404 Not Found`

```json
{
  "success": false,
  "message_ar": "ملف الطبيب غير موجود",
  "message_en": "Doctor profile not found"
}
```

---

### 4. غير مصرح

**Status Code:** `403 Forbidden`

```json
{
  "success": false,
  "message_ar": "غير مصرح لك بالوصول إلى هذا المورد",
  "message_en": "You are not authorized to access this resource"
}
```

---

## السجلات والتوثيق

يتم تسجيل جميع العمليات في:

1. **جدول `admin_action_logs`:**
   - نوع العملية: `UPDATE_DOCTOR_VERIFICATION_STATUS`
   - البيانات القديمة والجديدة
   - معرف الأدمن
   - السبب
   - معلومات الجهاز (IP, User Agent)

2. **ملف Log:**
   - `admin-doctor-management.log`

---

## الفرق بين الـ Endpoints

### 1. `/verify` - التحقق البسيط
- يحدث `is_verified` فقط
- لا يحدث `approval_status` تلقائياً

### 2. `/approval` - حالة الموافقة فقط
- يحدث `approval_status` فقط
- لا يحدث `is_verified`

### 3. `/verification-status` - التحديث الشامل (الجديد)
- يحدث `is_verified` + `verification_date` + `verified_by`
- يحدث `approval_status` (اختياري أو تلقائي)
- يحدث `doctor.status` بناءً على الحالة
- **الأكثر شمولاً وموصى به**

---

## جدول مقارنة الحالات

| is_verified | approval_status | doctor.status | الوصف |
|------------|----------------|---------------|--------|
| `true` | `approved` | `active` | طبيب نشط ومعتمد |
| `true` | `pending` | `pending_verification` | تم التحقق لكن قيد المراجعة |
| `false` | `pending` | `pending_verification` | قيد المراجعة |
| `false` | `rejected` | `inactive` | مرفوض |
| `false` | `suspended` | `suspended` | معلق |

---

## ملاحظات مهمة

1. **الصلاحيات:** يتطلب صلاحيات System Admin أو أعلى
2. **Transaction:** جميع العمليات تتم داخل transaction لضمان سلامة البيانات
3. **Logging:** يتم تسجيل جميع التغييرات في admin_action_logs
4. **Cascading:** تحديث حالة doctor_profiles يؤثر تلقائياً على جدول doctors
5. **Validation:** يتم التحقق من صحة جميع المدخلات قبل التنفيذ

---

## الاختبار

استخدم ملف Postman Collection المرفق:
- `docs/admin-doctor-verification-status.json`

يحتوي على 10 اختبارات شاملة تغطي:
- ✅ التحقق والموافقة
- ✅ التحقق فقط
- ✅ إلغاء التحقق
- ✅ الرفض
- ✅ التعليق
- ✅ جلب التفاصيل
- ✅ الفلترة
- ❌ اختبارات الأخطاء

---

## الدعم والمساعدة

للمزيد من المعلومات، راجع:
- `controllers/AdminDoctorManagementController.js`
- `routes/adminDoctorManagementRoutes.js`
- `SQL-Database.sql`

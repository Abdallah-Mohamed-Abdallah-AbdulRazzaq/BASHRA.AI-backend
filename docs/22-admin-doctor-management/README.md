# Admin Doctor Management API Documentation
# توثيق API إدارة الأطباء للأدمن

## Overview | نظرة عامة

هذا النظام يتيح للأدمن إدارة حالة الأطباء في النظام، بما في ذلك:
- الموافقة على الأطباء الجدد
- التحقق من ملفات الأطباء
- تعليق أو رفض الأطباء
- تحديث حالات الأطباء

This system allows admins to manage doctors' status in the system, including:
- Approving new doctors
- Verifying doctor profiles
- Suspending or rejecting doctors
- Updating doctor statuses

---

## Base URL

```
/api/admin/doctors
```

---

## Authentication | المصادقة

جميع المسارات تتطلب:
- **JWT Token** في header الـ Authorization
- صلاحيات **Admin** (أي نوع من الأدمن للقراءة، System Admin أو أعلى للتعديل)

All routes require:
- **JWT Token** in Authorization header
- **Admin** permissions (any admin type for reading, System Admin or higher for modifications)

```
Authorization: Bearer <admin_jwt_token>
```

---

## Database Fields | حقول قاعدة البيانات

### جدول `doctors`
| Field | Type | Description |
|-------|------|-------------|
| `status` | enum | `active`, `inactive`, `suspended`, `pending_verification` |

### جدول `doctor_profiles`
| Field | Type | Description |
|-------|------|-------------|
| `is_verified` | boolean | هل تم التحقق من الملف |
| `verification_date` | timestamp | تاريخ التحقق |
| `verified_by` | int | ID الأدمن الذي قام بالتحقق |
| `approval_status` | enum | `pending`, `approved`, `rejected`, `suspended` |

---

## API Endpoints | نقاط النهاية

### 1. Get All Doctors | جلب جميع الأطباء

```http
GET /api/admin/doctors
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | رقم الصفحة |
| `limit` | number | 20 | عدد النتائج في الصفحة |
| `status` | string | - | فلتر حسب الحالة |
| `approval_status` | string | - | فلتر حسب حالة الموافقة |
| `is_verified` | boolean | - | فلتر حسب التحقق |
| `search` | string | - | بحث في الإيميل، الهاتف، الاسم، رقم الترخيص |
| `sort_by` | string | created_at | حقل الترتيب |
| `sort_order` | string | DESC | اتجاه الترتيب |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "xxx-xxx-xxx",
      "email": "doctor@example.com",
      "phone": "+966500000000",
      "status": "pending_verification",
      "is_active": 1,
      "profile_id": 1,
      "license_number": "12345",
      "is_verified": false,
      "approval_status": "pending",
      "full_name": "د. أحمد محمد",
      "specialty": "طب عام"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasMore": true
  }
}
```

---

### 2. Get Pending Doctors | جلب الأطباء المعلقين

```http
GET /api/admin/doctors/pending
```

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `page` | number | 1 |
| `limit` | number | 20 |

---

### 3. Get Doctor Statistics | إحصائيات الأطباء

```http
GET /api/admin/doctors/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_doctors": 150,
    "active_doctors": 100,
    "inactive_doctors": 20,
    "suspended_doctors": 5,
    "pending_verification_doctors": 25,
    "pending_approval": 15,
    "approved_doctors": 120,
    "rejected_doctors": 10,
    "verified_doctors": 110,
    "unverified_doctors": 40,
    "new_doctors_last_week": 8,
    "new_doctors_last_month": 25
  }
}
```

---

### 4. Get Doctor Details | تفاصيل طبيب

```http
GET /api/admin/doctors/:doctorId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "xxx-xxx-xxx",
    "email": "doctor@example.com",
    "status": "active",
    "is_verified": true,
    "approval_status": "approved",
    "verified_by_email": "admin@example.com",
    "translations": {
      "ar": {
        "full_name": "د. أحمد محمد",
        "specialty": "طب عام"
      },
      "en": {
        "full_name": "Dr. Ahmed Mohamed",
        "specialty": "General Medicine"
      }
    }
  }
}
```

---

### 5. Update Doctor Status | تحديث حالة الطبيب

```http
PATCH /api/admin/doctors/:doctorId/status
```

**Required Permission:** System Admin or higher

**Request Body:**
```json
{
  "status": "active",
  "reason": "تم التحقق من جميع الوثائق"
}
```

**Valid Status Values:**
- `active` - نشط
- `inactive` - غير نشط
- `suspended` - معلق
- `pending_verification` - في انتظار التحقق

---

### 6. Verify Doctor Profile | التحقق من ملف الطبيب

```http
PATCH /api/admin/doctors/:doctorId/verify
```

**Required Permission:** System Admin or higher

**Request Body:**
```json
{
  "is_verified": true,
  "reason": "تم التحقق من رخصة الطبيب"
}
```

**Effects:**
- يحدث `is_verified` في `doctor_profiles`
- يحدث `verification_date` إلى الوقت الحالي
- يحدث `verified_by` إلى ID الأدمن الحالي

---

### 7. Update Approval Status | تحديث حالة الموافقة

```http
PATCH /api/admin/doctors/:doctorId/approval
```

**Required Permission:** System Admin or higher

**Request Body:**
```json
{
  "approval_status": "approved",
  "reason": "مستوفي جميع الشروط"
}
```

**Valid Approval Status Values:**
- `pending` - في الانتظار
- `approved` - موافق عليه
- `rejected` - مرفوض
- `suspended` - معلق

---

### 8. Approve Doctor (Combined Action) | الموافقة على الطبيب

```http
POST /api/admin/doctors/:doctorId/approve
```

**Required Permission:** System Admin or higher

**Request Body:**
```json
{
  "reason": "تم التحقق من جميع الوثائق والمؤهلات"
}
```

**Effects (Combined):**
- `doctors.status` → `active`
- `doctor_profiles.is_verified` → `true`
- `doctor_profiles.verification_date` → NOW()
- `doctor_profiles.verified_by` → Admin ID
- `doctor_profiles.approval_status` → `approved`

---

### 9. Reject Doctor | رفض الطبيب

```http
POST /api/admin/doctors/:doctorId/reject
```

**Required Permission:** System Admin or higher

**Request Body (reason required):**
```json
{
  "reason": "الوثائق المقدمة غير صالحة"
}
```

**Effects:**
- `doctors.status` → `inactive`
- `doctor_profiles.approval_status` → `rejected`

---

### 10. Suspend Doctor | تعليق الطبيب

```http
POST /api/admin/doctors/:doctorId/suspend
```

**Required Permission:** System Admin or higher

**Request Body (reason required):**
```json
{
  "reason": "مخالفة سياسات المنصة"
}
```

**Effects:**
- `doctors.status` → `suspended`
- `doctor_profiles.approval_status` → `suspended`

---

### 11. Bulk Update Status | تحديث مجموعة أطباء

```http
POST /api/admin/doctors/bulk/status
```

**Required Permission:** System Admin or higher

**Request Body:**
```json
{
  "doctorIds": [1, 2, 3, 4, 5],
  "status": "active",
  "reason": "تفعيل مجموعة من الأطباء"
}
```

---

## Permission Levels | مستويات الصلاحيات

| Operation | Required Permission |
|-----------|---------------------|
| GET (Read) | Any Admin |
| PATCH/POST (Modify) | System Admin or Super Admin |

### Admin Types:
1. **super_admin** - صلاحيات كاملة
2. **system_admin** - صلاحيات النظام
3. **clinic_admin** - صلاحيات العيادة (قراءة فقط)

---

## Error Responses | استجابات الأخطاء

### 400 Bad Request
```json
{
  "success": false,
  "message_ar": "الحالة غير صحيحة",
  "message_en": "Invalid status"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message_ar": "صلاحيات غير كافية",
  "message_en": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message_ar": "الطبيب غير موجود",
  "message_en": "Doctor not found"
}
```

---

## Workflow | سير العمل

### تسجيل طبيب جديد:
```
1. Doctor registers → status: pending_verification, approval_status: pending
2. Admin reviews → GET /api/admin/doctors/pending
3. Admin approves → POST /api/admin/doctors/:id/approve
4. Doctor becomes active with verified profile
```

### تعليق طبيب:
```
1. Admin identifies issue
2. POST /api/admin/doctors/:id/suspend with reason
3. Doctor status becomes suspended
```

---

## Files | الملفات

- **Controller:** `controllers/AdminDoctorManagementController.js`
- **Routes:** `routes/adminDoctorManagementRoutes.js`
- **Log File:** `admin-doctor-management.log`

---

## Related Documentation | توثيق ذو صلة

- [Authentication System](../01-authentication/)
- [Doctor Profile System](../02-profile-system/)
- [Security System](../06-security-fixes/)

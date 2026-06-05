# Blocked Entities API Documentation
# توثيق API الكيانات المحظورة

## Overview | نظرة عامة

هذا النظام يتيح للأدمن إدارة حظر وإلغاء حظر جميع أنواع المستخدمين في النظام:
- **Users** - المستخدمين العاديين
- **Doctors** - الأطباء
- **Assistants** - المساعدين
- **Admins** - المديرين (فقط super_admin يمكنه حظر المديرين)

This system allows admins to manage blocking and unblocking all types of users:
- **Users** - Regular users
- **Doctors** - Doctors
- **Assistants** - Assistants
- **Admins** - Administrators (only super_admin can block admins)

---

## Base URL

```
/api/admin/blocked-entities
```

---

## Authentication | المصادقة

جميع المسارات تتطلب:
- **JWT Token** في header الـ Authorization
- صلاحيات **Admin** (أي نوع للقراءة، System Admin أو أعلى للتعديل)

```
Authorization: Bearer <admin_jwt_token>
```

---

## Database Schema | هيكل قاعدة البيانات

### جدول `blocked_entities`

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | المعرف الفريد |
| `blocked_user_id` | int | معرف المستخدم المحظور (nullable) |
| `blocked_admin_id` | int | معرف الأدمن المحظور (nullable) |
| `blocked_doctor_id` | int | معرف الطبيب المحظور (nullable) |
| `blocked_assistant_id` | int | معرف المساعد المحظور (nullable) |
| `blocked_by_admin_id` | int | معرف الأدمن الذي قام بالحظر |
| `block_type` | enum | نوع الحظر: `temporary`, `permanent`, `warning` |
| `blocked_until` | timestamp | تاريخ انتهاء الحظر (للحظر المؤقت) |
| `reason` | text | سبب الحظر |
| `is_active` | boolean | هل الحظر نشط |
| `created_at` | timestamp | تاريخ الإنشاء |
| `removed_at` | timestamp | تاريخ إلغاء الحظر |
| `removed_by_admin_id` | int | معرف الأدمن الذي ألغى الحظر |

**Note:** فقط واحد من الحقول (`blocked_user_id`, `blocked_admin_id`, `blocked_doctor_id`, `blocked_assistant_id`) يمكن أن يكون له قيمة في كل سجل.

---

## Block Types | أنواع الحظر

| Type | Description AR | Description EN |
|------|----------------|----------------|
| `temporary` | حظر مؤقت (يتطلب تاريخ انتهاء) | Temporary block (requires end date) |
| `permanent` | حظر دائم | Permanent block |
| `warning` | تحذير (لا يمنع الوصول) | Warning (doesn't prevent access) |

---

## Entity Types | أنواع الكيانات

| Type | Table | Description |
|------|-------|-------------|
| `user` | users | المستخدمين العاديين |
| `doctor` | doctors | الأطباء |
| `assistant` | assistants | المساعدين |
| `admin` | admins | المديرين |

---

## API Endpoints | نقاط النهاية

### 1. Get All Blocked Entities | جلب جميع الكيانات المحظورة

```http
GET /api/admin/blocked-entities
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | رقم الصفحة |
| `limit` | number | 20 | عدد النتائج |
| `entity_type` | string | - | فلتر حسب نوع الكيان |
| `block_type` | string | - | فلتر حسب نوع الحظر |
| `is_active` | boolean | true | فلتر حسب حالة الحظر |
| `search` | string | - | بحث في الإيميل، الهاتف، السبب |
| `sort_by` | string | created_at | حقل الترتيب |
| `sort_order` | string | DESC | اتجاه الترتيب |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "blocked_user_id": 5,
      "blocked_by_admin_id": 1,
      "block_type": "temporary",
      "blocked_until": "2024-01-15T00:00:00.000Z",
      "reason": "مخالفة سياسات الاستخدام",
      "is_active": true,
      "created_at": "2024-01-01T10:00:00.000Z",
      "entity_type": "user",
      "entity_id": 5,
      "entity_email": "user@example.com",
      "blocked_by_email": "admin@example.com"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasMore": true
  }
}
```

---

### 2. Get Block Statistics | إحصائيات الحظر

```http
GET /api/admin/blocked-entities/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_blocks": 100,
      "active_blocks": 45,
      "removed_blocks": 55,
      "blocked_users": 20,
      "blocked_doctors": 15,
      "blocked_assistants": 5,
      "blocked_admins": 5,
      "temporary_blocks": 30,
      "permanent_blocks": 10,
      "warning_blocks": 5,
      "blocks_last_week": 8,
      "blocks_last_month": 25,
      "unblocks_last_week": 5,
      "expiring_soon": 3
    },
    "top_blocking_admins": [
      {
        "id": 1,
        "email": "admin@example.com",
        "admin_type": "super_admin",
        "block_count": 15
      }
    ]
  }
}
```

---

### 3. Check Entity Block Status | التحقق من حالة حظر كيان

```http
GET /api/admin/blocked-entities/check?entity_id=5&entity_type=user
```

**Response (Blocked):**
```json
{
  "success": true,
  "is_blocked": true,
  "block_info": {
    "id": 1,
    "block_type": "temporary",
    "blocked_until": "2024-01-15T00:00:00.000Z",
    "reason": "مخالفة سياسات الاستخدام",
    "blocked_at": "2024-01-01T10:00:00.000Z",
    "blocked_by": "admin@example.com"
  }
}
```

**Response (Not Blocked):**
```json
{
  "success": true,
  "is_blocked": false,
  "block_info": null
}
```

---

### 4. Get Block Details | تفاصيل الحظر

```http
GET /api/admin/blocked-entities/:blockId
```

---

### 5. Get Entity Block History | سجل حظر كيان

```http
GET /api/admin/blocked-entities/history/:entity_type/:entity_id
```

**Response:**
```json
{
  "success": true,
  "entity": {
    "id": 5,
    "uuid": "xxx-xxx-xxx",
    "email": "user@example.com",
    "status": "active"
  },
  "history": [
    {
      "id": 1,
      "block_type": "temporary",
      "reason": "السبب الأول",
      "created_at": "2024-01-01T10:00:00.000Z",
      "removed_at": "2024-01-05T10:00:00.000Z",
      "blocked_by_email": "admin@example.com",
      "removed_by_email": "admin@example.com"
    }
  ],
  "pagination": { ... }
}
```

---

### 6. Block Entity | حظر كيان

```http
POST /api/admin/blocked-entities/block
```

**Required Permission:** System Admin or higher (Super Admin for blocking admins)

**Request Body:**
```json
{
  "entity_id": 5,
  "entity_type": "user",
  "block_type": "temporary",
  "blocked_until": "2024-01-15T00:00:00.000Z",
  "reason": "مخالفة سياسات الاستخدام - تم التحذير مسبقاً"
}
```

**Validation Rules:**
- `entity_id` و `entity_type` مطلوبان
- `reason` مطلوب ويجب أن يكون 10 أحرف على الأقل
- `blocked_until` مطلوب للحظر المؤقت ويجب أن يكون في المستقبل
- لا يمكن للأدمن حظر نفسه
- فقط `super_admin` يمكنه حظر المديرين الآخرين

**Effects:**
- إنشاء سجل حظر جديد
- تحديث حالة الكيان إلى `suspended`
- إلغاء جميع الجلسات النشطة للكيان

**Response:**
```json
{
  "success": true,
  "message_ar": "تم حظر الكيان بنجاح",
  "message_en": "Entity blocked successfully",
  "data": {
    "block_id": 1,
    "entity_id": 5,
    "entity_type": "user",
    "block_type": "temporary",
    "blocked_until": "2024-01-15T00:00:00.000Z",
    "blocked_by": 1
  }
}
```

---

### 7. Unblock Entity | إلغاء حظر كيان

```http
POST /api/admin/blocked-entities/unblock
```

**Required Permission:** System Admin or higher (Super Admin for unblocking admins)

**Request Body:**
```json
{
  "entity_id": 5,
  "entity_type": "user",
  "reason": "تم مراجعة الحالة وإلغاء الحظر"
}
```

**Effects:**
- تحديث سجل الحظر (`is_active = false`, `removed_at`, `removed_by_admin_id`)
- تحديث حالة الكيان إلى `active`

---

### 8. Update Block Record | تحديث سجل الحظر

```http
PATCH /api/admin/blocked-entities/:blockId
```

**Request Body:**
```json
{
  "block_type": "permanent",
  "blocked_until": null,
  "reason": "تم تحويل الحظر إلى دائم بسبب تكرار المخالفات"
}
```

---

### 9. Bulk Block Entities | حظر مجموعة كيانات

```http
POST /api/admin/blocked-entities/bulk/block
```

**Request Body:**
```json
{
  "entities": [
    { "entity_id": 1, "entity_type": "user" },
    { "entity_id": 2, "entity_type": "user" },
    { "entity_id": 3, "entity_type": "doctor" }
  ],
  "block_type": "temporary",
  "blocked_until": "2024-01-15T00:00:00.000Z",
  "reason": "حظر جماعي بسبب نشاط مشبوه"
}
```

**Response:**
```json
{
  "success": true,
  "message_ar": "تم حظر 3 كيان بنجاح",
  "message_en": "3 entities blocked successfully",
  "data": {
    "success": [
      { "entity_id": 1, "entity_type": "user" },
      { "entity_id": 2, "entity_type": "user" },
      { "entity_id": 3, "entity_type": "doctor" }
    ],
    "failed": []
  }
}
```

---

### 10. Bulk Unblock Entities | إلغاء حظر مجموعة كيانات

```http
POST /api/admin/blocked-entities/bulk/unblock
```

**Request Body:**
```json
{
  "entities": [
    { "entity_id": 1, "entity_type": "user" },
    { "entity_id": 2, "entity_type": "user" }
  ],
  "reason": "إلغاء حظر جماعي"
}
```

---

### 11. Auto-Unblock Expired | إلغاء الحظر التلقائي للمنتهية

```http
POST /api/admin/blocked-entities/auto-unblock
```

يمكن استدعاء هذا المسار بواسطة scheduler لإلغاء حظر الكيانات التي انتهت فترة حظرها المؤقت.

**Response:**
```json
{
  "success": true,
  "message_ar": "تم إلغاء حظر 5 كيان منتهي الصلاحية",
  "message_en": "5 expired blocks removed",
  "unblocked_count": 5
}
```

---

## Permission Levels | مستويات الصلاحيات

| Operation | Required Permission |
|-----------|---------------------|
| GET (Read) | Any Admin |
| POST/PATCH (Modify) | System Admin or Super Admin |
| Block/Unblock Admins | Super Admin only |

---

## Error Responses | استجابات الأخطاء

### 400 Bad Request
```json
{
  "success": false,
  "message_ar": "سبب الحظر مطلوب ويجب أن يكون 10 أحرف على الأقل",
  "message_en": "Block reason is required and must be at least 10 characters"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message_ar": "فقط المدير الأعلى يمكنه حظر المديرين الآخرين",
  "message_en": "Only super admin can block other admins"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message_ar": "الكيان غير موجود",
  "message_en": "Entity not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message_ar": "هذا الكيان محظور بالفعل",
  "message_en": "This entity is already blocked",
  "existing_block": {
    "id": 1,
    "block_type": "temporary",
    "blocked_until": "2024-01-15T00:00:00.000Z",
    "created_at": "2024-01-01T10:00:00.000Z"
  }
}
```

---

## Workflow Examples | أمثلة سير العمل

### حظر مستخدم مؤقتاً:
```
1. POST /api/admin/blocked-entities/block
   Body: {
     "entity_id": 5,
     "entity_type": "user",
     "block_type": "temporary",
     "blocked_until": "2024-01-15T00:00:00.000Z",
     "reason": "مخالفة سياسات الاستخدام"
   }
2. المستخدم يتم تسجيل خروجه تلقائياً
3. المستخدم لا يستطيع تسجيل الدخول حتى انتهاء الحظر
```

### تحويل حظر مؤقت إلى دائم:
```
1. GET /api/admin/blocked-entities?entity_type=user&is_active=true
2. PATCH /api/admin/blocked-entities/:blockId
   Body: {
     "block_type": "permanent",
     "blocked_until": null,
     "reason": "تحويل إلى حظر دائم بسبب تكرار المخالفات"
   }
```

### إلغاء حظر مستخدم:
```
1. GET /api/admin/blocked-entities/check?entity_id=5&entity_type=user
2. POST /api/admin/blocked-entities/unblock
   Body: {
     "entity_id": 5,
     "entity_type": "user",
     "reason": "تم مراجعة الحالة"
   }
```

---

## Files | الملفات

- **Controller:** `controllers/BlockedEntitiesController.js`
- **Routes:** `routes/blockedEntitiesRoutes.js`
- **Log File:** `blocked-entities.log`

---

## Related Documentation | توثيق ذو صلة

- [Admin Doctor Management](../22-admin-doctor-management/)
- [Authentication System](../01-authentication/)
- [Security System](../06-security-fixes/)

# Doctor Schedules API Documentation
# توثيق API جداول مواعيد الأطباء

---

## جدول المحتويات | Table of Contents

1. [Doctor APIs (Private)](#doctor-apis-private)
2. [Public APIs](#public-apis)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling)

---

## Doctor APIs (Private)

جميع هذه الـ APIs تتطلب:
- Authentication: Bearer Token
- Authorization: Doctor role only
- Base URL: `/api/doctor-schedules`

---

### 1. Create Schedule
### إنشاء جدول مواعيد جديد

**Endpoint:** `POST /api/doctor-schedules`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
Accept-Language: ar | en
```

**Request Body:**
```json
{
  "clinic_id": 1,  // optional, null for online
  "day_of_week": "saturday",
  "start_time": "09:00:00",
  "end_time": "13:00:00",
  "session_price": 200.00,
  "session_duration": 30,
  "consultation_type": "in_clinic"  // or "online"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الجدول بنجاح",
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
    "created_at": "2024-12-05T07:00:00.000Z",
    "updated_at": "2024-12-05T07:00:00.000Z"
  }
}
```

**Error Responses:**

**400 - Missing Required Fields:**
```json
{
  "success": false,
  "message": "جميع الحقول المطلوبة يجب أن تكون موجودة"
}
```

**400 - Invalid Consultation Type:**
```json
{
  "success": false,
  "message": "نوع الاستشارة يجب أن يكون online أو in_clinic"
}
```

**400 - Schedule Conflict:**
```json
{
  "success": false,
  "message": "يوجد تعارض في المواعيد المحددة"
}
```

**404 - Clinic Not Found:**
```json
{
  "success": false,
  "message": "العيادة غير موجودة أو لا تنتمي لك"
}
```

---

### 2. Get All Doctor Schedules
### جلب جميع جداول المواعيد للطبيب

**Endpoint:** `GET /api/doctor-schedules`

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Query Parameters:**
- `consultation_type` (optional): `online` | `in_clinic`
- `is_active` (optional): `true` | `false`
- `day_of_week` (optional): `saturday` | `sunday` | `monday` | etc.

**Example Request:**
```
GET /api/doctor-schedules?consultation_type=online&is_active=true
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
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
      "created_at": "2024-12-05T07:00:00.000Z",
      "updated_at": "2024-12-05T07:00:00.000Z",
      "clinic_name": "عيادة القاهرة",
      "clinic_address": "شارع التحرير، القاهرة"
    },
    {
      "id": 2,
      "doctor_id": 2,
      "clinic_id": null,
      "day_of_week": "sunday",
      "start_time": "18:00:00",
      "end_time": "22:00:00",
      "session_price": "150.00",
      "session_duration": 30,
      "consultation_type": "online",
      "is_active": 1,
      "created_at": "2024-12-05T07:00:00.000Z",
      "updated_at": "2024-12-05T07:00:00.000Z",
      "clinic_name": null,
      "clinic_address": null
    }
  ]
}
```

---

### 3. Get Schedule by ID
### جلب جدول مواعيد واحد

**Endpoint:** `GET /api/doctor-schedules/:id`

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Success Response (200):**
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
    "created_at": "2024-12-05T07:00:00.000Z",
    "updated_at": "2024-12-05T07:00:00.000Z",
    "clinic_name": "عيادة القاهرة",
    "clinic_address": "شارع التحرير، القاهرة"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "الجدول غير موجود"
}
```

---

### 4. Update Schedule
### تحديث جدول المواعيد

**Endpoint:** `PUT /api/doctor-schedules/:id`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
Accept-Language: ar | en
```

**Request Body (all fields optional):**
```json
{
  "clinic_id": 2,
  "day_of_week": "monday",
  "start_time": "10:00:00",
  "end_time": "14:00:00",
  "session_price": 250.00,
  "session_duration": 45,
  "consultation_type": "in_clinic",
  "is_active": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم تحديث الجدول بنجاح",
  "data": {
    "id": 1,
    "doctor_id": 2,
    "clinic_id": 2,
    "day_of_week": "monday",
    "start_time": "10:00:00",
    "end_time": "14:00:00",
    "session_price": "250.00",
    "session_duration": 45,
    "consultation_type": "in_clinic",
    "is_active": 1,
    "created_at": "2024-12-05T07:00:00.000Z",
    "updated_at": "2024-12-05T08:00:00.000Z",
    "clinic_name": "عيادة الإسكندرية",
    "clinic_address": "شارع الجيش، الإسكندرية"
  }
}
```

**Error Responses:**

**400 - No Fields to Update:**
```json
{
  "success": false,
  "message": "لا توجد حقول للتحديث"
}
```

**400 - Schedule Conflict:**
```json
{
  "success": false,
  "message": "يوجد تعارض في المواعيد المحددة"
}
```

**404 - Schedule Not Found:**
```json
{
  "success": false,
  "message": "الجدول غير موجود"
}
```

---

### 5. Delete Schedule (Soft Delete)
### حذف جدول المواعيد (حذف ناعم)

**Endpoint:** `DELETE /api/doctor-schedules/:id`

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف الجدول بنجاح"
}
```

**Note:** هذا حذف ناعم - يتم تعيين `is_active = 0` فقط

---

### 6. Permanently Delete Schedule
### حذف جدول المواعيد نهائياً

**Endpoint:** `DELETE /api/doctor-schedules/:id/permanent`

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "تم حذف الجدول نهائياً"
}
```

**Warning:** ⚠️ هذا حذف نهائي - لا يمكن التراجع عنه

---

## Public APIs

هذه الـ APIs لا تتطلب مصادقة - متاحة للجميع

---

### Get Public Doctor Schedules
### جلب جداول مواعيد طبيب معين (عام)

**Endpoint:** `GET /api/public/doctor-schedules/:doctorId`

**Headers:**
```
Accept-Language: ar | en
```

**Query Parameters:**
- `consultation_type` (optional): `online` | `in_clinic`
- `day_of_week` (optional): `saturday` | `sunday` | `monday` | etc.

**Example Request:**
```
GET /api/public/doctor-schedules/2?consultation_type=online
```

**Success Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 2,
      "day_of_week": "sunday",
      "start_time": "18:00:00",
      "end_time": "22:00:00",
      "session_price": "150.00",
      "session_duration": 30,
      "consultation_type": "online",
      "clinic_id": null,
      "clinic_name": null,
      "clinic_address": null,
      "city_name_ar": null,
      "city_name_en": null
    },
    {
      "id": 3,
      "day_of_week": "tuesday",
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

**Error Responses:**

**404 - Doctor Not Found:**
```json
{
  "success": false,
  "message": "الطبيب غير موجود"
}
```

**403 - Doctor Not Available:**
```json
{
  "success": false,
  "message": "الطبيب غير متاح حالياً"
}
```

---

## Response Formats

### Success Response Structure
```json
{
  "success": true,
  "message": "رسالة النجاح",  // optional
  "data": {},  // or []
  "count": 10  // for list responses
}
```

### Error Response Structure
```json
{
  "success": false,
  "message": "رسالة الخطأ",
  "error": "تفاصيل الخطأ التقنية"  // في بيئة التطوير فقط
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description (AR) | Description (EN) |
|------|---------|------------------|------------------|
| 200 | OK | نجح الطلب | Request succeeded |
| 201 | Created | تم الإنشاء بنجاح | Resource created |
| 400 | Bad Request | بيانات غير صحيحة | Invalid data |
| 401 | Unauthorized | غير مصرح | Not authenticated |
| 403 | Forbidden | ممنوع | Not authorized |
| 404 | Not Found | غير موجود | Resource not found |
| 500 | Server Error | خطأ في الخادم | Server error |

---

## Validation Rules

### Required Fields for Creation
- `day_of_week` ✅
- `start_time` ✅
- `end_time` ✅
- `session_price` ✅
- `session_duration` ✅
- `consultation_type` ✅

### Conditional Requirements
- If `consultation_type = "in_clinic"` → `clinic_id` is required
- If `consultation_type = "online"` → `clinic_id` must be null

### Business Rules
1. `end_time` must be after `start_time`
2. No overlapping schedules for same doctor, day, and clinic
3. Clinic must belong to the doctor
4. Doctor must be active and approved

---

## Rate Limiting

- **Doctor APIs:** 100 requests per minute
- **Public APIs:** 60 requests per minute

---

## Best Practices

### For Doctors
1. Create schedules in advance
2. Set realistic session durations
3. Use soft delete to preserve history
4. Update prices seasonally

### For Frontend Developers
1. Always handle error responses
2. Show loading states
3. Validate data before sending
4. Cache public schedules
5. Use query parameters for filtering

---

**Last Updated:** December 5, 2024  
**Version:** 1.0.0

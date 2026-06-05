# Admin User Management System - API Documentation

## Overview

The Admin User Management System provides comprehensive tools for administrators to manage user accounts in the BASHRA.AI platform. This system enables viewing, filtering, searching, and managing user statuses with complete audit logging.

## Base URL

```
http://localhost:3006/api/admin/users
```

## Authentication

All endpoints require JWT authentication with admin privileges:

```
Authorization: Bearer <jwt_token>
```

### Authorization Levels
- **Admin**: Can view all user information
- **Super Admin**: Can view and modify user statuses

## API Endpoints

### 1. Get All Users

**Endpoint**: `GET /api/admin/users`

**Description**: Retrieve paginated list of all users with optional filters

**Authorization**: Admin or Super Admin

**Query Parameters**:
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 20, max: 100) - Items per page
- `status` (string, optional) - Filter by status (active, inactive, suspended, pending_verification)
- `verified` (boolean, optional) - Filter by email verification status
- `language` (string, optional, default: ar) - Response language (ar/en)

**Example Request**:
```bash
GET /api/admin/users?page=1&limit=20&status=active
Authorization: Bearer <token>
Accept-Language: ar
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم استرجاع المستخدمين بنجاح",
  "data": {
    "users": [
      {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user@example.com",
        "phone": "+966501234567",
        "status": "active",
        "is_active": true,
        "email_verified": true,
        "phone_verified": true,
        "id_verified": false,
        "last_login_at": "2026-02-20T10:30:00Z",
        "last_activity_at": "2026-02-20T11:00:00Z",
        "created_at": "2026-01-15T08:00:00Z",
        "profile": {
          "full_name": "أحمد محمد",
          "date_of_birth": "1990-05-15",
          "gender": "male",
          "nationality": "Saudi Arabia",
          "profile_picture_url": "https://...",
          "language_preference": "ar"
        }
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_items": 200,
      "items_per_page": 20,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

### 2. Get User By ID

**Endpoint**: `GET /api/admin/users/:id`

**Description**: Retrieve complete information for a single user

**Authorization**: Admin or Super Admin

**Path Parameters**:
- `id` (number, required) - User ID

**Query Parameters**:
- `language` (string, optional, default: ar) - Response language

**Example Request**:
```bash
GET /api/admin/users/1
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم استرجاع بيانات المستخدم بنجاح",
  "data": {
    "user": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "phone": "+966501234567",
      "status": "active",
      "is_active": true,
      "verification": {
        "email_verified": true,
        "email_verified_at": "2026-01-15T09:00:00Z",
        "phone_verified": true,
        "phone_verified_at": "2026-01-15T09:30:00Z",
        "id_verified": false
      },
      "activity": {
        "last_login_at": "2026-02-20T10:30:00Z",
        "last_activity_at": "2026-02-20T11:00:00Z",
        "login_attempts": 0,
        "locked_until": null
      },
      "timestamps": {
        "created_at": "2026-01-15T08:00:00Z",
        "updated_at": "2026-02-20T11:00:00Z"
      }
    },
    "profile": {
      "full_name": "أحمد محمد",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "nationality": "Saudi Arabia",
      "profile_picture_url": "https://...",
      "emergency_contact": {
        "name": "فاطمة أحمد",
        "phone": "+966501234568",
        "relationship": "زوجة"
      },
      "preferences": {
        "timezone": "Asia/Riyadh",
        "language": "ar"
      }
    },
    "has_patient_profile": true
  }
}
```

---

### 3. Get Users By Status

**Endpoint**: `GET /api/admin/users/status/:status`

**Description**: Retrieve users filtered by specific status

**Authorization**: Admin or Super Admin

**Path Parameters**:
- `status` (string, required) - One of: active, inactive, suspended, pending_verification

**Query Parameters**:
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page
- `language` (string, optional) - Response language

**Example Request**:
```bash
GET /api/admin/users/status/suspended?page=1&limit=20
Authorization: Bearer <token>
```

**Response**: Same format as "Get All Users"

---

### 4. Get User Medical Profile

**Endpoint**: `GET /api/admin/users/:id/medical`

**Description**: Retrieve patient medical profile for review

**Authorization**: Admin or Super Admin

**Path Parameters**:
- `id` (number, required) - User ID

**Query Parameters**:
- `language` (string, optional) - Response language

**Example Request**:
```bash
GET /api/admin/users/1/medical
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم استرجاع الملف الطبي بنجاح",
  "data": {
    "user_info": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "أحمد محمد",
      "email": "user@example.com",
      "phone": "+966501234567"
    },
    "medical_profile": {
      "physical_measurements": {
        "blood_type": "A+",
        "height": 175.5,
        "weight": 75.0
      },
      "lifestyle": {
        "smoking_status": "never",
        "alcohol_consumption": "never",
        "exercise_frequency": "regularly"
      },
      "medical_information": {
        "medical_history": "تاريخ طبي مفصل...",
        "current_medications": "قائمة الأدوية الحالية...",
        "allergies": "حساسية من البنسلين",
        "chronic_conditions": "لا يوجد",
        "family_medical_history": "تاريخ عائلي..."
      },
      "insurance": {
        "provider": "شركة التأمين الطبي",
        "policy_number": "INS-123456"
      },
      "preferred_doctor_id": 5,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-02-10T14:30:00Z"
    }
  }
}
```

---

### 5. Search Users

**Endpoint**: `GET /api/admin/users/search`

**Description**: Search users by multiple criteria

**Authorization**: Admin or Super Admin

**Query Parameters**:
- `query` (string, optional) - Search term for name, email, or phone
- `email` (string, optional) - Email search
- `phone` (string, optional) - Phone search
- `uuid` (string, optional) - UUID search (exact match)
- `status` (string, optional) - Status filter
- `verified` (boolean, optional) - Verification filter
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page
- `language` (string, optional) - Response language

**Example Request**:
```bash
GET /api/admin/users/search?query=أحمد&status=active
Authorization: Bearer <token>
```

**Response**: Same format as "Get All Users"

---

### 6. Update User Status

**Endpoint**: `PUT /api/admin/users/:id/status`

**Description**: Update user account status (Super Admin only)

**Authorization**: Super Admin only

**Path Parameters**:
- `id` (number, required) - User ID

**Request Body**:
```json
{
  "status": "suspended",
  "reason": "Violation of terms of service",
  "language": "ar"
}
```

**Validation Rules**:
- `status` (required): Must be one of: active, inactive, suspended, pending_verification
- `reason` (required): 10-500 characters

**Example Request**:
```bash
PUT /api/admin/users/1/status
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Violation of terms of service"
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم تحديث حالة المستخدم بنجاح",
  "data": {
    "user_id": 1,
    "old_status": "active",
    "new_status": "suspended",
    "updated_by": {
      "admin_id": 10,
      "admin_email": "admin@bashra.ai"
    },
    "reason": "Violation of terms of service",
    "updated_at": "2026-02-21T10:00:00Z"
  }
}
```

---

### 7. Get User Statistics

**Endpoint**: `GET /api/admin/users/stats`

**Description**: Get comprehensive user statistics

**Authorization**: Admin or Super Admin

**Query Parameters**:
- `language` (string, optional) - Response language

**Example Request**:
```bash
GET /api/admin/users/stats
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم استرجاع الإحصائيات بنجاح",
  "data": {
    "total_users": 1250,
    "by_status": {
      "active": 980,
      "inactive": 120,
      "suspended": 50,
      "pending_verification": 100
    },
    "verification": {
      "email_verified": 1100,
      "phone_verified": 950,
      "id_verified": 200,
      "fully_verified": 180
    },
    "activity": {
      "last_7_days": 650,
      "last_30_days": 900,
      "never_logged_in": 150
    },
    "registrations": {
      "today": 15,
      "this_week": 85,
      "this_month": 320
    },
    "with_patient_profile": 800,
    "generated_at": "2026-02-21T10:00:00Z"
  }
}
```

---

### 8. Get User Admin Logs

**Endpoint**: `GET /api/admin/users/:id/logs`

**Description**: Get admin action logs for a specific user

**Authorization**: Admin or Super Admin

**Path Parameters**:
- `id` (number, required) - User ID

**Query Parameters**:
- `page` (number, optional) - Page number
- `limit` (number, optional) - Items per page
- `action` (string, optional) - Filter by action type
- `language` (string, optional) - Response language

**Example Request**:
```bash
GET /api/admin/users/1/logs?page=1&limit=20
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "message": "تم استرجاع سجلات الإدارة بنجاح",
  "data": {
    "user_id": 1,
    "logs": [
      {
        "id": 150,
        "admin": {
          "id": 10,
          "email": "admin@bashra.ai"
        },
        "action": "USER_STATUS_CHANGE",
        "description": "Changed user status from active to suspended",
        "old_values": {
          "status": "active",
          "is_active": true
        },
        "new_values": {
          "status": "suspended",
          "is_active": false,
          "reason": "Violation of terms"
        },
        "ip_address": "192.168.1.100",
        "severity": "high",
        "created_at": "2026-02-21T10:00:00Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid user ID",
  "message_ar": "معرف المستخدم غير صالح"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "message_ar": "غير مصرح"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "message_ar": "صلاحيات غير كافية"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found",
  "message_ar": "المستخدم غير موجود"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve users",
  "message_ar": "فشل في استرجاع المستخدمين"
}
```

## Status Values

| Status | Description (EN) | Description (AR) | is_active |
|--------|------------------|------------------|-----------|
| active | Account is active | الحساب نشط | true |
| inactive | Account is inactive | الحساب غير نشط | false |
| suspended | Account is suspended | الحساب موقوف | false |
| pending_verification | Awaiting verification | في انتظار التحقق | false |

## Audit Logging

All status changes are automatically logged in the `admin_logs` table with:
- Admin who made the change
- Old and new values (JSON)
- Reason for change
- IP address and user agent
- Severity level
- Timestamp

## Rate Limiting

Status update operations are rate-limited to prevent abuse. Contact system administrator for rate limit details.

## Multi-Language Support

All endpoints support Arabic (ar) and English (en) responses. Set the `Accept-Language` header or use the `language` query parameter.

## Testing

See [TESTING-GUIDE.md](./TESTING-GUIDE.md) for testing instructions and Postman collection.

---

**Version**: 1.0  
**Last Updated**: 2026-02-21  
**Maintained By**: BASHRA.AI Development Team

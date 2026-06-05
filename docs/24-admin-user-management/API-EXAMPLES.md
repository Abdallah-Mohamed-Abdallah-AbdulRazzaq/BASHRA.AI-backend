# Admin User Management - API Examples

This document provides detailed examples for all API endpoints with cURL commands and expected responses.

## Table of Contents
1. [Authentication Setup](#authentication-setup)
2. [Get All Users](#1-get-all-users)
3. [Get User By ID](#2-get-user-by-id)
4. [Get Users By Status](#3-get-users-by-status)
5. [Get User Medical Profile](#4-get-user-medical-profile)
6. [Search Users](#5-search-users)
7. [Update User Status](#6-update-user-status)
8. [Get User Statistics](#7-get-user-statistics)
9. [Get User Admin Logs](#8-get-user-admin-logs)
10. [Error Examples](#error-examples)

---

## Authentication Setup

All requests require a valid JWT token. First, authenticate as an admin:

```bash
# Login as Admin
curl -X POST http://localhost:3006/api/auth-admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bashra.ai",
    "password": "your_password"
  }'
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 10,
    "email": "admin@bashra.ai",
    "adminType": "super_admin"
  }
}
```

Save the token for subsequent requests:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 1. Get All Users

### Example 1.1: Get First Page (Default)

```bash
curl -X GET "http://localhost:3006/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: ar"
```

**Response**:
```json
{
  "success": true,
  "message": "تم استرجاع المستخدمين بنجاح",
  "data": {
    "users": [
      {
        "id": 1,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "email": "user1@example.com",
        "phone": "+966501234567",
        "status": "active",
        "is_active": true,
        "email_verified": true,
        "phone_verified": true,
        "id_verified": false,
        "last_login_at": "2026-02-20T10:30:00.000Z",
        "last_activity_at": "2026-02-20T11:00:00.000Z",
        "created_at": "2026-01-15T08:00:00.000Z",
        "profile": {
          "full_name": "أحمد محمد علي",
          "date_of_birth": "1990-05-15",
          "gender": "male",
          "nationality": "Saudi Arabia",
          "profile_picture_url": "https://storage.bashra.ai/profiles/user1.jpg",
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

### Example 1.2: Get Specific Page with Custom Limit

```bash
curl -X GET "http://localhost:3006/api/admin/users?page=2&limit=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: en"
```

### Example 1.3: Filter by Status

```bash
curl -X GET "http://localhost:3006/api/admin/users?status=active&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 1.4: Filter by Verification Status

```bash
curl -X GET "http://localhost:3006/api/admin/users?verified=true" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. Get User By ID

### Example 2.1: Get Complete User Details (Arabic)

```bash
curl -X GET "http://localhost:3006/api/admin/users/1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: ar"
```

**Response**:
```json
{
  "success": true,
  "message": "تم استرجاع بيانات المستخدم بنجاح",
  "data": {
    "user": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user1@example.com",
      "phone": "+966501234567",
      "status": "active",
      "is_active": true,
      "verification": {
        "email_verified": true,
        "email_verified_at": "2026-01-15T09:00:00.000Z",
        "phone_verified": true,
        "phone_verified_at": "2026-01-15T09:30:00.000Z",
        "id_verified": false
      },
      "activity": {
        "last_login_at": "2026-02-20T10:30:00.000Z",
        "last_activity_at": "2026-02-20T11:00:00.000Z",
        "login_attempts": 0,
        "locked_until": null
      },
      "timestamps": {
        "created_at": "2026-01-15T08:00:00.000Z",
        "updated_at": "2026-02-20T11:00:00.000Z"
      }
    },
    "profile": {
      "full_name": "أحمد محمد علي",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "nationality": "Saudi Arabia",
      "profile_picture_url": "https://storage.bashra.ai/profiles/user1.jpg",
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

### Example 2.2: Get User Details (English)

```bash
curl -X GET "http://localhost:3006/api/admin/users/1?language=en" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: en"
```

**Response**:
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user1@example.com",
      "phone": "+966501234567",
      "status": "active",
      "is_active": true,
      "verification": {
        "email_verified": true,
        "email_verified_at": "2026-01-15T09:00:00.000Z",
        "phone_verified": true,
        "phone_verified_at": "2026-01-15T09:30:00.000Z",
        "id_verified": false
      },
      "activity": {
        "last_login_at": "2026-02-20T10:30:00.000Z",
        "last_activity_at": "2026-02-20T11:00:00.000Z",
        "login_attempts": 0,
        "locked_until": null
      },
      "timestamps": {
        "created_at": "2026-01-15T08:00:00.000Z",
        "updated_at": "2026-02-20T11:00:00.000Z"
      }
    },
    "profile": {
      "full_name": "Ahmed Mohammed Ali",
      "date_of_birth": "1990-05-15",
      "gender": "male",
      "nationality": "Saudi Arabia",
      "profile_picture_url": "https://storage.bashra.ai/profiles/user1.jpg",
      "emergency_contact": {
        "name": "Fatima Ahmed",
        "phone": "+966501234568",
        "relationship": "Wife"
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

## 3. Get Users By Status

### Example 3.1: Get Active Users

```bash
curl -X GET "http://localhost:3006/api/admin/users/status/active?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3.2: Get Suspended Users

```bash
curl -X GET "http://localhost:3006/api/admin/users/status/suspended" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3.3: Get Pending Verification Users

```bash
curl -X GET "http://localhost:3006/api/admin/users/status/pending_verification" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 3.4: Get Inactive Users

```bash
curl -X GET "http://localhost:3006/api/admin/users/status/inactive" \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: Same format as "Get All Users" but filtered by status

---

## 4. Get User Medical Profile

### Example 4.1: Get Medical Profile (Arabic)

```bash
curl -X GET "http://localhost:3006/api/admin/users/1/medical" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: ar"
```

**Response**:
```json
{
  "success": true,
  "message": "تم استرجاع الملف الطبي بنجاح",
  "data": {
    "user_info": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "أحمد محمد علي",
      "email": "user1@example.com",
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
        "medical_history": "لا يوجد تاريخ طبي سابق. صحة جيدة بشكل عام.",
        "current_medications": "لا يوجد أدوية حالية",
        "allergies": "حساسية من البنسلين والمكسرات",
        "chronic_conditions": "لا يوجد أمراض مزمنة",
        "family_medical_history": "والده يعاني من ضغط الدم. والدته تعاني من السكري النوع الثاني."
      },
      "insurance": {
        "provider": "شركة التأمين الطبي السعودية",
        "policy_number": "INS-2026-123456"
      },
      "preferred_doctor_id": 5,
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-02-10T14:30:00.000Z"
    }
  }
}
```

### Example 4.2: Get Medical Profile (English)

```bash
curl -X GET "http://localhost:3006/api/admin/users/1/medical?language=en" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: en"
```

**Response**:
```json
{
  "success": true,
  "message": "Medical profile retrieved successfully",
  "data": {
    "user_info": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Ahmed Mohammed Ali",
      "email": "user1@example.com",
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
        "medical_history": "No previous medical history. Generally good health.",
        "current_medications": "No current medications",
        "allergies": "Allergic to penicillin and nuts",
        "chronic_conditions": "No chronic conditions",
        "family_medical_history": "Father has hypertension. Mother has type 2 diabetes."
      },
      "insurance": {
        "provider": "Saudi Medical Insurance Company",
        "policy_number": "INS-2026-123456"
      },
      "preferred_doctor_id": 5,
      "created_at": "2026-01-15T10:00:00.000Z",
      "updated_at": "2026-02-10T14:30:00.000Z"
    }
  }
}
```

---

## 5. Search Users

### Example 5.1: Search by Name (Arabic)

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?query=أحمد" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.2: Search by Name (English)

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?query=Ahmed" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.3: Search by Email

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?email=user1@example.com" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.4: Search by Phone

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?phone=966501234567" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.5: Search by UUID

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?uuid=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.6: Combined Search (Name + Status)

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?query=أحمد&status=active" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 5.7: Combined Search (Email + Verified)

```bash
curl -X GET "http://localhost:3006/api/admin/users/search?email=example.com&verified=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: Same format as "Get All Users" but filtered by search criteria

---

## 6. Update User Status

### Example 6.1: Suspend User

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "status": "suspended",
    "reason": "انتهاك شروط الاستخدام - نشر محتوى غير لائق"
  }'
```

**Response**:
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
    "reason": "انتهاك شروط الاستخدام - نشر محتوى غير لائق",
    "updated_at": "2026-02-21T10:00:00.000Z"
  }
}
```

### Example 6.2: Activate User

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "reason": "User appeal approved after review"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "user_id": 1,
    "old_status": "suspended",
    "new_status": "active",
    "updated_by": {
      "admin_id": 10,
      "admin_email": "admin@bashra.ai"
    },
    "reason": "User appeal approved after review",
    "updated_at": "2026-02-21T10:15:00.000Z"
  }
}
```

### Example 6.3: Set to Inactive

```bash
curl -X PUT "http://localhost:3006/api/admin/users/2/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "inactive",
    "reason": "User requested account deactivation"
  }'
```

### Example 6.4: Set to Pending Verification

```bash
curl -X PUT "http://localhost:3006/api/admin/users/3/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending_verification",
    "reason": "Additional verification required for medical license"
  }'
```

---

## 7. Get User Statistics

### Example 7.1: Get All Statistics (Arabic)

```bash
curl -X GET "http://localhost:3006/api/admin/users/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: ar"
```

**Response**:
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
    "generated_at": "2026-02-21T10:00:00.000Z"
  }
}
```

### Example 7.2: Get Statistics (English)

```bash
curl -X GET "http://localhost:3006/api/admin/users/stats?language=en" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: en"
```

**Response**:
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
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
    "generated_at": "2026-02-21T10:00:00.000Z"
  }
}
```

---

## 8. Get User Admin Logs

### Example 8.1: Get All Logs for User

```bash
curl -X GET "http://localhost:3006/api/admin/users/1/logs?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response**:
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
          "reason": "انتهاك شروط الاستخدام"
        },
        "ip_address": "192.168.1.100",
        "severity": "high",
        "created_at": "2026-02-21T10:00:00.000Z"
      },
      {
        "id": 145,
        "admin": {
          "id": 10,
          "email": "admin@bashra.ai"
        },
        "action": "USER_STATUS_CHANGE",
        "description": "Changed user status from pending_verification to active",
        "old_values": {
          "status": "pending_verification",
          "is_active": false
        },
        "new_values": {
          "status": "active",
          "is_active": true,
          "reason": "Verification completed successfully"
        },
        "ip_address": "192.168.1.100",
        "severity": "low",
        "created_at": "2026-01-16T09:00:00.000Z"
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

### Example 8.2: Filter Logs by Action

```bash
curl -X GET "http://localhost:3006/api/admin/users/1/logs?action=USER_STATUS_CHANGE" \
  -H "Authorization: Bearer $TOKEN"
```

### Example 8.3: Get Specific Page of Logs

```bash
curl -X GET "http://localhost:3006/api/admin/users/1/logs?page=2&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Examples

### Error 1: Invalid User ID

```bash
curl -X GET "http://localhost:3006/api/admin/users/abc" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (400):
```json
{
  "success": false,
  "message": "Invalid user ID",
  "message_ar": "معرف المستخدم غير صالح"
}
```

### Error 2: User Not Found

```bash
curl -X GET "http://localhost:3006/api/admin/users/99999" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (404):
```json
{
  "success": false,
  "message": "User not found",
  "message_ar": "المستخدم غير موجود"
}
```

### Error 3: No JWT Token

```bash
curl -X GET "http://localhost:3006/api/admin/users"
```

**Response** (401):
```json
{
  "success": false,
  "message": "Unauthorized",
  "message_ar": "غير مصرح"
}
```

### Error 4: Invalid Status Value

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "invalid_status",
    "reason": "Test reason"
  }'
```

**Response** (400):
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: active, inactive, suspended, pending_verification",
  "message_ar": "حالة غير صالحة. يجب أن تكون واحدة من: active, inactive, suspended, pending_verification"
}
```

### Error 5: Reason Too Short

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "reason": "Short"
  }'
```

**Response** (400):
```json
{
  "success": false,
  "message": "Validation error",
  "message_ar": "خطأ في التحقق من البيانات",
  "errors": [
    {
      "msg": "Reason must be between 10 and 500 characters",
      "param": "reason",
      "location": "body"
    }
  ]
}
```

### Error 6: Same Status Update

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "reason": "Trying to set same status"
  }'
```

**Response** (400):
```json
{
  "success": false,
  "message": "New status must be different from current status",
  "message_ar": "يجب أن تكون الحالة الجديدة مختلفة عن الحالة الحالية"
}
```

### Error 7: Insufficient Permissions (Regular Admin trying to update status)

```bash
curl -X PUT "http://localhost:3006/api/admin/users/1/status" \
  -H "Authorization: Bearer $REGULAR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "reason": "Test suspension"
  }'
```

**Response** (403):
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "message_ar": "صلاحيات غير كافية"
}
```

### Error 8: Medical Profile Not Found

```bash
curl -X GET "http://localhost:3006/api/admin/users/5/medical" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (404):
```json
{
  "success": false,
  "message": "Medical profile not found for this user",
  "message_ar": "الملف الطبي غير موجود لهذا المستخدم"
}
```

---

## Testing Workflow

### 1. Setup
```bash
# Set base URL
export BASE_URL="http://localhost:3006/api"

# Login and get token
export TOKEN=$(curl -s -X POST $BASE_URL/auth-admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bashra.ai","password":"your_password"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
```

### 2. Test All Endpoints
```bash
# Get all users
curl -X GET "$BASE_URL/admin/users" -H "Authorization: Bearer $TOKEN"

# Get user by ID
curl -X GET "$BASE_URL/admin/users/1" -H "Authorization: Bearer $TOKEN"

# Get users by status
curl -X GET "$BASE_URL/admin/users/status/active" -H "Authorization: Bearer $TOKEN"

# Get medical profile
curl -X GET "$BASE_URL/admin/users/1/medical" -H "Authorization: Bearer $TOKEN"

# Search users
curl -X GET "$BASE_URL/admin/users/search?query=أحمد" -H "Authorization: Bearer $TOKEN"

# Get statistics
curl -X GET "$BASE_URL/admin/users/stats" -H "Authorization: Bearer $TOKEN"

# Get logs
curl -X GET "$BASE_URL/admin/users/1/logs" -H "Authorization: Bearer $TOKEN"

# Update status (Super Admin only)
curl -X PUT "$BASE_URL/admin/users/1/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended","reason":"Test suspension for API testing"}'
```

---

## Notes

1. **Language Support**: All endpoints support Arabic (ar) and English (en). Use `Accept-Language` header or `language` query parameter.

2. **Pagination**: All list endpoints support pagination with `page` and `limit` parameters.

3. **Authorization**: 
   - GET endpoints: Admin or Super Admin
   - PUT endpoints: Super Admin only

4. **Audit Logging**: All status changes are automatically logged in the `admin_logs` table.

5. **Error Handling**: All errors return appropriate HTTP status codes with bilingual messages.

---

**Version**: 1.0  
**Last Updated**: 2026-02-21  
**For**: BASHRA.AI Admin User Management System

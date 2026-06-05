# 07 - Admin AI Usage APIs

This document describes the Admin APIs used to manage AI usage policies, monitor user usage, and review AI provider usage.

These APIs are used by the admin dashboard.

---

## Base URL

```http
http://localhost:3006/api/admin/ai-usage
```

---

## Authentication

Admin APIs require an admin JWT.

```http
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

---

## Authorization Levels

The module follows the same admin permission style as the rest of the project.

| Operation | Required role |
|---|---|
| View overview | `authorizeAdmin` |
| View user usage | `authorizeAdmin` |
| View policies | `authorizeAdmin` |
| Create policy | `authorizeSuperAdmin` |
| Update policy | `authorizeSuperAdmin` |
| Activate/deactivate policy | `authorizeSuperAdmin` |

---

## Policy Types

`ai_usage_policies.scope_type` supports:

```text
global
user
package
```

### Global policy

Default limits used when no more specific policy applies.

### User policy

Applies to a specific user. It has higher priority than global policy.

### Package policy

Prepared for future package/subscription integration.

---

## Policy Selection

The user usage endpoint and AI usage service should select the most specific active policy:

1. active user policy
2. active package policy if implemented
3. active global policy

Lower `priority` value means higher priority.

Example:

```text
priority = 5  wins over  priority = 100
```

---

# 1. Get AI Usage Overview

Get high-level usage metrics for the admin dashboard.

```http
GET /api/admin/ai-usage/overview
```

## Auth

Admin token required.

## Query parameters

| Param | Type | Required | Example |
|---|---:|---:|---|
| `period_key` | string | no | `2026-06` |

## Example

```http
GET /api/admin/ai-usage/overview?period_key=2026-06
```

## Success response

```json
{
  "success": true,
  "message": "تم جلب نظرة عامة على استخدام الذكاء الاصطناعي بنجاح",
  "data": {
    "period_key": "2026-06",
    "counters": {
      "active_users": 1,
      "total_requests": "8",
      "chat_messages_count": "4",
      "image_analyses_count": "2",
      "document_analyses_count": "1",
      "tokens_used": "26443"
    },
    "provider_summary": [
      {
        "provider": "openai",
        "model": "gpt-4.1-mini",
        "request_type": "chat",
        "status": "success",
        "requests_count": 3,
        "total_tokens": "3335",
        "avg_latency_ms": "9017.33"
      }
    ],
    "policies_summary": [
      {
        "scope_type": "global",
        "is_active": 1,
        "count": 1
      }
    ]
  }
}
```

## Dashboard usage

Use this for dashboard cards:

- active AI users
- total AI requests this month
- chat/image/document counts
- total tokens used
- provider success/failure counts
- average latency by request type

---

# 2. Get User AI Usage

Get detailed AI usage for a specific user.

```http
GET /api/admin/ai-usage/users/:userId
```

## Auth

Admin token required.

## Example

```http
GET /api/admin/ai-usage/users/1
```

## Success response

```json
{
  "success": true,
  "message": "تم جلب استخدام المستخدم للذكاء الاصطناعي بنجاح",
  "data": {
    "user": {
      "id": 1,
      "uuid": "ab5c7031-396b-4383-89b9-1d630fe39e47",
      "email": "safnks0@gmail.com",
      "phone": "+20 10 03226502",
      "status": "pending_verification",
      "is_active": true,
      "full_name": "Abdallah Mohamed Abdallah",
      "profile_picture_url": null
    },
    "active_policies": [],
    "counters": [],
    "recent_events": []
  }
}
```

## Returned sections

### `user`

Basic user identity.

### `active_policies`

All active global/user policies relevant to this user.

### `counters`

Monthly/daily usage counters from `ai_usage_counters`.

### `recent_events`

Last usage events from `ai_usage_events`, joined with AI session/result UUIDs.

## Common errors

| Status | Reason |
|---:|---|
| 404 | user not found |
| 401 | missing/invalid admin token |
| 403 | non-admin token |

---

# 3. Get AI Usage Policies

List AI usage policies.

```http
GET /api/admin/ai-usage/policies
```

## Auth

Admin token required.

## Query parameters

| Param | Type | Required | Notes |
|---|---:|---:|---|
| `page` | number | no | Default 1. |
| `limit` | number | no | Default 20, max 100. |
| `scope_type` | enum | no | `global`, `user`, `package`. |
| `is_active` | boolean | no | true/false. |

## Example

```http
GET /api/admin/ai-usage/policies?page=1&limit=20&scope_type=user&is_active=true
```

## Success response

```json
{
  "success": true,
  "message": "تم جلب سياسات استخدام الذكاء الاصطناعي بنجاح",
  "data": {
    "policies": [
      {
        "id": 2,
        "policy_name": "VIP User AI Usage",
        "scope_type": "user",
        "user_id": 1,
        "package_id": null,
        "limits": {
          "max_total_requests_per_month": 120,
          "max_chat_messages_per_month": 80,
          "max_image_analyses_per_month": 40,
          "max_document_analyses_per_month": 15,
          "max_files_per_session": 10,
          "max_tokens_per_request": 8000
        },
        "is_active": true,
        "priority": 5,
        "created_by_admin_id": 2,
        "updated_by_admin_id": 2
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 1,
      "items_per_page": 20,
      "has_next": false,
      "has_previous": false
    }
  }
}
```

---

# 4. Get AI Usage Policy By ID

Get one policy by ID.

```http
GET /api/admin/ai-usage/policies/:id
```

## Auth

Admin token required.

## Example

```http
GET /api/admin/ai-usage/policies/2
```

## Common errors

| Status | Reason |
|---:|---|
| 404 | policy not found |

---

# 5. Create AI Usage Policy

Create a new AI usage policy.

```http
POST /api/admin/ai-usage/policies
```

## Auth

Super admin token required.

## Body - User policy example

```json
{
  "policy_name": "VIP User AI Usage",
  "scope_type": "user",
  "user_id": 1,
  "max_total_requests_per_month": 100,
  "max_chat_messages_per_month": 80,
  "max_image_analyses_per_month": 30,
  "max_document_analyses_per_month": 15,
  "max_files_per_session": 10,
  "max_tokens_per_request": 8000,
  "is_active": true,
  "priority": 10
}
```

## Body - Global policy example

```json
{
  "policy_name": "Default Free AI Usage",
  "scope_type": "global",
  "max_total_requests_per_month": 30,
  "max_chat_messages_per_month": 30,
  "max_image_analyses_per_month": 10,
  "max_document_analyses_per_month": 5,
  "max_files_per_session": 5,
  "max_tokens_per_request": 4000,
  "is_active": true,
  "priority": 100
}
```

## Body fields

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `policy_name` | string | yes | 3-150 chars. |
| `scope_type` | enum | yes | `global`, `user`, `package`. |
| `user_id` | int | when scope=user | User ID. |
| `package_id` | int | when scope=package | Package ID. |
| `max_total_requests_per_month` | int | no | Default 30. |
| `max_chat_messages_per_month` | int | no | Default 30. |
| `max_image_analyses_per_month` | int | no | Default 10. |
| `max_document_analyses_per_month` | int | no | Default 5. |
| `max_files_per_session` | int | no | Default 5, min 1. |
| `max_tokens_per_request` | int | no | Default 4000, min 1. |
| `is_active` | boolean | no | Default true. |
| `priority` | int | no | Default 100. Lower means stronger. |

## Success response

```json
{
  "success": true,
  "message": "تم إنشاء سياسة استخدام الذكاء الاصطناعي بنجاح",
  "data": {
    "policy": {
      "id": 2,
      "policy_name": "VIP User AI Usage",
      "scope_type": "user",
      "user_id": 1,
      "limits": {
        "max_total_requests_per_month": 100,
        "max_chat_messages_per_month": 80,
        "max_image_analyses_per_month": 30,
        "max_document_analyses_per_month": 15,
        "max_files_per_session": 10,
        "max_tokens_per_request": 8000
      },
      "is_active": true,
      "priority": 10
    }
  }
}
```

## Database effect

Inserts row into `ai_usage_policies`.

Also inserts admin log:

```text
admin_logs.target_type = AIUsagePolicy
admin_logs.action = AI_USAGE_POLICY_CREATE
```

## Common errors

| Status | Reason |
|---:|---|
| 400 | validation error |
| 400 | user_id required for user scope |
| 400 | package_id required for package scope |
| 403 | token is not super admin |

---

# 6. Update AI Usage Policy

Update policy limits or scope.

```http
PATCH /api/admin/ai-usage/policies/:id
```

## Auth

Super admin token required.

## Example

```http
PATCH /api/admin/ai-usage/policies/2
```

## Body

```json
{
  "max_total_requests_per_month": 120,
  "max_image_analyses_per_month": 40,
  "priority": 5
}
```

## Success response

```json
{
  "success": true,
  "message": "تم تحديث سياسة استخدام الذكاء الاصطناعي بنجاح",
  "data": {
    "policy": {
      "id": 2,
      "limits": {
        "max_total_requests_per_month": 120,
        "max_image_analyses_per_month": 40
      },
      "priority": 5
    }
  }
}
```

## Database effect

Updates `ai_usage_policies` and writes admin log:

```text
AI_USAGE_POLICY_UPDATE
```

## Important note

Use `PATCH`, not `POST`.

This is wrong and should return 404:

```http
POST /api/admin/ai-usage/policies/2
```

Correct:

```http
PATCH /api/admin/ai-usage/policies/2
```

---

# 7. Activate / Deactivate Policy

Change policy active status.

```http
PATCH /api/admin/ai-usage/policies/:id/status
```

## Auth

Super admin token required.

## Activate body

```json
{
  "is_active": true
}
```

## Deactivate body

```json
{
  "is_active": false
}
```

## Success response

```json
{
  "success": true,
  "message": "تم تحديث حالة سياسة استخدام الذكاء الاصطناعي بنجاح",
  "data": {
    "policy": {
      "id": 2,
      "is_active": true,
      "priority": 5
    }
  }
}
```

## Database effect

Updates:

```text
ai_usage_policies.is_active
ai_usage_policies.updated_by_admin_id
ai_usage_policies.updated_at
```

Writes admin log:

```text
AI_USAGE_POLICY_ACTIVATE
AI_USAGE_POLICY_DEACTIVATE
```

---

# 8. Verify Policy Applies To User

After activating a user-specific policy, call the user usage endpoint with the user's token:

```http
GET /api/ai-dermatology/usage
```

Expected when VIP policy is active:

```json
{
  "policy": {
    "id": 2,
    "policy_name": "VIP User AI Usage",
    "scope_type": "user",
    "max_total_requests_per_month": 120,
    "max_chat_messages_per_month": 80,
    "max_image_analyses_per_month": 40,
    "max_document_analyses_per_month": 15,
    "max_files_per_session": 10,
    "max_tokens_per_request": 8000
  },
  "remaining": {
    "total_requests": 112,
    "chat_messages": 76,
    "image_analyses": 38,
    "document_analyses": 14
  }
}
```

This confirms admin policy changes take effect immediately.

---

# 9. Admin Logs Verification

Check AI usage policy admin logs:

```sql
SELECT
  id,
  admin_id,
  action,
  target_type,
  target_id,
  description,
  severity,
  created_at
FROM admin_logs
WHERE target_type = 'AIUsagePolicy'
ORDER BY id DESC
LIMIT 10;
```

Expected rows:

```text
AI_USAGE_POLICY_CREATE
AI_USAGE_POLICY_UPDATE
AI_USAGE_POLICY_ACTIVATE
AI_USAGE_POLICY_DEACTIVATE
```

## Fixed issue

During implementation, admin log insert initially failed because `getClientInfo(req)` returned:

```text
ip_address
user_agent
```

but the new controller used:

```text
ip
userAgent
```

The fix normalizes client info and ensures no SQL bind parameter is `undefined`.

---

# 10. SQL Queries For Admin Testing

## List policies

```sql
SELECT
  id,
  policy_name,
  scope_type,
  user_id,
  package_id,
  max_total_requests_per_month,
  max_chat_messages_per_month,
  max_image_analyses_per_month,
  max_document_analyses_per_month,
  max_files_per_session,
  max_tokens_per_request,
  is_active,
  priority,
  created_by_admin_id,
  updated_by_admin_id,
  created_at,
  updated_at
FROM ai_usage_policies
ORDER BY id DESC;
```

## User usage counters

```sql
SELECT
  user_id,
  period_key,
  total_requests,
  chat_messages_count,
  image_analyses_count,
  document_analyses_count,
  tokens_used
FROM ai_usage_counters;
```

## Provider logs

```sql
SELECT
  id,
  provider,
  model,
  request_type,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  latency_ms,
  status,
  created_at
FROM ai_provider_logs
ORDER BY id DESC
LIMIT 20;
```

## Usage events

```sql
SELECT
  id,
  user_id,
  ai_session_id,
  ai_result_id,
  event_type,
  status,
  counted_units,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  created_at
FROM ai_usage_events
ORDER BY id DESC
LIMIT 50;
```

---

# 11. Recommended Admin Dashboard Screens

## AI Overview

Endpoint:

```http
GET /api/admin/ai-usage/overview?period_key=YYYY-MM
```

Cards:

- active users
- total requests
- chat requests
- image analyses
- document analyses
- total tokens
- average latency

## AI User Usage

Endpoint:

```http
GET /api/admin/ai-usage/users/:userId
```

Sections:

- user profile
- active policies
- counters
- recent events

## AI Policies Management

Endpoints:

```http
GET /policies
POST /policies
PATCH /policies/:id
PATCH /policies/:id/status
```

Features:

- list policies
- create global/user/package policy
- update limits
- activate/deactivate
- show created/updated admin

---

# 12. Common Errors

| Status | Error | Reason |
|---:|---|---|
| 400 | Validation error | Invalid request body or query. |
| 400 | user_id is required | `scope_type=user` but no user_id. |
| 400 | package_id is required | `scope_type=package` but no package_id. |
| 401 | Authorization header missing | No token. |
| 403 | Insufficient permissions | Not admin/super_admin. |
| 404 | Policy not found | Invalid policy ID. |
| 404 | User not found | Invalid user ID. |

---

# 13. Production Notes

- Keep at least one active global policy.
- Avoid setting all limits to zero unless intentionally blocking AI usage.
- Monitor `ai_provider_logs.total_tokens` for cost.
- Monitor failed provider logs.
- Use policy priority carefully.
- User-specific policies should be audited.
- Admin log records should not be manually deleted except through controlled retention policy.

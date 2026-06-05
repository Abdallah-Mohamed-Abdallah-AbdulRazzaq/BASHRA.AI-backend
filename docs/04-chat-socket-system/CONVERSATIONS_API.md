# 📱 Conversations API - المرحلة الأولى

## نظرة عامة

هذا التوثيق يغطي **المرحلة الأولى** من نظام الدردشة (Chat System) في BASHRA.AI Backend.

### ما تم تنفيذه في المرحلة الأولى:

✅ **المصادقة الموحدة (Unified Authentication)**
- نظام JWT موحد يدعم جميع أنواع المستخدمين (user, admin, doctor, assistant)
- التحقق تلقائي من الصلاحيات باستخدام Middleware

✅ **حماية الـ API (Authentication Middleware)**
- `authenticateJWT`: للتحقق من JWT Token
- `authorizeUserOrDoctorOrAssistant`: للتحقق من الصلاحيات

✅ **API Endpoints (RESTful)**
- جلب قائمة المحادثات
- جلب سجل الرسائل مع Pagination
- بدء محادثة جديدة
- جلب تفاصيل محادثة معينة

---

## 🔐 المصادقة (Authentication)

جميع Endpoints تتطلب JWT Token في Header:

```
Authorization: Bearer <your-jwt-token>
```

### الحصول على Token:

استخدم endpoint تسجيل الدخول:
```http
POST /api/auth-user/login
POST /api/auth-admin/login
POST /api/auth-doctor/login
POST /api/auth-assistant/login
```

---

## 📡 API Endpoints

### 1️⃣ جلب قائمة المحادثات

**Endpoint:** `GET /api/conversations`

**Description:** جلب جميع المحادثات التي يشارك فيها المستخدم الحالي، مرتبة حسب آخر رسالة.

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar (optional)
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "id": 1,
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "last_message_at": "2025-11-10T14:30:00.000Z",
      "created_at": "2025-11-10T10:00:00.000Z",
      "unread_count": 5,
      "last_message_content": "مرحباً، كيف يمكنني مساعدتك؟",
      "last_message_type": "text",
      "participants": [
        {
          "participant_id": 10,
          "participant_type": "user",
          "joined_at": "2025-11-10T10:00:00.000Z",
          "name": "أحمد محمد",
          "email": "ahmad@example.com"
        },
        {
          "participant_id": 5,
          "participant_type": "doctor",
          "joined_at": "2025-11-10T10:00:00.000Z",
          "name": "د. سارة علي",
          "email": "sara@example.com"
        }
      ]
    }
  ]
}
```

---

### 2️⃣ جلب سجل الرسائل

**Endpoint:** `GET /api/conversations/:id/messages`

**Description:** جلب سجل الرسائل لمحادثة معينة مع دعم Pagination.

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar (optional)
```

**Query Parameters:**
- `limit` (optional, default: 50): عدد الرسائل المراد جلبها
- `offset` (optional, default: 0): البداية من أي رسالة

**Example:**
```
GET /api/conversations/1/messages?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 100,
      "uuid": "msg-uuid-123",
      "conversation_id": 1,
      "sender_id": 10,
      "sender_type": "user",
      "sender_name": "أحمد محمد",
      "message_type": "text",
      "content": "مرحباً دكتور",
      "file_id": null,
      "file_path": null,
      "file_name": null,
      "file_type": null,
      "file_size": null,
      "is_read": true,
      "read_at": "2025-11-10T14:35:00.000Z",
      "reply_to_message_id": null,
      "is_deleted": false,
      "deleted_at": null,
      "created_at": "2025-11-10T14:30:00.000Z",
      "updated_at": "2025-11-10T14:35:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

**Features:**
- ✅ تحديث تلقائي لحالة الرسائل إلى "مقروءة"
- ✅ دعم Pagination لتحسين الأداء
- ✅ جلب معلومات الملفات المرفقة

---

### 3️⃣ بدء محادثة جديدة

**Endpoint:** `POST /api/conversations`

**Description:** إنشاء محادثة جديدة أو إرجاع محادثة موجودة بين نفس الطرفين.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipient_id": 5,
  "recipient_type": "doctor"
}
```

**Fields:**
- `recipient_id` (required): معرف المستقبل
- `recipient_type` (required): نوع المستقبل (user, admin, doctor, assistant)

**Response (محادثة جديدة):**
```json
{
  "success": true,
  "message_ar": "تم إنشاء المحادثة بنجاح",
  "message_en": "Conversation created successfully",
  "conversation": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-11-10T15:00:00.000Z"
  },
  "isNew": true
}
```

**Response (محادثة موجودة):**
```json
{
  "success": true,
  "message_ar": "المحادثة موجودة بالفعل",
  "message_en": "Conversation already exists",
  "conversation": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "created_at": "2025-11-10T10:00:00.000Z"
  },
  "isNew": false
}
```

**Features:**
- ✅ البحث عن محادثة موجودة قبل الإنشاء
- ✅ Polymorphic Association (دعم جميع أنواع المستخدمين)
- ✅ UUID فريد لكل محادثة

---

### 4️⃣ جلب تفاصيل محادثة معينة

**Endpoint:** `GET /api/conversations/:id`

**Description:** جلب تفاصيل محادثة معينة مع قائمة المشاركين.

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar (optional)
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "last_message_at": "2025-11-10T14:30:00.000Z",
    "created_at": "2025-11-10T10:00:00.000Z",
    "participants": [
      {
        "participant_id": 10,
        "participant_type": "user",
        "joined_at": "2025-11-10T10:00:00.000Z",
        "name": "أحمد محمد"
      },
      {
        "participant_id": 5,
        "participant_type": "doctor",
        "joined_at": "2025-11-10T10:00:00.000Z",
        "name": "د. سارة علي"
      }
    ]
  }
}
```

---

## 🔒 الأمان (Security)

### التحقق من الصلاحيات:
- ✅ جميع Endpoints محمية بـ JWT Authentication
- ✅ التحقق من أن المستخدم مشارك في المحادثة قبل الوصول
- ✅ دعم Polymorphic Association لجميع أنواع المستخدمين

### Rate Limiting:
- الحد من الطلبات: 1000 طلب / 15 دقيقة (General)

---

## 📊 هيكل قاعدة البيانات (Database Schema)

### الجداول المستخدمة:

1. **conversations**: المحادثات الأساسية
   - `id`, `uuid`, `last_message_at`, `created_at`

2. **conversation_participants**: المشاركين في المحادثات
   - `id`, `conversation_id`, `participant_id`, `participant_type`, `joined_at`
   - **Polymorphic Association**: `participant_type` يحدد نوع المستخدم

3. **messages**: الرسائل
   - `id`, `uuid`, `conversation_id`, `sender_id`, `sender_type`, `content`, ...
   - **Polymorphic Association**: `sender_type` يحدد نوع المرسل

---

## 🧪 أمثلة الاستخدام (Usage Examples)

### Example 1: User يبدأ محادثة مع Doctor

```javascript
// 1. User Login
POST /api/auth-user/login
{
  "email": "user@example.com",
  "password": "password123",
  "entityType": "user"
}

// Response: { tokens: { accessToken: "..." } }

// 2. بدء محادثة جديدة
POST /api/conversations
Headers: { Authorization: "Bearer <user-token>" }
{
  "recipient_id": 5,
  "recipient_type": "doctor"
}

// 3. جلب الرسائل
GET /api/conversations/1/messages?limit=50&offset=0
Headers: { Authorization: "Bearer <user-token>" }
```

### Example 2: Doctor يجلب قائمة محادثاته

```javascript
// 1. Doctor Login
POST /api/auth-doctor/login
{
  "email": "doctor@example.com",
  "password": "password123",
  "entityType": "doctor"
}

// 2. جلب القائمة
GET /api/conversations
Headers: { Authorization: "Bearer <doctor-token>" }
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
  "error": "Authorization header missing"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message_ar": "غير مصرح لك بالوصول لهذه المحادثة",
  "message_en": "You are not authorized to access this conversation"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message_ar": "المحادثة غير موجودة",
  "message_en": "Conversation not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message_ar": "حدث خطأ في الخادم",
  "message_en": "Internal server error"
}
```

---

## 🚀 المراحل القادمة

المرحلة الأولى مكتملة ✅

**في انتظار المرحلة الثانية:**
- Socket.IO Real-time messaging
- إرسال واستقبال الرسائل الفورية
- Typing indicators
- Online/Offline status
- وغيرها...

---

## 📝 ملاحظات مهمة

1. ✅ **Polymorphic Association**: النظام يدعم جميع أنواع المستخدمين بشكل موحد
2. ✅ **Pagination**: استخدم Pagination عند جلب الرسائل لتحسين الأداء
3. ✅ **Language Support**: أرسل `Accept-Language: ar` أو `en` في Header
4. ✅ **Auto Read Status**: الرسائل يتم تحديثها تلقائياً إلى "مقروءة" عند جلبها
5. ✅ **Unique Conversations**: النظام يمنع إنشاء محادثات مكررة بين نفس الطرفين

---

## 📞 التواصل

للاستفسارات أو المساعدة، يرجى التواصل مع فريق التطوير.

**تم التنفيذ بواسطة:** Cascade AI
**التاريخ:** 10 نوفمبر 2025

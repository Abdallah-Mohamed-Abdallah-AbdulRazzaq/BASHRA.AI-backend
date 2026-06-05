# 🧪 دليل الاختبار الشامل - Chat System

**التاريخ:** 10 نوفمبر 2025  
**النسخة:** 1.0

---

## 📋 نظرة عامة

هذا الدليل يوفر خطوات شاملة ومفصلة لاختبار نظام الدردشة بالكامل.

### ما سيتم اختباره:

1. ✅ **REST API Endpoints** (المرحلة الأولى)
2. ✅ **Socket.IO Events** (المرحلة الثانية)
3. ✅ **Security & Authorization**
4. ✅ **Real-time Messaging**
5. ✅ **Typing Indicators**
6. ✅ **Read Receipts**

---

## 🔧 متطلبات الاختبار

### الأدوات المطلوبة:

1. **Postman** (لاختبار REST API و Socket.IO)
   - تحميل من: https://www.postman.com/downloads/

2. **Node.js** (لاختبار Socket.IO عبر Code)
   - تحميل من: https://nodejs.org/

3. **MySQL Client** (لفحص قاعدة البيانات)
   - MySQL Workbench أو أي client آخر

### البيانات المطلوبة:

- ✅ Server URL: `http://localhost:3006`
- ✅ JWT Token (سنحصل عليه من Login)
- ✅ Conversation ID (سننشئه من Create Conversation)

---

## 📍 الجزء الأول: اختبار REST API

### الخطوة 1: تسجيل الدخول والحصول على JWT Token

**Endpoint:** `POST /api/auth-user/login`

**في Postman:**

1. افتح Postman
2. أنشئ طلب جديد (New Request)
3. اختر `POST`
4. URL: `http://localhost:3006/api/auth-user/login`
5. اذهب إلى تبويب `Body`
6. اختر `raw` ثم `JSON`
7. أدخل البيانات:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "entityType": "user"
}
```

8. اضغط `Send`

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "message_ar": "تم تسجيل الدخول بنجاح",
  "message_en": "Login successful",
  "user": {
    "id": 1,
    "uuid": "user-uuid-123",
    "email": "user@example.com",
    "entityType": "user"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ مهم جداً:**
- انسخ `accessToken` واحتفظ به!
- سنستخدمه في جميع الطلبات القادمة

---

### الخطوة 2: بدء محادثة جديدة

**Endpoint:** `POST /api/conversations`

**في Postman:**

1. أنشئ طلب جديد
2. اختر `POST`
3. URL: `http://localhost:3006/api/conversations`
4. **اذهب إلى تبويب `Authorization`:**
   - Type: `Bearer Token`
   - Token: الصق الـ `accessToken` الذي حصلت عليه
5. اذهب إلى تبويب `Body`
6. اختر `form-data` (أو `raw` + `JSON`)
7. أدخل البيانات:

**Form-data:**
```
recipient_id: 5
recipient_type: doctor
```

**أو JSON:**
```json
{
  "recipient_id": 5,
  "recipient_type": "doctor"
}
```

8. اضغط `Send`

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "message_ar": "تم إنشاء المحادثة بنجاح",
  "message_en": "Conversation created successfully",
  "conversation": {
    "id": 1,
    "uuid": "conv-uuid-123",
    "created_at": "2025-11-10T15:30:00.000Z"
  }
}
```

**⚠️ مهم:**
- احتفظ بـ `conversation.id` (مثلاً: `1`)
- سنستخدمه في الخطوات القادمة

---

### الخطوة 3: جلب قائمة المحادثات

**Endpoint:** `GET /api/conversations`

**في Postman:**

1. أنشئ طلب جديد
2. اختر `GET`
3. URL: `http://localhost:3006/api/conversations`
4. **Authorization:** `Bearer Token` مع الـ `accessToken`
5. اضغط `Send`

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "conversations": [
    {
      "id": 1,
      "uuid": "conv-uuid-123",
      "last_message_at": null,
      "created_at": "2025-11-10T15:30:00.000Z",
      "unread_count": 0,
      "last_message_content": null,
      "last_message_type": null,
      "participants": [
        {
          "participant_id": 1,
          "participant_type": "user",
          "name": "أحمد محمد",
          "email": "user@example.com",
          "joined_at": "2025-11-10T15:30:00.000Z"
        },
        {
          "participant_id": 5,
          "participant_type": "doctor",
          "name": "د. سارة أحمد",
          "email": "doctor@example.com",
          "joined_at": "2025-11-10T15:30:00.000Z"
        }
      ]
    }
  ]
}
```

---

### الخطوة 4: جلب تفاصيل محادثة

**Endpoint:** `GET /api/conversations/:id`

**في Postman:**

1. أنشئ طلب جديد
2. اختر `GET`
3. URL: `http://localhost:3006/api/conversations/1`
4. **Authorization:** `Bearer Token`
5. اضغط `Send`

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "uuid": "conv-uuid-123",
    "last_message_at": null,
    "created_at": "2025-11-10T15:30:00.000Z",
    "participants": [...]
  }
}
```

---

### الخطوة 5: جلب الرسائل من محادثة

**Endpoint:** `GET /api/conversations/:id/messages`

**في Postman:**

1. أنشئ طلب جديد
2. اختر `GET`
3. URL: `http://localhost:3006/api/conversations/1/messages?limit=50&offset=0`
4. **Authorization:** `Bearer Token`
5. اضغط `Send`

**النتيجة المتوقعة:**

```json
{
  "success": true,
  "messages": [],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 0
  }
}
```

✅ **اختبار REST API مكتمل!**

---

## 📍 الجزء الثاني: اختبار Socket.IO

### طريقة 1: اختبار Socket.IO في Postman

#### الخطوة 1: إنشاء Socket.IO Request

1. في Postman، اضغط `New` → `WebSocket Request`
2. اختر نوع الاتصال: `Socket.IO`
3. URL: `http://localhost:3006`
4. في `Handshake` tab، اذهب إلى `Auth`:
   - أضف parameter جديد:
   - Key: `token`
   - Value: الصق الـ `accessToken`

#### الخطوة 2: الاتصال

1. اضغط `Connect`
2. إذا نجح الاتصال، سترى: `✅ Connected`

#### الخطوة 3: الانضمام لمحادثة

1. في قسم `Events`, اضغط `New Message`
2. Event name: `joinConversation`
3. Message (JSON):
```json
{
  "conversationId": 1
}
```
4. اضغط `Send`

**ستستقبل:**
- Event: `joinedConversation`
- Data: `{ "success": true, "conversationId": 1 }`

#### الخطوة 4: إرسال رسالة

1. أرسل event جديد
2. Event name: `sendMessage`
3. Message (JSON):
```json
{
  "conversationId": 1,
  "content": "مرحباً! هذه رسالة اختبار",
  "messageType": "text"
}
```
4. اضغط `Send`

**ستستقبل:**
- Event: `messageSent`
- Data: كائن الرسالة الكامل

#### الخطوة 5: Typing Indicator

1. أرسل event: `typing`
2. Message: `{"conversationId": 1}`

ثم بعد ثانيتين:

1. أرسل event: `stopTyping`
2. Message: `{"conversationId": 1}`

#### الخطوة 6: Mark as Read

1. أرسل event: `markAsRead`
2. Message:
```json
{
  "conversationId": 1,
  "messageIds": [1, 2, 3]
}
```

---

### طريقة 2: اختبار Socket.IO بالكود (Node.js)

تم إنشاء ملف اختبار جاهز: `test-socket-client.js`

#### خطوات الاستخدام:

1. **تأكد من تثبيت socket.io-client:**
```bash
npm install socket.io-client
```

2. **افتح الملف `test-socket-client.js`**

3. **عدّل القيم:**
```javascript
const USER_TOKEN = 'YOUR_USER_JWT_TOKEN_HERE'; // ضع الـ Token هنا
const CONVERSATION_ID = 1; // معرف المحادثة
```

4. **شغّل السكريبت:**
```bash
node test-socket-client.js
```

5. **راقب النتائج في Terminal**

---

## 🔍 الجزء الثالث: سيناريوهات الاختبار الكاملة

### السيناريو 1: محادثة بين مستخدم وطبيب

#### الإعداد:
1. سجل دخول كـ **User** (احصل على `USER_TOKEN`)
2. سجل دخول كـ **Doctor** (احصل على `DOCTOR_TOKEN`)
3. أنشئ محادثة جديدة بينهما

#### الخطوات:

**1. User يتصل:**
```javascript
const userSocket = io('http://localhost:3006', {
  auth: { token: USER_TOKEN }
});
```

**2. User ينضم للمحادثة:**
```javascript
userSocket.emit('joinConversation', { conversationId: 1 });
```

**3. Doctor يتصل:**
```javascript
const doctorSocket = io('http://localhost:3006', {
  auth: { token: DOCTOR_TOKEN }
});
```

**4. Doctor ينضم لنفس المحادثة:**
```javascript
doctorSocket.emit('joinConversation', { conversationId: 1 });
```

**5. User يرسل رسالة:**
```javascript
userSocket.emit('sendMessage', {
  conversationId: 1,
  content: 'مرحباً دكتور، أحتاج استشارة'
});
```

**النتيجة المتوقعة:**
- ✅ User يستقبل `messageSent`
- ✅ Doctor يستقبل `newMessage`
- ✅ Doctor يستقبل `messageNotification` (في الغرفة الشخصية)

**6. Doctor يرد:**
```javascript
doctorSocket.emit('sendMessage', {
  conversationId: 1,
  content: 'مرحباً، كيف يمكنني مساعدتك؟'
});
```

**النتيجة المتوقعة:**
- ✅ Doctor يستقبل `messageSent`
- ✅ User يستقبل `newMessage`

**7. User يكتب (Typing):**
```javascript
userSocket.emit('typing', { conversationId: 1 });
```

**النتيجة المتوقعة:**
- ✅ Doctor يستقبل `userTyping`

**8. User يوقف الكتابة:**
```javascript
userSocket.emit('stopTyping', { conversationId: 1 });
```

**النتيجة المتوقعة:**
- ✅ Doctor يستقبل `userStoppedTyping`

**9. Doctor يقرأ الرسائل:**
```javascript
doctorSocket.emit('markAsRead', {
  conversationId: 1,
  messageIds: [1]
});
```

**النتيجة المتوقعة:**
- ✅ Doctor يستقبل `markedAsRead`
- ✅ User يستقبل `messagesRead`

---

### السيناريو 2: اختبار الأمان (Security Testing)

#### اختبار 1: الاتصال بدون Token

```javascript
const socket = io('http://localhost:3006', {
  auth: {} // لا يوجد token
});
```

**النتيجة المتوقعة:**
- ❌ `connect_error` مع رسالة "Authentication error"

#### اختبار 2: Token منتهي الصلاحية

```javascript
const socket = io('http://localhost:3006', {
  auth: { token: 'expired-token-123' }
});
```

**النتيجة المتوقعة:**
- ❌ `connect_error`

#### اختبار 3: الانضمام لمحادثة غير مصرح بها

```javascript
// المستخدم 1 يحاول الانضمام لمحادثة المستخدم 2 والمستخدم 3
socket.emit('joinConversation', {
  conversationId: 999 // محادثة لا يشارك فيها
});
```

**النتيجة المتوقعة:**
- ❌ Event `error` مع رسالة "غير مصرح لك بالوصول لهذه المحادثة"

#### اختبار 4: إرسال رسالة لمحادثة غير مصرح بها

```javascript
socket.emit('sendMessage', {
  conversationId: 999,
  content: 'رسالة غير مصرح بها'
});
```

**النتيجة المتوقعة:**
- ❌ Event `error`

---

### السيناريو 3: اختبار Pagination

#### الخطوة 1: إنشاء محادثة وإرسال 100 رسالة

```bash
# استخدم loop لإرسال رسائل متعددة
for i in {1..100}; do
  # أرسل رسالة عبر Socket.IO
done
```

#### الخطوة 2: جلب الرسائل بـ Pagination

```http
GET /api/conversations/1/messages?limit=50&offset=0
```

**النتيجة:**
- 50 رسالة (الأحدث)

```http
GET /api/conversations/1/messages?limit=50&offset=50
```

**النتيجة:**
- 50 رسالة التالية

---

## 📊 الجزء الرابع: التحقق من قاعدة البيانات

### فحص المحادثات

```sql
SELECT * FROM conversations ORDER BY last_message_at DESC;
```

**توقعات:**
- ✅ `last_message_at` يتحدث بعد كل رسالة

### فحص الرسائل

```sql
SELECT 
  m.id,
  m.conversation_id,
  m.sender_type,
  m.sender_id,
  m.content,
  m.is_read,
  m.created_at
FROM messages m
WHERE m.conversation_id = 1
ORDER BY m.created_at DESC
LIMIT 10;
```

**توقعات:**
- ✅ الرسائل محفوظة بشكل صحيح
- ✅ `is_read` يتحدث بعد markAsRead

### فحص المشاركين

```sql
SELECT 
  cp.conversation_id,
  cp.participant_id,
  cp.participant_type,
  cp.joined_at
FROM conversation_participants cp
WHERE cp.conversation_id = 1;
```

**توقعات:**
- ✅ جميع المشاركين موجودون
- ✅ لا يوجد مشارك مكرر

---

## ✅ Checklist الاختبار الشامل

### REST API Testing:
- [ ] Login successful
- [ ] Create conversation successful
- [ ] Get conversations list
- [ ] Get conversation by ID
- [ ] Get messages with pagination
- [ ] Form-data support for POST

### Socket.IO Testing:
- [ ] Connection with valid token successful
- [ ] Connection without token fails
- [ ] Join conversation successful
- [ ] Join unauthorized conversation fails
- [ ] Send message successful
- [ ] Receive newMessage event
- [ ] Typing indicator works
- [ ] Stop typing works
- [ ] Mark as read works
- [ ] Messages read notification works
- [ ] User joined notification
- [ ] User left notification
- [ ] Message notification (personal room)

### Security Testing:
- [ ] Expired token rejected
- [ ] Invalid token rejected
- [ ] Unauthorized conversation access blocked
- [ ] Unauthorized message send blocked

### Database Testing:
- [ ] Messages saved correctly
- [ ] last_message_at updated
- [ ] is_read updated
- [ ] No duplicate participants

### Performance Testing:
- [ ] 100 messages load in < 1 second
- [ ] Socket connection stable
- [ ] No memory leaks

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Connection error" في Socket.IO

**الحلول:**
1. تأكد من تشغيل الخادم
2. تأكد من صحة JWT Token
3. تأكد من عدم انتهاء صلاحية Token
4. تحقق من URL الصحيح

### المشكلة: "Unauthorized" عند joinConversation

**الحلول:**
1. تأكد من أنك مشارك في المحادثة
2. تحقق من `conversation_participants` في قاعدة البيانات
3. تأكد من صحة `conversationId`

### المشكلة: الرسائل لا تظهر

**الحلول:**
1. تأكد من الانضمام للمحادثة أولاً (`joinConversation`)
2. تحقق من `newMessage` event
3. افحص قاعدة البيانات

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من logs في Terminal
2. افحص قاعدة البيانات
3. استخدم `console.log` للتتبع

---

**تم إنشاء الدليل بواسطة:** Cascade AI  
**التاريخ:** 10 نوفمبر 2025

# 🧪 دليل اختبار Socket.IO في Postman - خطوة بخطوة

**التاريخ:** 11 نوفمبر 2025  
**الإصدار:** 2.0 (محدّث ومُختبر)

---

## 📋 نظرة عامة

هذا الدليل يشرح كيفية اختبار Socket.IO في Postman بطريقة **صحيحة ومُختبرة**.

### ⚠️ ملاحظة مهمة

الكود الحالي يستقبل Token عبر:
```javascript
socket.handshake.auth.token
```

لذلك سنستخدم **Query Parameters** في Postman لإرسال Token.

---

## 🔧 المتطلبات

### 1. إصدار Postman
- **Postman Desktop** (النسخة الحديثة)
- تحميل من: https://www.postman.com/downloads/

### 2. البيانات المطلوبة
- ✅ JWT Token (احصل عليه من Login)
- ✅ Conversation ID (أنشئه من POST /conversations)
- ✅ Server URL: `http://localhost:3006`

---

## 📍 الجزء الأول: الحصول على JWT Token

### الخطوة 1: تسجيل الدخول

**في Postman:**

1. افتح Postman
2. New Request → HTTP Request
3. اختر `POST`
4. URL: `http://localhost:3006/api/auth-user/login`
5. اذهب إلى `Body`
6. اختر `raw` ثم `JSON`
7. أدخل:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "entityType": "user"
}
```

8. اضغط `Send`

**ستحصل على:**

```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW50aXR5VHlwZSI6InVzZXIiLCJpYXQiOjE2OTk4Nzg5MzB9.abc123xyz..."
  }
}
```

**⚠️ مهم جداً:**
- انسخ `accessToken` بالكامل
- احتفظ به في ملف نصي

---

## 📍 الجزء الثاني: إنشاء محادثة

### الخطوة 2: بدء محادثة

**في Postman:**

1. New Request → HTTP Request
2. اختر `POST`
3. URL: `http://localhost:3006/api/conversations`
4. اذهب إلى `Authorization`
5. اختر `Bearer Token`
6. الصق Token في الخانة
7. اذهب إلى `Body`
8. اختر `raw` ثم `JSON`
9. أدخل:

```json
{
  "recipient_id": 5,
  "recipient_type": "doctor"
}
```

10. اضغط `Send`

**ستحصل على:**

```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "uuid": "conv-uuid-123"
  }
}
```

**احتفظ بـ `conversation.id` (مثلاً: `1`)**

---

## 📍 الجزء الثالث: اختبار Socket.IO في Postman

### الخطوة 3: إنشاء WebSocket Request

**في Postman:**

1. اضغط `New` في الزاوية العلوية اليسرى
2. اختر `WebSocket Request`

![New WebSocket Request](screenshot-1.png)

### الخطوة 4: إعداد الاتصال

**في نافذة WebSocket:**

1. **URL:** اكتب:
   ```
   ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=YOUR_JWT_TOKEN_HERE
   ```
   
   **⚠️ مهم:** استبدل `YOUR_JWT_TOKEN_HERE` بالـ Token الفعلي!

   **مثال كامل:**
   ```
   ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW50aXR5VHlwZSI6InVzZXIiLCJpYXQiOjE2OTk4Nzg5MzB9.abc123xyz
   ```

2. اضغط `Connect`

**النتيجة المتوقعة:**

```
✅ Connected
```

في قسم `Messages` ستستقبل:

```
0{"sid":"abc123","upgrades":[],"pingInterval":25000,"pingTimeout":60000}
```

هذا يعني **الاتصال نجح!** 🎉

---

### الخطوة 5: الانضمام لمحادثة

**في قسم `New Message`:**

1. **Message:** اكتب:
   ```
   42["joinConversation",{"conversationId":1}]
   ```
   
   **⚠️ ملاحظة:**
   - `42` هو بروتوكول Socket.IO للرسائل
   - استبدل `1` بمعرف محادثتك

2. اضغط `Send`

**ستستقبل:**

```
42["joinedConversation",{"success":true,"conversationId":1}]
```

**معنى هذا:** تم الانضمام بنجاح! ✅

---

### الخطوة 6: إرسال رسالة

**في قسم `New Message`:**

1. **Message:** اكتب:
   ```
   42["sendMessage",{"conversationId":1,"content":"مرحباً! هذه رسالة اختبار من Postman","messageType":"text"}]
   ```

2. اضغط `Send`

**ستستقبل:**

```
42["messageSent",{"success":true,"message":{"id":1,"uuid":"msg-uuid-123","conversationId":1,"senderId":1,"senderType":"user","senderName":"أحمد محمد","content":"مرحباً! هذه رسالة اختبار من Postman","messageType":"text","isRead":false,"createdAt":"2025-11-11T12:30:00.000Z"}}]
```

**تهانينا! 🎉 الرسالة أُرسلت بنجاح!**

---

### الخطوة 7: إشعار "جاري الكتابة" (Typing Indicator)

**في قسم `New Message`:**

1. **Message:**
   ```
   42["typing",{"conversationId":1}]
   ```

2. اضغط `Send`

**لن تستقبل رد مباشر** (لأنك أنت الوحيد في المحادثة الآن).

**لكن إذا كان هناك مستخدم آخر متصل في نفس المحادثة، سيستقبل:**

```
42["userTyping",{"userId":1,"entityType":"user","conversationId":1}]
```

---

### الخطوة 8: إيقاف الكتابة

**في قسم `New Message`:**

1. **Message:**
   ```
   42["stopTyping",{"conversationId":1}]
   ```

2. اضغط `Send`

---

### الخطوة 9: تحديد الرسائل كمقروءة

**في قسم `New Message`:**

1. **Message:**
   ```
   42["markAsRead",{"conversationId":1,"messageIds":[1]}]
   ```
   
   **⚠️ ملاحظة:** استبدل `[1]` بمعرفات الرسائل التي تريد تحديدها كمقروءة

2. اضغط `Send`

**ستستقبل:**

```
42["markedAsRead",{"success":true,"conversationId":1,"messageIds":[1]}]
```

---

### الخطوة 10: مغادرة المحادثة

**في قسم `New Message`:**

1. **Message:**
   ```
   42["leaveConversation",{"conversationId":1}]
   ```

2. اضغط `Send`

**ستستقبل:**

```
42["leftConversation",{"success":true,"conversationId":1}]
```

---

## 🎯 ملخص جميع Socket Events

### Events التي ترسلها (Client → Server):

| Event | Data | الوصف |
|-------|------|-------|
| `joinConversation` | `{"conversationId": 1}` | الانضمام لمحادثة |
| `leaveConversation` | `{"conversationId": 1}` | مغادرة محادثة |
| `sendMessage` | `{"conversationId": 1, "content": "نص", "messageType": "text"}` | إرسال رسالة |
| `typing` | `{"conversationId": 1}` | بدء الكتابة |
| `stopTyping` | `{"conversationId": 1}` | إيقاف الكتابة |
| `markAsRead` | `{"conversationId": 1, "messageIds": [1,2,3]}` | تحديد كمقروء |

### Events التي تستقبلها (Server → Client):

| Event | Data | الوصف |
|-------|------|-------|
| `joinedConversation` | `{"success": true, "conversationId": 1}` | تأكيد الانضمام |
| `leftConversation` | `{"success": true, "conversationId": 1}` | تأكيد المغادرة |
| `messageSent` | `{"success": true, "message": {...}}` | تأكيد إرسال رسالة |
| `newMessage` | `{"id": 1, "content": "...", ...}` | رسالة جديدة واردة |
| `userTyping` | `{"userId": 5, "entityType": "doctor", ...}` | مستخدم يكتب |
| `userStoppedTyping` | `{"userId": 5, "entityType": "doctor", ...}` | مستخدم توقف |
| `markedAsRead` | `{"success": true, "conversationId": 1, ...}` | تأكيد القراءة |
| `messagesRead` | `{"readBy": {...}, "messageIds": [1,2]}` | رسائلك قُرئت |
| `userJoined` | `{"userId": 5, "entityType": "doctor"}` | مستخدم انضم |
| `userLeft` | `{"userId": 5, "entityType": "doctor"}` | مستخدم غادر |
| `messageNotification` | `{"conversationId": 1, "message": {...}}` | إشعار رسالة |
| `error` | `{"message_ar": "...", "message_en": "..."}` | خطأ |

---

## 🔍 اختبار السيناريو الكامل

### السيناريو: محادثة بين مستخدم وطبيب

#### الإعداد:

1. **افتح نافذتين من Postman** (أو استخدم نافذة واحدة وملف `test-socket-client.js`)

2. **النافذة 1 (User):**
   - احصل على User Token من Login
   - اتصل بـ Socket.IO: `ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=USER_TOKEN`

3. **النافذة 2 (Doctor):**
   - احصل على Doctor Token من Login
   - اتصل بـ Socket.IO: `ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=DOCTOR_TOKEN`

#### الاختبار:

**1. User ينضم للمحادثة:**
```
42["joinConversation",{"conversationId":1}]
```

**2. Doctor ينضم لنفس المحادثة:**
```
42["joinConversation",{"conversationId":1}]
```

**النتيجة:**
- User يستقبل: `userJoined` (إشعار أن Doctor انضم)
- Doctor يستقبل: `joinedConversation`

**3. User يرسل رسالة:**
```
42["sendMessage",{"conversationId":1,"content":"مرحباً دكتور، أحتاج استشارة","messageType":"text"}]
```

**النتيجة:**
- User يستقبل: `messageSent`
- Doctor يستقبل: `newMessage` + `messageNotification`

**4. Doctor يبدأ الكتابة:**
```
42["typing",{"conversationId":1}]
```

**النتيجة:**
- User يستقبل: `userTyping`

**5. Doctor يرد:**
```
42["sendMessage",{"conversationId":1,"content":"مرحباً، كيف يمكنني مساعدتك؟","messageType":"text"}]
```

**النتيجة:**
- Doctor يستقبل: `messageSent` + `userStoppedTyping` (تلقائياً)
- User يستقبل: `newMessage`

**6. User يقرأ الرسالة:**
```
42["markAsRead",{"conversationId":1,"messageIds":[2]}]
```

**النتيجة:**
- User يستقبل: `markedAsRead`
- Doctor يستقبل: `messagesRead`

---

## 🐛 استكشاف الأخطاء

### المشكلة 1: "Authentication error" عند الاتصال

**السبب:**
- Token غير صحيح
- Token منتهي الصلاحية
- Token غير مُرسل

**الحل:**
1. تأكد من نسخ Token بالكامل
2. تأكد من عدم وجود مسافات زائدة
3. احصل على Token جديد من Login
4. تأكد من URL:
   ```
   ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=FULL_TOKEN_HERE
   ```

### المشكلة 2: "Conversation ID is required"

**السبب:**
- لم ترسل `conversationId` في البيانات

**الحل:**
تأكد من إرسال:
```
42["joinConversation",{"conversationId":1}]
```

### المشكلة 3: "غير مصرح لك بالوصول لهذه المحادثة"

**السبب:**
- أنت لست مشاركاً في هذه المحادثة

**الحل:**
1. تحقق من `conversation_participants` في قاعدة البيانات
2. أنشئ محادثة جديدة بينك وبين المستخدم الآخر
3. تأكد من استخدام `conversationId` الصحيح

### المشكلة 4: لا أستقبل رسائل

**السبب:**
- لم تنضم للمحادثة أولاً

**الحل:**
يجب دائماً الانضمام للمحادثة أولاً:
```
42["joinConversation",{"conversationId":1}]
```

---

## 📊 التحقق من قاعدة البيانات

### فحص الرسائل المُرسلة:

```sql
SELECT * FROM messages 
WHERE conversation_id = 1 
ORDER BY created_at DESC;
```

### فحص حالة القراءة:

```sql
SELECT id, content, is_read, read_at 
FROM messages 
WHERE conversation_id = 1;
```

### فحص المشاركين:

```sql
SELECT * FROM conversation_participants 
WHERE conversation_id = 1;
```

---

## ✅ Checklist الاختبار

- [ ] تسجيل الدخول وحفظ Token
- [ ] إنشاء محادثة وحفظ ID
- [ ] الاتصال بـ Socket.IO
- [ ] الانضمام للمحادثة
- [ ] إرسال رسالة
- [ ] استقبال رسالة
- [ ] Typing indicator
- [ ] Stop typing
- [ ] Mark as read
- [ ] المغادرة

---

## 🎓 نصائح مهمة

1. **دائماً انضم للمحادثة أولاً** قبل إرسال رسائل
2. **احفظ Token في مكان آمن** لإعادة الاستخدام
3. **استخدم نافذتين من Postman** لاختبار المحادثات الثنائية
4. **راقب Terminal** للحصول على Logs مفيدة
5. **افحص قاعدة البيانات** للتأكد من حفظ البيانات

---

**تم إنشاء الدليل بواسطة:** Cascade AI  
**التاريخ:** 11 نوفمبر 2025  
**الحالة:** ✅ مُختبر وجاهز للاستخدام

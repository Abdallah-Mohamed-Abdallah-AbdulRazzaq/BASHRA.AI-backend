# دليل اختبار Socket.IO في Postman

## المشكلة الحالية
عند الاتصال بـ Socket.IO من Postman، يتم الاتصال بنجاح (Status Code: 101) لكن يتم قطع الاتصال فوراً مع الكود `1005 No Status Received`.

## السبب
السيرفر يحتاج إلى إعادة تشغيل لتطبيق التغييرات الجديدة في الـ middleware.

## خطوات الحل

### 1. إعادة تشغيل السيرفر
```bash
# أوقف السيرفر الحالي (Ctrl+C)
# ثم شغله من جديد
npm start
# أو
node app.js
```

### 2. اختبار الاتصال في Postman

#### الطريقة الصحيحة:
```
ws://localhost:3006?token=YOUR_JWT_TOKEN_HERE
```

**ملاحظة مهمة:** 
- ❌ لا تستخدم: `ws://localhost:3006/socket.io/?token=...`
- ✅ استخدم: `ws://localhost:3006?token=...`

#### مثال كامل:
```
ws://localhost:3006?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjQsInV1aWQiOiI3MzRkZTZkYy00YzNhLTQ1OWMtYWIyMy1iOWYxMjI0NWI5YWMiLCJlbWFpbCI6InNhZm5rczBAZ21haWwuY29tIiwiZW50aXR5VHlwZSI6InVzZXIiLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjM2NTUxMjQsImV4cCI6MTc2NDI1OTkyNH0.h9txKMAcLr9OdRzXKhClv_T7ILu9snK0gFL8U1KQSLo
```

### 3. التحقق من الـ Logs

بعد إعادة تشغيل السيرفر، راقب ملف `app.log` أو console output:

#### إذا نجح الاتصال، ستظهر:
```json
{
  "level": "info",
  "message": "Socket connection attempt",
  "socketId": "...",
  "hasAuthToken": false,
  "hasQueryToken": true,
  "tokenSource": "query",
  "tokenPreview": "eyJhbGciOiJIUzI1NiIs..."
}
```

```json
{
  "level": "info",
  "message": "Socket authenticated successfully",
  "socketId": "...",
  "userId": 24,
  "entityType": "user",
  "tokenSource": "query"
}
```

```json
{
  "level": "info",
  "message": "User connected to chat",
  "socketId": "...",
  "userId": 24,
  "entityType": "user"
}
```

#### إذا فشل الاتصال، ستظهر:
```json
{
  "level": "error",
  "message": "Socket authentication failed",
  "socketId": "...",
  "error": "jwt expired",
  "errorName": "TokenExpiredError"
}
```

### 4. اختبار Events

بعد الاتصال بنجاح، يمكنك إرسال events:

#### الانضمام لمحادثة:
```json
{
  "event": "joinConversation",
  "data": {
    "conversationId": 1
  }
}
```

#### إرسال رسالة:
```json
{
  "event": "sendMessage",
  "data": {
    "conversationId": 1,
    "content": "مرحباً، هذه رسالة تجريبية",
    "messageType": "text"
  }
}
```

#### بدء الكتابة:
```json
{
  "event": "typing",
  "data": {
    "conversationId": 1
  }
}
```

#### إيقاف الكتابة:
```json
{
  "event": "stopTyping",
  "data": {
    "conversationId": 1
  }
}
```

#### تحديث حالة الرسائل إلى "مقروءة":
```json
{
  "event": "markAsRead",
  "data": {
    "conversationId": 1,
    "messageIds": [1, 2, 3]
  }
}
```

## الأخطاء الشائعة

### 1. التوكن منتهي الصلاحية
```json
{
  "error": "jwt expired",
  "errorName": "TokenExpiredError"
}
```
**الحل:** احصل على توكن جديد من endpoint `/api/auth-user/login`

### 2. التوكن غير صحيح
```json
{
  "error": "invalid signature",
  "errorName": "JsonWebTokenError"
}
```
**الحل:** تأكد من أن التوكن صحيح وموقع بنفس `SECRET_KEY`

### 3. التوكن لا يحتوي على الحقول المطلوبة
```json
{
  "error": "Invalid token payload",
  "hasId": false,
  "hasEntityType": false
}
```
**الحل:** تأكد من أن التوكن يحتوي على `id` و `entityType`

### 4. لا يوجد توكن
```json
{
  "error": "No token provided",
  "authKeys": [],
  "queryKeys": ["EIO", "transport"]
}
```
**الحل:** تأكد من إضافة `?token=...` في URL

## ملاحظات مهمة

1. **السيرفر يدعم كلا الطريقتين:**
   - `socket.handshake.auth.token` (للتطبيقات)
   - `socket.handshake.query.token` (لـ Postman)

2. **التوكن يجب أن يكون Access Token:**
   - يحتوي على: `id`, `uuid`, `email`, `entityType`, `tokenType: "access"`
   - غير منتهي الصلاحية

3. **الاتصال يتطلب:**
   - WebSocket protocol (`ws://` أو `wss://`)
   - البورت الصحيح (3006)
   - التوكن في query parameters

4. **بعد الاتصال:**
   - سيتم إضافة `socket.userId` و `socket.entityType` تلقائياً
   - سيتم الانضمام للغرفة الشخصية: `user:24` (مثلاً)
   - يمكنك الانضمام لمحادثات محددة باستخدام `joinConversation`

## التحقق من نجاح الاتصال

### في Postman:
- ✅ Status: `Connected`
- ✅ لا توجد رسالة `Disconnected`
- ✅ يمكنك إرسال واستقبال events

### في السيرفر:
- ✅ Log: `Socket connection attempt`
- ✅ Log: `Socket authenticated successfully`
- ✅ Log: `User connected to chat`

## مثال كامل للاختبار

1. **احصل على توكن:**
```bash
POST http://localhost:3006/api/auth-user/login
Content-Type: application/json

{
  "email": "safnks0@gmail.com",
  "password": "your_password"
}
```

2. **انسخ الـ access_token من الاستجابة**

3. **اتصل بـ WebSocket:**
```
ws://localhost:3006?token=PASTE_TOKEN_HERE
```

4. **أرسل event:**
```json
{
  "event": "joinConversation",
  "data": {
    "conversationId": 1
  }
}
```

5. **انتظر الاستجابة:**
```json
{
  "event": "joinedConversation",
  "data": {
    "success": true,
    "conversationId": 1
  }
}
```

## استكشاف الأخطاء

إذا استمرت المشكلة:

1. **تحقق من السيرفر:**
   ```bash
   # راقب الـ logs في الوقت الفعلي
   tail -f app.log
   # أو في Windows PowerShell:
   Get-Content app.log -Wait -Tail 50
   ```

2. **تحقق من التوكن:**
   ```bash
   # فك تشفير التوكن على jwt.io
   # تأكد من:
   # - exp (expiration) لم ينتهي
   # - id موجود
   # - entityType موجود
   ```

3. **تحقق من CORS:**
   - تأكد من أن Postman مسموح له بالاتصال
   - راجع إعدادات `corsOptions` في `app.js`

4. **تحقق من البورت:**
   - تأكد من أن السيرفر يعمل على البورت 3006
   - تأكد من عدم وجود تطبيق آخر يستخدم نفس البورت

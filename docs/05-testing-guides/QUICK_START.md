# ⚡ دليل البدء السريع - Socket.IO Chat

**الوقت المتوقع:** 5 دقائق ⏱️

---

## 🎯 الهدف

تشغيل واختبار نظام الدردشة بأسرع طريقة ممكنة.

---

## 📍 الخطوة 1: تشغيل الخادم (30 ثانية)

```bash
# في مجلد المشروع
npm start
```

**توقع أن ترى:**
```
Server running on port 3006
Socket.IO initialized
```

---

## 📍 الخطوة 2: الحصول على Token (1 دقيقة)

### في Postman:

1. **طلب جديد** → POST
2. **URL:** `http://localhost:3006/api/auth-user/login`
3. **Body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "entityType": "user"
}
```
4. **Send** → انسخ `accessToken`

---

## 📍 الخطوة 3: إنشاء محادثة (30 ثانية)

1. **طلب جديد** → POST
2. **URL:** `http://localhost:3006/api/conversations`
3. **Authorization:** Bearer Token → الصق Token
4. **Body (JSON):**
```json
{
  "recipient_id": 5,
  "recipient_type": "doctor"
}
```
5. **Send** → احفظ `conversation.id`

---

## 📍 الخطوة 4: اختبار Socket.IO (دقيقتان)

### الطريقة السريعة: استخدام الملف الجاهز

```bash
# 1. ثبت المكتبة
npm install socket.io-client

# 2. افتح ملف test-socket-client.js
# 3. عدّل هذين السطرين:
const USER_TOKEN = 'الصق_Token_هنا';
const CONVERSATION_ID = 1; // معرف المحادثة

# 4. شغّل
node test-socket-client.js
```

**النتيجة المتوقعة:**
```
✅ Connected to server
✅ Joined conversation
✅ Message sent successfully
```

---

## 📍 اختبار في Postman (دقيقتان)

### 1. إنشاء WebSocket Request

في Postman:
- **New** → **WebSocket Request**

### 2. URL الصحيح

```
ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=الصق_Token_هنا
```

**⚠️ مهم:** استبدل `الصق_Token_هنا` بالـ Token الفعلي!

### 3. Connect

اضغط **Connect** → يجب أن ترى `✅ Connected`

### 4. الانضمام للمحادثة

في **New Message:**
```
42["joinConversation",{"conversationId":1}]
```

### 5. إرسال رسالة

```
42["sendMessage",{"conversationId":1,"content":"مرحباً","messageType":"text"}]
```

**تهانينا! 🎉** نظام الدردشة يعمل!

---

## 🐛 حل المشاكل السريع

### المشكلة: "Authentication error"

**الحل:**
- تأكد من نسخ Token بالكامل (بدون مسافات)
- احصل على Token جديد

### المشكلة: "Conversation ID is required"

**الحل:**
- تأكد من الصيغة:
```
42["joinConversation",{"conversationId":1}]
```

### المشكلة: "Not authorized"

**الحل:**
- أنشئ محادثة جديدة
- تأكد من أنك مشارك فيها

---

## 📚 الخطوات التالية

بعد التأكد من أن كل شيء يعمل:

1. **اقرأ:** `SOCKET_IO_INTEGRATION_GUIDE.md` - للتكامل مع Frontend
2. **اقرأ:** `SOCKET_IO_TESTING_POSTMAN.md` - للاختبار التفصيلي
3. **اقرأ:** `SOCKET_CHAT_API.md` - للتوثيق الكامل

---

## ✅ Checklist

- [ ] الخادم يعمل
- [ ] حصلت على Token
- [ ] أنشأت محادثة
- [ ] اختبرت Socket.IO بالكود
- [ ] اختبرت Socket.IO في Postman
- [ ] أرسلت رسالة بنجاح

---

**وقت الإنجاز:** ✅ 5 دقائق!

**التالي:** ابدأ التكامل مع تطبيقك! 🚀

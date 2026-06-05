# 💬 Chat & Socket.IO System Documentation
# توثيق نظام الشات والـ Socket.IO

> **المجلد:** `04-chat-socket-system/`  
> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 المحتويات | Contents

هذا المجلد يحتوي على التوثيق الكامل لنظام الشات Real-time باستخدام Socket.IO.

### 📄 الملفات:

1. **`SOCKET_IO_INTEGRATION_GUIDE.md`** - دليل التكامل الشامل
2. **`SOCKET_CHAT_API.md`** - توثيق Socket.IO API
3. **`SOCKET_README.md`** - مقدمة عن النظام
4. **`SOCKET_IO_TESTING_POSTMAN.md`** - اختبار Socket.IO في Postman
5. **`SOCKET_TESTING_GUIDE.md`** - دليل الاختبار
6. **`CONVERSATIONS_API.md`** - API المحادثات
7. **`CHAT_PHASE_1_COMPLETE.md`** - المرحلة الأولى
8. **`CHAT_PHASE_2_COMPLETE.md`** - المرحلة الثانية
9. **`CHAT_TEST_SUMMARY.md`** - ملخص الاختبارات
10. **`test-socket-client.js`** - كود اختبار جاهز

---

## 🎯 الميزات الرئيسية | Main Features

### ✅ Real-time Chat
- إرسال واستقبال الرسائل فوراً
- دعم الرسائل النصية
- دعم الملفات والصور
- Typing indicators

### ✅ إدارة المحادثات
- إنشاء محادثة جديدة
- عرض قائمة المحادثات
- حذف المحادثة
- أرشفة المحادثة

### ✅ حالة الاتصال
- Online/Offline Status
- Last Seen
- Presence Detection

### ✅ إشعارات
- إشعارات الرسائل الجديدة
- Read Receipts
- Delivery Status

---

## 🚀 البدء السريع | Quick Start

### 1. الاتصال بـ Socket.IO:

```javascript
const socket = io('http://localhost:3006', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('Connected!');
});
```

### 2. إرسال رسالة:

```javascript
socket.emit('send_message', {
  conversation_id: 1,
  message: 'Hello!',
  message_type: 'text'
});
```

### 3. استقبال رسالة:

```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
});
```

---

## 📡 Socket Events | الأحداث

### Client → Server:

```javascript
// إرسال رسالة
socket.emit('send_message', {
  conversation_id: number,
  message: string,
  message_type: 'text' | 'image' | 'file'
});

// بدء الكتابة
socket.emit('typing_start', {
  conversation_id: number
});

// إيقاف الكتابة
socket.emit('typing_stop', {
  conversation_id: number
});

// قراءة الرسائل
socket.emit('mark_as_read', {
  conversation_id: number
});
```

### Server → Client:

```javascript
// رسالة جديدة
socket.on('new_message', (data) => {});

// شخص يكتب
socket.on('user_typing', (data) => {});

// شخص توقف عن الكتابة
socket.on('user_stopped_typing', (data) => {});

// تم قراءة الرسالة
socket.on('message_read', (data) => {});

// حالة الاتصال
socket.on('user_online', (data) => {});
socket.on('user_offline', (data) => {});
```

---

## 🔧 REST APIs | الـ APIs

### المحادثات:

```
GET    /api/conversations              # عرض جميع المحادثات
GET    /api/conversations/:id          # عرض محادثة محددة
POST   /api/conversations              # إنشاء محادثة جديدة
DELETE /api/conversations/:id          # حذف محادثة
```

### الرسائل:

```
GET    /api/conversations/:id/messages # عرض رسائل المحادثة
POST   /api/conversations/:id/messages # إرسال رسالة (REST)
DELETE /api/messages/:id               # حذف رسالة
```

---

## 📖 الملفات المرجعية | Reference Files

### للبدء:
1. **`SOCKET_README.md`** - ابدأ من هنا!
2. **`SOCKET_IO_INTEGRATION_GUIDE.md`** - دليل التكامل

### للتطوير:
1. **`SOCKET_CHAT_API.md`** - توثيق API
2. **`CONVERSATIONS_API.md`** - API المحادثات

### للاختبار:
1. **`test-socket-client.js`** - كود اختبار جاهز
2. **`SOCKET_TESTING_GUIDE.md`** - دليل الاختبار
3. **`SOCKET_IO_TESTING_POSTMAN.md`** - اختبار في Postman

### المراحل:
1. **`CHAT_PHASE_1_COMPLETE.md`** - المرحلة الأولى
2. **`CHAT_PHASE_2_COMPLETE.md`** - المرحلة الثانية

---

## 💡 نصائح | Tips

### ✅ للاتصال:
- استخدم JWT Token في auth
- تأكد من الـ CORS settings
- تحقق من اتصال Socket.IO

### ✅ للرسائل:
- استخدم Socket.IO للرسائل الفورية
- استخدم REST API للرسائل القديمة
- احفظ الرسائل في قاعدة البيانات

### ✅ للاختبار:
- استخدم `test-socket-client.js`
- جرب في متصفحين مختلفين
- تحقق من Console logs

---

## 🔗 روابط ذات صلة | Related Links

- [نظام المصادقة](../01-authentication/)
- [نظام الملفات](../03-file-upload-system/)
- [دليل الاختبار](../05-testing-guides/)

---

**العودة إلى:** [التوثيق الرئيسي](../README.md)

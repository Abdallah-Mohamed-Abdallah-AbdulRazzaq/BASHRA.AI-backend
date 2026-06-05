# 💬 Socket.IO Chat System - التوثيق الكامل

**المشروع:** BASHRA.AI Backend  
**التاريخ:** 11 نوفمبر 2025  
**الإصدار:** 2.0

---

## 📚 فهرس التوثيق

### 🚀 للبدء السريع
- **[دليل البدء السريع](./QUICK_START.md)** - ابدأ في 5 دقائق

### 🧪 للاختبار
- **[اختبار Socket.IO في Postman](./SOCKET_IO_TESTING_POSTMAN.md)** - دليل مفصل خطوة بخطوة
- **[ملف الاختبار: test-socket-client.js](../test-socket-client.js)** - سكريبت جاهز للاختبار

### 👨‍💻 للمطورين
- **[دليل التكامل](./SOCKET_IO_INTEGRATION_GUIDE.md)** - React, Flutter, Angular
- **[توثيق Socket.IO API](./SOCKET_CHAT_API.md)** - جميع Events والبيانات
- **[توثيق REST API](./CONVERSATIONS_API.md)** - Endpoints المحادثات

### 📖 للمراجعة
- **[ملخص المرحلة الثانية](./CHAT_PHASE_2_COMPLETE.md)** - ما تم إنجازه
- **[إصلاحات المرحلة الأولى](./BUGFIXES_PHASE_1.md)** - الأخطاء والحلول

---

## 🎯 نظرة عامة على النظام

### ما هو Socket.IO Chat System؟

نظام دردشة فوري يسمح بـ:
- ✅ **محادثات ثنائية** بين المستخدمين والأطباء
- ✅ **إشعارات فورية** عند وصول رسائل جديدة
- ✅ **مؤشر الكتابة** (Typing Indicator)
- ✅ **إشعارات القراءة** (Read Receipts)
- ✅ **أنواع رسائل متعددة** (نص، صور، ملفات، صوت)
- ✅ **أمان عالي** (JWT Authentication)

---

## 🏗️ البنية المعمارية

### المكونات الرئيسية

```
┌─────────────────────────────────────────┐
│         Frontend Application            │
│  (React / React Native / Flutter)       │
└─────────────┬───────────────────────────┘
              │
              │ Socket.IO Client
              │
┌─────────────▼───────────────────────────┐
│         Socket.IO Server                │
│    (app.js + chatSocketHandler.js)      │
└─────────────┬───────────────────────────┘
              │
              │ Authentication Middleware
              │ (JWT Verification)
              │
┌─────────────▼───────────────────────────┐
│        Event Handlers                   │
│  - joinConversation                     │
│  - sendMessage                          │
│  - typing / stopTyping                  │
│  - markAsRead                           │
└─────────────┬───────────────────────────┘
              │
              │ Database Queries
              │
┌─────────────▼───────────────────────────┐
│          MySQL Database                 │
│  - conversations                        │
│  - conversation_participants            │
│  - messages                             │
└─────────────────────────────────────────┘
```

---

## 🔐 كيف يعمل Authentication؟

### الخطوة 1: الحصول على Token

```http
POST /api/auth-user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "entityType": "user"
}
```

**Response:**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### الخطوة 2: الاتصال بـ Socket.IO

```javascript
const socket = io('http://localhost:3006', {
  auth: {
    token: accessToken  // ← هذا مهم جداً!
  }
});
```

### الخطوة 3: التحقق في الخادم

```javascript
// في app.js - Socket Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  // التحقق من Token
  const decoded = jwt.verify(token, process.env.SECRET_KEY);
  
  // حفظ بيانات المستخدم في Socket
  socket.userId = decoded.id;
  socket.entityType = decoded.entityType;
  
  next();
});
```

---

## 💬 كيف تعمل المحادثات؟

### السيناريو الكامل

#### 1. إنشاء محادثة جديدة (REST API)

```http
POST /api/conversations
Authorization: Bearer YOUR_TOKEN

{
  "recipient_id": 5,
  "recipient_type": "doctor"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "uuid": "conv-abc123"
  }
}
```

#### 2. الاتصال بـ Socket.IO

```javascript
const socket = io('http://localhost:3006', {
  auth: { token: 'YOUR_TOKEN' }
});
```

#### 3. الانضمام للمحادثة

```javascript
socket.emit('joinConversation', {
  conversationId: 1
});

socket.on('joinedConversation', (data) => {
  console.log('✅ Joined:', data);
});
```

#### 4. إرسال رسالة

```javascript
socket.emit('sendMessage', {
  conversationId: 1,
  content: 'مرحباً دكتور',
  messageType: 'text'
});

socket.on('messageSent', (data) => {
  console.log('✅ Sent:', data.message);
});
```

#### 5. استقبال رسائل

```javascript
socket.on('newMessage', (message) => {
  console.log('📩 New message:', message);
  
  // عرض الرسالة في UI
  displayMessage(message);
  
  // تحديد كمقروء
  socket.emit('markAsRead', {
    conversationId: 1,
    messageIds: [message.id]
  });
});
```

---

## 📊 قاعدة البيانات

### الجداول الرئيسية

#### 1. conversations
```sql
CREATE TABLE conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP
);
```

#### 2. conversation_participants
```sql
CREATE TABLE conversation_participants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  conversation_id INT,
  participant_id INT,
  participant_type ENUM('user', 'doctor', 'admin', 'assistant'),
  joined_at TIMESTAMP,
  UNIQUE KEY (conversation_id, participant_id, participant_type)
);
```

#### 3. messages
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE,
  conversation_id INT,
  sender_id INT,
  sender_type ENUM('user', 'doctor', 'admin', 'assistant'),
  content TEXT,
  message_type ENUM('text', 'image', 'file', 'voice', 'system'),
  is_read TINYINT(1) DEFAULT 0,
  read_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## 🎨 أمثلة التكامل

### React Example

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatScreen({ conversationId }) {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const newSocket = io('http://localhost:3006', {
      auth: { token }
    });
    
    newSocket.on('connect', () => {
      newSocket.emit('joinConversation', { conversationId });
    });
    
    newSocket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    setSocket(newSocket);
    
    return () => newSocket.disconnect();
  }, [conversationId]);
  
  const sendMessage = (text) => {
    socket.emit('sendMessage', {
      conversationId,
      content: text,
      messageType: 'text'
    });
  };
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### Flutter Example

```dart
import 'package:socket_io_client/socket_io_client.dart';

class ChatService {
  Socket? socket;
  
  void connect(String token, int conversationId) {
    socket = io('http://localhost:3006', 
      OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .build()
    );
    
    socket!.on('connect', (_) {
      socket!.emit('joinConversation', {
        'conversationId': conversationId
      });
    });
    
    socket!.on('newMessage', (data) {
      print('New message: $data');
    });
    
    socket!.connect();
  }
  
  void sendMessage(int conversationId, String text) {
    socket!.emit('sendMessage', {
      'conversationId': conversationId,
      'content': text,
      'messageType': 'text'
    });
  }
}
```

---

## 🧪 الاختبار

### اختبار سريع بالكود

```bash
# 1. ثبت المكتبة
npm install socket.io-client

# 2. عدّل test-socket-client.js
# ضع Token و Conversation ID

# 3. شغّل
node test-socket-client.js
```

### اختبار في Postman

```
URL: ws://localhost:3006/socket.io/?EIO=4&transport=websocket&token=YOUR_TOKEN

Message: 42["joinConversation",{"conversationId":1}]
```

**للتفاصيل:** اقرأ [SOCKET_IO_TESTING_POSTMAN.md](./SOCKET_IO_TESTING_POSTMAN.md)

---

## 🎯 Events المتاحة

### Events ترسلها (Client → Server)

| Event | Parameters | الوصف |
|-------|-----------|-------|
| `joinConversation` | `{conversationId}` | الانضمام لمحادثة |
| `leaveConversation` | `{conversationId}` | مغادرة محادثة |
| `sendMessage` | `{conversationId, content, messageType}` | إرسال رسالة |
| `typing` | `{conversationId}` | بدء الكتابة |
| `stopTyping` | `{conversationId}` | إيقاف الكتابة |
| `markAsRead` | `{conversationId, messageIds}` | تحديد كمقروء |

### Events تستقبلها (Server → Client)

| Event | Data | الوصف |
|-------|------|-------|
| `joinedConversation` | `{success, conversationId}` | تأكيد الانضمام |
| `messageSent` | `{success, message}` | تأكيد الإرسال |
| `newMessage` | `{message object}` | رسالة جديدة |
| `userTyping` | `{userId, entityType}` | مستخدم يكتب |
| `userStoppedTyping` | `{userId, entityType}` | توقف الكتابة |
| `markedAsRead` | `{conversationId, messageIds}` | تأكيد القراءة |
| `messagesRead` | `{readBy, messageIds}` | رسائلك قُرئت |
| `messageNotification` | `{conversationId, message}` | إشعار رسالة |

---

## 🔒 الأمان

### 1. JWT Authentication

- ✅ كل اتصال Socket.IO يتطلب Token صالح
- ✅ Token يُتحقق منه قبل أي عملية
- ✅ انتهاء صلاحية Token يقطع الاتصال

### 2. Authorization

- ✅ التحقق من المشاركة في المحادثة قبل الانضمام
- ✅ التحقق من المشاركة قبل إرسال رسائل
- ✅ عزل المحادثات (لا يمكن الوصول لمحادثات الآخرين)

### 3. Data Validation

- ✅ التحقق من صحة البيانات المُرسلة
- ✅ منع SQL Injection
- ✅ تنظيف المدخلات

---

## 🚀 Production Best Practices

### 1. استخدام HTTPS

```javascript
// Production
const socket = io('https://your-domain.com', {
  auth: { token },
  secure: true
});
```

### 2. معالجة إعادة الاتصال

```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});
```

### 3. Error Handling

```javascript
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  // محاولة الحصول على Token جديد
  refreshToken().then(newToken => {
    socket.auth.token = newToken;
    socket.connect();
  });
});
```

---

## 📞 الدعم والمساعدة

### الملفات المرجعية

1. **[QUICK_START.md](./QUICK_START.md)** - للبدء السريع
2. **[SOCKET_IO_TESTING_POSTMAN.md](./SOCKET_IO_TESTING_POSTMAN.md)** - للاختبار
3. **[SOCKET_IO_INTEGRATION_GUIDE.md](./SOCKET_IO_INTEGRATION_GUIDE.md)** - للتكامل
4. **[SOCKET_CHAT_API.md](./SOCKET_CHAT_API.md)** - للتوثيق الكامل

### حل المشاكل

**مشكلة:** Authentication error  
**الحل:** تأكد من Token صحيح وغير منتهي

**مشكلة:** لا أستقبل رسائل  
**الحل:** تأكد من الانضمام للمحادثة أولاً

**مشكلة:** Unauthorized  
**الحل:** أنشئ محادثة جديدة بينك وبين المستلم

---

## ✅ Checklist التكامل

- [ ] قرأت QUICK_START.md
- [ ] اختبرت Socket.IO بالكود
- [ ] اختبرت في Postman
- [ ] فهمت كيفية Authentication
- [ ] فهمت كيفية إرسال واستقبال الرسائل
- [ ] جاهز للتكامل مع Frontend

---

**تم بواسطة:** Cascade AI  
**التاريخ:** 11 نوفمبر 2025  
**الحالة:** ✅ جاهز للإنتاج

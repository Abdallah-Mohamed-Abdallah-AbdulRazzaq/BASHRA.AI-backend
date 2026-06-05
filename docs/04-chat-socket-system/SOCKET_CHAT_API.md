# 🔌 Socket.IO Chat API - المرحلة الثانية

**التاريخ:** 10 نوفمبر 2025  
**الحالة:** ✅ مكتمل

---

## 📋 نظرة عامة

تم تنفيذ **المرحلة الثانية** من نظام الدردشة - الاتصال الفوري عبر Socket.IO.

### ما تم تنفيذه:

✅ **دمج Socket.IO مع Express**
- Socket Server يعمل على نفس الـ Port مع Express
- CORS configuration للسماح للعملاء بالاتصال

✅ **مصادقة Sockets (Socket Authentication Middleware)**
- التحقق من JWT Token عند الاتصال
- تخزين بيانات المستخدم في Socket
- حظر الاتصالات غير المصرح بها

✅ **إدارة الغرف (Room Management)**
- `joinConversation`: الانضمام لمحادثة
- `leaveConversation`: مغادرة محادثة
- التحقق من صلاحيات الوصول

✅ **إرسال واستقبال الرسائل الفورية**
- `sendMessage`: إرسال رسالة
- `newMessage`: استقبال رسالة جديدة
- حفظ الرسائل في قاعدة البيانات

✅ **Typing Indicators**
- `typing`: المستخدم يكتب
- `stopTyping`: المستخدم توقف عن الكتابة

✅ **Read Receipts**
- `markAsRead`: تحديث حالة الرسائل إلى "مقروءة"
- `messagesRead`: إشعار المرسل أن رسائله تم قراءتها

---

## 🔐 المصادقة (Authentication)

### الاتصال بـ Socket.IO

يجب إرسال JWT Token عند الاتصال:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3006', {
  auth: {
    token: 'your-jwt-token-here'
  }
});
```

### التحقق من الاتصال

```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

---

## 🔌 Socket Events

### 1️⃣ الانضمام لمحادثة (Join Conversation)

**Event:** `joinConversation`

**Description:** الانضمام لغرفة محادثة معينة للبدء في استقبال الرسائل الفورية.

**إرسال:**
```javascript
socket.emit('joinConversation', {
  conversationId: 1
});
```

**استقبال (نجاح):**
```javascript
socket.on('joinedConversation', (data) => {
  console.log('Joined conversation:', data);
  // {
  //   success: true,
  //   conversationId: 1
  // }
});
```

**استقبال (إشعار للمشاركين):**
```javascript
socket.on('userJoined', (data) => {
  console.log('User joined:', data);
  // {
  //   userId: 10,
  //   entityType: 'user'
  // }
});
```

**استقبال (خطأ):**
```javascript
socket.on('error', (error) => {
  console.error('Error:', error.message_ar);
});
```

**Features:**
- ✅ التحقق من أن المستخدم مشارك في المحادثة
- ✅ استخدام `conversation:conversationId` كاسم الغرفة
- ✅ إشعار جميع المشاركين الآخرين

---

### 2️⃣ مغادرة محادثة (Leave Conversation)

**Event:** `leaveConversation`

**Description:** مغادرة غرفة المحادثة.

**إرسال:**
```javascript
socket.emit('leaveConversation', {
  conversationId: 1
});
```

**استقبال (نجاح):**
```javascript
socket.on('leftConversation', (data) => {
  console.log('Left conversation:', data);
  // {
  //   success: true,
  //   conversationId: 1
  // }
});
```

**استقبال (إشعار للمشاركين):**
```javascript
socket.on('userLeft', (data) => {
  console.log('User left:', data);
  // {
  //   userId: 10,
  //   entityType: 'user'
  // }
});
```

---

### 3️⃣ إرسال رسالة (Send Message)

**Event:** `sendMessage`

**Description:** إرسال رسالة جديدة إلى محادثة.

**إرسال:**
```javascript
socket.emit('sendMessage', {
  conversationId: 1,
  content: 'مرحباً، كيف حالك؟',
  messageType: 'text',        // optional: 'text' (default), 'image', 'file', 'voice'
  fileId: null,                // optional: معرف الملف المرفق
  replyToMessageId: null       // optional: معرف الرسالة المراد الرد عليها
});
```

**استقبال (تأكيد للمرسل):**
```javascript
socket.on('messageSent', (data) => {
  console.log('Message sent successfully:', data);
  // {
  //   success: true,
  //   message: {
  //     id: 100,
  //     uuid: 'msg-uuid-123',
  //     conversationId: 1,
  //     senderId: 10,
  //     senderType: 'user',
  //     senderName: 'أحمد محمد',
  //     messageType: 'text',
  //     content: 'مرحباً، كيف حالك؟',
  //     fileId: null,
  //     replyToMessageId: null,
  //     isRead: false,
  //     createdAt: '2025-11-10T14:30:00.000Z',
  //     updatedAt: '2025-11-10T14:30:00.000Z'
  //   }
  // }
});
```

**استقبال (رسالة جديدة للمشاركين):**
```javascript
socket.on('newMessage', (message) => {
  console.log('New message received:', message);
  // نفس البنية أعلاه
});
```

**استقبال (إشعار في الغرفة الشخصية):**
```javascript
socket.on('messageNotification', (data) => {
  console.log('New message notification:', data);
  // {
  //   conversationId: 1,
  //   message: { ... }
  // }
});
```

**Features:**
- ✅ حفظ الرسالة في قاعدة البيانات
- ✅ تحديث `last_message_at` في المحادثة
- ✅ إرسال الرسالة لجميع المشاركين في الغرفة
- ✅ إرسال إشعار للمشاركين في غرفهم الشخصية
- ✅ دعم أنواع الرسائل المختلفة
- ✅ دعم الرد على رسائل معينة

---

### 4️⃣ المستخدم يكتب (Typing Indicator)

**Event:** `typing`

**Description:** إشعار المشاركين أن المستخدم يكتب.

**إرسال:**
```javascript
socket.emit('typing', {
  conversationId: 1
});
```

**استقبال:**
```javascript
socket.on('userTyping', (data) => {
  console.log('User is typing:', data);
  // {
  //   userId: 10,
  //   entityType: 'user',
  //   conversationId: 1
  // }
});
```

**Best Practice:**
استخدم debounce لتقليل عدد الـ events:
```javascript
let typingTimeout;
inputField.addEventListener('input', () => {
  socket.emit('typing', { conversationId: 1 });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping', { conversationId: 1 });
  }, 2000);
});
```

---

### 5️⃣ المستخدم توقف عن الكتابة (Stop Typing)

**Event:** `stopTyping`

**Description:** إشعار المشاركين أن المستخدم توقف عن الكتابة.

**إرسال:**
```javascript
socket.emit('stopTyping', {
  conversationId: 1
});
```

**استقبال:**
```javascript
socket.on('userStoppedTyping', (data) => {
  console.log('User stopped typing:', data);
  // {
  //   userId: 10,
  //   entityType: 'user',
  //   conversationId: 1
  // }
});
```

---

### 6️⃣ تحديث حالة الرسائل إلى "مقروءة" (Mark as Read)

**Event:** `markAsRead`

**Description:** تحديث حالة رسائل معينة إلى "مقروءة".

**إرسال:**
```javascript
socket.emit('markAsRead', {
  conversationId: 1,
  messageIds: [100, 101, 102]
});
```

**استقبال (تأكيد):**
```javascript
socket.on('markedAsRead', (data) => {
  console.log('Marked as read:', data);
  // {
  //   success: true,
  //   conversationId: 1,
  //   messageIds: [100, 101, 102]
  // }
});
```

**استقبال (إشعار للمرسل):**
```javascript
socket.on('messagesRead', (data) => {
  console.log('Your messages were read:', data);
  // {
  //   conversationId: 1,
  //   messageIds: [100, 101, 102],
  //   readBy: {
  //     userId: 5,
  //     entityType: 'doctor'
  //   }
  // }
});
```

**Features:**
- ✅ تحديث `is_read` و `read_at` في قاعدة البيانات
- ✅ إشعار المرسل الأصلي
- ✅ دعم تحديث عدة رسائل دفعة واحدة

---

## 🏗️ البنية التقنية (Architecture)

### Socket.IO Server Setup

```javascript
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,    // 60 seconds
  pingInterval: 25000    // 25 seconds
});
```

### Socket Authentication Middleware

```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    
    socket.userId = decoded.id;
    socket.entityType = decoded.entityType;
    
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### Room Naming Convention

- **Personal Room:** `{entityType}:{userId}`
  - Example: `user:10`, `doctor:5`
  - للإشعارات الشخصية

- **Conversation Room:** `conversation:{conversationId}`
  - Example: `conversation:1`
  - للرسائل الفورية في المحادثة

---

## 📊 تدفق البيانات (Data Flow)

### إرسال رسالة:

```
1. العميل: socket.emit('sendMessage', data)
2. الخادم: التحقق من الصلاحيات
3. الخادم: حفظ في قاعدة البيانات
4. الخادم: socket.emit('messageSent', message) → للمرسل
5. الخادم: socket.to('conversation:1').emit('newMessage', message) → للمشاركين
6. الخادم: io.to('user:5').emit('messageNotification', data) → للإشعارات
```

### الانضمام لمحادثة:

```
1. العميل: socket.emit('joinConversation', {conversationId: 1})
2. الخادم: التحقق من أن المستخدم مشارك في المحادثة
3. الخادم: socket.join('conversation:1')
4. الخادم: socket.emit('joinedConversation', {success: true})
5. الخادم: socket.to('conversation:1').emit('userJoined', user)
```

---

## 🧪 أمثلة الاستخدام (Usage Examples)

### مثال كامل - React/Vue/Angular

```javascript
import io from 'socket.io-client';

// 1. الاتصال بالخادم
const socket = io('http://localhost:3006', {
  auth: {
    token: localStorage.getItem('accessToken')
  }
});

// 2. معالجة الاتصال
socket.on('connect', () => {
  console.log('Connected to chat server');
  
  // 3. الانضمام للمحادثة
  socket.emit('joinConversation', {
    conversationId: 1
  });
});

// 4. استقبال تأكيد الانضمام
socket.on('joinedConversation', (data) => {
  console.log('Joined conversation:', data.conversationId);
});

// 5. إرسال رسالة
function sendMessage(text) {
  socket.emit('sendMessage', {
    conversationId: 1,
    content: text,
    messageType: 'text'
  });
}

// 6. استقبال رسائل جديدة
socket.on('newMessage', (message) => {
  // إضافة الرسالة للـ UI
  addMessageToChat(message);
  
  // تحديث حالتها إلى "مقروءة"
  socket.emit('markAsRead', {
    conversationId: message.conversationId,
    messageIds: [message.id]
  });
});

// 7. Typing indicator
let typingTimeout;
inputField.addEventListener('input', () => {
  socket.emit('typing', { conversationId: 1 });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stopTyping', { conversationId: 1 });
  }, 2000);
});

socket.on('userTyping', (data) => {
  showTypingIndicator(data.userId);
});

socket.on('userStoppedTyping', (data) => {
  hideTypingIndicator(data.userId);
});

// 8. عند مغادرة الصفحة
window.addEventListener('beforeunload', () => {
  socket.emit('leaveConversation', {
    conversationId: 1
  });
  socket.disconnect();
});
```

---

## 🔒 الأمان (Security)

### التحقق من الصلاحيات

كل event يتحقق من:
1. ✅ المستخدم مصادق عليه (JWT صحيح)
2. ✅ المستخدم مشارك في المحادثة
3. ✅ البيانات المرسلة صحيحة

### حماية من الهجمات

- ✅ Rate limiting على Socket connections (مدمج في app.js)
- ✅ التحقق من كل conversation_id
- ✅ منع إرسال رسائل لمحادثات غير مصرح بها

---

## 📝 ملاحظات مهمة

### 1. Personal Rooms
كل مستخدم ينضم تلقائياً لغرفته الشخصية عند الاتصال:
```javascript
socket.join(`${socket.entityType}:${socket.userId}`);
```

### 2. Conversation Rooms
يجب على المستخدم إرسال `joinConversation` للانضمام لغرفة محادثة.

### 3. Message Persistence
جميع الرسائل يتم حفظها في قاعدة البيانات فوراً.

### 4. Disconnection
عند قطع الاتصال، Socket.IO يزيل المستخدم من جميع الغرف تلقائياً.

---

## 🚀 الخطوات التالية

المرحلة الثانية مكتملة ✅

**في انتظار المرحلة الثالثة:**
- إرسال ملفات ومرفقات
- الرد على رسائل معينة (UI)
- حذف وتعديل الرسائل
- Emoji reactions
- Message search

---

## 📞 Support

للاستفسارات أو المساعدة، يرجى التواصل مع فريق التطوير.

**تم التنفيذ بواسطة:** Cascade AI  
**التاريخ:** 10 نوفمبر 2025

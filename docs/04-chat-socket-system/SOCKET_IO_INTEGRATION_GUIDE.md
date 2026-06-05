# 📱 دليل التكامل مع Socket.IO - للمطورين

**التاريخ:** 11 نوفمبر 2025  
**الإصدار:** 1.0

---

## 📋 نظرة عامة

هذا الدليل موجه لمطوري **Frontend** (React, React Native, Flutter, Angular) لشرح كيفية التكامل مع Socket.IO Chat System.

---

## 🎯 الهدف من النظام

نظام الدردشة يسمح بـ:
- ✅ محادثات فورية بين المستخدمين والأطباء
- ✅ إشعارات فورية عند وصول رسائل جديدة
- ✅ مؤشر "جاري الكتابة" (Typing Indicator)
- ✅ إشعارات قراءة الرسائل (Read Receipts)
- ✅ دعم أنواع رسائل متعددة (نص، صور، ملفات، صوت)

---

## 🔧 المتطلبات

### 1. مكتبات Socket.IO Client

**React / React Native:**
```bash
npm install socket.io-client
```

**Flutter:**
```yaml
dependencies:
  socket_io_client: ^2.0.3
```

**Angular:**
```bash
npm install socket.io-client
npm install @types/socket.io-client --save-dev
```

### 2. بيانات الاتصال

- **Server URL:** `http://localhost:3006` (في Development)
- **Production URL:** `https://your-domain.com`
- **JWT Token:** من Login API

---

## 📍 سيناريوهات الاستخدام الواقعية

### السيناريو 1️⃣: مستخدم يبدأ محادثة مع طبيب

#### الخطوة 1: المستخدم يبحث عن طبيب

**واجهة المستخدم:**
```
[قائمة الأطباء]
┌─────────────────────────────────┐
│ 👨‍⚕️ د. سارة أحمد               │
│    التخصص: طب الأطفال           │
│    [إرسال رسالة] ←              │
└─────────────────────────────────┘
```

**عند الضغط على "إرسال رسالة":**

1. **إنشاء محادثة جديدة:**
```javascript
// API Call
POST /api/conversations
Headers: {
  Authorization: "Bearer USER_JWT_TOKEN"
}
Body: {
  recipient_id: 5,        // ID الطبيب
  recipient_type: "doctor"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "conversation": {
    "id": 1,
    "uuid": "conv-abc123"
  }
}
```

2. **الانتقال لشاشة الدردشة:**
```javascript
// Navigate to Chat Screen
navigation.navigate('ChatScreen', {
  conversationId: 1,
  recipientName: 'د. سارة أحمد'
});
```

---

#### الخطوة 2: إعداد Socket Connection في شاشة الدردشة

**React / React Native:**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function ChatScreen({ route }) {
  const { conversationId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  
  // إعداد Socket Connection
  useEffect(() => {
    // احصل على Token من Storage
    const token = localStorage.getItem('accessToken');
    
    // الاتصال بـ Socket.IO
    socketRef.current = io('http://localhost:3006', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });
    
    const socket = socketRef.current;
    
    // معالجة الاتصال الناجح
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      
      // الانضمام للمحادثة فوراً
      socket.emit('joinConversation', {
        conversationId: conversationId
      });
    });
    
    // معالجة تأكيد الانضمام
    socket.on('joinedConversation', (data) => {
      console.log('✅ Joined conversation:', data);
    });
    
    // استقبال رسائل جديدة
    socket.on('newMessage', (message) => {
      console.log('📩 New message:', message);
      
      // إضافة الرسالة للقائمة
      setMessages(prev => [...prev, message]);
      
      // تشغيل صوت الإشعار (اختياري)
      playNotificationSound();
      
      // تحديد الرسالة كمقروءة تلقائياً
      socket.emit('markAsRead', {
        conversationId: conversationId,
        messageIds: [message.id]
      });
    });
    
    // معالجة مؤشر "جاري الكتابة"
    socket.on('userTyping', (data) => {
      console.log('⌨️ User is typing...');
      setIsTyping(true);
    });
    
    socket.on('userStoppedTyping', (data) => {
      console.log('⌨️ User stopped typing');
      setIsTyping(false);
    });
    
    // معالجة قراءة الرسائل
    socket.on('messagesRead', (data) => {
      console.log('✅ Messages read:', data);
      
      // تحديث حالة الرسائل في UI
      setMessages(prev => 
        prev.map(msg => 
          data.messageIds.includes(msg.id) 
            ? { ...msg, isRead: true } 
            : msg
        )
      );
    });
    
    // معالجة الأخطاء
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      alert(error.message_ar || error.message_en);
    });
    
    // Cleanup عند مغادرة الشاشة
    return () => {
      if (socket) {
        socket.emit('leaveConversation', {
          conversationId: conversationId
        });
        socket.disconnect();
      }
    };
  }, [conversationId]);
  
  // جلب الرسائل السابقة من API
  useEffect(() => {
    fetchPreviousMessages();
  }, []);
  
  const fetchPreviousMessages = async () => {
    try {
      const response = await fetch(
        `http://localhost:3006/api/conversations/${conversationId}/messages?limit=50&offset=0`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const data = await response.json();
      setMessages(data.messages.reverse()); // عكس الترتيب (الأقدم أولاً)
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  // إرسال رسالة
  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    const socket = socketRef.current;
    
    socket.emit('sendMessage', {
      conversationId: conversationId,
      content: inputText,
      messageType: 'text'
    });
    
    // مسح الـ Input
    setInputText('');
    
    // إيقاف مؤشر الكتابة
    socket.emit('stopTyping', {
      conversationId: conversationId
    });
  };
  
  // معالجة الكتابة
  const handleTextChange = (text) => {
    setInputText(text);
    
    const socket = socketRef.current;
    
    if (text.length > 0) {
      // إرسال "جاري الكتابة"
      socket.emit('typing', {
        conversationId: conversationId
      });
    } else {
      // إيقاف "جاري الكتابة"
      socket.emit('stopTyping', {
        conversationId: conversationId
      });
    }
  };
  
  return (
    <div className="chat-screen">
      {/* Header */}
      <div className="chat-header">
        <h2>د. سارة أحمد</h2>
        {isTyping && <span className="typing-indicator">جاري الكتابة...</span>}
      </div>
      
      {/* Messages List */}
      <div className="messages-container">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={msg.senderType === 'user' ? 'message-sent' : 'message-received'}
          >
            <p>{msg.content}</p>
            <span className="message-time">
              {new Date(msg.createdAt).toLocaleTimeString('ar-SA')}
              {msg.isRead && msg.senderType === 'user' && ' ✓✓'}
            </span>
          </div>
        ))}
      </div>
      
      {/* Input */}
      <div className="chat-input">
        <input
          type="text"
          value={inputText}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="اكتب رسالة..."
        />
        <button onClick={handleSendMessage}>إرسال</button>
      </div>
    </div>
  );
}

export default ChatScreen;
```

---

### السيناريو 2️⃣: قائمة المحادثات (Conversations List)

**واجهة المستخدم:**
```
[محادثاتي]
┌─────────────────────────────────┐
│ 👨‍⚕️ د. سارة أحمد               │
│    مرحباً، كيف يمكنني...       │
│    ⏰ منذ 5 دقائق   🔴 2       │
└─────────────────────────────────┘
│ 👨‍⚕️ د. محمد علي               │
│    شكراً لك                     │
│    ⏰ منذ ساعة      ✓✓          │
└─────────────────────────────────┘
```

**الكود:**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function ConversationsList() {
  const [conversations, setConversations] = useState([]);
  const socketRef = useRef(null);
  
  useEffect(() => {
    // جلب المحادثات من API
    fetchConversations();
    
    // إعداد Socket للإشعارات الفورية
    setupSocketNotifications();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  const fetchConversations = async () => {
    try {
      const response = await fetch(
        'http://localhost:3006/api/conversations',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  
  const setupSocketNotifications = () => {
    const token = localStorage.getItem('accessToken');
    
    socketRef.current = io('http://localhost:3006', {
      auth: { token }
    });
    
    const socket = socketRef.current;
    
    // استقبال إشعارات الرسائل الجديدة
    socket.on('messageNotification', (data) => {
      console.log('🔔 New message notification:', data);
      
      // تحديث القائمة
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              last_message_content: data.message.content,
              last_message_at: data.message.createdAt,
              unread_count: (conv.unread_count || 0) + 1
            };
          }
          return conv;
        });
        
        // ترتيب حسب آخر رسالة
        return updated.sort((a, b) => 
          new Date(b.last_message_at) - new Date(a.last_message_at)
        );
      });
      
      // إظهار إشعار للمستخدم
      showNotification({
        title: data.message.senderName,
        body: data.message.content,
        onClick: () => {
          // الانتقال للمحادثة
          navigateToChat(data.conversationId);
        }
      });
    });
  };
  
  const navigateToChat = (conversationId) => {
    // Navigate to chat screen
    window.location.href = `/chat/${conversationId}`;
  };
  
  return (
    <div className="conversations-list">
      <h1>محادثاتي</h1>
      {conversations.map(conv => (
        <div 
          key={conv.id} 
          className="conversation-item"
          onClick={() => navigateToChat(conv.id)}
        >
          <div className="conv-avatar">
            {/* صورة المستخدم */}
            <img src={conv.participants[1]?.avatar || '/default-avatar.png'} />
          </div>
          <div className="conv-details">
            <h3>{conv.participants[1]?.name || 'مستخدم'}</h3>
            <p className="last-message">{conv.last_message_content}</p>
          </div>
          <div className="conv-meta">
            <span className="time">
              {formatTimeAgo(conv.last_message_at)}
            </span>
            {conv.unread_count > 0 && (
              <span className="unread-badge">{conv.unread_count}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(date) {
  const now = new Date();
  const messageDate = new Date(date);
  const diff = now - messageDate;
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export default ConversationsList;
```

---

### السيناريو 3️⃣: طبيب يتلقى استشارة جديدة

**قصة المستخدم:**
> كطبيب، أريد أن أُشعر فوراً عندما يرسل لي مريض رسالة جديدة، حتى لو لم أكن في شاشة المحادثات.

**الحل: Global Socket Connection**

```javascript
// services/socketService.js
import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
  }
  
  connect(token) {
    if (this.socket?.connected) return;
    
    this.socket = io('http://localhost:3006', {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('✅ Global socket connected');
    });
    
    // استقبال إشعارات عامة
    this.socket.on('messageNotification', (data) => {
      console.log('🔔 Global notification:', data);
      
      // إظهار إشعار النظام
      if (Notification.permission === 'granted') {
        new Notification(data.message.senderName, {
          body: data.message.content,
          icon: '/notification-icon.png',
          tag: `conversation-${data.conversationId}`
        });
      }
      
      // تنبيه المستمعين
      this.emit('newMessage', data);
    });
    
    this.socket.on('error', (error) => {
      console.error('❌ Global socket error:', error);
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  // Event Emitter Pattern
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        cb => cb !== callback
      );
    }
  }
  
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
  
  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
```

**استخدام SocketService:**

```javascript
// App.js (أو index.js)
import React, { useEffect } from 'react';
import socketService from './services/socketService';

function App() {
  useEffect(() => {
    // الاتصال عند تسجيل الدخول
    const token = localStorage.getItem('accessToken');
    if (token) {
      socketService.connect(token);
      
      // طلب إذن الإشعارات
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
    
    // الاستماع للرسائل الجديدة
    const handleNewMessage = (data) => {
      console.log('New message in app:', data);
      // يمكنك تحديث Redux store هنا
      // dispatch(newMessageReceived(data));
    };
    
    socketService.on('newMessage', handleNewMessage);
    
    return () => {
      socketService.off('newMessage', handleNewMessage);
    };
  }, []);
  
  return (
    <div className="app">
      {/* Your app content */}
    </div>
  );
}

export default App;
```

---

## 🎨 أمثلة UI Components

### 1. Message Component

```jsx
function Message({ message, isOwn }) {
  return (
    <div className={`message ${isOwn ? 'message-own' : 'message-other'}`}>
      <div className="message-bubble">
        <p>{message.content}</p>
        <div className="message-footer">
          <span className="time">
            {new Date(message.createdAt).toLocaleTimeString('ar-SA', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          {isOwn && (
            <span className="read-status">
              {message.isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 2. Typing Indicator Component

```jsx
function TypingIndicator({ isTyping, userName }) {
  if (!isTyping) return null;
  
  return (
    <div className="typing-indicator">
      <span>{userName} يكتب</span>
      <div className="typing-dots">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </div>
    </div>
  );
}
```

**CSS:**
```css
.typing-dots span {
  animation: blink 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 60%, 100% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
}
```

---

## 📱 Flutter Integration

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ChatService {
  IO.Socket? socket;
  
  void connect(String token) {
    socket = IO.io('http://localhost:3006', <String, dynamic>{
      'transports': ['websocket'],
      'auth': {'token': token}
    });
    
    socket!.on('connect', (_) {
      print('✅ Connected to Socket.IO');
    });
    
    socket!.on('newMessage', (data) {
      print('📩 New message: $data');
      // تحديث UI
    });
    
    socket!.on('error', (data) {
      print('❌ Error: $data');
    });
    
    socket!.connect();
  }
  
  void joinConversation(int conversationId) {
    socket!.emit('joinConversation', {
      'conversationId': conversationId
    });
  }
  
  void sendMessage(int conversationId, String content) {
    socket!.emit('sendMessage', {
      'conversationId': conversationId,
      'content': content,
      'messageType': 'text'
    });
  }
  
  void disconnect() {
    socket?.disconnect();
    socket?.dispose();
  }
}
```

---

## 🔒 Best Practices

### 1. معالجة إعادة الاتصال

```javascript
socket.on('connect', () => {
  console.log('Connected');
  
  // إعادة الانضمام للمحادثات النشطة
  const activeConversations = getActiveConversations();
  activeConversations.forEach(convId => {
    socket.emit('joinConversation', { conversationId: convId });
  });
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  
  if (reason === 'io server disconnect') {
    // الخادم قطع الاتصال، حاول الاتصال يدوياً
    socket.connect();
  }
  // للأسباب الأخرى، Socket.IO يعيد الاتصال تلقائياً
});
```

### 2. تحسين الأداء

```javascript
// استخدام debounce لمؤشر الكتابة
import { debounce } from 'lodash';

const emitTyping = debounce(() => {
  socket.emit('typing', { conversationId });
}, 300);

const emitStopTyping = debounce(() => {
  socket.emit('stopTyping', { conversationId });
}, 1000);

// في Input Handler
const handleInputChange = (text) => {
  setInputText(text);
  
  if (text.length > 0) {
    emitTyping();
  } else {
    emitStopTyping();
  }
};
```

### 3. Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
  
  // عرض رسالة خطأ للمستخدم
  showErrorToast(error.message_ar || error.message_en);
  
  // Log للمراقبة
  logErrorToAnalytics('socket_error', error);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  
  // محاولة الحصول على Token جديد
  refreshTokenAndRetry();
});
```

---

## 📊 Testing

### Unit Testing (Jest + React Testing Library)

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatScreen from './ChatScreen';
import io from 'socket.io-client';

jest.mock('socket.io-client');

describe('ChatScreen', () => {
  let mockSocket;
  
  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn()
    };
    
    io.mockReturnValue(mockSocket);
  });
  
  it('should connect to socket on mount', () => {
    render(<ChatScreen conversationId={1} />);
    
    expect(io).toHaveBeenCalledWith('http://localhost:3006', {
      auth: expect.objectContaining({ token: expect.any(String) })
    });
  });
  
  it('should send message on button click', async () => {
    render(<ChatScreen conversationId={1} />);
    
    const input = screen.getByPlaceholderText('اكتب رسالة...');
    const sendButton = screen.getByText('إرسال');
    
    await userEvent.type(input, 'Hello');
    await userEvent.click(sendButton);
    
    expect(mockSocket.emit).toHaveBeenCalledWith('sendMessage', {
      conversationId: 1,
      content: 'Hello',
      messageType: 'text'
    });
  });
});
```

---

## 🚀 Production Checklist

- [ ] استخدام HTTPS (wss://) في Production
- [ ] تفعيل معالجة إعادة الاتصال
- [ ] إضافة Error Boundary
- [ ] تفعيل Analytics للأخطاء
- [ ] اختبار على اتصال بطيء
- [ ] اختبار قطع الاتصال المفاجئ
- [ ] تفعيل Compression
- [ ] إضافة Rate Limiting في Client

---

**تم إنشاء الدليل بواسطة:** Cascade AI  
**التاريخ:** 11 نوفمبر 2025

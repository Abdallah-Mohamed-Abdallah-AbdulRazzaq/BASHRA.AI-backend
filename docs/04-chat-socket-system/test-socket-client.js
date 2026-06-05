/**
 * ============================================
 * Socket.IO Chat - Test Client
 * ============================================
 * 
 * تعليمات الاستخدام:
 * 
 * 1. شغّل الخادم:
 *    npm start
 * 
 * 2. احصل على JWT Token:
 *    - استخدم Postman
 *    - POST http://localhost:3006/api/auth-user/login
 *    - Body: {"email": "user@example.com", "password": "password123", "entityType": "user"}
 *    - انسخ accessToken
 * 
 * 3. أنشئ محادثة:
 *    - POST http://localhost:3006/api/conversations
 *    - Authorization: Bearer YOUR_TOKEN
 *    - Body: {"recipient_id": 5, "recipient_type": "doctor"}
 *    - احفظ conversation.id
 * 
 * 4. عدّل القيم أدناه:
 *    - ضع Token في USER_TOKEN
 *    - ضع ID المحادثة في CONVERSATION_ID
 * 
 * 5. شغّل السكريبت:
 *    node test-socket-client.js
 * 
 * ============================================
 */

const io = require('socket.io-client');

// ============================================
// الإعدادات - عدّل هذه القيم
// ============================================

const SERVER_URL = 'https://api.bashraai.com';

// const SERVER_URL = 'http://localhost:3006';


// ضع هنا JWT Token الذي حصلت عليه من Login
// مثال: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MS...'
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6IjBiOWU3NjkwLTcwNTAtNGE1OC1hOWVmLTEwYzNiY2RmZjg3NiIsImVtYWlsIjoic3V2ZXlkdEBnbWFpbC5jb20iLCJlbnRpdHlUeXBlIjoidXNlciIsInRva2VuVHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MjY0NDg3NiwiZXhwIjoxNzczMjQ5Njc2fQ.BG1BkZs0N32i7_-W0xax6JGyt5crep8yLEyoyuhqPkU';

// معرف المحادثة (الذي أنشأته من POST /conversations)
// مثال: 1
const CONVERSATION_ID = 2;

// ============================================
// التحقق من الإعدادات
// ============================================

if (USER_TOKEN === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6ImViZmY4OGNhLTgxMzQtNDAzYi1iZDJlLWU3Njg3MzA2NGUwOSIsImVtYWlsIjoic2FmbmtzMEBnbWFpbC5jb20iLCJlbnRpdHlUeXBlIjoidXNlciIsInRva2VuVHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3MjYzMTEyNSwiZXhwIjoxNzczMjM1OTI1fQ.lIcSFaRAuOJiQuuNijEY4fG1ZUGmXJNgX8OIV7JlIV0') {
  console.error('خطأ: يجب وضع JWT Token في المتغير USER_TOKEN');
  console.log('');
  console.log('كيفية الحصول على Token:');
  console.log('   1. افتح Postman');
  console.log('   2. POST https://api.bashraai.com/api/auth-user/login');
  console.log('   3. Body: {"email": "user@example.com", "password": "password123", "entityType": "user"}');
  console.log('   4. انسخ accessToken وضعه في المتغير USER_TOKEN');
  console.log('');
  process.exit(1);
}

// ========================================
// اختبار الاتصال
// ========================================

console.log('='.repeat(70));
console.log('🧪 Socket.IO Chat Testing Started');
console.log('='.repeat(70));
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`📝 Conversation ID: ${CONVERSATION_ID}`);
console.log('='.repeat(70));
console.log('');

const socket = io(SERVER_URL, {
  auth: {
    token: USER_TOKEN
  },
  transports: ['websocket', 'polling']
});

// ========================================
// معالجة الاتصال
// ========================================

socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log(`   Socket ID: ${socket.id}`);
  console.log('');
  
  // الانضمام للمحادثة
  console.log(`📍 Step 1: Joining conversation ${CONVERSATION_ID}...`);
  socket.emit('joinConversation', {
    conversationId: CONVERSATION_ID
  });
});

// ========================================
// معالجة تأكيد الانضمام
// ========================================

socket.on('joinedConversation', (data) => {
  console.log('✅ Step 1 Complete: Joined conversation');
  console.log(`   Data:`, JSON.stringify(data, null, 2));
  console.log('');
  
  // إرسال رسالة
  console.log('📤 Step 2: Sending message...');
  socket.emit('sendMessage', {
    conversationId: CONVERSATION_ID,
    content: 'مرحباً! هذه رسالة اختبار من Socket.IO Test Client 🚀',
    messageType: 'text'
  });
});

// ========================================
// معالجة تأكيد إرسال الرسالة
// ========================================

socket.on('messageSent', (data) => {
  console.log('✅ Step 2 Complete: Message sent successfully');
  console.log('   Message ID:', data.message.id);
  console.log('   Content:', data.message.content);
  console.log('   Sender:', data.message.senderName);
  console.log('');
  
  // اختبار Typing indicator
  console.log('⌨️  Step 3: Testing typing indicator...');
  socket.emit('typing', {
    conversationId: CONVERSATION_ID
  });
  
  // إيقاف الكتابة بعد 2 ثانية
  setTimeout(() => {
    console.log('⌨️  Step 3: Stopping typing...');
    socket.emit('stopTyping', {
      conversationId: CONVERSATION_ID
    });
    console.log('');
    
    // اختبار Mark as Read
    console.log('📖 Step 4: Marking message as read...');
    socket.emit('markAsRead', {
      conversationId: CONVERSATION_ID,
      messageIds: [data.message.id]
    });
  }, 2000);
});

// ========================================
// معالجة تأكيد القراءة
// ========================================

socket.on('markedAsRead', (data) => {
  console.log('✅ Step 4 Complete: Marked as read');
  console.log(`   Conversation ID: ${data.conversationId}`);
  console.log(`   Message IDs: ${data.messageIds.join(', ')}`);
  console.log('');
  
  // إرسال رسالة أخرى
  console.log('📤 Step 5: Sending another message...');
  socket.emit('sendMessage', {
    conversationId: CONVERSATION_ID,
    content: 'رسالة أخرى للاختبار ✨',
    messageType: 'text'
  });
});

// ========================================
// استقبال رسائل جديدة
// ========================================

socket.on('newMessage', (message) => {
  console.log('📩 NEW MESSAGE RECEIVED:');
  console.log('   From:', message.senderName);
  console.log('   Content:', message.content);
  console.log('   Type:', message.messageType);
  console.log('   Time:', message.createdAt);
  console.log('');
  
  // تحديث تلقائياً لمقروء
  socket.emit('markAsRead', {
    conversationId: CONVERSATION_ID,
    messageIds: [message.id]
  });
});

// ========================================
// استقبال إشعار أن رسائلك تم قراءتها
// ========================================

socket.on('messagesRead', (data) => {
  console.log('📖 YOUR MESSAGES WERE READ:');
  console.log('   Read by:', `${data.readBy.entityType} (ID: ${data.readBy.userId})`);
  console.log('   Conversation:', data.conversationId);
  console.log('   Message IDs:', data.messageIds.join(', '));
  console.log('');
});

// ========================================
// استقبال إشعار مستخدم يكتب
// ========================================

socket.on('userTyping', (data) => {
  console.log('⌨️  USER TYPING:');
  console.log('   User:', `${data.entityType} (ID: ${data.userId})`);
  console.log('   Conversation:', data.conversationId);
  console.log('');
});

// ========================================
// استقبال إشعار مستخدم توقف عن الكتابة
// ========================================

socket.on('userStoppedTyping', (data) => {
  console.log('⌨️  USER STOPPED TYPING:');
  console.log('   User:', `${data.entityType} (ID: ${data.userId})`);
  console.log('');
});

// ========================================
// استقبال إشعار مستخدم انضم
// ========================================

socket.on('userJoined', (data) => {
  console.log('👤 USER JOINED:');
  console.log('   User:', `${data.entityType} (ID: ${data.userId})`);
  console.log('');
});

// ========================================
// استقبال إشعار مستخدم غادر
// ========================================

socket.on('userLeft', (data) => {
  console.log('👤 USER LEFT:');
  console.log('   User:', `${data.entityType} (ID: ${data.userId})`);
  console.log('');
});

// ========================================
// استقبال إشعارات الرسائل (في الغرفة الشخصية)
// ========================================

socket.on('messageNotification', (data) => {
  console.log('🔔 MESSAGE NOTIFICATION:');
  console.log('   Conversation:', data.conversationId);
  console.log('   From:', data.message.senderName);
  console.log('   Content:', data.message.content);
  console.log('');
});

// ========================================
// معالجة الأخطاء
// ========================================

socket.on('error', (error) => {
  console.error('❌ ERROR:', error);
  console.log('');
});

socket.on('connect_error', (error) => {
  console.error('❌ CONNECTION ERROR:', error.message);
  console.log('');
  console.log('💡 Troubleshooting:');
  console.log('   1. Make sure the server is running (npm start)');
  console.log('   2. Check if your JWT token is valid');
  console.log('   3. Verify the SERVER_URL is correct');
  console.log('   4. Check if the token is not expired');
  console.log('');
});

// ========================================
// معالجة قطع الاتصال
// ========================================

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
  console.log('');
});

// ========================================
// معالجة إيقاف السكريبت
// ========================================

process.on('SIGINT', () => {
  console.log('');
  console.log('='.repeat(70));
  console.log('👋 Closing connection...');
  
  // مغادرة المحادثة
  socket.emit('leaveConversation', {
    conversationId: CONVERSATION_ID
  });
  
  // قطع الاتصال
  socket.disconnect();
  
  console.log('✅ Connection closed');
  console.log('='.repeat(70));
  process.exit();
});

// ========================================
// رسالة الاستمرار
// ========================================

console.log('💡 Test is running... Press Ctrl+C to exit');
console.log('');

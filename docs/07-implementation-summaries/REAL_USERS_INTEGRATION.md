# 🔗 ربط صفحة الاختبار بالمستخدمين الحقيقيين

## 📋 ملخص التغييرات

تم ربط صفحة اختبار الشات بقاعدة البيانات الحقيقية لجلب المستخدمين الفعليين بدلاً من البيانات الوهمية (Mock Data).

---

## 🎯 الملفات المنشأة/المحدثة

### 1️⃣ **`routes/chatUsersRoutes.js`** (جديد)
Route جديد لجلب المستخدمين للشات

```javascript
GET /api/chat-users
```

**المميزات:**
- ✅ يتطلب مصادقة JWT
- ✅ يستثني المستخدم الحالي من القائمة
- ✅ يدعم الفلترة حسب النوع (type)
- ✅ يدعم البحث (search)

---

### 2️⃣ **`controllers/chatUsersController.js`** (جديد)
Controller لمعالجة طلبات جلب المستخدمين

**الوظائف:**
- جلب المستخدمين (Users) من جدول `users`
- جلب الأطباء (Doctors) من جدول `doctors`
- جلب المدراء (Admins) من جدول `admins`
- جلب المساعدين (Assistants) من جدول `assistants`

**البيانات المُرجعة:**
```javascript
{
  success: true,
  users: [
    {
      id: 24,
      uuid: "734de6dc-4c3a-459c-ab23-b9f12245b9ac",
      email: "safnks0@gmail.com",
      name: "محمد أحمد",
      type: "user",
      status: "active",
      profile_picture_url: "https://...",
      specialization: null,  // للأطباء فقط
      admin_type: null       // للمدراء فقط
    },
    // ... more users
  ],
  count: 15
}
```

---

### 3️⃣ **`routes/index.js`** (محدث)
إضافة route الجديد

```javascript
const chatUsersRoutes = require("./chatUsersRoutes");
router.use("/chat-users", chatUsersRoutes);
```

---

### 4️⃣ **`public/js/chat-test.js`** (محدث)
تحديث دالة `loadUsers()` لاستخدام API الحقيقي

**قبل:**
```javascript
// Mock users
const mockUsers = [
  { id: 1, email: 'user1@example.com', name: 'مستخدم 1', type: 'user' },
  // ...
];
```

**بعد:**
```javascript
// Real users from database
const response = await fetch(`${API_BASE}/api/chat-users`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
const data = await response.json();
const users = data.users;
```

---

## 🔍 كيفية عمل النظام

### 1. تسجيل الدخول
```javascript
POST /api/auth-user/login
Body: { email, password }

Response: {
  access_token: "eyJhbGciOiJIUzI1NiIs...",
  user: { id: 24, email: "safnks0@gmail.com", ... }
}
```

### 2. جلب المستخدمين
```javascript
GET /api/chat-users
Headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIs..." }

Response: {
  success: true,
  users: [...],
  count: 15
}
```

### 3. عرض المستخدمين
```javascript
// في chat-test.js
users.forEach(user => {
  // عرض كل مستخدم في القائمة
  const userItem = createUserItem(user);
  usersList.appendChild(userItem);
});
```

---

## 📊 قاعدة البيانات

### الجداول المستخدمة:

#### 1. **Users** (المستخدمون)
```sql
SELECT 
  u.id,
  u.uuid,
  u.email,
  u.status,
  'user' as entity_type,
  upt.full_name,
  up.profile_picture_url
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN user_profile_translations upt ON up.id = upt.profile_id
WHERE u.status = 'active'
```

#### 2. **Doctors** (الأطباء)
```sql
SELECT 
  d.id,
  d.uuid,
  d.email,
  d.status,
  'doctor' as entity_type,
  dpt.full_name,
  dp.profile_picture_url,
  dpt.specialization
FROM doctors d
LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id
WHERE d.status = 'active'
```

#### 3. **Admins** (المدراء)
```sql
SELECT 
  a.id,
  a.uuid,
  a.email,
  a.status,
  'admin' as entity_type,
  a.email as full_name,
  a.admin_type
FROM admins a
WHERE a.status = 'active'
```

#### 4. **Assistants** (المساعدون)
```sql
SELECT 
  a.id,
  a.uuid,
  a.email,
  a.status,
  'assistant' as entity_type,
  a.email as full_name
FROM assistants a
WHERE a.status = 'active'
```

---

## 🎯 المميزات

### 1. **استثناء المستخدم الحالي**
```javascript
// في Controller
${currentUserType === 'user' ? "AND u.id != ?" : ""}
```
لا يظهر المستخدم الحالي في قائمة المستخدمين

### 2. **الفلترة حسب النوع**
```javascript
GET /api/chat-users?type=doctor
```
جلب الأطباء فقط

### 3. **البحث**
```javascript
GET /api/chat-users?search=محمد
```
البحث بالاسم أو البريد الإلكتروني

### 4. **الحد الأقصى للنتائج**
```sql
LIMIT 50
```
لتحسين الأداء

---

## 🚀 كيفية الاستخدام

### 1️⃣ **أعد تشغيل السيرفر**
```bash
npm start
```

### 2️⃣ **افتح صفحة الاختبار**
```
http://localhost:3006/chat-test
```

### 3️⃣ **سجل الدخول**
- اختر نوع المستخدم
- أدخل البريد وكلمة المرور
- اضغط "تسجيل الدخول"

### 4️⃣ **شاهد المستخدمين الحقيقيين**
سيتم تحميل المستخدمين من قاعدة البيانات تلقائياً

---

## 🧪 الاختبار

### اختبار API مباشرة:

#### 1. احصل على التوكن:
```bash
POST http://localhost:3006/api/auth-user/login
Content-Type: application/json

{
  "email": "safnks0@gmail.com",
  "password": "Katch112481632"
}
```

#### 2. اجلب المستخدمين:
```bash
GET http://localhost:3006/api/chat-users
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 3. فلتر حسب النوع:
```bash
GET http://localhost:3006/api/chat-users?type=doctor
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### 4. البحث:
```bash
GET http://localhost:3006/api/chat-users?search=محمد
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 📝 ملاحظات مهمة

### 1. **المصادقة مطلوبة**
جميع طلبات `/api/chat-users` تتطلب JWT token صالح

### 2. **فقط المستخدمين النشطين**
```sql
WHERE status = 'active'
```
يتم جلب المستخدمين النشطين فقط

### 3. **الترجمة**
يتم جلب الأسماء باللغة العربية (language = 'ar')

### 4. **الأداء**
- حد أقصى 50 مستخدم لكل نوع
- استخدام LEFT JOIN لتحسين الأداء
- Indexes على الجداول المستخدمة

---

## 🔧 التخصيص

### إضافة فلاتر إضافية:

```javascript
// في chatUsersController.js
const { type, search, status, limit } = req.query;

// فلتر حسب الحالة
WHERE u.status = ?

// تغيير الحد الأقصى
LIMIT ${limit || 50}
```

### إضافة حقول إضافية:

```javascript
// في SQL query
SELECT 
  u.id,
  u.email,
  u.phone,  // إضافة رقم الهاتف
  u.created_at,  // إضافة تاريخ الإنشاء
  // ...
```

---

## 🎉 الخلاصة

### ✅ ما تم إنجازه:
1. ✅ إنشاء API endpoint لجلب المستخدمين
2. ✅ ربط الصفحة بقاعدة البيانات الحقيقية
3. ✅ دعم جميع أنواع المستخدمين (User, Doctor, Admin, Assistant)
4. ✅ دعم البحث والفلترة
5. ✅ استثناء المستخدم الحالي
6. ✅ معالجة الأخطاء بشكل صحيح

### 🚀 النتيجة:
- ✅ صفحة الاختبار تعرض مستخدمين حقيقيين
- ✅ يمكن البحث عن المستخدمين
- ✅ يمكن الفلترة حسب النوع
- ✅ واجهة سلسة وسريعة

---

**الآن يمكنك اختبار الشات مع مستخدمين حقيقيين من قاعدة البيانات! 🎉**

**تاريخ التحديث**: 20 نوفمبر 2025
**الحالة**: ✅ مكتمل

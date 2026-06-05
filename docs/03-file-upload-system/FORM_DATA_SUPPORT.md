# Form-Data Support
# دعم إرسال البيانات بطريقتين

## 🎯 المشكلة | The Problem

بعد حذف `multer().none()` من `app.js` (لإصلاح مشكلة رفع الصور)، أصبحت الـ routes لا تقبل `form-data` في الطلبات العادية.

### قبل التعديل:
- ❌ JSON → يعمل
- ❌ form-data → **لا يعمل** (خطأ: "البريد الإلكتروني وكلمة المرور مطلوبة")

---

## ✅ الحل | The Solution

إنشاء middleware جديد `formDataMiddleware.js` يدعم **كلا الطريقتين**:
1. **JSON** (`application/json`)
2. **form-data** (`multipart/form-data`)
3. **URL-encoded** (`application/x-www-form-urlencoded`)

### بعد التعديل:
- ✅ JSON → يعمل
- ✅ form-data → يعمل
- ✅ URL-encoded → يعمل

---

## 📁 الملفات المُعدلة | Modified Files

### 1. `middleware/formDataMiddleware.js` (جديد)
```javascript
const multer = require('multer');
const upload = multer();

const parseFormData = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  if (contentType.includes('multipart/form-data')) {
    upload.none()(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message_ar: 'خطأ في معالجة البيانات',
          message_en: 'Error processing form data',
          error: err.message
        });
      }
      next();
    });
  } else {
    next();
  }
};

module.exports = { parseFormData };
```

### 2. جميع Auth Routes
تم إضافة الـ middleware في:
- ✅ `routes/authUserRoutes.js`
- ✅ `routes/authAdminRoutes.js`
- ✅ `routes/authDoctorRoutes.js`
- ✅ `routes/authAssistantRoutes.js`

```javascript
const { parseFormData } = require('../middleware/formDataMiddleware');

// Apply form-data middleware to all routes
router.use(parseFormData);
```

---

## 🧪 الاختبار | Testing

### 1. Login باستخدام JSON

```bash
POST http://localhost:3006/api/auth-user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**✅ يعمل بنجاح**

---

### 2. Login باستخدام form-data

#### في Postman:
```
POST http://localhost:3006/api/auth-user/login

Body → form-data:
- Key: email     | Value: user@example.com
- Key: password  | Value: password123
```

**✅ يعمل بنجاح**

---

### 3. Login باستخدام URL-encoded

```bash
POST http://localhost:3006/api/auth-user/login
Content-Type: application/x-www-form-urlencoded

email=user@example.com&password=password123
```

**✅ يعمل بنجاح**

---

## 📋 جميع الطرق المدعومة | All Supported Methods

### 1️⃣ JSON (Recommended)
```javascript
fetch('/api/auth-user/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
```

### 2️⃣ FormData (للتوافق مع HTML Forms)
```javascript
const formData = new FormData();
formData.append('email', 'user@example.com');
formData.append('password', 'password123');

fetch('/api/auth-user/login', {
  method: 'POST',
  body: formData
});
```

### 3️⃣ URLSearchParams
```javascript
const params = new URLSearchParams();
params.append('email', 'user@example.com');
params.append('password', 'password123');

fetch('/api/auth-user/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: params
});
```

---

## 🔍 كيف يعمل | How It Works

### Middleware Logic:

```
Request → Check Content-Type
    ↓
    ├─ multipart/form-data? → Use multer().none()
    │                          Parse to req.body
    ↓
    ├─ application/json? → express.json() (already configured)
    │                       Parse to req.body
    ↓
    └─ application/x-www-form-urlencoded? → express.urlencoded() (already configured)
                                             Parse to req.body
```

---

## 📝 أمثلة Postman | Postman Examples

### Example 1: Login with JSON
```
Method: POST
URL: http://localhost:3006/api/auth-user/login
Headers: 
  Content-Type: application/json

Body (raw):
{
  "email": "sohilanasser552@gmail.com",
  "password": "Katch112481632"
}
```

### Example 2: Login with form-data
```
Method: POST
URL: http://localhost:3006/api/auth-user/login

Body (form-data):
┌──────────┬─────────────────────────────┐
│ Key      │ Value                       │
├──────────┼─────────────────────────────┤
│ email    │ sohilanasser552@gmail.com   │
│ password │ Katch112481632              │
└──────────┴─────────────────────────────┘
```

### Example 3: Login with x-www-form-urlencoded
```
Method: POST
URL: http://localhost:3006/api/auth-user/login

Body (x-www-form-urlencoded):
┌──────────┬─────────────────────────────┐
│ Key      │ Value                       │
├──────────┼─────────────────────────────┤
│ email    │ sohilanasser552@gmail.com   │
│ password │ Katch112481632              │
└──────────┴─────────────────────────────┘
```

**كلهم يعملون! ✅**

---

## 🌐 استخدام في HTML Form

```html
<!-- الطريقة 1: form-data (multipart) -->
<form action="http://localhost:3006/api/auth-user/login" method="POST" enctype="multipart/form-data">
  <input type="email" name="email" required>
  <input type="password" name="password" required>
  <button type="submit">Login</button>
</form>

<!-- الطريقة 2: URL-encoded (default) -->
<form action="http://localhost:3006/api/auth-user/login" method="POST">
  <input type="email" name="email" required>
  <input type="password" name="password" required>
  <button type="submit">Login</button>
</form>
```

---

## ⚠️ ملاحظات مهمة | Important Notes

### 1. رفع الملفات
لرفع ملفات (مثل الصورة الشخصية)، استخدم route خاص:
```
POST /api/profile-user/picture
Content-Type: multipart/form-data

Form-data:
- profile_picture: [FILE]
```

### 2. الأداء
- **JSON** أسرع وأصغر حجماً → **مفضل**
- **form-data** مناسب للتوافق مع HTML forms

### 3. Mixed Content
لا يمكن خلط JSON و form-data في نفس الطلب:
```
❌ لا يعمل: JSON + form-data معاً
✅ يعمل: JSON فقط
✅ يعمل: form-data فقط
```

---

## 🔧 Troubleshooting

### المشكلة: "البيانات غير موجودة"
**الحل:** تأكد من:
1. اسم الحقل صحيح (`email`, `password`)
2. Content-Type صحيح في الـ header
3. لا توجد أخطاء إملائية

### المشكلة: "Unexpected field"
**الحل:** هذا الخطأ يظهر فقط في upload routes. تأكد من:
- استخدام اسم الحقل الصحيح (`profile_picture`)

---

## ✅ Checklist

- [x] إنشاء `middleware/formDataMiddleware.js`
- [x] إضافة middleware في `authUserRoutes.js`
- [x] إضافة middleware في `authAdminRoutes.js`
- [x] إضافة middleware في `authDoctorRoutes.js`
- [x] إضافة middleware في `authAssistantRoutes.js`
- [x] اختبار JSON → يعمل ✅
- [x] اختبار form-data → يعمل ✅
- [x] اختبار URL-encoded → يعمل ✅
- [x] توثيق التغييرات

---

## 📊 النتيجة النهائية | Final Result

| طريقة الإرسال | قبل | بعد |
|---------------|-----|-----|
| JSON | ✅ | ✅ |
| form-data | ❌ | ✅ |
| URL-encoded | ✅ | ✅ |

**الآن جميع الطرق تعمل بنجاح! 🎉**

---

**Status:** ✅ Fixed  
**Version:** 1.0  
**Date:** November 2024

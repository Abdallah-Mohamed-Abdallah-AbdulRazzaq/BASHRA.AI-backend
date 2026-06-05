# 🚀 Quick Start - File Upload System
## دليل سريع - نظام رفع الملفات

---

## ⚡ التهيئة في 3 خطوات

### 1️⃣ تشغيل سكريبت التهيئة

```bash
node scripts/initializeDirectories.js
```

**النتيجة:**
```
✅ Created directory: upload/files/profile-picture/user/
✅ Created directory: upload/files/profile-picture/doctor/
✅ Created directory: upload/files/profile-picture/admin/
✅ Created directory: upload/files/profile-picture/assistant/
```

### 2️⃣ البنية الناتجة

```
upload/
└── files/
    └── profile-picture/
        ├── user/        ← صور المستخدمين
        ├── doctor/      ← صور الأطباء
        ├── admin/       ← صور المشرفين
        └── assistant/   ← صور المساعدين
```

### 3️⃣ الاستخدام في Controller

```javascript
const FileService = require('../services/fileService');

// رفع صورة ملف شخصي
const fileRecord = await FileService.uploadFile(
  req.file,
  {
    entityType: 'doctor',    // ← user, doctor, admin, أو assistant
    entityId: doctorId
  },
  {
    fileCategory: 'profile_picture',  // ← المفتاح
    isPublic: true
  }
);

// ✅ يتم الحفظ تلقائياً في: upload/files/profile-picture/doctor/
// fileRecord.file_url = "http://localhost:3006/upload/files/profile-picture/doctor/xxx.jpg"
```

---

## 📋 Checklist

- [ ] تشغيل `node scripts/initializeDirectories.js`
- [ ] التحقق من وجود المجلدات الأربعة
- [ ] اختبار رفع صورة لكل نوع مستخدم
- [ ] التحقق من حفظ الصور في المجلدات الصحيحة

---

## 🎯 النقاط المهمة

| المفتاح | القيمة | التأثير |
|---------|--------|---------|
| `entityType` | `'user'`, `'doctor'`, `'admin'`, `'assistant'` | يحدد المجلد الفرعي |
| `fileCategory` | `'profile_picture'` | يفعّل التنظيم التلقائي |
| البنية | `profile-picture/{entityType}/` | يتم إنشاؤها تلقائياً |

---

## 🔧 استكشاف الأخطاء

### المشكلة: "Directory not found"
```bash
# الحل: تشغيل سكريبت التهيئة
node scripts/initializeDirectories.js
```

### المشكلة: "Invalid user type"
```javascript
// التأكد من استخدام نوع صحيح
const validTypes = ['user', 'doctor', 'admin', 'assistant'];
```

### المشكلة: الصور تحفظ في مكان خاطئ
```javascript
// التأكد من:
// 1. fileCategory = 'profile_picture' (مع underscore)
// 2. entityType صحيح
```

---

## 📚 المزيد من التفاصيل

راجع: `docs/FILE-UPLOAD-SYSTEM.md` للتوثيق الكامل

---

**✅ جاهز للاستخدام!**

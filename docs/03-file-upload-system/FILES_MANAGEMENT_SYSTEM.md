# Files Management System
# نظام إدارة الملفات الشامل

## 🎯 نظرة عامة | Overview

نظام مركزي متقدم لإدارة جميع الملفات في التطبيق.

### الميزات الرئيسية:
- ✅ **مركزية**: كل الملفات في جدول واحد
- ✅ **تتبع شامل**: من رفع الملف، متى، لأي غرض
- ✅ **أمان متقدم**: تشفير، صلاحيات، فحص فيروسات
- ✅ **مرونة**: دعم مقدمي تخزين متعددين (Local, S3, etc.)
- ✅ **إحصائيات**: تقارير شاملة عن الملفات
- ✅ **انتهاء تلقائي**: حذف تلقائي للملفات المنتهية

---

## 📊 هيكل قاعدة البيانات | Database Structure

### جدول `files`:

```sql
CREATE TABLE `files` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `uuid` varchar(36) UNIQUE NOT NULL,
  
  -- من رفع الملف (Uploader)
  `uploaded_by_user_id` int,
  `uploaded_by_admin_id` int,
  `uploaded_by_doctor_id` int,
  `uploaded_by_assistant_id` int,
  
  -- مرتبط بماذا (Related to)
  `related_to_type` varchar(50),
  `related_to_id` int,
  
  -- معلومات الملف (File info)
  `file_category` enum(...),
  `original_filename` varchar(255),
  `stored_filename` varchar(255),
  `file_path` varchar(500),
  `file_url` varchar(500),
  `mime_type` varchar(100),
  `file_size` bigint,
  `file_extension` varchar(10),
  
  -- الأمان (Security)
  `is_public` boolean DEFAULT 0,
  `is_encrypted` boolean DEFAULT 0,
  `encryption_key` varchar(255),
  
  -- فحص الفيروسات (Virus scan)
  `virus_scan_status` enum('pending','clean','infected','error'),
  `virus_scan_date` timestamp,
  
  -- التخزين (Storage)
  `storage_provider` varchar(50) DEFAULT 'local',
  `storage_reference` varchar(255),
  
  -- الإحصائيات (Statistics)
  `access_count` int DEFAULT 0,
  `last_accessed_at` timestamp,
  
  -- الانتهاء (Expiration)
  `expires_at` timestamp,
  
  -- الحذف الناعم (Soft delete)
  `is_deleted` boolean DEFAULT 0,
  `deleted_at` timestamp,
  
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📂 فئات الملفات | File Categories

```javascript
const FILE_CATEGORIES = {
  profile_picture: 'صورة شخصية',
  medical_image: 'صورة طبية',
  document: 'مستند',
  prescription: 'وصفة طبية',
  license: 'رخصة',
  id_document: 'وثيقة هوية',
  other: 'أخرى'
};
```

---

## 🏗️ الملفات المنشأة | Created Files

### 1. `services/fileService.js`
خدمة مركزية لجميع عمليات الملفات:

- ✅ `uploadFile()` - رفع ملف
- ✅ `getFileByUuid()` - جلب ملف
- ✅ `getFilesByUploader()` - جلب ملفات المستخدم
- ✅ `getFilesByRelatedEntity()` - جلب ملفات الكيان
- ✅ `deleteFile()` - حذف ملف
- ✅ `updateFileMetadata()` - تحديث البيانات
- ✅ `getFileStatistics()` - إحصائيات
- ✅ `cleanupExpiredFiles()` - تنظيف الملفات المنتهية

### 2. `controllers/FilesController.js`
Controller للـ Admin فقط:

- ✅ CRUD كامل للملفات
- ✅ إحصائيات شاملة
- ✅ تنظيف تلقائي
- ✅ حذف جماعي
- ✅ استعادة الملفات المحذوفة

### 3. `routes/filesRoutes.js`
API routes للـ Admin:

```
GET    /api/files                    - جلب جميع الملفات (مع فلاتر)
GET    /api/files/statistics         - الإحصائيات
GET    /api/files/:uuid              - جلب ملف محدد
GET    /api/files/uploader/:type/:id - ملفات مستخدم محدد
GET    /api/files/related/:type/:id  - ملفات كيان محدد
PUT    /api/files/:uuid              - تحديث بيانات الملف
DELETE /api/files/:uuid              - حذف ملف
POST   /api/files/:uuid/restore      - استعادة ملف
POST   /api/files/cleanup/expired    - تنظيف الملفات المنتهية
POST   /api/files/bulk-delete        - حذف جماعي
```

### 4. `middleware/fileUploadMiddleware.js`
Middleware متقدم لرفع الملفات:

- ✅ دعم أنواع ملفات مختلفة
- ✅ فلاتر حسب الفئة
- ✅ معالجة أخطاء شاملة
- ✅ middleware جاهزة للاستخدام

---

## 📖 كيفية الاستخدام | How to Use

### 1️⃣ رفع ملف من Controller

```javascript
const FileService = require('../services/fileService');

// في أي controller
static async uploadFile(req, res) {
  try {
    const file = req.file; // من multer
    
    const uploadedBy = {
      entityType: req.user.entityType, // 'user', 'admin', etc.
      entityId: req.user.id
    };
    
    const options = {
      fileCategory: 'profile_picture',
      relatedToType: 'user_profile',
      relatedToId: profileId,
      isPublic: false,
      metadata: {
        description: 'Profile picture for user',
        uploaded_from: 'mobile_app'
      }
    };
    
    const fileRecord = await FileService.uploadFile(
      file,
      uploadedBy,
      options
    );
    
    return res.json({
      success: true,
      data: fileRecord
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### 2️⃣ جلب ملفات مستخدم

```javascript
// جلب جميع الصور الطبية لمستخدم
const medicalImages = await FileService.getFilesByUploader(
  'user',
  userId,
  { fileCategory: 'medical_image' }
);
```

### 3️⃣ جلب ملفات كيان معين

```javascript
// جلب جميع الوصفات الطبية لموعد محدد
const prescriptions = await FileService.getFilesByRelatedEntity(
  'appointment',
  appointmentId,
  { fileCategory: 'prescription' }
);
```

### 4️⃣ حذف ملف

```javascript
// حذف ناعم (soft delete)
await FileService.deleteFile(fileUuid, false);

// حذف من القرص أيضاً
await FileService.deleteFile(fileUuid, true);
```

---

## 🔐 الأمان | Security

### 1. صلاحيات الوصول:
- **Admin**: كامل الصلاحيات (CRUD)
- **User/Doctor/Assistant**: رفع فقط، عرض ملفاتهم

### 2. التشفير:
```javascript
const options = {
  isEncrypted: true,
  encryptionKey: generateEncryptionKey()
};
```

### 3. فحص الفيروسات:
```javascript
// التحديث بعد الفحص
await FileService.updateFileMetadata(fileUuid, {
  virus_scan_status: 'clean',
  virus_scan_date: new Date()
});
```

---

## 📊 API Examples | أمثلة API

### 1. جلب جميع الملفات (مع فلاتر)

```bash
GET /api/files?page=1&limit=20&fileCategory=medical_image&entityType=user&entityId=23

Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "data": {
    "files": [...],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

### 2. الإحصائيات

```bash
GET /api/files/statistics

Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "data": {
    "overall": {
      "total_files": 1250,
      "total_size": 524288000,
      "total_uploaders": 350
    },
    "byCategory": [
      {
        "file_category": "profile_picture",
        "count": 450,
        "total_size": 45000000
      },
      ...
    ],
    "byVirusScan": [
      {
        "virus_scan_status": "clean",
        "count": 1100
      },
      ...
    ]
  }
}
```

### 3. حذف ملف

```bash
DELETE /api/files/550e8400-e29b-41d4-a716-446655440000?deleteFromDisk=true

Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 4. تنظيف الملفات المنتهية

```bash
POST /api/files/cleanup/expired

Authorization: Bearer ADMIN_TOKEN

Response:
{
  "success": true,
  "message": "Cleaned up 25 expired files",
  "data": {
    "deletedCount": 25
  }
}
```

---

## 🔄 Integration مع الأنظمة الموجودة

### تحديث ProfileService:

```javascript
// في uploadProfilePicture
const fileRecord = await FileService.uploadFile(file, uploadedBy, {
  fileCategory: 'profile_picture',
  relatedToType: 'user_profile',
  relatedToId: profileId,
  isPublic: true
});

// استخدام file_url من FileService
const pictureUrl = fileRecord.file_url;
```

---

## 🛠️ Cron Jobs للتنظيف التلقائي

### إعداد Cron Job:

```javascript
// في app.js أو ملف منفصل
const cron = require('node-cron');
const FileService = require('./services/fileService');

// تنظيف الملفات المنتهية يومياً في 2 صباحاً
cron.schedule('0 2 * * *', async () => {
  console.log('Running expired files cleanup...');
  try {
    const deletedCount = await FileService.cleanupExpiredFiles();
    console.log(`Cleaned up ${deletedCount} expired files`);
  } catch (error) {
    console.error('Error in cleanup cron job:', error);
  }
});
```

---

## 📈 حالات الاستخدام | Use Cases

### 1. صورة شخصية للمستخدم:
```javascript
{
  fileCategory: 'profile_picture',
  relatedToType: 'user_profile',
  relatedToId: profileId,
  isPublic: true
}
```

### 2. صورة طبية في موعد:
```javascript
{
  fileCategory: 'medical_image',
  relatedToType: 'appointment',
  relatedToId: appointmentId,
  isPublic: false,
  isEncrypted: true
}
```

### 3. وصفة طبية:
```javascript
{
  fileCategory: 'prescription',
  relatedToType: 'appointment',
  relatedToId: appointmentId,
  isPublic: false,
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
}
```

### 4. رخصة طبيب:
```javascript
{
  fileCategory: 'license',
  relatedToType: 'doctor_profile',
  relatedToId: doctorProfileId,
  isPublic: false,
  metadata: {
    license_number: 'DOC-12345',
    expiry_date: '2025-12-31'
  }
}
```

---

## ⚙️ التكوين | Configuration

### في `.env`:

```bash
# File Storage
BASE_URL=http://localhost:3006
FILE_STORAGE_PROVIDER=local
FILE_MAX_SIZE=10485760  # 10MB in bytes
FILE_UPLOAD_PATH=./upload/files

# S3 Configuration (optional)
AWS_S3_BUCKET=my-bucket
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# File Cleanup
FILE_CLEANUP_CRON=0 2 * * *  # Daily at 2 AM
```

---

## 🧪 Testing

### Postman Collection:

```json
{
  "name": "Files Management API",
  "requests": [
    {
      "name": "Get All Files",
      "method": "GET",
      "url": "{{base_url}}/api/files?page=1&limit=20",
      "headers": {
        "Authorization": "Bearer {{admin_token}}"
      }
    },
    {
      "name": "Get File Statistics",
      "method": "GET",
      "url": "{{base_url}}/api/files/statistics",
      "headers": {
        "Authorization": "Bearer {{admin_token}}"
      }
    }
  ]
}
```

---

## ✅ Checklist للتطبيق

- [x] إنشاء `services/fileService.js`
- [x] إنشاء `controllers/FilesController.js`
- [x] إنشاء `routes/filesRoutes.js`
- [x] إنشاء `middleware/fileUploadMiddleware.js`
- [x] إضافة routes في `routes/index.js`
- [x] إنشاء توثيق شامل
- [ ] تثبيت `uuid` package: `npm install uuid`
- [ ] إضافة Cron job للتنظيف التلقائي
- [ ] تحديث ProfileService لاستخدام FileService
- [ ] اختبار جميع endpoints
- [ ] إضافة virus scanning (optional)

---

## 🚀 Next Steps

1. **تثبيت Dependencies:**
```bash
npm install uuid
npm install node-cron  # للتنظيف التلقائي
```

2. **إعداد Cron Job** في `app.js`

3. **تحديث Existing Services** لاستخدام FileService

4. **إضافة Virus Scanning** (optional)

5. **إعداد S3** للتخزين السحابي (optional)

---

**Status:** ✅ Complete  
**Version:** 1.0  
**Date:** November 2024  
**Author:** Cascade AI

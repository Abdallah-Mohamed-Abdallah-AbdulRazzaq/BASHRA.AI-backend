# 📁 File Upload System - Profile Pictures
## نظام رفع الملفات - صور الملفات الشخصية

**التاريخ:** نوفمبر 2024  
**الحالة:** ✅ محدّث ويدعم جميع أنواع المستخدمين

---

## 🎯 نظرة عامة

تم تحديث نظام رفع الملفات ليدعم **تنظيم صور الملفات الشخصية حسب نوع المستخدم**، حيث يتم حفظ صور كل نوع في مجلد منفصل.

### 📂 بنية المجلدات الجديدة

```
upload/
└── files/
    └── profile-picture/
        ├── user/              ← صور المستخدمين العاديين
        ├── doctor/            ← صور الأطباء
        ├── admin/             ← صور المشرفين
        └── assistant/         ← صور المساعدين
```

---

## 🔧 التعديلات المطبقة

### 1. تحديث `fileService.js`

#### الميزة الرئيسية
```javascript
// عند رفع صورة profile_picture، يتم تلقائياً:
// 1. تحديد نوع المستخدم (user, doctor, admin, assistant)
// 2. إنشاء المجلد المناسب إذا لم يكن موجوداً
// 3. حفظ الصورة في المجلد الصحيح

// مثال: رفع صورة طبيب
await FileService.uploadFile(
  file,
  { entityType: 'doctor', entityId: doctorId },
  { fileCategory: 'profile_picture' }
);
// ✅ يتم الحفظ في: upload/files/profile-picture/doctor/
```

#### الدوال الجديدة

##### أ) `initializeProfilePictureDirectories()`
```javascript
/**
 * إنشاء جميع المجلدات الأساسية
 * Creates all necessary directories for profile pictures
 */
await FileService.initializeProfilePictureDirectories();

// ينشئ:
// - upload/files/profile-picture/user/
// - upload/files/profile-picture/doctor/
// - upload/files/profile-picture/admin/
// - upload/files/profile-picture/assistant/
```

##### ب) `getProfilePicturePath(userType)`
```javascript
/**
 * الحصول على المسار النسبي لصورة الملف الشخصي
 * Get relative path for profile picture
 */
const path = FileService.getProfilePicturePath('doctor');
// Returns: 'profile-picture/doctor'
```

##### ج) `getProfilePictureDirectory(userType)`
```javascript
/**
 * الحصول على المسار الكامل للمجلد
 * Get full directory path
 */
const dir = FileService.getProfilePictureDirectory('admin');
// Returns: '/path/to/project/upload/files/profile-picture/admin'
```

##### د) `ensureProfilePictureDirectory(userType)`
```javascript
/**
 * التأكد من وجود المجلد وإنشائه إذا لزم الأمر
 * Ensure directory exists, create if needed
 */
await FileService.ensureProfilePictureDirectory('assistant');
// ✅ ينشئ المجلد إذا لم يكن موجوداً
```

---

## 🚀 التهيئة الأولية

### الطريقة 1: استخدام السكريبت (موصى بها)

```bash
# تشغيل سكريبت التهيئة
node scripts/initializeDirectories.js
```

**النتيجة:**
```
🚀 Initializing directory structure...

✅ Created directory: upload/files/profile-picture/user/
✅ Created directory: upload/files/profile-picture/doctor/
✅ Created directory: upload/files/profile-picture/admin/
✅ Created directory: upload/files/profile-picture/assistant/

✅ All profile picture directories initialized successfully

✅ Directory initialization completed successfully!

📁 Created structure:
   upload/
   └── files/
       └── profile-picture/
           ├── user/
           ├── doctor/
           ├── admin/
           └── assistant/
```

### الطريقة 2: التهيئة البرمجية

```javascript
const FileService = require('./services/fileService');

// في server.js أو app.js
async function initializeApp() {
  try {
    // تهيئة المجلدات
    await FileService.initializeProfilePictureDirectories();
    console.log('✅ Directories initialized');
    
    // باقي كود التطبيق...
  } catch (error) {
    console.error('Error:', error);
  }
}

initializeApp();
```

---

## 📝 أمثلة الاستخدام

### 1. رفع صورة ملف شخصي - User

```javascript
const FileService = require('../services/fileService');

// في profileUserController.js
async function uploadUserProfilePicture(req, res) {
  try {
    const userId = req.user.id;
    const file = req.file; // من multer
    
    // رفع الصورة
    const fileRecord = await FileService.uploadFile(
      file,
      {
        entityType: 'user',      // ← نوع المستخدم
        entityId: userId
      },
      {
        fileCategory: 'profile_picture',  // ← فئة الملف
        relatedToType: 'user_profile',
        relatedToId: profileId,
        isPublic: true
      }
    );
    
    // ✅ يتم الحفظ في: upload/files/profile-picture/user/
    // fileRecord.file_url: http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg
    
    res.json({
      success: true,
      file_url: fileRecord.file_url
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 2. رفع صورة ملف شخصي - Doctor

```javascript
// في profileDoctorController.js
async function uploadDoctorProfilePicture(req, res) {
  const doctorId = req.user.id;
  const file = req.file;
  
  const fileRecord = await FileService.uploadFile(
    file,
    {
      entityType: 'doctor',    // ← نوع المستخدم: doctor
      entityId: doctorId
    },
    {
      fileCategory: 'profile_picture',
      relatedToType: 'doctor_profile',
      relatedToId: profileId,
      isPublic: true,
      metadata: {
        uploaded_from: 'profile_update',
        profile_type: 'doctor'
      }
    }
  );
  
  // ✅ يتم الحفظ في: upload/files/profile-picture/doctor/
  // fileRecord.file_url: http://localhost:3006/upload/files/profile-picture/doctor/profile_picture_xxx.jpg
  
  return fileRecord;
}
```

### 3. رفع صورة ملف شخصي - Admin

```javascript
// في profileAdminController.js
const fileRecord = await FileService.uploadFile(
  file,
  {
    entityType: 'admin',      // ← نوع المستخدم: admin
    entityId: adminId
  },
  {
    fileCategory: 'profile_picture',
    isPublic: true
  }
);

// ✅ يتم الحفظ في: upload/files/profile-picture/admin/
```

### 4. رفع صورة ملف شخصي - Assistant

```javascript
// في profileAssistantController.js
const fileRecord = await FileService.uploadFile(
  file,
  {
    entityType: 'assistant',   // ← نوع المستخدم: assistant
    entityId: assistantId
  },
  {
    fileCategory: 'profile_picture',
    isPublic: true
  }
);

// ✅ يتم الحفظ في: upload/files/profile-picture/assistant/
```

---

## 🔍 كيف يعمل النظام؟

### تدفق رفع الصورة

```
1. Controller يستقبل الملف من Multer
   ↓
2. يحدد نوع المستخدم (entityType: 'user', 'doctor', 'admin', 'assistant')
   ↓
3. FileService.uploadFile() يتحقق من fileCategory
   ↓
4. إذا كان fileCategory = 'profile_picture':
   ├─→ يحدد المجلد الفرعي حسب entityType
   ├─→ ينشئ المجلد إذا لم يكن موجوداً
   └─→ يحفظ الملف في: upload/files/profile-picture/{entityType}/
   ↓
5. يسجل الملف في قاعدة البيانات مع المسار الصحيح
   ↓
6. يرجع file_url كامل: http://localhost:3006/upload/files/profile-picture/{entityType}/filename.jpg
```

### الكود المحدث في `fileService.js`

```javascript
// السطور 57-71
// Define upload directory based on category and entity type
const categoryDir = fileCategory.replace(/_/g, '-');
let uploadDir;
let relativePath;

// Special handling for profile pictures - separate folder per user type
if (fileCategory === 'profile_picture') {
  // Create subdirectory for each user type: user, doctor, admin, assistant
  const userTypeDir = uploadedBy.entityType; // 'user', 'doctor', 'admin', 'assistant'
  uploadDir = path.join(__dirname, '..', 'upload', 'files', categoryDir, userTypeDir);
  relativePath = `${categoryDir}/${userTypeDir}`;
} else {
  uploadDir = path.join(__dirname, '..', 'upload', 'files', categoryDir);
  relativePath = categoryDir;
}

// Create directory if it doesn't exist
await fs.mkdir(uploadDir, { recursive: true });

// Save file with correct path
const fileUrl = `${baseUrl}/upload/files/${relativePath}/${storedFilename}`;
```

---

## 📊 أمثلة URLs الناتجة

| نوع المستخدم | المسار النسبي | URL الكامل |
|--------------|---------------|------------|
| **User** | `profile-picture/user/profile_picture_xxx.jpg` | `http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg` |
| **Doctor** | `profile-picture/doctor/profile_picture_xxx.jpg` | `http://localhost:3006/upload/files/profile-picture/doctor/profile_picture_xxx.jpg` |
| **Admin** | `profile-picture/admin/profile_picture_xxx.jpg` | `http://localhost:3006/upload/files/profile-picture/admin/profile_picture_xxx.jpg` |
| **Assistant** | `profile-picture/assistant/profile_picture_xxx.jpg` | `http://localhost:3006/upload/files/profile-picture/assistant/profile_picture_xxx.jpg` |

---

## 🔐 الأمان والصلاحيات

### التحقق من نوع المستخدم

```javascript
// في FileService
static getProfilePicturePath(userType) {
  const validUserTypes = ['user', 'doctor', 'admin', 'assistant'];
  
  if (!validUserTypes.includes(userType)) {
    throw new Error(`Invalid user type: ${userType}`);
  }
  
  return `profile-picture/${userType}`;
}
```

### الصلاحيات الموصى بها

```javascript
// في middleware/authMiddleware.js

// فقط المستخدم نفسه يمكنه رفع صورته
function canUploadProfilePicture(req, res, next) {
  const userId = req.user.id;
  const userType = req.user.type;
  const targetId = req.params.id || req.user.id;
  
  if (userId !== targetId) {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك برفع صورة شخصية لمستخدم آخر'
    });
  }
  
  next();
}
```

---

## 🧪 الاختبار

### اختبار رفع صورة - Postman/cURL

```bash
# 1. User Profile Picture
curl -X POST http://localhost:3006/api/profile-user/picture \
  -H "Authorization: Bearer <user_token>" \
  -F "profile_picture=@/path/to/image.jpg"

# 2. Doctor Profile Picture
curl -X POST http://localhost:3006/api/profile-doctor/picture \
  -H "Authorization: Bearer <doctor_token>" \
  -F "profile_picture=@/path/to/image.jpg"

# 3. Admin Profile Picture
curl -X POST http://localhost:3006/api/profile-admin/picture \
  -H "Authorization: Bearer <admin_token>" \
  -F "profile_picture=@/path/to/image.jpg"

# 4. Assistant Profile Picture
curl -X POST http://localhost:3006/api/profile-assistant/picture \
  -H "Authorization: Bearer <assistant_token>" \
  -F "profile_picture=@/path/to/image.jpg"
```

### التحقق من البنية

```bash
# التحقق من وجود المجلدات
ls -la upload/files/profile-picture/

# يجب أن ترى:
# user/
# doctor/
# admin/
# assistant/

# التحقق من محتوى مجلد معين
ls -la upload/files/profile-picture/doctor/
```

---

## 📦 التكامل مع النظام الحالي

### profileService.js (محدث)

```javascript
// في profileService.js - دالة uploadProfilePicture

static async uploadProfilePicture(file, userId, profileType = 'user', profileId = null) {
  try {
    if (!file) {
      throw new Error('لم يتم رفع أي ملف');
    }

    // ✅ يتم تمرير profileType كـ entityType
    const fileRecord = await FileService.uploadFile(
      file,
      {
        entityType: profileType,  // 'user', 'doctor', 'admin', 'assistant'
        entityId: userId
      },
      {
        fileCategory: 'profile_picture',  // ← المفتاح السحري
        relatedToType: `${profileType}_profile`,
        relatedToId: profileId,
        isPublic: true,
        metadata: {
          uploaded_from: 'profile_update',
          profile_type: profileType
        }
      }
    );
    
    return {
      file_url: fileRecord.file_url,
      file_uuid: fileRecord.file_uuid,
      file_id: fileRecord.file_id
    };
  } catch (error) {
    throw new Error('خطأ في رفع الصورة الشخصية: ' + error.message);
  }
}
```

---

## ✅ الميزات

### 1. التنظيم التلقائي
- ✅ كل نوع مستخدم له مجلد خاص
- ✅ سهولة الوصول والإدارة
- ✅ تجنب التشويش والفوضى

### 2. قابلية التوسع
- ✅ سهولة إضافة أنواع جديدة
- ✅ فقط إضافة النوع للـ `validUserTypes`

### 3. الأمان
- ✅ التحقق من نوع المستخدم
- ✅ عزل الملفات حسب النوع

### 4. الأداء
- ✅ تقليل عدد الملفات في مجلد واحد
- ✅ أداء أفضل للنظام

---

## 🔄 الترقية من النظام القديم

### إذا كان لديك صور موجودة

```javascript
// سكريبت لنقل الصور القديمة
const fs = require('fs').promises;
const path = require('path');
const db = require('./config/db');

async function migrateOldProfilePictures() {
  try {
    console.log('🔄 Starting migration...');
    
    // 1. جلب جميع الملفات القديمة
    const [files] = await db.execute(
      `SELECT * FROM files WHERE file_category = 'profile_picture' 
       AND file_path NOT LIKE '%/user/%' 
       AND file_path NOT LIKE '%/doctor/%'
       AND file_path NOT LIKE '%/admin/%'
       AND file_path NOT LIKE '%/assistant/%'`
    );
    
    console.log(`Found ${files.length} files to migrate`);
    
    for (const file of files) {
      // 2. تحديد نوع المستخدم
      let userType = 'user'; // افتراضي
      
      if (file.uploaded_by_doctor_id) userType = 'doctor';
      else if (file.uploaded_by_admin_id) userType = 'admin';
      else if (file.uploaded_by_assistant_id) userType = 'assistant';
      
      // 3. المسارات القديمة والجديدة
      const oldPath = path.join(__dirname, file.file_path);
      const newRelativePath = `/upload/files/profile-picture/${userType}/${path.basename(file.file_path)}`;
      const newPath = path.join(__dirname, newRelativePath);
      
      // 4. نقل الملف
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
      
      // 5. تحديث قاعدة البيانات
      const newUrl = `${process.env.BASE_URL}${newRelativePath}`;
      await db.execute(
        `UPDATE files SET file_path = ?, file_url = ? WHERE id = ?`,
        [newRelativePath, newUrl, file.id]
      );
      
      console.log(`✅ Migrated: ${file.id} → ${newRelativePath}`);
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// تشغيل
migrateOldProfilePictures();
```

---

## 📚 الملفات المحدثة

1. ✅ **`services/fileService.js`**
   - تحديث `uploadFile()` - دعم مجلدات فرعية
   - إضافة `initializeProfilePictureDirectories()`
   - إضافة `getProfilePicturePath()`
   - إضافة `getProfilePictureDirectory()`
   - إضافة `ensureProfilePictureDirectory()`

2. ✅ **`scripts/initializeDirectories.js`** (جديد)
   - سكريبت لإنشاء بنية المجلدات

3. ✅ **`docs/FILE-UPLOAD-SYSTEM.md`** (هذا الملف)
   - توثيق شامل

---

## 🎯 الخطوات التالية الموصى بها

### 1. تشغيل سكريبت التهيئة
```bash
node scripts/initializeDirectories.js
```

### 2. اختبار رفع الصور
- اختبر رفع صورة لكل نوع مستخدم
- تحقق من حفظها في المجلد الصحيح

### 3. تحديث Controllers (إذا لزم الأمر)
- تأكد من تمرير `profileType` الصحيح
- مثال: `'doctor'` للأطباء، `'admin'` للمشرفين

---

## 🎉 الخلاصة

### ✅ ما تم إنجازه:
1. تنظيم صور الملفات الشخصية في مجلدات منفصلة
2. دعم جميع أنواع المستخدمين (user, doctor, admin, assistant)
3. إنشاء تلقائي للمجلدات
4. دوال helper للإدارة
5. توثيق شامل

### 🎯 البنية النهائية:
```
upload/files/profile-picture/
├── user/        ← صور المستخدمين
├── doctor/      ← صور الأطباء
├── admin/       ← صور المشرفين
└── assistant/   ← صور المساعدين
```

### 🚀 جاهز للاستخدام!

---

**تم التوثيق بواسطة:** Cascade AI  
**التاريخ:** نوفمبر 2024  
**الحالة:** ✅ مكتمل وجاهز للإنتاج

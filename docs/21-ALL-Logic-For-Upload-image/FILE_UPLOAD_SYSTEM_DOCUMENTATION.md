# توثيق شامل لنظام رفع الملفات في المشروع
## Complete File Upload System Documentation

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [بنية المجلدات](#بنية-المجلدات)
3. [Middleware المستخدمة](#middleware-المستخدمة)
4. [Services](#services)
5. [Routes التي تستخدم رفع الملفات](#routes-التي-تستخدم-رفع-الملفات)
6. [إعدادات app.js](#إعدادات-appjs)
7. [أمثلة الاستخدام](#أمثلة-الاستخدام)
8. [المشاكل المحتملة والحلول](#المشاكل-المحتملة-والحلول)

---

## 🎯 نظرة عامة

المشروع يستخدم **نظامين** لرفع الملفات:

### **1. FileService (النظام المتقدم)**
- يستخدم لـ **Profile Pictures**
- يحفظ metadata في جدول `files`
- يدعم tracking و statistics
- يستخدم `multer.memoryStorage()`
- يحفظ URL كامل في قاعدة البيانات

### **2. Direct Upload (النظام المباشر)**
- يستخدم لـ **Location Images**
- يحفظ المسار مباشرة في جدول الكيان
- أبسط وأسرع
- يستخدم `multer.memoryStorage()`
- يحفظ URL كامل في قاعدة البيانات

---

## 📁 بنية المجلدات

```
project/
├── upload/
│   ├── files/
│   │   ├── location-images/          ← صور المواقع (عامة)
│   │   │   ├── location_xxx.png
│   │   │   └── ...
│   │   └── profile-picture/          ← صور البروفايل (عامة)
│   │       ├── user/
│   │       │   └── profile_picture_xxx.jpg
│   │       ├── doctor/
│   │       │   └── profile_picture_xxx.jpg
│   │       ├── admin/
│   │       │   └── profile_picture_xxx.jpg
│   │       └── assistant/
│   │           └── profile_picture_xxx.jpg
│   ├── health-tips/                  ← صور النصائح الصحية (عامة)
│   │   └── image-xxx.jpg
│   └── profiles/                     ← مجلد قديم (غير مستخدم)
│
├── middleware/
│   ├── fileUploadMiddleware.js       ← النظام المتقدم
│   ├── uploadMiddleware.js           ← للصور الشخصية
│   ├── formDataMiddleware.js         ← لـ form-data بدون ملفات
│   └── healthTipsMiddleware.js       ← للنصائح الصحية
│
├── services/
│   ├── fileService.js                ← خدمة مركزية للملفات
│   └── profileService.js             ← خدمة الملفات الشخصية
│
└── scripts/
    └── initializeDirectories.js      ← إنشاء المجلدات
```

---

## 🔧 Middleware المستخدمة

### **1. fileUploadMiddleware.js** (النظام المتقدم)

**الموقع:** `middleware/fileUploadMiddleware.js`

**الميزات:**
- ✅ يدعم فئات متعددة: `images`, `documents`, `medicalImages`, `all`
- ✅ يستخدم `multer.memoryStorage()`
- ✅ حجم افتراضي: 10MB (للصور 5MB)
- ✅ معالجة أخطاء متقدمة

**Middleware الجاهزة:**
```javascript
uploadMiddleware.singleImage        // صورة واحدة (field: 'image')
uploadMiddleware.multipleImages     // صور متعددة (field: 'images')
uploadMiddleware.singleDocument     // مستند واحد
uploadMiddleware.multipleDocuments  // مستندات متعددة
uploadMiddleware.singleMedicalImage // صورة طبية
uploadMiddleware.multipleMedicalImages
uploadMiddleware.anyFile            // أي نوع ملف
```

**الاستخدام:**
```javascript
const { uploadMiddleware } = require('../middleware/fileUploadMiddleware');

router.post('/upload', uploadMiddleware.singleImage, controller.upload);
```

---

### **2. uploadMiddleware.js** (للصور الشخصية)

**الموقع:** `middleware/uploadMiddleware.js`

**الميزات:**
- ✅ مخصص لصور البروفايل
- ✅ يستخدم `multer.memoryStorage()`
- ✅ حجم أقصى: 5MB
- ✅ أنواع مدعومة: JPEG, PNG, JPG, WebP

**Middleware:**
```javascript
uploadProfilePictureMiddleware  // field: 'profile_picture'
```

**الاستخدام:**
```javascript
const { uploadProfilePictureMiddleware } = require('../middleware/uploadMiddleware');

router.post('/picture', uploadProfilePictureMiddleware, controller.uploadProfilePicture);
```

---

### **3. formDataMiddleware.js**

**الموقع:** `middleware/formDataMiddleware.js`

**الوظيفة:**
- معالجة `multipart/form-data` **بدون ملفات**
- يستخدم `multer().none()`

**⚠️ تحذير:**
- **لا تستخدمه** مع routes التي ترفع ملفات
- استخدم `fileUploadMiddleware` أو `uploadMiddleware` بدلاً منه

**الاستخدام الصحيح:**
```javascript
// ✅ صحيح - بدون ملفات
router.put('/profile', parseFormData, controller.updateProfile);

// ❌ خطأ - مع ملفات
router.post('/picture', parseFormData, controller.uploadPicture); // خطأ!

// ✅ صحيح - مع ملفات
router.post('/picture', uploadProfilePictureMiddleware, controller.uploadPicture);
```

---

### **4. healthTipsMiddleware.js**

**الموقع:** `middleware/healthTipsMiddleware.js`

**الميزات:**
- ✅ يستخدم `multer.diskStorage()` (يحفظ مباشرة على القرص)
- ✅ المجلد: `upload/health-tips/`
- ✅ حجم أقصى: 5MB
- ✅ أنواع مدعومة: صور فقط

**⚠️ ملاحظة:**
- هذا middleware **غير مستخدم حالياً** في Routes
- تم إعداده للاستخدام المستقبلي

---

## 🛠️ Services

### **1. FileService** (خدمة مركزية)

**الموقع:** `services/fileService.js`

**الوظائف الرئيسية:**

#### **uploadFile(file, uploadedBy, options)**
```javascript
const fileRecord = await FileService.uploadFile(
  file,                          // Multer file object
  {
    entityType: 'user',          // 'user', 'doctor', 'admin', 'assistant'
    entityId: userId
  },
  {
    fileCategory: 'profile_picture',
    relatedToType: 'user_profile',
    relatedToId: profileId,
    isPublic: true,
    metadata: { ... }
  }
);
```

**النتيجة:**
```javascript
{
  id: 1,
  uuid: 'xxx-xxx-xxx',
  file_url: 'http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg',
  original_filename: 'photo.jpg',
  stored_filename: 'profile_picture_xxx.jpg',
  file_size: 123456,
  mime_type: 'image/jpeg',
  file_category: 'profile_picture'
}
```

**مسار الحفظ:**
- Profile Pictures: `upload/files/profile-picture/{userType}/`
- Other Categories: `upload/files/{category}/`

**قاعدة البيانات:**
- يحفظ في جدول `files`
- يحفظ **URL كامل** في `file_url`
- يحفظ metadata كاملة

---

#### **getFileByUuid(uuid)**
```javascript
const file = await FileService.getFileByUuid('xxx-xxx-xxx');
```

---

#### **deleteFile(uuid, deleteFromDisk)**
```javascript
await FileService.deleteFile('xxx-xxx-xxx', true);
```

---

### **2. ProfileService**

**الموقع:** `services/profileService.js`

**الوظائف الرئيسية:**

#### **uploadProfilePicture(file, userId, profileType, profileId)**
```javascript
const result = await ProfileService.uploadProfilePicture(
  req.file,
  userId,
  'user',        // 'user', 'doctor', 'admin', 'assistant'
  profileId
);
```

**النتيجة:**
```javascript
{
  file_url: 'http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg',
  file_uuid: 'xxx-xxx-xxx',
  file_id: 1
}
```

**يستخدم FileService داخلياً**

---

#### **deleteProfilePicture(pictureUrl)**
```javascript
await ProfileService.deleteProfilePicture(
  'http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg'
);
```

**يدعم:**
- ✅ URL كامل
- ✅ مسار نسبي

---

## 🛣️ Routes التي تستخدم رفع الملفات

### **1. countriesCitiesRoutes.js**

**الملفات المرفوعة:** صور المواقع الجغرافية

**Middleware:** `uploadMiddleware.singleImage`

**Routes:**
```javascript
// POST - إنشاء موقع مع صورة
router.post('/', authenticateJWT, authorizeAnyAdmin, uploadMiddleware.singleImage, create);

// PUT - تحديث موقع مع صورة
router.put('/:id', authenticateJWT, authorizeAnyAdmin, uploadMiddleware.singleImage, update);
```

**Field Name:** `image`

**التخزين:**
- المجلد: `upload/files/location-images/`
- قاعدة البيانات: `countries_cities.image`
- النوع: URL كامل

**مثال:**
```
http://localhost:3006/upload/files/location-images/location_1765080605355.png
```

---

### **2. profileUserRoutes.js**

**الملفات المرفوعة:** صور البروفايل للمستخدمين

**Middleware:** `uploadProfilePictureMiddleware`

**Routes:**
```javascript
// POST - رفع صورة البروفايل
router.post('/picture', uploadProfilePictureMiddleware, uploadProfilePicture);

// DELETE - حذف صورة البروفايل
router.delete('/picture', deleteProfilePicture);
```

**Field Name:** `profile_picture`

**التخزين:**
- المجلد: `upload/files/profile-picture/user/`
- قاعدة البيانات: `user_profiles.profile_picture_url` + جدول `files`
- النوع: URL كامل

**مثال:**
```
http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg
```

---

### **3. profileDoctorRoutes.js**

**الملفات المرفوعة:** صور البروفايل للأطباء

**Middleware:** `uploadProfilePictureMiddleware`

**Routes:**
```javascript
// POST - رفع صورة البروفايل
router.post('/picture', uploadProfilePictureMiddleware, uploadProfilePicture);

// DELETE - حذف صورة البروفايل
router.delete('/picture', deleteProfilePicture);
```

**Field Name:** `profile_picture`

**التخزين:**
- المجلد: `upload/files/profile-picture/doctor/`
- قاعدة البيانات: `doctor_profiles.profile_picture_url` + جدول `files`
- النوع: URL كامل

**مثال:**
```
http://localhost:3006/upload/files/profile-picture/doctor/profile_picture_xxx.jpg
```

---

### **4. healthTipsRoutes.js**

**الملفات المرفوعة:** لا يوجد حالياً

**ملاحظة:**
- Routes لا تستخدم رفع ملفات حالياً
- `healthTipsMiddleware` جاهز للاستخدام المستقبلي

---

## ⚙️ إعدادات app.js

### **Static Files Middleware**

```javascript
// ============================================
// Public Static Files (No Authentication)
// ============================================

// 1. Location images
app.use('/upload/files/location-images', express.static(
  path.join(__dirname, 'upload', 'files', 'location-images'),
  {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
));

// 2. Profile pictures
app.use('/upload/files/profile-picture', express.static(
  path.join(__dirname, 'upload', 'files', 'profile-picture'),
  {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
));

// 3. Health tips images
app.use('/upload/health-tips', express.static(
  path.join(__dirname, 'upload', 'health-tips'),
  {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
));

// Protected upload routes (requires authentication)
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/upload', uploadRoutes);
```

**الترتيب مهم:**
1. ✅ Static files أولاً (بدون authentication)
2. ✅ Protected routes ثانياً (مع authentication)

---

### **Security Headers**

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https:", "http:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

---

### **CORS Configuration**

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3006',
  'https://api.bashraai.com',
  'https://bashraai.com',
  'https://www.bashraai.com',
  process.env.FRONTEND_URL,
].filter(Boolean);
```

---

## 📝 أمثلة الاستخدام

### **1. رفع صورة موقع جغرافي**

```bash
POST /api/countries-cities
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}

Body (form-data):
- name_ar: "السعودية"
- name_en: "Saudi Arabia"
- level_type: "country"
- image: [file]
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الموقع بنجاح",
  "data": {
    "countries_cities_id": 1,
    "name_ar": "السعودية",
    "name_en": "Saudi Arabia",
    "level_type": "country",
    "image": "http://localhost:3006/upload/files/location-images/location_xxx.png"
  }
}
```

**الوصول للصورة:**
```
http://localhost:3006/upload/files/location-images/location_xxx.png
```

---

### **2. رفع صورة بروفايل مستخدم**

```bash
POST /api/profile-user/picture
Content-Type: multipart/form-data
Authorization: Bearer {user_token}

Body (form-data):
- profile_picture: [file]
```

**Response:**
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg"
  }
}
```

**الوصول للصورة:**
```
http://localhost:3006/upload/files/profile-picture/user/profile_picture_xxx.jpg
```

---

### **3. رفع صورة بروفايل طبيب**

```bash
POST /api/profile-doctor/picture
Content-Type: multipart/form-data
Authorization: Bearer {doctor_token}

Body (form-data):
- profile_picture: [file]
```

**Response:**
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "http://localhost:3006/upload/files/profile-picture/doctor/profile_picture_xxx.jpg"
  }
}
```

---

## 🐛 المشاكل المحتملة والحلول

### **المشكلة 1: الصور لا تظهر (404 Not Found)**

**السبب:**
- مجلد الصور غير متاح كـ static files

**الحل:**
```javascript
// في app.js - إضافة static middleware
app.use('/upload/files/location-images', express.static(...));
```

---

### **المشكلة 2: CORS Error عند تحميل الصور**

**السبب:**
- Domain غير موجود في allowed origins
- `crossOriginResourcePolicy` غير مضبوط

**الحل:**
```javascript
// 1. إضافة domain في CORS
const allowedOrigins = [
  'https://yourdomain.com',
  // ...
];

// 2. إضافة CORP في Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

---

### **المشكلة 3: الصورة تُرفع لكن المسار خاطئ**

**السبب:**
- `BASE_URL` غير مضبوط في `.env`

**الحل:**
```env
# في .env
BASE_URL=http://localhost:3006          # Local
BASE_URL=https://api.bashraai.com       # Production
```

---

### **المشكلة 4: خطأ عند رفع ملف كبير**

**السبب:**
- حجم الملف أكبر من الحد المسموح

**الحل:**
```javascript
// في middleware
limits: {
  fileSize: 10 * 1024 * 1024  // 10MB
}
```

---

### **المشكلة 5: نوع الملف غير مدعوم**

**السبب:**
- MIME type غير موجود في file filter

**الحل:**
```javascript
// في fileUploadMiddleware.js
const FILE_FILTERS = {
  images: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
};
```

---

## ✅ Checklist للتأكد من عمل النظام

### **Backend:**
- [ ] `BASE_URL` مضبوط في `.env`
- [ ] Static middleware مضاف في `app.js`
- [ ] CORS يشمل جميع domains المطلوبة
- [ ] Helmet CSP يسمح بالصور
- [ ] المجلدات موجودة (`upload/files/...`)
- [ ] Middleware صحيح في Routes

### **Testing:**
- [ ] رفع صورة موقع يعمل
- [ ] رفع صورة بروفايل يعمل
- [ ] الوصول للصور بدون token يعمل
- [ ] حذف الصور يعمل
- [ ] تحديث الصور يعمل

### **Production:**
- [ ] `BASE_URL` يشير لـ production domain
- [ ] HTTPS مفعّل
- [ ] Nginx configured (إذا كان موجود)
- [ ] صلاحيات المجلدات صحيحة

---

## 📊 ملخص الفروقات

| الميزة | Location Images | Profile Pictures |
|--------|----------------|------------------|
| **Middleware** | `uploadMiddleware.singleImage` | `uploadProfilePictureMiddleware` |
| **Service** | مباشر في Controller | `FileService` + `ProfileService` |
| **Database** | `countries_cities.image` | `user_profiles.profile_picture_url` + `files` |
| **Storage** | `upload/files/location-images/` | `upload/files/profile-picture/{type}/` |
| **URL Type** | Full URL | Full URL |
| **Public Access** | ✅ Yes | ✅ Yes |
| **Metadata** | ❌ No | ✅ Yes (في `files`) |

---

## 🎯 التوصيات

1. **استخدم FileService** لجميع الملفات المستقبلية
2. **احتفظ بـ URL كامل** في قاعدة البيانات
3. **استخدم Static Middleware** للملفات العامة
4. **لا تخلط** بين `parseFormData` و file upload middleware
5. **اختبر** في Local قبل Production

---

**تاريخ التوثيق:** 7 ديسمبر 2024  
**الإصدار:** 1.0  
**الحالة:** ✅ مكتمل ومختبر

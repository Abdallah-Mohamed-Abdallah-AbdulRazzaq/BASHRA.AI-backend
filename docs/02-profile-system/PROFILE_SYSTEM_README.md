# Profile System - نظام الملفات الشخصية

## نظرة عامة | Overview

نظام إدارة الملفات الشخصية للمستخدمين في منصة Bashra AI. يدعم النظام:
- ✅ إدارة البيانات الشخصية للمستخدمين
- ✅ دعم متعدد اللغات (عربي - إنجليزي)
- ✅ رفع وإدارة الصور الشخصية
- ✅ CRUD operations كاملة
- ✅ التحقق من صحة البيانات
- ✅ معالجة الأخطاء

---

## هيكل المشروع | Project Structure

```
BASHRA.AI-backend/
├── controllers/
│   └── profileUserController.js       # معالج الملفات الشخصية للمستخدمين
│
├── services/
│   └── profileService.js              # خدمات مشتركة (رفع الصور، validation، إلخ)
│
├── routes/
│   ├── profileUserRoutes.js           # مسارات الملفات الشخصية للمستخدمين
│   └── index.js                       # نقطة دخول الـ routes الرئيسية
│
├── middleware/
│   ├── authMiddleware.js              # مصادقة JWT
│   └── uploadMiddleware.js            # معالجة رفع الملفات باستخدام Multer
│
├── utils/
│   └── langHelper.js                  # دوال مساعدة للغات المتعددة
│
├── upload/
│   └── profiles/
│       └── user/                      # مجلد الصور الشخصية للمستخدمين
│
└── docs/
    ├── PROFILE_USER_API.md            # توثيق API
    └── PROFILE_SYSTEM_README.md       # هذا الملف
```

---

## قاعدة البيانات | Database Schema

### الجدول: user_profiles

```sql
CREATE TABLE user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date_of_birth DATE,
  gender ENUM('male','female','other','prefer_not_to_say'),
  nationality VARCHAR(100),
  profile_picture_url VARCHAR(500),
  emergency_contact_phone VARCHAR(20),
  timezone VARCHAR(50),
  language_preference VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### الجدول: user_profile_translations

```sql
CREATE TABLE user_profile_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL,
  language_code VARCHAR(10) NOT NULL,
  full_name VARCHAR(300),
  emergency_contact_name VARCHAR(200),
  emergency_contact_relationship VARCHAR(50),
  FOREIGN KEY (profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);
```

---

## كيفية العمل | How It Works

### 1. عند التسجيل (Registration)

عند تسجيل مستخدم جديد، يتم إنشاء ملف شخصي أساسي تلقائياً في `AuthController`:

```javascript
// في user_profiles
INSERT INTO user_profiles (user_id, language_preference) 
VALUES (?, ?);

// في user_profile_translations
INSERT INTO user_profile_translations (profile_id, language_code, full_name) 
VALUES (?, ?, ?);
```

**البيانات المُدخلة عند التسجيل:**
- `user_profiles`: id, user_id, timezone, language_preference
- `user_profile_translations`: id, profile_id, language_code, full_name

### 2. تحديث الملف الشخصي (Update Profile)

المستخدم يمكنه إضافة/تحديث باقي البيانات:

```javascript
PUT /api/profile-user
{
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "nationality": "Egyptian",
  "emergency_contact_phone": "+20123456789",
  "translations": {
    "ar": {
      "full_name": "أحمد محمد",
      "emergency_contact_name": "فاطمة أحمد",
      "emergency_contact_relationship": "أخت"
    },
    "en": {
      "full_name": "Ahmed Mohamed",
      "emergency_contact_name": "Fatima Ahmed",
      "emergency_contact_relationship": "Sister"
    }
  }
}
```

### 3. الحصول على البيانات (Get Profile)

عند طلب الملف الشخصي، يتم:
1. جلب البيانات من الجدولين
2. تصفية البيانات حسب اللغة المطلوبة
3. إزالة suffixes (`_ar`, `_en`)
4. إرجاع response نظيف

**مثال:**
```javascript
// في قاعدة البيانات:
{
  full_name_ar: "أحمد محمد",
  full_name_en: "Ahmed Mohamed"
}

// في الـ Response (للغة العربية):
{
  full_name: "أحمد محمد"
}

// في الـ Response (للغة الإنجليزية):
{
  full_name: "Ahmed Mohamed"
}
```

---

## الملفات الرئيسية | Main Files

### 1. profileService.js

خدمات مشتركة يمكن استخدامها في أي نوع من الملفات الشخصية (user, doctor, assistant, admin):

**الوظائف:**
- `uploadProfilePicture()` - رفع الصورة الشخصية
- `deleteProfilePicture()` - حذف الصورة الشخصية
- `validateDateFormat()` - التحقق من صيغة التاريخ
- `validatePhoneNumber()` - التحقق من صحة رقم الهاتف
- `validateGender()` - التحقق من صحة قيمة الجنس
- `getProfileByUserId()` - جلب الملف الشخصي
- `profileExists()` - التحقق من وجود الملف
- `updateProfileTranslation()` - تحديث الترجمات

### 2. profileUserController.js

معالج CRUD operations للمستخدمين:

**الوظائف:**
- `getProfile()` - جلب الملف الشخصي
- `updateProfile()` - تحديث الملف الشخصي
- `uploadProfilePicture()` - رفع الصورة
- `deleteProfilePicture()` - حذف الصورة
- `deleteProfile()` - إلغاء تفعيل الحساب

### 3. uploadMiddleware.js

معالجة رفع الملفات باستخدام Multer:

**المميزات:**
- استخدام Memory Storage (الملفات في الذاكرة كـ Buffer)
- التحقق من نوع الملف (JPEG, PNG, WebP فقط)
- الحد الأقصى للحجم: 5MB
- معالجة الأخطاء بشكل صحيح

### 4. langHelper.js

دوال مساعدة للتعامل مع اللغات المتعددة:

**الوظيفة الرئيسية:**
```javascript
filterByLanguage(data, lang)
```

تقوم بـ:
1. نسخ `field_ar` أو `field_en` إلى `field`
2. حذف `field_ar` و `field_en`
3. إرجاع object نظيف بدون suffixes

---

## استخدام النظام مع ملفات شخصية أخرى | Using with Other Profile Types

يمكن استخدام نفس الـ Service مع أنواع أخرى من الملفات الشخصية:

### مثال: Doctor Profile

```javascript
// في profileDoctorController.js
const profile = await ProfileService.getProfileByUserId(
  userId,
  'doctor_profiles',              // جدول مختلف
  'doctor_profile_translations',  // جدول ترجمات مختلف
  language
);

// رفع صورة للطبيب
const pictureUrl = await ProfileService.uploadProfilePicture(
  req.file, 
  userId, 
  'doctor'  // نوع مختلف
);
```

---

## معالجة الأخطاء | Error Handling

النظام يتعامل مع الأخطاء بشكل شامل:

### 1. Validation Errors (400)
```json
{
  "success": false,
  "message": "صيغة تاريخ الميلاد غير صحيحة"
}
```

### 2. Not Found (404)
```json
{
  "success": false,
  "message": "الملف الشخصي غير موجود"
}
```

### 3. Server Errors (500)
```json
{
  "success": false,
  "message": "خطأ في الخادم",
  "error": "Error details..."
}
```

---

## الأمان | Security

### 1. JWT Authentication
جميع endpoints محمية بـ JWT token:
```javascript
router.use(authenticateJWT);
```

### 2. File Upload Security
- التحقق من نوع الملف
- الحد الأقصى للحجم: 5MB
- تسمية الملفات بشكل آمن مع timestamp
- حذف الملفات القديمة تلقائياً

### 3. SQL Injection Protection
استخدام Prepared Statements:
```javascript
await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
```

### 4. Transaction Support
جميع العمليات المعقدة تستخدم transactions:
```javascript
const connection = await db.getConnection();
await connection.beginTransaction();
try {
  // operations...
  await connection.commit();
} catch (error) {
  await connection.rollback();
}
```

---

## الاختبار | Testing

### اختبار رفع الصورة

```bash
# باستخدام cURL
curl -X POST \
  http://localhost:3006/api/profile-user/picture \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'profile_picture=@/path/to/image.jpg'
```

### اختبار تحديث الملف الشخصي

```bash
# باستخدام cURL
curl -X PUT \
  http://localhost:3006/api/profile-user \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'Accept-Language: ar' \
  -d '{
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "translations": {
      "ar": {
        "full_name": "أحمد محمد"
      }
    }
  }'
```

---

## التطوير المستقبلي | Future Development

### 1. Profile Doctor
- إضافة حقول خاصة بالأطباء (specialty, license_number, etc.)
- نفس الـ Service يمكن استخدامه

### 2. Profile Assistant
- إضافة حقول خاصة بالمساعدين
- نفس الـ Service يمكن استخدامه

### 3. Profile Admin
- إضافة حقول خاصة بالمسؤولين
- نفس الـ Service يمكن استخدامه

### 4. Image Processing
- إضافة معالجة الصور (resize, compress, etc.)
- استخدام مكتبة مثل Sharp

### 5. Cloud Storage
- رفع الصور إلى AWS S3 أو Cloudinary
- بدلاً من التخزين المحلي

---

## الملاحظات المهمة | Important Notes

1. **Soft Delete**: عملية حذف الملف الشخصي لا تحذف البيانات فعلياً، بل تقوم بإلغاء تفعيل الحساب

2. **Auto Delete**: عند رفع صورة جديدة، يتم حذف الصورة القديمة تلقائياً

3. **Partial Update**: يمكن تحديث أي حقل بشكل منفصل دون الحاجة لإرسال جميع الحقول

4. **Language Support**: النظام يدعم اللغتين العربية والإنجليزية بشكل كامل

5. **Reusable Service**: الـ Service يمكن استخدامه لجميع أنواع الملفات الشخصية

---

## الدعم | Support

لمزيد من المعلومات، راجع:
- [API Documentation](./PROFILE_USER_API.md)
- Database Schema في `BASHRA-Final.sql`
- Code comments في الملفات المختلفة

---

**Author:** Abdallah Mohamed  
**Date:** November 2024  
**Version:** 1.0.0

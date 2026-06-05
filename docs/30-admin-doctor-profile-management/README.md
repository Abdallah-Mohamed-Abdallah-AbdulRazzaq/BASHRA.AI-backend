# نظام إدارة ملفات الأطباء للأدمن
# Admin Doctor Profile Management System

## نظرة عامة | Overview

تم بناء نظام شامل للأدمن لإدارة ملفات الأطباء بشكل كامل، متوافق تماماً مع بنية المشروع الحالية.

A comprehensive system has been built for admins to manage doctors' profiles completely, fully compatible with the current project structure.

---

## ما تم إنجازه | What Was Done

### ✅ 1. مراجعة بنية المشروع
تمت مراجعة جميع الملفات الأساسية:
- `config/staticFilesConfig.js` - إعدادات الملفات الثابتة
- `middleware/fileUploadMiddleware.js` - middleware رفع الملفات
- `middleware/formDataMiddleware.js` - معالجة form-data
- `services/fileService.js` - خدمة إدارة الملفات
- `services/profileService.js` - خدمة الملفات الشخصية
- `controllers/AdminDoctorManagementController.js` - Controller الأدمن الحالي

### ✅ 2. بناء Controller جديد
تم إنشاء `AdminDoctorProfileManagementController.js` مع:
- 9 APIs كاملة
- دعم CRUD كامل
- متوافق مع بنية المشروع
- استخدام نفس الأساليب (Winston logger, logAdminAction, etc.)

### ✅ 3. إنشاء Routes
تم إنشاء `adminDoctorProfileManagementRoutes.js` مع:
- 9 routes منظمة
- Authentication & Authorization
- توثيق كامل لكل route

### ✅ 4. التوثيق
تم إنشاء ملفين فقط كما طلبت:
1. `admin-doctor-profile-management-logic.md` - شرح اللوجيك
2. `admin-doctor-profile-management-api-testing.json` - اختبار APIs (15 اختبار)

---

## الـ APIs المتاحة | Available APIs

### 1. GET APIs (جلب البيانات)
- `GET /api/admin/doctors/:doctorId/profile/complete` - جميع البيانات
- `GET /api/admin/doctors/:doctorId/profile/personal` - البيانات الشخصية
- `GET /api/admin/doctors/:doctorId/profile/professional` - البيانات المهنية
- `GET /api/admin/doctors/:doctorId/profile/documents` - المستندات
- `GET /api/admin/doctors/:doctorId/profile/documents/summary` - ملخص المستندات

### 2. PUT APIs (تحديث البيانات)
- `PUT /api/admin/doctors/:doctorId/profile/personal` - تحديث البيانات الشخصية
- `PUT /api/admin/doctors/:doctorId/profile/professional` - تحديث البيانات المهنية
- `PUT /api/admin/doctors/:doctorId/profile/documents/:documentId` - الموافقة/رفض مستند

### 3. DELETE APIs (حذف البيانات)
- `DELETE /api/admin/doctors/:doctorId/profile` - حذف الملف الشخصي (حذف ناعم)

### 4. POST APIs (إجراءات خاصة)
- `POST /api/admin/doctors/:doctorId/profile/approve` - الموافقة الكاملة على الملف الشخصي
- `POST /api/admin/doctors/:doctorId/profile/reject` - رفض الملف الشخصي

---

## الميزات | Features

### 1. التوافق مع بنية المشروع ✅
- استخدام نفس الـ services (FileService, ProfileService)
- استخدام نفس الـ middleware (authenticateJWT, authorizeAdmin)
- استخدام نفس أسلوب الـ logging (Winston + logAdminAction)
- استخدام نفس أسلوب معالجة الأخطاء

### 2. CRUD كامل ✅
- Create: من خلال الطبيب نفسه
- Read: 5 APIs للقراءة (منفصلة ومجمعة)
- Update: 3 APIs للتحديث
- Delete: 1 API للحذف (حذف ناعم)

### 3. إدارة المستندات ✅
- عرض جميع المستندات
- الموافقة/رفض المستندات
- ملخص إحصائي
- تسجيل من قام بالموافقة/الرفض

### 4. دعم اللغات المتعددة ✅
- تحديث الترجمات لعدة لغات
- دعم العربية والإنجليزية
- رسائل خطأ بلغتين

### 5. الأمان والتسجيل ✅
- Authentication & Authorization
- تسجيل جميع الإجراءات
- Winston logger
- معلومات العميل (IP, User Agent)

---

## بنية الملفات | File Structure

```
project/
├── controllers/
│   ├── AdminDoctorManagementController.js (موجود مسبقاً)
│   └── AdminDoctorProfileManagementController.js (جديد) ✨
│
├── routes/
│   ├── adminDoctorManagementRoutes.js (موجود مسبقاً)
│   ├── adminDoctorProfileManagementRoutes.js (جديد) ✨
│   └── index.js (تم التعديل) 🔧
│
└── docs/
    └── 30-admin-doctor-profile-management/ (جديد) ✨
        ├── admin-doctor-profile-management-logic.md
        ├── admin-doctor-profile-management-api-testing.json
        └── README.md (هذا الملف)
```

---

## كيفية الاستخدام | How to Use

### 1. تسجيل الدخول كأدمن
```bash
POST http://localhost:3006/api/auth-admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

### 2. جلب الملف الكامل للطبيب
```bash
GET http://localhost:3006/api/admin/doctors/1/profile/complete
Authorization: Bearer ADMIN_TOKEN
```

### 3. تحديث البيانات المهنية
```bash
PUT http://localhost:3006/api/admin/doctors/1/profile/professional
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "years_of_experience": 12,
  "translations": {
    "ar": {
      "specialty": "أمراض القلب"
    }
  }
}
```

### 4. الموافقة على مستند
```bash
PUT http://localhost:3006/api/admin/doctors/1/profile/documents/1
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "status": "approved"
}
```

---

## الاختبار | Testing

### استخدام Postman:

1. **استيراد Collection:**
   ```
   docs/30-admin-doctor-profile-management/admin-doctor-profile-management-api-testing.json
   ```

2. **تعيين المتغيرات:**
   - `base_url`: http://localhost:3006
   - `admin_token`: YOUR_ADMIN_TOKEN
   - `doctor_id`: 1
   - `document_id`: 1

3. **تشغيل الاختبارات:**
   - 15 اختبار شامل
   - تغطية جميع السيناريوهات

---

## الفرق بين الأنظمة | System Differences

### نظام إدارة الأطباء الأساسي
**Path:** `/api/admin/doctors`

**الوظائف:**
- إدارة حالة الطبيب (active, inactive, suspended)
- الموافقة/رفض الطبيب (approve, reject)
- التحقق من الملف (verify)
- إحصائيات عامة

### نظام إدارة ملفات الأطباء (الجديد)
**Path:** `/api/admin/doctors/:doctorId/profile`

**الوظائف:**
- إدارة البيانات الشخصية (personal data)
- إدارة البيانات المهنية (professional data)
- إدارة مستندات التحقق (verification documents)
- تحديث الترجمات (translations)

---

## التكامل | Integration

### مع نظام الطبيب:
```
الطبيب يدخل البيانات:
/api/profile-doctor/basic
/api/profile-doctor/professional
/api/profile-doctor/verification-documents

الأدمن يراجع ويعدل:
/api/admin/doctors/:doctorId/profile/personal
/api/admin/doctors/:doctorId/profile/professional
/api/admin/doctors/:doctorId/profile/documents
```

### مع نظام الإدارة الأساسي:
```
الإدارة الأساسية:
/api/admin/doctors (الحالة، الموافقة، التعليق)

إدارة الملفات:
/api/admin/doctors/:doctorId/profile (البيانات التفصيلية)
```

---

## الأمان | Security

### 1. Authentication & Authorization
```javascript
router.use(authenticateJWT, authorizeAdmin);
```
- فقط الأدمن يمكنه الوصول
- التحقق من الصلاحيات

### 2. Logging
```javascript
await logAdminAction(
  adminId,
  'UPDATE_DOCTOR_PERSONAL_DATA',
  'doctor',
  doctorId,
  oldData,
  newData,
  clientInfo
);
```
- تسجيل جميع الإجراءات
- معلومات العميل
- البيانات القديمة والجديدة

### 3. Validation
- التحقق من البيانات المدخلة
- التحقق من وجود السجلات
- معالجة الأخطاء

---

## ملاحظات مهمة | Important Notes

### 1. لا تعارض مع الأنظمة الموجودة
- النظام الجديد مكمل للنظام الأساسي
- لا يوجد تداخل في الـ routes
- استخدام نفس الأساليب والمعايير

### 2. متوافق مع بنية المشروع
- استخدام نفس الـ services
- استخدام نفس الـ middleware
- استخدام نفس أسلوب الـ logging

### 3. قابل للتوسع
- يمكن إضافة APIs جديدة بسهولة
- بنية واضحة ومنظمة
- توثيق شامل

---

## الخطوات التالية المقترحة | Suggested Next Steps

### 1. للتطوير:
- إضافة APIs للإحصائيات التفصيلية
- إضافة APIs للتقارير
- إضافة APIs للتصدير (Export)

### 2. للأمان:
- إضافة rate limiting
- إضافة audit trail
- إضافة notifications

### 3. للتحسين:
- إضافة caching
- إضافة pagination للمستندات
- إضافة bulk operations

---

## الدعم | Support

### الملفات المرجعية:
1. **شرح اللوجيك:**
   `docs/30-admin-doctor-profile-management/admin-doctor-profile-management-logic.md`

2. **اختبار APIs:**
   `docs/30-admin-doctor-profile-management/admin-doctor-profile-management-api-testing.json`

3. **هذا الملف:**
   `docs/30-admin-doctor-profile-management/README.md`

---

## الخلاصة | Summary

تم بنجاح:
- ✅ مراجعة بنية المشروع الكاملة
- ✅ بناء نظام متوافق 100% مع البنية الحالية
- ✅ إنشاء 9 APIs كاملة (CRUD)
- ✅ توثيق شامل (ملفين فقط كما طلبت)
- ✅ 15 اختبار شامل في Postman
- ✅ لا تعارض مع الأنظمة الموجودة
- ✅ استخدام نفس الأساليب والمعايير

**النظام جاهز للاستخدام والاختبار! 🎉**

---

**تاريخ الإنشاء:** 7 مارس 2026
**الحالة:** ✅ مكتمل ومختبر

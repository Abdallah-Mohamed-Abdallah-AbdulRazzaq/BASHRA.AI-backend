# تحديث شامل للوجيك الخاص بالأطباء
# Complete Doctor Logic Update

## نظرة عامة | Overview

تم تنفيذ تحديث شامل للوجيك الخاص بالأطباء، حيث تم:
1. مراجعة اللوجيك الحالي للبيانات الشخصية
2. إضافة route جديد للبيانات المهنية
3. إضافة لوجيك كامل لمستندات التحقق

---

## ملخص التعديلات | Summary of Changes

### 1. البيانات الشخصية (Personal Data) - موجودة مسبقاً ✓

**Route:** `/api/profile-doctor`

**APIs المتاحة:**
- `GET /api/profile-doctor` - جلب الملف الشخصي
- `GET /api/profile-doctor/basic` - جلب البيانات الأساسية
- `GET /api/profile-doctor/complete` - جلب البيانات الكاملة
- `PUT /api/profile-doctor` - تحديث الملف الشخصي
- `PUT /api/profile-doctor/basic` - تحديث البيانات الأساسية
- `POST /api/profile-doctor/picture` - رفع الصورة الشخصية
- `DELETE /api/profile-doctor/picture` - حذف الصورة الشخصية
- `DELETE /api/profile-doctor` - إلغاء تفعيل الحساب
- `PATCH /api/profile-doctor/reactivate` - إعادة تفعيل الحساب

**البيانات المشمولة:**
- من جدول `doctors`: email, phone
- من جدول `doctor_profiles`: date_of_birth, gender, nationality, emergency_contact_phone, timezone, language_preference
- من جدول `doctor_profile_translations`: full_name, emergency_contact_name, emergency_contact_relationship

---

### 2. البيانات المهنية (Professional Data) - جديد ✨

**Route:** `/api/profile-doctor/professional`

**Files Created:**
- `controllers/doctorProfessionalController.js`
- `routes/doctorProfessionalRoutes.js`
- `docs/27-doctor-professional-data/doctor-professional-logic.md`
- `docs/27-doctor-professional-data/doctor-professional-api-testing.json`

**APIs المتاحة:**
- `GET /api/profile-doctor/professional` - جلب البيانات المهنية
- `PUT /api/profile-doctor/professional` - تحديث البيانات المهنية

**البيانات المشمولة:**
- من جدول `doctor_profiles`:
  - `license_number` - رقم الترخيص
  - `years_of_experience` - سنوات الخبرة
  - `medical_school` - الجامعة
  - `graduation_year` - سنة التخرج
  - `board_certifications` - شهادات البورد (JSON)
  - `languages_spoken` - اللغات المنطوقة (JSON)
  - `rating_average`, `rating_count`, `total_consultations` - إحصائيات
  - `is_verified`, `verification_date`, `approval_status` - حالة التوثيق

- من جدول `doctor_profile_translations`:
  - `specialty` - التخصص
  - `sub_specialty` - التخصص الفرعي
  - `biography` - السيرة الذاتية

**الميزات:**
- دعم تحديث لغة واحدة أو عدة لغات
- التحقق من فرادة رقم الترخيص
- معالجة JSON fields تلقائياً

---

### 3. مستندات التحقق (Verification Documents) - جديد ✨

**Route:** `/api/profile-doctor/verification-documents`

**Files Created:**
- `controllers/doctorVerificationDocumentsController.js`
- `routes/doctorVerificationDocumentsRoutes.js`
- `docs/28-doctor-verification-documents/doctor-verification-documents-logic.md`
- `docs/28-doctor-verification-documents/doctor-verification-documents-api-testing.json`

**APIs المتاحة:**
- `POST /api/profile-doctor/verification-documents` - رفع مستند جديد
- `GET /api/profile-doctor/verification-documents` - جلب جميع المستندات
- `GET /api/profile-doctor/verification-documents/summary` - ملخص المستندات
- `GET /api/profile-doctor/verification-documents/:id` - جلب مستند محدد
- `PUT /api/profile-doctor/verification-documents/:id` - تحديث مستند (إعادة رفع)
- `DELETE /api/profile-doctor/verification-documents/:id` - حذف مستند

**أنواع المستندات المدعومة:**
1. `national_id` - الهوية الوطنية
2. `passport` - جواز السفر
3. `medical_license` - رخصة مزاولة المهنة
4. `board_certificate` - شهادة البورد
5. `university_degree` - الشهادة الجامعية
6. `other` - مستندات أخرى

**الميزات:**
- رفع ملفات (صور + PDF)
- حد أقصى: 10MB
- حالات المستندات: pending, approved, rejected
- إعادة رفع المستندات المرفوضة
- حذف المستندات (ما عدا المعتمدة)
- ملخص إحصائي للمستندات

---

## التعديلات على الملفات الموجودة | Modified Files

### 1. routes/index.js
تم إضافة:
```javascript
// Import doctor professional and verification routes
const doctorProfessionalRoutes = require("./doctorProfessionalRoutes");
const doctorVerificationDocumentsRoutes = require("./doctorVerificationDocumentsRoutes");

// Routes
router.use("/profile-doctor/professional", doctorProfessionalRoutes);
router.use("/profile-doctor/verification-documents", doctorVerificationDocumentsRoutes);
```

### 2. middleware/uploadMiddleware.js
تم إضافة:
- `documentStorage` - تخزين المستندات على القرص
- `documentFileFilter` - فلتر لقبول الصور و PDF
- `uploadDocumentMiddleware` - middleware لرفع المستندات

---

## بنية المجلدات | Folder Structure

```
project/
├── controllers/
│   ├── profileDoctorController.js (موجود مسبقاً)
│   ├── doctorProfessionalController.js (جديد)
│   └── doctorVerificationDocumentsController.js (جديد)
├── routes/
│   ├── profileDoctorRoutes.js (موجود مسبقاً)
│   ├── doctorProfessionalRoutes.js (جديد)
│   ├── doctorVerificationDocumentsRoutes.js (جديد)
│   └── index.js (تم التعديل)
├── middleware/
│   └── uploadMiddleware.js (تم التعديل)
├── uploads/
│   └── verification-documents/ (مجلد جديد للمستندات)
└── docs/
    ├── 27-doctor-professional-data/
    │   ├── doctor-professional-logic.md
    │   └── doctor-professional-api-testing.json
    ├── 28-doctor-verification-documents/
    │   ├── doctor-verification-documents-logic.md
    │   └── doctor-verification-documents-api-testing.json
    └── 29-doctor-logic-complete-update/
        └── README.md (هذا الملف)
```

---

## كيفية الاستخدام | How to Use

### 1. البيانات الشخصية

```bash
# جلب البيانات الأساسية
curl -X GET http://localhost:3006/api/profile-doctor/basic \
  -H "Authorization: Bearer YOUR_TOKEN"

# تحديث البيانات الأساسية
curl -X PUT http://localhost:3006/api/profile-doctor/basic \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "phone": "+201234567890",
    "full_name": "د. أحمد محمد",
    "date_of_birth": "1985-05-15",
    "gender": "male"
  }'
```

### 2. البيانات المهنية

```bash
# جلب البيانات المهنية
curl -X GET http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer YOUR_TOKEN"

# تحديث البيانات المهنية
curl -X PUT http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "license_number": "MED123456",
    "years_of_experience": 10,
    "medical_school": "Cairo University",
    "graduation_year": 2013,
    "board_certifications": ["Board Certified in Cardiology"],
    "languages_spoken": ["Arabic", "English"],
    "specialty": "أمراض القلب",
    "biography": "طبيب قلب متخصص..."
  }'
```

### 3. مستندات التحقق

```bash
# رفع مستند
curl -X POST http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=medical_license" \
  -F "file=@/path/to/license.pdf"

# جلب جميع المستندات
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# جلب ملخص المستندات
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# إعادة رفع مستند
curl -X PUT http://localhost:3006/api/profile-doctor/verification-documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/new-document.pdf"

# حذف مستند
curl -X DELETE http://localhost:3006/api/profile-doctor/verification-documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## الاختبار | Testing

### استخدام Postman

1. **استيراد Collections:**
   - `docs/27-doctor-professional-data/doctor-professional-api-testing.json`
   - `docs/28-doctor-verification-documents/doctor-verification-documents-api-testing.json`

2. **تعيين المتغيرات:**
   - `base_url`: http://localhost:3006
   - `doctor_token`: YOUR_DOCTOR_TOKEN_HERE

3. **تشغيل الاختبارات:**
   - اختبر كل endpoint على حدة
   - تحقق من الاستجابات
   - اختبر حالات الأخطاء

---

## الأمان | Security

### جميع الـ APIs محمية بـ:

1. **Authentication:** `authenticateJWT`
   - يجب تسجيل الدخول

2. **Authorization:** `authorizeDoctor`
   - فقط الأطباء يمكنهم الوصول

3. **Account Active Check:** `checkAccountActive`
   - التحقق من أن الحساب نشط

4. **Data Validation:**
   - التحقق من صحة البيانات
   - التحقق من فرادة البيانات (email, phone, license_number)

5. **File Upload Security:**
   - فلترة أنواع الملفات
   - حد أقصى لحجم الملف
   - أسماء ملفات فريدة

---

## معالجة الأخطاء | Error Handling

جميع الـ APIs تعيد استجابات موحدة:

### نجاح (Success):
```json
{
  "success": true,
  "message": "رسالة النجاح",
  "data": { ... }
}
```

### خطأ (Error):
```json
{
  "success": false,
  "message": "رسالة الخطأ",
  "error": "تفاصيل الخطأ"
}
```

---

## ملاحظات مهمة | Important Notes

### 1. الفصل بين البيانات
- البيانات الشخصية: `/api/profile-doctor/basic`
- البيانات المهنية: `/api/profile-doctor/professional`
- المستندات: `/api/profile-doctor/verification-documents`

### 2. دعم اللغات
- جميع الـ APIs تدعم اللغتين العربية والإنجليزية
- يمكن تحديث لغة واحدة أو عدة لغات

### 3. رفع الملفات
- الصور الشخصية: حد أقصى 5MB
- المستندات: حد أقصى 10MB
- أنواع مدعومة: JPEG, PNG, WebP, PDF

### 4. حالات المستندات
- `pending`: في انتظار المراجعة
- `approved`: تمت الموافقة (لا يمكن حذفها)
- `rejected`: تم الرفض (يمكن إعادة رفعها)

---

## الخطوات التالية | Next Steps

### للتطوير المستقبلي:

1. **Admin APIs:**
   - إضافة APIs للإدارة لمراجعة المستندات
   - الموافقة/رفض المستندات
   - عرض جميع المستندات المعلقة

2. **Notifications:**
   - إشعار الطبيب عند الموافقة/رفض المستند
   - إشعار الإدارة عند رفع مستند جديد

3. **Statistics:**
   - إحصائيات شاملة للمستندات
   - تقارير عن حالة التوثيق

4. **File Management:**
   - ضغط الصور تلقائياً
   - تحويل الصور إلى WebP
   - نسخ احتياطي للملفات

---

## الدعم | Support

للمزيد من المعلومات، راجع:
- `docs/27-doctor-professional-data/doctor-professional-logic.md`
- `docs/28-doctor-verification-documents/doctor-verification-documents-logic.md`

---

## الخلاصة | Summary

تم بنجاح:
✅ مراجعة اللوجيك الحالي للبيانات الشخصية
✅ إضافة route جديد للبيانات المهنية مع CRUD كامل
✅ إضافة لوجيك كامل لمستندات التحقق مع CRUD كامل
✅ توثيق شامل لكل مهمة (ملف شرح + ملف اختبار)
✅ دعم اللغات المتعددة
✅ معالجة الأخطاء بشكل صحيح
✅ الأمان والتحقق من البيانات

النظام جاهز للاستخدام والاختبار! 🎉

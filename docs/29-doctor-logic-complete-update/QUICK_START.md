# دليل البدء السريع - لوجيك الأطباء
# Quick Start Guide - Doctor Logic

## البدء السريع | Quick Start

### 1. تسجيل دخول الطبيب | Doctor Login

```bash
POST http://localhost:3006/api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "your_password"
}
```

**احفظ الـ token من الاستجابة!**

---

## البيانات الشخصية | Personal Data

### جلب البيانات الأساسية
```bash
GET http://localhost:3006/api/profile-doctor/basic
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
```

### تحديث البيانات الأساسية
```bash
PUT http://localhost:3006/api/profile-doctor/basic
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "full_name": "د. أحمد محمد",
  "email": "doctor@example.com",
  "phone": "+201234567890",
  "date_of_birth": "1985-05-15",
  "gender": "male",
  "nationality": "Egyptian"
}
```

---

## البيانات المهنية | Professional Data

### جلب البيانات المهنية
```bash
GET http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
```

### تحديث البيانات المهنية (لغة واحدة)
```bash
PUT http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Accept-Language: ar

{
  "license_number": "MED123456",
  "years_of_experience": 10,
  "medical_school": "Cairo University",
  "graduation_year": 2013,
  "board_certifications": ["Board Certified in Cardiology", "FACC"],
  "languages_spoken": ["Arabic", "English", "French"],
  "specialty": "أمراض القلب",
  "sub_specialty": "قسطرة القلب",
  "biography": "طبيب قلب متخصص مع خبرة 10 سنوات..."
}
```

### تحديث البيانات المهنية (عدة لغات)
```bash
PUT http://localhost:3006/api/profile-doctor/professional
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "license_number": "MED123456",
  "years_of_experience": 10,
  "medical_school": "Cairo University",
  "graduation_year": 2013,
  "board_certifications": ["Board Certified in Cardiology", "FACC"],
  "languages_spoken": ["Arabic", "English", "French"],
  "translations": {
    "ar": {
      "specialty": "أمراض القلب",
      "sub_specialty": "قسطرة القلب",
      "biography": "طبيب قلب متخصص..."
    },
    "en": {
      "specialty": "Cardiology",
      "sub_specialty": "Cardiac Catheterization",
      "biography": "Specialized cardiologist..."
    }
  }
}
```

---

## مستندات التحقق | Verification Documents

### رفع رخصة مزاولة المهنة
```bash
POST http://localhost:3006/api/profile-doctor/verification-documents
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

document_type: medical_license
file: [اختر ملف PDF أو صورة]
```

### رفع الهوية الوطنية
```bash
POST http://localhost:3006/api/profile-doctor/verification-documents
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

document_type: national_id
file: [اختر صورة]
```

### جلب جميع المستندات
```bash
GET http://localhost:3006/api/profile-doctor/verification-documents
Authorization: Bearer YOUR_TOKEN
```

### جلب ملخص المستندات
```bash
GET http://localhost:3006/api/profile-doctor/verification-documents/summary
Authorization: Bearer YOUR_TOKEN
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 2,
    "approved": 2,
    "rejected": 1
  }
}
```

### إعادة رفع مستند مرفوض
```bash
PUT http://localhost:3006/api/profile-doctor/verification-documents/3
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

file: [اختر ملف جديد]
```

### حذف مستند
```bash
DELETE http://localhost:3006/api/profile-doctor/verification-documents/5
Authorization: Bearer YOUR_TOKEN
```

---

## أنواع المستندات المدعومة | Supported Document Types

1. `national_id` - الهوية الوطنية
2. `passport` - جواز السفر
3. `medical_license` - رخصة مزاولة المهنة
4. `board_certificate` - شهادة البورد
5. `university_degree` - الشهادة الجامعية
6. `other` - مستندات أخرى

---

## أنواع الملفات المدعومة | Supported File Types

### للصور الشخصية:
- JPEG, PNG, WebP
- حد أقصى: 5MB

### للمستندات:
- JPEG, PNG, WebP, PDF
- حد أقصى: 10MB

---

## حالات المستندات | Document Status

- `pending` - في انتظار المراجعة
- `approved` - تمت الموافقة (لا يمكن حذفه)
- `rejected` - تم الرفض (يمكن إعادة رفعه)

---

## استخدام Postman | Using Postman

### 1. استيراد Collections:

**البيانات المهنية:**
```
docs/27-doctor-professional-data/doctor-professional-api-testing.json
```

**مستندات التحقق:**
```
docs/28-doctor-verification-documents/doctor-verification-documents-api-testing.json
```

### 2. تعيين المتغيرات:

في Postman، اذهب إلى Environment وأضف:
- `base_url`: `http://localhost:3006`
- `doctor_token`: `YOUR_TOKEN_HERE`

### 3. تشغيل الاختبارات:

- اختبر كل endpoint على حدة
- تحقق من الاستجابات
- اختبر حالات الأخطاء

---

## استخدام cURL | Using cURL

### مثال كامل:

```bash
# 1. تسجيل الدخول
curl -X POST http://localhost:3006/api/auth-doctor/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"password123"}'

# احفظ الـ token من الاستجابة
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. جلب البيانات المهنية
curl -X GET http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept-Language: ar"

# 3. تحديث البيانات المهنية
curl -X PUT http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "years_of_experience": 12,
    "specialty": "أمراض القلب",
    "biography": "طبيب قلب متخصص..."
  }'

# 4. رفع مستند
curl -X POST http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "document_type=medical_license" \
  -F "file=@/path/to/license.pdf"

# 5. جلب جميع المستندات
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer $TOKEN"

# 6. جلب ملخص المستندات
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents/summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## الأخطاء الشائعة | Common Errors

### 1. 401 Unauthorized
```json
{
  "success": false,
  "message": "غير مصرح"
}
```
**الحل:** تأكد من إرسال token صحيح في header

### 2. 400 Invalid Document Type
```json
{
  "success": false,
  "message": "نوع المستند غير صالح",
  "valid_types": ["national_id", "passport", "medical_license", ...]
}
```
**الحل:** استخدم أحد الأنواع المدعومة

### 3. 400 File Size Too Large
```json
{
  "success": false,
  "message": "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت"
}
```
**الحل:** قلل حجم الملف أو اضغطه

### 4. 400 License Number Already in Use
```json
{
  "success": false,
  "message": "رقم الترخيص مستخدم بالفعل"
}
```
**الحل:** استخدم رقم ترخيص مختلف

### 5. 404 Document Not Found
```json
{
  "success": false,
  "message": "المستند غير موجود"
}
```
**الحل:** تأكد من ID المستند

---

## نصائح | Tips

### 1. استخدام اللغات
- أرسل `Accept-Language: ar` للحصول على رسائل بالعربية
- أرسل `Accept-Language: en` للحصول على رسائل بالإنجليزية

### 2. تحديث البيانات
- يمكنك تحديث حقل واحد فقط دون إرسال جميع الحقول
- استخدم `translations` لتحديث عدة لغات في نفس الوقت

### 3. رفع المستندات
- استخدم `multipart/form-data` لرفع الملفات
- اسم الحقل للملف يجب أن يكون `file`
- اسم الحقل لنوع المستند يجب أن يكون `document_type`

### 4. إدارة المستندات
- لا يمكن حذف المستندات المعتمدة (`approved`)
- يمكن إعادة رفع المستندات المرفوضة (`rejected`)
- استخدم `/summary` للحصول على نظرة سريعة

---

## الخطوات التالية | Next Steps

1. ✅ سجل دخول كطبيب
2. ✅ املأ البيانات الشخصية
3. ✅ املأ البيانات المهنية
4. ✅ ارفع المستندات المطلوبة
5. ⏳ انتظر مراجعة الإدارة
6. ✅ ابدأ استخدام المنصة

---

## الدعم | Support

للمزيد من المعلومات:
- **التوثيق الكامل:** `docs/29-doctor-logic-complete-update/README.md`
- **شرح البيانات المهنية:** `docs/27-doctor-professional-data/doctor-professional-logic.md`
- **شرح المستندات:** `docs/28-doctor-verification-documents/doctor-verification-documents-logic.md`

**جاهز للبدء! 🚀**

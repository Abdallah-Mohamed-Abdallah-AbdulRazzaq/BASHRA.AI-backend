# شرح لوجيك البيانات المهنية للأطباء
# Doctor Professional Data Logic Documentation

## نظرة عامة | Overview

هذا النظام مخصص لإدارة البيانات المهنية للأطباء بشكل منفصل عن البيانات الشخصية، مما يسمح بتنظيم أفضل وسهولة في الصيانة والتطوير.

This system is dedicated to managing doctors' professional data separately from personal data, allowing for better organization and easier maintenance and development.

---

## الجداول المستخدمة | Database Tables

### 1. جدول doctor_profiles
يحتوي على البيانات المهنية التالية:

**البيانات المهنية (Professional Data):**
- `license_number`: رقم رخصة مزاولة المهنة (فريد لكل طبيب)
- `years_of_experience`: عدد سنوات الخبرة
- `medical_school`: الجامعة أو الكلية التي تخرج منها
- `graduation_year`: سنة التخرج
- `board_certifications`: شهادات البورد (JSON Array)
- `languages_spoken`: اللغات التي يتحدث بها (JSON Array)

**بيانات التقييم والإحصائيات:**
- `rating_average`: متوسط التقييم
- `rating_count`: عدد التقييمات
- `total_consultations`: إجمالي الاستشارات
- `is_available`: حالة التوفر

**بيانات التوثيق:**
- `is_verified`: هل تم التحقق من الطبيب
- `verification_date`: تاريخ التحقق
- `approval_status`: حالة الموافقة (pending, approved, rejected, suspended)

### 2. جدول doctor_profile_translations
يحتوي على الترجمات للبيانات المهنية:

- `specialty`: التخصص الأساسي
- `sub_specialty`: التخصص الفرعي
- `biography`: السيرة الذاتية المهنية

---

## الـ APIs المتاحة | Available APIs

### 1. جلب البيانات المهنية | Get Professional Data

**Endpoint:** `GET /api/profile-doctor/professional`

**Authentication:** Required (Doctor only)

**Response:**
```json
{
  "success": true,
  "data": {
    "professional_data": {
      "license_number": "MED123456",
      "years_of_experience": 10,
      "medical_school": "Cairo University",
      "graduation_year": 2013,
      "board_certifications": ["Board Certified in Cardiology", "FACC"],
      "languages_spoken": ["Arabic", "English", "French"],
      "is_verified": true,
      "verification_date": "2024-01-15T10:30:00.000Z",
      "approval_status": "approved",
      "rating_average": 4.75,
      "rating_count": 120,
      "total_consultations": 450,
      "is_available": true
    },
    "translations": {
      "ar": {
        "specialty": "أمراض القلب",
        "sub_specialty": "قسطرة القلب",
        "biography": "طبيب قلب متخصص مع خبرة 10 سنوات..."
      },
      "en": {
        "specialty": "Cardiology",
        "sub_specialty": "Cardiac Catheterization",
        "biography": "Specialized cardiologist with 10 years experience..."
      }
    }
  }
}
```

---

### 2. تحديث البيانات المهنية | Update Professional Data

**Endpoint:** `PUT /api/profile-doctor/professional`

**Authentication:** Required (Doctor only)

**Request Body (Single Language):**
```json
{
  "license_number": "MED123456",
  "years_of_experience": 11,
  "medical_school": "Cairo University",
  "graduation_year": 2013,
  "board_certifications": ["Board Certified in Cardiology", "FACC", "FESC"],
  "languages_spoken": ["Arabic", "English", "French"],
  "specialty": "أمراض القلب",
  "sub_specialty": "قسطرة القلب",
  "biography": "طبيب قلب متخصص..."
}
```

**Request Body (Multi-Language):**
```json
{
  "license_number": "MED123456",
  "years_of_experience": 11,
  "medical_school": "Cairo University",
  "graduation_year": 2013,
  "board_certifications": ["Board Certified in Cardiology", "FACC", "FESC"],
  "languages_spoken": ["Arabic", "English", "French"],
  "translations": {
    "ar": {
      "specialty": "أمراض القلب",
      "sub_specialty": "قسطرة القلب",
      "biography": "طبيب قلب متخصص مع خبرة 11 سنة..."
    },
    "en": {
      "specialty": "Cardiology",
      "sub_specialty": "Cardiac Catheterization",
      "biography": "Specialized cardiologist with 11 years experience..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث البيانات المهنية بنجاح"
}
```

---

## ميزات النظام | System Features

### 1. الفصل بين البيانات الشخصية والمهنية
- البيانات الشخصية في `/api/profile-doctor/basic`
- البيانات المهنية في `/api/profile-doctor/professional`
- يسهل الصيانة والتطوير

### 2. دعم اللغات المتعددة
- يمكن تحديث لغة واحدة أو عدة لغات في نفس الوقت
- الترجمات منفصلة في جدول خاص

### 3. التحقق من البيانات
- التحقق من رقم الترخيص (يجب أن يكون فريد)
- التحقق من وجود الملف الشخصي
- معالجة الأخطاء بشكل صحيح

### 4. JSON Fields
- `board_certifications` و `languages_spoken` مخزنة كـ JSON
- يسمح بإضافة عدد غير محدود من الشهادات واللغات

---

## الأمان | Security

1. **Authentication Required:** جميع الـ APIs تتطلب تسجيل دخول
2. **Authorization:** فقط الأطباء يمكنهم الوصول
3. **Account Active Check:** التحقق من أن الحساب نشط
4. **Data Validation:** التحقق من صحة البيانات قبل الحفظ
5. **Transaction Support:** استخدام transactions لضمان سلامة البيانات

---

## معالجة الأخطاء | Error Handling

### الأخطاء المحتملة:

1. **404 - Profile Not Found**
   - الملف الشخصي غير موجود

2. **400 - License Number Already in Use**
   - رقم الترخيص مستخدم من قبل طبيب آخر

3. **500 - Server Error**
   - خطأ في الخادم

---

## ملاحظات مهمة | Important Notes

1. **رقم الترخيص (license_number):**
   - يجب أن يكون فريد لكل طبيب
   - لا يمكن استخدام نفس الرقم لأكثر من طبيب

2. **الترجمات:**
   - يمكن تحديث لغة واحدة دون التأثير على اللغات الأخرى
   - إذا لم تكن الترجمة موجودة، سيتم إنشاؤها تلقائياً

3. **JSON Fields:**
   - يتم تحويل `board_certifications` و `languages_spoken` تلقائياً من وإلى JSON

4. **البيانات الإحصائية:**
   - `rating_average`, `rating_count`, `total_consultations` للقراءة فقط
   - يتم تحديثها من أنظمة أخرى (التقييمات والمواعيد)

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: جلب البيانات المهنية
```bash
curl -X GET http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"
```

### مثال 2: تحديث البيانات المهنية (لغة واحدة)
```bash
curl -X PUT http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "years_of_experience": 12,
    "specialty": "أمراض القلب",
    "biography": "طبيب قلب متخصص..."
  }'
```

### مثال 3: تحديث البيانات المهنية (عدة لغات)
```bash
curl -X PUT http://localhost:3006/api/profile-doctor/professional \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "years_of_experience": 12,
    "translations": {
      "ar": {
        "specialty": "أمراض القلب",
        "biography": "طبيب قلب متخصص..."
      },
      "en": {
        "specialty": "Cardiology",
        "biography": "Specialized cardiologist..."
      }
    }
  }'
```

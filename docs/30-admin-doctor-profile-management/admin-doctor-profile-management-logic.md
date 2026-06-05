# شرح لوجيك إدارة ملفات الأطباء للأدمن
# Admin Doctor Profile Management Logic Documentation

## نظرة عامة | Overview

هذا النظام مخصص للأدمن لإدارة ملفات الأطباء بشكل كامل، بما في ذلك البيانات الشخصية والمهنية ومستندات التحقق. يوفر النظام CRUD APIs كاملة لجميع أنواع البيانات.

This system is dedicated for admins to manage doctors' profiles completely, including personal data, professional data, and verification documents. The system provides complete CRUD APIs for all data types.

---

## الـ APIs المتاحة | Available APIs

### 1. جلب الملف الكامل | Get Complete Profile

**Endpoint:** `GET /api/admin/doctors/:doctorId/profile/complete`

**Description:** جلب جميع بيانات الطبيب في استدعاء واحد (حساب + ملف شخصي + ترجمات + مستندات)

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": 1,
      "uuid": "...",
      "email": "doctor@example.com",
      "phone": "+201234567890",
      "status": "active",
      "is_active": true,
      "email_verified_at": "2024-01-15T10:30:00.000Z",
      "phone_verified_at": "2024-01-15T10:35:00.000Z",
      "last_login_at": "2024-03-07T08:00:00.000Z",
      "created_at": "2024-01-15T10:00:00.000Z"
    },
    "profile": {
      "id": 1,
      "doctor_id": 1,
      "license_number": "MED123456",
      "years_of_experience": 10,
      "medical_school": "Cairo University",
      "graduation_year": 2013,
      "board_certifications": ["Board Certified in Cardiology"],
      "languages_spoken": ["Arabic", "English"],
      "is_verified": true,
      "verification_date": "2024-01-16T14:20:00.000Z",
      "approval_status": "approved",
      "rating_average": 4.75,
      "rating_count": 120,
      "total_consultations": 450,
      "date_of_birth": "1985-05-15",
      "gender": "male",
      "nationality": "Egyptian"
    },
    "translations": {
      "ar": {
        "full_name": "د. أحمد محمد",
        "specialty": "أمراض القلب",
        "sub_specialty": "قسطرة القلب",
        "biography": "طبيب قلب متخصص...",
        "emergency_contact_name": "محمد أحمد",
        "emergency_contact_relationship": "أخ"
      },
      "en": {
        "full_name": "Dr. Ahmed Mohamed",
        "specialty": "Cardiology",
        "sub_specialty": "Cardiac Catheterization",
        "biography": "Specialized cardiologist...",
        "emergency_contact_name": "Mohamed Ahmed",
        "emergency_contact_relationship": "Brother"
      }
    },
    "documents": [
      {
        "id": 1,
        "document_type": "medical_license",
        "file_url": "/uploads/verification-documents/doc-123.pdf",
        "status": "approved",
        "rejection_reason": null,
        "uploaded_at": "2024-01-15T11:00:00.000Z",
        "verified_at": "2024-01-16T14:20:00.000Z",
        "verified_by": 1
      }
    ]
  }
}
```

---

### 2. جلب البيانات الشخصية | Get Personal Data

**Endpoint:** `GET /api/admin/doctors/:doctorId/profile/personal`

**Description:** جلب البيانات الشخصية فقط

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "...",
    "email": "doctor@example.com",
    "phone": "+201234567890",
    "date_of_birth": "1985-05-15",
    "gender": "male",
    "nationality": "Egyptian",
    "emergency_contact_phone": "+201234567891",
    "timezone": "Africa/Cairo",
    "language_preference": "ar",
    "translations": {
      "ar": {
        "full_name": "د. أحمد محمد",
        "emergency_contact_name": "محمد أحمد",
        "emergency_contact_relationship": "أخ"
      },
      "en": {
        "full_name": "Dr. Ahmed Mohamed",
        "emergency_contact_name": "Mohamed Ahmed",
        "emergency_contact_relationship": "Brother"
      }
    }
  }
}
```

---

### 3. جلب البيانات المهنية | Get Professional Data

**Endpoint:** `GET /api/admin/doctors/:doctorId/profile/professional`

**Description:** جلب البيانات المهنية فقط

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
      "verification_date": "2024-01-16T14:20:00.000Z",
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
        "biography": "طبيب قلب متخصص..."
      },
      "en": {
        "specialty": "Cardiology",
        "sub_specialty": "Cardiac Catheterization",
        "biography": "Specialized cardiologist..."
      }
    }
  }
}
```

---

### 4. جلب مستندات التحقق | Get Verification Documents

**Endpoint:** `GET /api/admin/doctors/:doctorId/profile/documents`

**Description:** جلب جميع مستندات التحقق للطبيب

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "document_type": "medical_license",
      "file_url": "/uploads/verification-documents/doc-123.pdf",
      "status": "approved",
      "rejection_reason": null,
      "uploaded_at": "2024-01-15T11:00:00.000Z",
      "verified_at": "2024-01-16T14:20:00.000Z",
      "verified_by": 1
    },
    {
      "id": 2,
      "document_type": "national_id",
      "file_url": "/uploads/verification-documents/doc-124.jpg",
      "status": "pending",
      "rejection_reason": null,
      "uploaded_at": "2024-01-15T11:05:00.000Z",
      "verified_at": null,
      "verified_by": null
    }
  ]
}
```

---

### 5. جلب ملخص المستندات | Get Documents Summary

**Endpoint:** `GET /api/admin/doctors/:doctorId/profile/documents/summary`

**Description:** جلب ملخص إحصائي للمستندات

**Response:**
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

---

### 6. تحديث البيانات الشخصية | Update Personal Data

**Endpoint:** `PUT /api/admin/doctors/:doctorId/profile/personal`

**Description:** تحديث البيانات الشخصية للطبيب

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "phone": "+201234567890",
  "date_of_birth": "1985-05-15",
  "gender": "male",
  "nationality": "Egyptian",
  "emergency_contact_phone": "+201234567891",
  "timezone": "Africa/Cairo",
  "language_preference": "ar",
  "translations": {
    "ar": {
      "full_name": "د. أحمد محمد علي",
      "emergency_contact_name": "محمد أحمد",
      "emergency_contact_relationship": "أخ"
    },
    "en": {
      "full_name": "Dr. Ahmed Mohamed Ali",
      "emergency_contact_name": "Mohamed Ahmed",
      "emergency_contact_relationship": "Brother"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث البيانات الشخصية بنجاح"
}
```

---

### 7. تحديث البيانات المهنية | Update Professional Data

**Endpoint:** `PUT /api/admin/doctors/:doctorId/profile/professional`

**Description:** تحديث البيانات المهنية للطبيب

**Request Body:**
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
      "biography": "طبيب قلب استشاري مع خبرة 11 سنة..."
    },
    "en": {
      "specialty": "Cardiology",
      "sub_specialty": "Cardiac Catheterization",
      "biography": "Consultant cardiologist with 11 years experience..."
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

### 8. الموافقة/رفض مستند التحقق | Approve/Reject Document

**Endpoint:** `PUT /api/admin/doctors/:doctorId/profile/documents/:documentId`

**Description:** الموافقة على أو رفض مستند التحقق

**Request Body (Approve):**
```json
{
  "status": "approved"
}
```

**Request Body (Reject):**
```json
{
  "status": "rejected",
  "rejection_reason": "الصورة غير واضحة، يرجى إعادة الرفع"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث حالة المستند بنجاح",
  "data": {
    "documentId": 1,
    "status": "approved",
    "verified_by": 1,
    "verified_at": "2024-03-07T10:30:00.000Z"
  }
}
```

---

### 9. حذف الملف الشخصي | Delete Profile

**Endpoint:** `DELETE /api/admin/doctors/:doctorId/profile`

**Description:** حذف الملف الشخصي للطبيب (حذف ناعم - تعطيل الحساب)

**Request Body:**
```json
{
  "reason": "مخالفة سياسات المنصة"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف الملف الشخصي بنجاح"
}
```

---

## ميزات النظام | System Features

### 1. CRUD كامل
- جلب البيانات (GET) - منفصلة أو مجمعة
- تحديث البيانات (PUT) - للبيانات الشخصية والمهنية
- حذف البيانات (DELETE) - حذف ناعم

### 2. إدارة المستندات
- عرض جميع المستندات
- الموافقة/رفض المستندات
- ملخص إحصائي للمستندات

### 3. دعم اللغات المتعددة
- تحديث الترجمات لعدة لغات في نفس الوقت
- دعم العربية والإنجليزية

### 4. التسجيل والمراقبة
- تسجيل جميع إجراءات الأدمن
- Winston logger للتتبع
- معلومات العميل (IP, User Agent)

### 5. الأمان
- Authentication & Authorization
- فقط الأدمن يمكنه الوصول
- تسجيل جميع التغييرات

---

## الأمان | Security

### 1. Authentication & Authorization
```javascript
router.use(authenticateJWT, authorizeAdmin);
```
- يجب تسجيل الدخول كأدمن
- التحقق من الصلاحيات

### 2. Logging
- تسجيل جميع الإجراءات في قاعدة البيانات
- Winston logger للملفات
- معلومات العميل (IP, User Agent)

### 3. Validation
- التحقق من البيانات المدخلة
- التحقق من وجود السجلات
- معالجة الأخطاء

---

## معالجة الأخطاء | Error Handling

### الأخطاء المحتملة:

1. **404 - Not Found**
   - الطبيب غير موجود
   - الملف الشخصي غير موجود
   - المستند غير موجود

2. **400 - Bad Request**
   - بيانات غير صحيحة
   - حقول مطلوبة مفقودة
   - قيم غير صالحة

3. **500 - Server Error**
   - خطأ في قاعدة البيانات
   - خطأ في الخادم

---

## ملاحظات مهمة | Important Notes

### 1. الفرق بين الـ APIs
- `/complete` - جميع البيانات في استدعاء واحد
- `/personal` - البيانات الشخصية فقط
- `/professional` - البيانات المهنية فقط
- `/documents` - المستندات فقط

### 2. التحديثات
- يمكن تحديث حقل واحد أو عدة حقول
- الترجمات اختيارية
- يتم تسجيل جميع التغييرات

### 3. المستندات
- يجب تحديد سبب الرفض
- يتم تسجيل من قام بالموافقة/الرفض
- لا يمكن حذف المستندات من هذا الـ API

### 4. الحذف
- حذف ناعم (تعطيل الحساب)
- يجب تحديد سبب الحذف
- يتم تسجيل الإجراء

---

## التكامل مع الأنظمة الأخرى | Integration

### 1. مع نظام إدارة الأطباء الأساسي
- `/api/admin/doctors` - الإدارة الأساسية (الحالة، الموافقة، التعليق)
- `/api/admin/doctors/:doctorId/profile` - إدارة الملفات (البيانات الشخصية والمهنية)

### 2. مع نظام الطبيب
- الطبيب يدخل البيانات من `/api/profile-doctor`
- الأدمن يراجع ويعدل من `/api/admin/doctors/:doctorId/profile`

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: مراجعة طبيب جديد
```bash
# 1. جلب الملف الكامل
curl -X GET http://localhost:3006/api/admin/doctors/1/profile/complete \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 2. مراجعة المستندات
curl -X GET http://localhost:3006/api/admin/doctors/1/profile/documents \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. الموافقة على المستندات
curl -X PUT http://localhost:3006/api/admin/doctors/1/profile/documents/1 \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'
```

### مثال 2: تعديل بيانات طبيب
```bash
# تحديث البيانات المهنية
curl -X PUT http://localhost:3006/api/admin/doctors/1/profile/professional \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "years_of_experience": 12,
    "translations": {
      "ar": {
        "specialty": "أمراض القلب والأوعية الدموية"
      }
    }
  }'
```

---

## الخلاصة | Conclusion

النظام يوفر:
- ✅ CRUD كامل لجميع أنواع البيانات
- ✅ إدارة شاملة للمستندات
- ✅ دعم اللغات المتعددة
- ✅ تسجيل وأمان عالي
- ✅ APIs منظمة وواضحة

**النظام جاهز للاستخدام! 🎉**

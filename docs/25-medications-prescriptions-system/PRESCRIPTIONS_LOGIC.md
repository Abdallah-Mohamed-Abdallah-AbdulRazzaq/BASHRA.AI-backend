# شرح لوجيك نظام الوصفات الطبية
# Prescriptions System Logic Explanation

## نظرة عامة | Overview

نظام الوصفات الطبية هو النظام الأساسي لإدارة الوصفات التي يكتبها الأطباء للمرضى. يتضمن معلومات كاملة عن الدواء، الجرعة، التكرار، المدة، والتعليمات بلغات متعددة.

The Prescriptions System is the core system for managing prescriptions written by doctors for patients. It includes complete information about medication, dosage, frequency, duration, and instructions in multiple languages.

---

## الصلاحيات | Permissions

### الطبيب (Doctor)
- إنشاء وصفات طبية للمرضى
- عرض وصفاته الطبية فقط
- تعديل وصفاته (قبل الصرف)
- إلغاء وصفاته (قبل الصرف)
- إضافة/تعديل الترجمات

**Doctor:**
- Create prescriptions for patients
- View own prescriptions only
- Edit own prescriptions (before filling)
- Cancel own prescriptions (before filling)
- Add/Update translations

### المريض (Patient)
- عرض وصفاته الطبية فقط
- لا يمكنه التعديل أو الحذف

**Patient:**
- View own prescriptions only
- Cannot edit or delete

### الصيدلية (Pharmacy)
- صرف الوصفات الطبية
- تسجيل تاريخ الصرف

**Pharmacy:**
- Fill prescriptions
- Record filling date

### المسؤول (Admin)
- عرض جميع الوصفات
- لا يمكنه التعديل أو الحذف

**Admin:**
- View all prescriptions
- Cannot edit or delete

---

## هيكل قاعدة البيانات | Database Structure

### جدول prescriptions

```sql
CREATE TABLE prescriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  prescription_number VARCHAR(50) UNIQUE NOT NULL,
  medical_record_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100),
  quantity VARCHAR(50),
  route_of_administration VARCHAR(100),
  refills_allowed INT DEFAULT 0,
  refills_used INT DEFAULT 0,
  is_generic_allowed BOOLEAN DEFAULT TRUE,
  status ENUM('active', 'filled', 'cancelled', 'expired') DEFAULT 'active',
  prescribed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATE,
  filled_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE RESTRICT,
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT
);
```

### جدول prescription_translations

```sql
CREATE TABLE prescription_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  prescription_id INT NOT NULL,
  language_code VARCHAR(5) NOT NULL,
  instructions TEXT,
  indication TEXT,
  pharmacy_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_prescription_language (prescription_id, language_code)
);
```

### العلاقات | Relationships

```
medical_records (1) ←→ (N) prescriptions
users/patients (1) ←→ (N) prescriptions
doctors (1) ←→ (N) prescriptions
prescriptions (1) ←→ (N) prescription_translations
```

---

## آلية العمل | How It Works

### 1. إنشاء وصفة طبية | Create Prescription

```
الطبيب يرسل طلب POST
↓
التحقق من صلاحيات الطبيب (authenticateJWT + authorizeDoctor)
↓
التحقق من البيانات المطلوبة
↓
التحقق من وجود السجل الطبي وانتمائه للمريض
↓
إنشاء UUID ورقم وصفة فريد (RX-timestamp-random)
↓
حفظ الوصفة في prescriptions
↓
إذا تم إرسال translations:
  - حفظ الترجمات في prescription_translations
↓
إرجاع بيانات الوصفة المنشأة
```

**Flow:**
```
Doctor sends POST request
↓
Verify doctor permissions
↓
Validate required data
↓
Verify medical record exists and belongs to patient
↓
Generate UUID and unique prescription number (RX-timestamp-random)
↓
Save prescription to prescriptions table
↓
If translations provided:
  - Save translations to prescription_translations
↓
Return created prescription data
```

### 2. عرض الوصفات | View Prescriptions

```
المستخدم يرسل طلب GET
↓
التحقق من الصلاحيات
↓
تطبيق فلتر حسب الدور:
  - Patient: وصفاته فقط (patient_id = user.id)
  - Doctor: وصفاته فقط (doctor_id = doctor.id)
  - Admin: جميع الوصفات
↓
تطبيق فلاتر إضافية (status, medical_record_id, patient_id)
↓
جلب الوصفات مع معلومات المريض والطبيب
↓
جلب الترجمات حسب اللغة المطلوبة
↓
تطبيق Pagination
↓
إرجاع القائمة
```

### 3. تعديل وصفة | Update Prescription

```
الطبيب يرسل طلب PUT
↓
التحقق من ملكية الوصفة (doctor_id = ?)
↓
التحقق من حالة الوصفة (لا يمكن تعديل filled أو cancelled)
↓
تعديل الحقول المطلوبة
↓
إرجاع البيانات المحدثة
```

### 4. إلغاء وصفة | Cancel Prescription

```
الطبيب يرسل طلب PATCH /prescriptions/:id/cancel
↓
التحقق من ملكية الوصفة
↓
التحقق من الحالة (لا يمكن إلغاء filled أو cancelled)
↓
تغيير status إلى 'cancelled'
↓
إرجاع رسالة نجاح
```

### 5. صرف وصفة | Fill Prescription

```
الصيدلية ترسل طلب PATCH /prescriptions/:id/fill
↓
التحقق من وجود الوصفة
↓
التحقق من الحالة (لا يمكن صرف cancelled أو expired)
↓
التحقق من إعادات الصرف المتاحة
↓
إذا أول صرف:
  - تغيير status إلى 'filled'
  - تسجيل filled_date
  - refills_used = 1
↓
إذا إعادة صرف:
  - زيادة refills_used
  - تحديث filled_date
↓
إرجاع رسالة نجاح
```

### 6. إضافة/تعديل ترجمة | Add/Update Translation

```
الطبيب يرسل طلب POST /prescriptions/:id/translations
↓
التحقق من ملكية الوصفة
↓
التحقق من language_code
↓
إذا الترجمة موجودة:
  - تحديث الحقول المطلوبة
↓
إذا الترجمة غير موجودة:
  - إنشاء ترجمة جديدة
↓
إرجاع رسالة نجاح
```

---

## حقول الوصفة | Prescription Fields

### الحقول الأساسية | Basic Fields

1. **id, uuid**: معرفات فريدة
2. **prescription_number**: رقم الوصفة الفريد (RX-...)
3. **medical_record_id**: معرف السجل الطبي (مطلوب)
4. **patient_id**: معرف المريض (مطلوب)
5. **doctor_id**: معرف الطبيب (تلقائي)
6. **medication_name**: اسم الدواء (مطلوب)
7. **dosage**: الجرعة (مطلوب) - مثال: "500mg"
8. **frequency**: التكرار (مطلوب) - مثال: "3 مرات يومياً"
9. **duration**: المدة (اختياري) - مثال: "7 أيام"
10. **quantity**: الكمية (اختياري) - مثال: "21 حبة"

### حقول إضافية | Additional Fields

11. **route_of_administration**: طريقة الإعطاء - مثال: "فموي"
12. **refills_allowed**: عدد إعادات الصرف المسموحة (افتراضي: 0)
13. **refills_used**: عدد إعادات الصرف المستخدمة (افتراضي: 0)
14. **is_generic_allowed**: السماح بالبديل الجنيس (افتراضي: true)
15. **status**: حالة الوصفة (active, filled, cancelled, expired)
16. **prescribed_date**: تاريخ كتابة الوصفة (تلقائي)
17. **expiry_date**: تاريخ انتهاء الصلاحية (اختياري)
18. **filled_date**: تاريخ الصرف (تلقائي عند الصرف)

### حقول الترجمة | Translation Fields

1. **language_code**: كود اللغة (ar, en)
2. **instructions**: تعليمات الاستخدام
3. **indication**: دواعي الاستعمال
4. **pharmacy_notes**: ملاحظات للصيدلية

---

## حالات الوصفة | Prescription Status

```javascript
const prescriptionStatus = {
  'active': 'نشطة - لم يتم صرفها بعد',
  'filled': 'تم صرفها',
  'cancelled': 'ملغاة من قبل الطبيب',
  'expired': 'منتهية الصلاحية'
};
```

### دورة حياة الوصفة | Prescription Lifecycle

```
إنشاء (active)
    ↓
    ├→ صرف (filled)
    │     ↓
    │     └→ إعادة صرف (filled + refills_used++)
    │
    ├→ إلغاء (cancelled)
    │
    └→ انتهاء صلاحية (expired)
```

---

## التحقق من الصحة | Validation Rules

### عند الإنشاء | On Create
1. ✅ medical_record_id مطلوب
2. ✅ patient_id مطلوب
3. ✅ medication_name مطلوب
4. ✅ dosage مطلوب
5. ✅ frequency مطلوب
6. ✅ السجل الطبي موجود وينتمي للمريض
7. ✅ newPassword طوله 8 أحرف على الأقل

### عند التعديل | On Update
1. ✅ الوصفة موجودة وتنتمي للطبيب
2. ✅ الحالة ليست filled أو cancelled
3. ✅ يمكن تعديل أي حقل ماعدا patient_id و doctor_id

### عند الإلغاء | On Cancel
1. ✅ الوصفة موجودة وتنتمي للطبيب
2. ✅ الحالة ليست cancelled أو filled

### عند الصرف | On Fill
1. ✅ الوصفة موجودة
2. ✅ الحالة ليست cancelled أو expired
3. ✅ إعادات الصرف متاحة (refills_used < refills_allowed)

---

## الأمان | Security

### 1. عزل البيانات | Data Isolation
- المريض يرى وصفاته فقط
- الطبيب يرى وصفاته فقط
- Admin يرى جميع الوصفات
- التحقق من الملكية في كل عملية

### 2. حماية من التعديل | Edit Protection
- لا يمكن تعديل وصفة تم صرفها
- لا يمكن تعديل وصفة ملغاة
- لا يمكن إلغاء وصفة تم صرفها

### 3. تتبع الصرف | Filling Tracking
- تسجيل تاريخ كل صرف
- تتبع عدد إعادات الصرف
- منع الصرف الزائد

---

## الفلاتر والبحث | Filters and Search

### الفلاتر المتاحة | Available Filters

1. **patient_id**: فلترة حسب المريض
2. **status**: فلترة حسب الحالة
3. **medical_record_id**: فلترة حسب السجل الطبي
4. **pagination**: page & limit

### مثال استعلام | Query Example

```
GET /api/prescriptions?patient_id=5&status=active&page=1&limit=20
```

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: إنشاء وصفة كاملة
```javascript
POST /api/prescriptions
Headers: {
  Authorization: "Bearer {doctor_token}",
  Content-Type: "application/json"
}
Body: {
  "medical_record_id": 10,
  "patient_id": 5,
  "medication_name": "أموكسيسيلين 500mg",
  "dosage": "500mg",
  "frequency": "3 مرات يومياً",
  "duration": "7 أيام",
  "quantity": "21 كبسولة",
  "route_of_administration": "فموي",
  "refills_allowed": 0,
  "is_generic_allowed": true,
  "expiry_date": "2024-12-31",
  "translations": {
    "ar": {
      "instructions": "تؤخذ بعد الأكل مع كوب ماء كامل",
      "indication": "التهاب الحلق البكتيري",
      "pharmacy_notes": "يرجى التأكد من عدم وجود حساسية للبنسلين"
    },
    "en": {
      "instructions": "Take after meals with a full glass of water",
      "indication": "Bacterial throat infection",
      "pharmacy_notes": "Please ensure no penicillin allergy"
    }
  }
}

Response: {
  "success": true,
  "message": "تم إنشاء الوصفة الطبية بنجاح",
  "data": {
    "id": 1,
    "uuid": "...",
    "prescription_number": "RX-1234567890-ABC123",
    ...
  }
}
```

### مثال 2: عرض وصفات مريض
```javascript
GET /api/prescriptions?patient_id=5&status=active

Response: {
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "data": [...]
}
```

### مثال 3: صرف وصفة
```javascript
PATCH /api/prescriptions/1/fill

Response: {
  "success": true,
  "message": "تم صرف الوصفة الطبية بنجاح"
}
```

### مثال 4: إلغاء وصفة
```javascript
PATCH /api/prescriptions/1/cancel

Response: {
  "success": true,
  "message": "تم إلغاء الوصفة الطبية بنجاح"
}
```

---

## التكامل | Integration

### 1. السجلات الطبية | Medical Records
- كل وصفة مرتبطة بسجل طبي
- لا يمكن حذف سجل طبي له وصفات (RESTRICT)

### 2. المرضى والأطباء | Patients & Doctors
- كل وصفة مرتبطة بمريض وطبيب
- لا يمكن حذف مريض أو طبيب له وصفات

### 3. قوالب الوصفات | Prescription Templates
- يمكن استخدام القالب لإنشاء وصفة سريعة
- نسخ البيانات الافتراضية من القالب

---

## الأداء | Performance

### 1. Indexing
```sql
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_medical_record ON prescriptions(medical_record_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_number ON prescriptions(prescription_number);
```

### 2. Pagination
- الحد الافتراضي: 20 وصفة لكل صفحة
- ترتيب حسب تاريخ الكتابة (الأحدث أولاً)

---

## معالجة الأخطاء | Error Handling

### أخطاء شائعة | Common Errors

1. **400 Bad Request**
   - بيانات مطلوبة مفقودة
   - السجل الطبي لا ينتمي للمريض
   - لا يمكن تعديل/إلغاء وصفة تم صرفها

2. **401 Unauthorized**
   - Token غير موجود أو غير صالح

3. **403 Forbidden**
   - المستخدم ليس لديه صلاحية

4. **404 Not Found**
   - الوصفة غير موجودة
   - السجل الطبي غير موجود

5. **500 Internal Server Error**
   - خطأ في قاعدة البيانات

---

## ملاحظات مهمة | Important Notes

### للمطورين | For Developers

1. **Prescription Number**: يتم إنشاؤه تلقائياً بصيغة RX-timestamp-random
2. **Translations**: استخدم transactions عند إنشاء وصفة مع ترجمات
3. **Status Management**: تحقق من الحالة قبل أي عملية
4. **Refills**: تتبع عدد إعادات الصرف بدقة

### للأطباء | For Doctors

1. تأكد من صحة معلومات الدواء
2. أضف تعليمات واضحة بلغات متعددة
3. حدد عدد إعادات الصرف بدقة
4. راجع الوصفات قبل الصرف

### للصيادلة | For Pharmacists

1. تحقق من تاريخ انتهاء الصلاحية
2. راجع ملاحظات الصيدلية
3. تأكد من عدم تجاوز إعادات الصرف
4. سجل تاريخ الصرف بدقة

---

## التحديثات المستقبلية | Future Enhancements

1. توقيع إلكتروني للوصفات
2. باركود للوصفات
3. تنبيهات التفاعلات الدوائية
4. تكامل مع الصيدليات
5. إحصائيات الوصفات
6. تصدير الوصفات PDF
7. إشعارات للمرضى

---

## الدعم | Support

للمزيد من المعلومات:
- ملف الاختبار: `PRESCRIPTIONS_API_TESTING.json`
- الكود: `controllers/prescriptionsController.js`
- Routes: `routes/prescriptionsRoutes.js`

For more information:
- Testing file: `PRESCRIPTIONS_API_TESTING.json`
- Code: `controllers/prescriptionsController.js`
- Routes: `routes/prescriptionsRoutes.js`

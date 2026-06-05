# شرح لوجيك نظام الأدوية
# Medications System Logic Explanation

## نظرة عامة | Overview

نظام الأدوية هو قاعدة بيانات شاملة للأدوية المتاحة في النظام الطبي. يسمح للأطباء والإداريين بإدارة معلومات الأدوية بشكل كامل.

The Medications System is a comprehensive database of available medications in the medical system. It allows doctors and administrators to fully manage medication information.

---

## الصلاحيات | Permissions

### المسؤول (Admin)
- إنشاء أدوية عامة (created_by_doctor_id = NULL)
- تعديل جميع الأدوية
- حذف الأدوية
- تفعيل/إلغاء تفعيل الأدوية
- عرض جميع الأدوية

**Admin:**
- Create global medications (created_by_doctor_id = NULL)
- Edit all medications
- Delete medications
- Activate/Deactivate medications
- View all medications

### الطبيب (Doctor)
- إنشاء أدوية خاصة (created_by_doctor_id = doctor.id)
- عرض جميع الأدوية (العامة والخاصة)
- لا يمكن تعديل أو حذف الأدوية

**Doctor:**
- Create private medications (created_by_doctor_id = doctor.id)
- View all medications (global and private)
- Cannot edit or delete medications

---

## هيكل قاعدة البيانات | Database Structure

### جدول medications

```sql
CREATE TABLE medications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  created_by_doctor_id INT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  category VARCHAR(100),
  form_type ENUM('tablet', 'capsule', 'syrup', 'cream', 'ointment', 
                 'injection', 'drops', 'inhaler', 'suppository', 
                 'sachet', 'other') DEFAULT 'tablet',
  available_dosages JSON,
  indications TEXT,
  warning_alert TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
);
```

### الحقول الرئيسية | Main Fields

1. **id, uuid**: معرفات فريدة للدواء
2. **created_by_doctor_id**: 
   - NULL = دواء عام (أنشأه Admin)
   - doctor_id = دواء خاص (أنشأه طبيب معين)
3. **name_ar, name_en**: اسم الدواء بالعربية والإنجليزية (مطلوب)
4. **scientific_name**: الاسم العلمي للدواء
5. **category**: تصنيف الدواء (مضاد حيوي، مسكن، إلخ)
6. **form_type**: شكل الدواء (حبوب، كبسولات، شراب، إلخ)
7. **available_dosages**: الجرعات المتاحة (JSON Array)
8. **indications**: دواعي الاستعمال
9. **warning_alert**: تحذيرات مهمة
10. **is_active**: حالة التفعيل

---

## آلية العمل | How It Works

### 1. إنشاء دواء جديد | Create Medication

```
المستخدم (Admin/Doctor) يرسل طلب POST
↓
التحقق من الصلاحيات (authenticateJWT + authorizeAdminOrDoctor)
↓
التحقق من البيانات المطلوبة (name_ar, name_en)
↓
التحقق من عدم وجود دواء بنفس الاسم
↓
تحديد created_by_doctor_id:
  - Admin → NULL (دواء عام)
  - Doctor → doctor.id (دواء خاص)
↓
إنشاء UUID فريد
↓
حفظ الدواء في قاعدة البيانات
↓
إرجاع بيانات الدواء المنشأ
```

**Flow:**
```
User (Admin/Doctor) sends POST request
↓
Verify permissions (authenticateJWT + authorizeAdminOrDoctor)
↓
Validate required data (name_ar, name_en)
↓
Check medication doesn't already exist
↓
Determine created_by_doctor_id:
  - Admin → NULL (global medication)
  - Doctor → doctor.id (private medication)
↓
Generate unique UUID
↓
Save medication to database
↓
Return created medication data
```

### 2. عرض الأدوية | View Medications

```
المستخدم يرسل طلب GET
↓
التحقق من الصلاحيات
↓
تطبيق الفلاتر (is_active, category, form_type, search)
↓
جلب الأدوية مع معلومات المنشئ (Doctor info if applicable)
↓
تطبيق Pagination
↓
تنسيق البيانات حسب اللغة المطلوبة
↓
إرجاع القائمة
```

### 3. تعديل دواء | Update Medication

```
Admin يرسل طلب PUT
↓
التحقق من صلاحيات Admin فقط (authorizeAnyAdmin)
↓
التحقق من وجود الدواء
↓
بناء استعلام التحديث الديناميكي
↓
تحديث الحقول المطلوبة فقط
↓
إرجاع البيانات المحدثة
```

### 4. حذف دواء | Delete Medication

```
Admin يرسل طلب DELETE
↓
التحقق من صلاحيات Admin فقط
↓
التحقق من وجود الدواء
↓
التحقق من عدم استخدام الدواء في قوالب وصفات
↓
حذف الدواء
↓
إرجاع رسالة نجاح
```

### 5. تفعيل/إلغاء تفعيل | Toggle Status

```
Admin يرسل طلب PATCH
↓
التحقق من صلاحيات Admin فقط
↓
التحقق من وجود الدواء
↓
قلب حالة is_active (1 ↔ 0)
↓
إرجاع الحالة الجديدة
```

---

## الفلاتر والبحث | Filters and Search

### الفلاتر المتاحة | Available Filters

1. **is_active**: فلترة حسب حالة التفعيل
   - `?is_active=true` - الأدوية المفعلة فقط
   - `?is_active=false` - الأدوية غير المفعلة

2. **category**: فلترة حسب التصنيف
   - `?category=مضاد حيوي`

3. **form_type**: فلترة حسب شكل الدواء
   - `?form_type=tablet`

4. **search**: البحث في الأسماء
   - يبحث في: name_ar, name_en, scientific_name
   - `?search=باراسيتامول`

5. **pagination**: تقسيم النتائج
   - `?page=1&limit=20`

### مثال استعلام مركب | Complex Query Example

```
GET /api/medications?is_active=true&category=مضاد حيوي&form_type=tablet&search=أموكسي&page=1&limit=10
```

---

## أنواع الأدوية | Medication Form Types

```javascript
const validFormTypes = [
  'tablet',        // حبوب
  'capsule',       // كبسولات
  'syrup',         // شراب
  'cream',         // كريم
  'ointment',      // مرهم
  'injection',     // حقن
  'drops',         // قطرة
  'inhaler',       // بخاخ
  'suppository',   // تحاميل
  'sachet',        // أكياس
  'other'          // أخرى
];
```

---

## الجرعات المتاحة | Available Dosages

يتم تخزين الجرعات المتاحة كـ JSON Array:

```json
{
  "available_dosages": [
    "500mg",
    "1000mg",
    "250mg/5ml"
  ]
}
```

---

## التحقق من الصحة | Validation Rules

### عند الإنشاء | On Create
1. ✅ name_ar مطلوب
2. ✅ name_en مطلوب
3. ✅ form_type يجب أن يكون من القائمة المحددة
4. ✅ عدم وجود دواء بنفس الاسم
5. ✅ available_dosages يجب أن يكون JSON صالح

### عند التعديل | On Update
1. ✅ الدواء موجود
2. ✅ المستخدم لديه صلاحية Admin
3. ✅ form_type صالح (إذا تم إرساله)
4. ✅ available_dosages JSON صالح (إذا تم إرساله)

### عند الحذف | On Delete
1. ✅ الدواء موجود
2. ✅ المستخدم لديه صلاحية Admin
3. ✅ الدواء غير مستخدم في قوالب وصفات

---

## الأمان | Security

### 1. المصادقة | Authentication
- جميع الـ endpoints تتطلب JWT Token صالح
- يتم التحقق من الهوية عبر `authenticateJWT` middleware

### 2. التفويض | Authorization
- **Admin**: صلاحيات كاملة (CRUD)
- **Doctor**: قراءة + إنشاء فقط
- يتم التحقق عبر `authorizeAnyAdmin` أو `authorizeAdminOrDoctor`

### 3. حماية البيانات | Data Protection
- استخدام Prepared Statements لمنع SQL Injection
- التحقق من صحة البيانات قبل الحفظ
- استخدام Transactions للعمليات المعقدة

---

## معالجة الأخطاء | Error Handling

### أخطاء شائعة | Common Errors

1. **400 Bad Request**
   - بيانات مطلوبة مفقودة
   - نوع دواء غير صالح
   - دواء موجود بالفعل

2. **401 Unauthorized**
   - Token غير موجود أو غير صالح

3. **403 Forbidden**
   - المستخدم ليس لديه صلاحية

4. **404 Not Found**
   - الدواء غير موجود

5. **500 Internal Server Error**
   - خطأ في قاعدة البيانات
   - خطأ في الخادم

---

## التكامل مع الأنظمة الأخرى | Integration

### 1. قوالب الوصفات | Prescription Templates
- يتم استخدام medications في prescription_template_items
- لا يمكن حذف دواء مستخدم في قالب

### 2. الوصفات الطبية | Prescriptions
- يمكن للأطباء اختيار الأدوية عند كتابة وصفة
- يتم عرض معلومات الدواء الكاملة

### 3. نظام البحث | Search System
- البحث السريع في الأدوية
- الفلترة حسب التصنيف والشكل

---

## الأداء | Performance

### 1. Indexing
```sql
CREATE INDEX idx_medications_name_ar ON medications(name_ar);
CREATE INDEX idx_medications_name_en ON medications(name_en);
CREATE INDEX idx_medications_category ON medications(category);
CREATE INDEX idx_medications_is_active ON medications(is_active);
CREATE INDEX idx_medications_created_by ON medications(created_by_doctor_id);
```

### 2. Pagination
- استخدام LIMIT و OFFSET
- الحد الافتراضي: 20 دواء لكل صفحة
- يمكن تخصيص الحد (limit parameter)

### 3. Caching
- يمكن تطبيق Redis caching للأدوية المفعلة
- Cache invalidation عند التعديل

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: إنشاء دواء عام (Admin)
```javascript
POST /api/medications
Headers: {
  Authorization: "Bearer {admin_token}",
  Content-Type: "application/json"
}
Body: {
  "name_ar": "باراسيتامول",
  "name_en": "Paracetamol",
  "scientific_name": "Acetaminophen",
  "category": "مسكن",
  "form_type": "tablet",
  "available_dosages": ["500mg", "1000mg"],
  "indications": "مسكن للألم وخافض للحرارة",
  "warning_alert": "لا يستخدم مع أمراض الكبد",
  "is_active": true
}

Response: {
  "success": true,
  "message": "تم إضافة الدواء بنجاح",
  "data": {
    "id": 1,
    "uuid": "...",
    "created_by": {
      "type": "admin",
      "verified": true
    },
    ...
  }
}
```

### مثال 2: إنشاء دواء خاص (Doctor)
```javascript
POST /api/medications
Headers: {
  Authorization: "Bearer {doctor_token}",
  Content-Type: "application/json"
}
Body: {
  "name_ar": "خلطة خاصة",
  "name_en": "Custom Mix",
  "form_type": "cream"
}

Response: {
  "success": true,
  "data": {
    "created_by": {
      "type": "doctor",
      "doctor_id": 5,
      "doctor_name": "د. أحمد محمد"
    }
  }
}
```

### مثال 3: البحث والفلترة
```javascript
GET /api/medications?is_active=true&category=مضاد حيوي&search=أموكسي&page=1&limit=10

Response: {
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "pages": 1,
  "data": [...]
}
```

---

## ملاحظات مهمة | Important Notes

### للمطورين | For Developers

1. **UUID vs ID**: 
   - استخدم UUID للـ API الخارجي
   - استخدم ID للعلاقات الداخلية

2. **Language Support**:
   - يتم تحديد اللغة من Header: `Accept-Language`
   - الافتراضي: العربية (ar)

3. **JSON Parsing**:
   - available_dosages يتم تخزينه كـ JSON
   - استخدم `safeJSONParse` helper function

4. **Transactions**:
   - استخدم transactions للعمليات المعقدة
   - تأكد من rollback عند الخطأ

### للمستخدمين | For Users

1. تأكد من إدخال الاسم بالعربية والإنجليزية
2. اختر التصنيف المناسب للدواء
3. أضف التحذيرات المهمة
4. حدد الجرعات المتاحة بدقة

---

## التحديثات المستقبلية | Future Enhancements

1. إضافة صور للأدوية
2. ربط مع قواعد بيانات أدوية عالمية
3. نظام تقييم الأدوية
4. تتبع تاريخ الأسعار
5. تنبيهات التفاعلات الدوائية
6. باركود للأدوية
7. تقارير استخدام الأدوية

---

## الدعم | Support

للمزيد من المعلومات:
- ملف الاختبار: `MEDICATIONS_API_TESTING.json`
- الكود: `controllers/medicationsController.js`
- Routes: `routes/medicationsRoutes.js`

For more information:
- Testing file: `MEDICATIONS_API_TESTING.json`
- Code: `controllers/medicationsController.js`
- Routes: `routes/medicationsRoutes.js`

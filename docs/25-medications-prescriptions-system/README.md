# نظام الأدوية والوصفات الطبية
# Medications and Prescriptions System

## نظرة عامة | Overview

هذا المجلد يحتوي على التوثيق الكامل لثلاثة أنظمة مترابطة:

This folder contains complete documentation for three interconnected systems:

1. **نظام الأدوية** | Medications System
2. **نظام قوالب الوصفات** | Prescription Templates System
3. **نظام الوصفات الطبية** | Prescriptions System

---

## محتويات المجلد | Folder Contents

### 📚 ملفات التوثيق | Documentation Files

#### 1. نظام الأدوية | Medications System

**📄 MEDICATIONS_LOGIC.md**
- شرح شامل للوجيك
- الصلاحيات والأمان
- هيكل قاعدة البيانات
- آلية العمل لجميع العمليات
- أمثلة عملية

**📄 MEDICATIONS_API_TESTING.json**
- ملف Postman للاختبار
- جميع الـ APIs مع أمثلة
- اختبارات ناجحة وفاشلة
- بيانات بالعربية والإنجليزية

#### 2. نظام قوالب الوصفات | Prescription Templates System

**📄 PRESCRIPTION_TEMPLATES_LOGIC.md**
- شرح شامل للوجيك
- إدارة القوالب والأدوية
- عداد الاستخدام
- أمثلة عملية

**📄 PRESCRIPTION_TEMPLATES_API_TESTING.json**
- ملف Postman للاختبار
- جميع الـ APIs
- اختبارات عزل البيانات
- إدارة الأدوية في القوالب

#### 3. نظام الوصفات الطبية | Prescriptions System

**📄 PRESCRIPTIONS_LOGIC.md**
- شرح شامل للوجيك
- حالات الوصفة
- نظام إعادات الصرف
- الترجمات متعددة اللغات

**📄 PRESCRIPTIONS_API_TESTING.json**
- ملف Postman للاختبار
- جميع الـ APIs
- اختبارات الصرف والإلغاء
- اختبارات الترجمات

### 🐛 ملفات الإصلاحات | Bugfix Files

**📄 BUGFIX_JSON_PARSE_ERROR.md**
- إصلاح خطأ JSON Parse
- الأسباب والحلول
- التعديلات المطبقة
- نصائح للمطورين

---

## البدء السريع | Quick Start

### 1. قراءة التوثيق | Read Documentation

ابدأ بقراءة ملفات `*_LOGIC.md` لفهم كل نظام:

```
1. MEDICATIONS_LOGIC.md
2. PRESCRIPTION_TEMPLATES_LOGIC.md
3. PRESCRIPTIONS_LOGIC.md
```

### 2. استيراد ملفات Postman | Import Postman Files

افتح Postman واستورد الملفات:

```
1. MEDICATIONS_API_TESTING.json
2. PRESCRIPTION_TEMPLATES_API_TESTING.json
3. PRESCRIPTIONS_API_TESTING.json
```

### 3. تعديل المتغيرات | Configure Variables

في كل collection، عدّل:
- `baseUrl`: عنوان الـ API
- بيانات تسجيل الدخول في Setup

### 4. تشغيل الاختبارات | Run Tests

شغّل الاختبارات بالترتيب:
1. Setup - Login
2. Create operations
3. Read operations
4. Update operations
5. Delete operations

---

## العلاقات بين الأنظمة | System Relationships

```
medications (الأدوية)
    ↓
    ├─→ prescription_template_items (أدوية القوالب)
    │       ↓
    │   prescription_templates (قوالب الوصفات)
    │
    └─→ prescriptions (الوصفات الطبية)
            ↓
        prescription_translations (ترجمات الوصفات)
```

### تدفق العمل | Workflow

```
1. Admin/Doctor يضيف أدوية → medications
2. Doctor يُنشئ قالب → prescription_templates
3. Doctor يضيف أدوية للقالب → prescription_template_items
4. Doctor يستخدم القالب لإنشاء وصفة → prescriptions
5. Doctor يضيف ترجمات → prescription_translations
6. Pharmacy تصرف الوصفة → prescriptions (status: filled)
```

---

## الصلاحيات | Permissions Summary

### نظام الأدوية | Medications

| العملية | Admin | Doctor | Patient |
|---------|-------|--------|---------|
| Create  | ✅ عام | ✅ خاص | ❌ |
| Read    | ✅     | ✅     | ❌ |
| Update  | ✅     | ❌     | ❌ |
| Delete  | ✅     | ❌     | ❌ |
| Toggle  | ✅     | ❌     | ❌ |

### نظام قوالب الوصفات | Prescription Templates

| العملية | Admin | Doctor | Patient |
|---------|-------|--------|---------|
| Create  | ❌    | ✅ خاص | ❌ |
| Read    | ❌    | ✅ خاص | ❌ |
| Update  | ❌    | ✅ خاص | ❌ |
| Delete  | ❌    | ✅ خاص | ❌ |

### نظام الوصفات الطبية | Prescriptions

| العملية | Admin | Doctor | Patient | Pharmacy |
|---------|-------|--------|---------|----------|
| Create  | ❌    | ✅     | ❌      | ❌ |
| Read    | ✅ الكل | ✅ خاص | ✅ خاص | ✅ |
| Update  | ❌    | ✅ خاص | ❌      | ❌ |
| Cancel  | ❌    | ✅ خاص | ❌      | ❌ |
| Fill    | ❌    | ❌     | ❌      | ✅ |

---

## الملفات المرتبطة | Related Files

### Controllers
```
controllers/
├── medicationsController.js
├── prescriptionTemplatesController.js
└── prescriptionsController.js
```

### Routes
```
routes/
├── medicationsRoutes.js
├── prescriptionTemplatesRoutes.js
└── prescriptionsRoutes.js
```

### Database Tables
```sql
medications
prescription_templates
prescription_template_items
prescriptions
prescription_translations
```

---

## المشاكل الشائعة | Common Issues

### 1. JSON Parse Error ❌

**المشكلة:**
```
Unexpected non-whitespace character after JSON at position 3
```

**الحل:**
راجع ملف `BUGFIX_JSON_PARSE_ERROR.md`

### 2. Unauthorized 401 ❌

**المشكلة:**
```json
{"success": false, "message": "Authentication required"}
```

**الحل:**
- تأكد من تسجيل الدخول أولاً
- تحقق من صحة الـ Token
- تأكد من إرسال Token في Header

### 3. Forbidden 403 ❌

**المشكلة:**
```json
{"success": false, "message": "Insufficient permissions"}
```

**الحل:**
- تحقق من صلاحيات المستخدم
- راجع جدول الصلاحيات أعلاه

### 4. Not Found 404 ❌

**المشكلة:**
```json
{"success": false, "message": "Resource not found"}
```

**الحل:**
- تحقق من صحة الـ ID أو UUID
- تأكد من ملكية المورد (للأطباء والمرضى)

---

## نصائح للمطورين | Developer Tips

### 1. استخدام UUID
```javascript
// ✅ Good - Using UUID for external API
GET /api/medications/aed418e1-35cc-44ae-9bee-0db380c4e08b

// ⚠️ OK - Using ID for internal operations
GET /api/medications/1
```

### 2. معالجة JSON
```javascript
// ❌ Bad
const data = JSON.parse(item.available_dosages);

// ✅ Good
const data = safeJSONParse(item.available_dosages);
```

### 3. Transactions
```javascript
// ✅ Always use transactions for complex operations
await connection.beginTransaction();
try {
  // ... operations
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
}
```

### 4. Error Handling
```javascript
// ✅ Always catch and log errors
try {
  // ... operations
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({
    success: false,
    message: 'خطأ في العملية',
    error: error.message
  });
}
```

---

## الإصدارات | Versions

| الإصدار | التاريخ | التغييرات |
|---------|---------|-----------|
| v1.0.1  | 2026-03-07 | إصلاح JSON Parse Error |
| v1.0.0  | 2026-03-07 | الإصدار الأولي |

---

## الدعم | Support

للمزيد من المعلومات أو الإبلاغ عن مشاكل:

For more information or to report issues:

1. راجع ملفات التوثيق في هذا المجلد
2. تحقق من ملف BUGFIX للمشاكل المعروفة
3. راجع الكود في controllers/

---

## المساهمة | Contributing

عند إضافة ميزات جديدة:

When adding new features:

1. ✅ حدّث ملفات `*_LOGIC.md`
2. ✅ أضف اختبارات في ملفات `*_API_TESTING.json`
3. ✅ وثّق أي تغييرات في قاعدة البيانات
4. ✅ أضف أمثلة عملية
5. ✅ حدّث جدول الإصدارات

---

## الترخيص | License

هذا التوثيق جزء من مشروع BASHRA.AI

This documentation is part of BASHRA.AI project

---

**آخر تحديث | Last Updated:** 2026-03-07
**الإصدار | Version:** 1.0.1

# شرح لوجيك نظام قوالب الوصفات الطبية
# Prescription Templates System Logic Explanation

## نظرة عامة | Overview

نظام قوالب الوصفات الطبية يسمح للأطباء بإنشاء قوالب جاهزة تحتوي على مجموعة من الأدوية بجرعاتها وتعليماتها. هذا يوفر الوقت عند كتابة وصفات متكررة.

The Prescription Templates System allows doctors to create ready-made templates containing a set of medications with their dosages and instructions. This saves time when writing recurring prescriptions.

---

## الصلاحيات | Permissions

### الطبيب فقط (Doctor Only)
- إنشاء قوالب خاصة به
- عرض قوالبه فقط
- تعديل قوالبه
- حذف قوالبه
- إضافة/تعديل/حذف أدوية من قوالبه
- تتبع عدد مرات استخدام القالب

**Doctor Only:**
- Create own templates
- View own templates only
- Edit own templates
- Delete own templates
- Add/Edit/Delete medications from own templates
- Track template usage count

---

## هيكل قاعدة البيانات | Database Structure

### جدول prescription_templates

```sql
CREATE TABLE prescription_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  doctor_id INT NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);
```

### جدول prescription_template_items

```sql
CREATE TABLE prescription_template_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  medication_id INT NOT NULL,
  default_dosage VARCHAR(100) NOT NULL,
  default_frequency VARCHAR(100) NOT NULL,
  default_duration VARCHAR(100),
  default_instructions TEXT,
  default_quantity VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES prescription_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE RESTRICT
);
```

### العلاقات | Relationships

```
doctors (1) ←→ (N) prescription_templates
prescription_templates (1) ←→ (N) prescription_template_items
medications (1) ←→ (N) prescription_template_items
```

---

## آلية العمل | How It Works

### 1. إنشاء قالب جديد | Create Template

```
الطبيب يرسل طلب POST
↓
التحقق من صلاحيات الطبيب (authenticateJWT + authorizeDoctor)
↓
التحقق من البيانات المطلوبة (template_name, items)
↓
التحقق من وجود دواء واحد على الأقل
↓
إنشاء UUID فريد للقالب
↓
حفظ القالب في prescription_templates
↓
لكل دواء في items:
  - التحقق من وجود الدواء
  - التحقق من البيانات المطلوبة
  - حفظ في prescription_template_items
↓
إرجاع بيانات القالب المنشأ
```

**Flow:**
```
Doctor sends POST request
↓
Verify doctor permissions
↓
Validate required data (template_name, items)
↓
Check at least one medication exists
↓
Generate unique UUID for template
↓
Save template to prescription_templates
↓
For each medication in items:
  - Verify medication exists
  - Validate required data
  - Save to prescription_template_items
↓
Return created template data
```

### 2. عرض القوالب | View Templates

```
الطبيب يرسل طلب GET
↓
التحقق من الصلاحيات
↓
جلب قوالب الطبيب فقط (WHERE doctor_id = ?)
↓
ترتيب حسب usage_count DESC (الأكثر استخداماً أولاً)
↓
إذا include_items=true:
  - جلب أدوية كل قالب
  - جلب معلومات الأدوية من medications
↓
تنسيق البيانات
↓
إرجاع القائمة
```

### 3. تعديل قالب | Update Template

```
الطبيب يرسل طلب PUT
↓
التحقق من الصلاحيات
↓
التحقق من ملكية القالب (doctor_id = ?)
↓
تعديل الاسم والوصف فقط
↓
لا يمكن تعديل الأدوية من هنا
↓
إرجاع البيانات المحدثة
```

### 4. إضافة دواء للقالب | Add Item to Template

```
الطبيب يرسل طلب POST /templates/:id/items
↓
التحقق من ملكية القالب
↓
التحقق من البيانات المطلوبة
↓
التحقق من وجود الدواء
↓
التحقق من عدم تكرار الدواء في القالب
↓
إضافة الدواء
↓
إرجاع رسالة نجاح
```

### 5. تعديل دواء في القالب | Update Template Item

```
الطبيب يرسل طلب PUT /templates/:id/items/:itemId
↓
التحقق من ملكية القالب
↓
التحقق من وجود الدواء في القالب
↓
تعديل الجرعة/التكرار/المدة/التعليمات
↓
إرجاع رسالة نجاح
```

### 6. حذف دواء من القالب | Delete Item from Template

```
الطبيب يرسل طلب DELETE /templates/:id/items/:itemId
↓
التحقق من ملكية القالب
↓
حذف الدواء من القالب
↓
إرجاع رسالة نجاح
```

### 7. زيادة عداد الاستخدام | Increment Usage Count

```
الطبيب يرسل طلب PATCH /templates/:id/use
↓
التحقق من ملكية القالب
↓
زيادة usage_count بمقدار 1
↓
إرجاع رسالة نجاح
```

---

## حقول القالب | Template Fields

### القالب الرئيسي | Main Template

1. **id, uuid**: معرفات فريدة
2. **doctor_id**: معرف الطبيب المالك
3. **template_name**: اسم القالب (مطلوب)
4. **description**: وصف القالب (اختياري)
5. **usage_count**: عدد مرات الاستخدام (يبدأ من 0)
6. **created_at, updated_at**: تواريخ الإنشاء والتحديث

### عناصر القالب | Template Items

1. **id**: معرف العنصر
2. **template_id**: معرف القالب
3. **medication_id**: معرف الدواء (مطلوب)
4. **default_dosage**: الجرعة الافتراضية (مطلوب) - مثال: "500mg"
5. **default_frequency**: التكرار الافتراضي (مطلوب) - مثال: "3 مرات يومياً"
6. **default_duration**: المدة الافتراضية (اختياري) - مثال: "7 أيام"
7. **default_instructions**: التعليمات الافتراضية (اختياري)
8. **default_quantity**: الكمية الافتراضية (اختياري) - مثال: "21 حبة"

---

## التحقق من الصحة | Validation Rules

### عند إنشاء قالب | On Create Template
1. ✅ template_name مطلوب
2. ✅ items مطلوب ويجب أن يكون array
3. ✅ items يجب أن يحتوي على دواء واحد على الأقل
4. ✅ لكل دواء:
   - medication_id مطلوب
   - default_dosage مطلوب
   - default_frequency مطلوب
   - الدواء موجود ومفعل

### عند تعديل قالب | On Update Template
1. ✅ القالب موجود
2. ✅ القالب ينتمي للطبيب
3. ✅ يمكن تعديل template_name و description فقط

### عند إضافة دواء | On Add Item
1. ✅ القالب موجود وينتمي للطبيب
2. ✅ medication_id, default_dosage, default_frequency مطلوبة
3. ✅ الدواء موجود ومفعل
4. ✅ الدواء غير موجود بالفعل في القالب

### عند تعديل دواء | On Update Item
1. ✅ القالب موجود وينتمي للطبيب
2. ✅ الدواء موجود في القالب
3. ✅ يمكن تعديل أي حقل من حقول الدواء

### عند حذف دواء | On Delete Item
1. ✅ القالب موجود وينتمي للطبيب
2. ✅ الدواء موجود في القالب

---

## الأمان | Security

### 1. عزل البيانات | Data Isolation
- كل طبيب يرى قوالبه فقط
- لا يمكن الوصول لقوالب أطباء آخرين
- يتم التحقق من doctor_id في كل عملية

### 2. المصادقة والتفويض | Authentication & Authorization
- جميع الـ endpoints تتطلب JWT Token
- صلاحيات الطبيب فقط (authorizeDoctor)
- التحقق من الملكية قبل أي عملية

### 3. حماية البيانات | Data Protection
- استخدام Prepared Statements
- استخدام Transactions للعمليات المعقدة
- Cascade Delete للقالب يحذف عناصره تلقائياً
- Restrict Delete للدواء يمنع حذفه إذا كان مستخدم

---

## حالات الاستخدام | Use Cases

### 1. قالب لنزلات البرد
```json
{
  "template_name": "علاج نزلة البرد",
  "description": "قالب قياسي لعلاج نزلات البرد الشائعة",
  "items": [
    {
      "medication_id": 1,
      "default_dosage": "500mg",
      "default_frequency": "3 مرات يومياً",
      "default_duration": "5 أيام",
      "default_instructions": "بعد الأكل",
      "default_quantity": "15 حبة"
    },
    {
      "medication_id": 2,
      "default_dosage": "10ml",
      "default_frequency": "مرتين يومياً",
      "default_duration": "5 أيام",
      "default_instructions": "قبل النوم"
    }
  ]
}
```

### 2. قالب لمرضى السكري
```json
{
  "template_name": "متابعة السكري",
  "description": "أدوية روتينية لمرضى السكري",
  "items": [
    {
      "medication_id": 5,
      "default_dosage": "500mg",
      "default_frequency": "مرتين يومياً",
      "default_instructions": "مع الوجبات الرئيسية"
    }
  ]
}
```

### 3. قالب للضغط
```json
{
  "template_name": "علاج ضغط الدم",
  "description": "أدوية ضغط الدم المرتفع",
  "items": [
    {
      "medication_id": 8,
      "default_dosage": "5mg",
      "default_frequency": "مرة يومياً",
      "default_instructions": "صباحاً قبل الإفطار"
    }
  ]
}
```

---

## الترتيب والأولوية | Sorting and Priority

### ترتيب القوالب | Templates Sorting
```sql
ORDER BY usage_count DESC, created_at DESC
```

- القوالب الأكثر استخداماً تظهر أولاً
- القوالب الأحدث تظهر أولاً في حالة التساوي

### ترتيب الأدوية | Items Sorting
```sql
ORDER BY id ASC
```

- الأدوية تظهر بترتيب إضافتها للقالب

---

## الأداء | Performance

### 1. Indexing
```sql
CREATE INDEX idx_templates_doctor ON prescription_templates(doctor_id);
CREATE INDEX idx_templates_usage ON prescription_templates(usage_count);
CREATE INDEX idx_items_template ON prescription_template_items(template_id);
CREATE INDEX idx_items_medication ON prescription_template_items(medication_id);
```

### 2. Eager Loading
- عند طلب `include_items=true`، يتم جلب الأدوية مع معلوماتها
- استخدام JOIN لتقليل عدد الاستعلامات

### 3. Caching
- يمكن cache القوالب الأكثر استخداماً
- Cache invalidation عند التعديل

---

## التكامل مع الأنظمة الأخرى | Integration

### 1. نظام الأدوية | Medications System
- يتم جلب معلومات الأدوية من جدول medications
- لا يمكن حذف دواء مستخدم في قالب (RESTRICT)

### 2. نظام الوصفات | Prescriptions System
- يمكن استخدام القالب لإنشاء وصفة سريعة
- يتم نسخ البيانات الافتراضية من القالب
- يتم زيادة usage_count عند الاستخدام

---

## معالجة الأخطاء | Error Handling

### أخطاء شائعة | Common Errors

1. **400 Bad Request**
   - بيانات مطلوبة مفقودة
   - لا توجد أدوية في القالب
   - دواء مكرر في القالب

2. **401 Unauthorized**
   - Token غير موجود أو غير صالح

3. **403 Forbidden**
   - المستخدم ليس طبيباً

4. **404 Not Found**
   - القالب غير موجود
   - القالب لا ينتمي للطبيب
   - الدواء غير موجود في القالب

5. **500 Internal Server Error**
   - خطأ في قاعدة البيانات

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: إنشاء قالب كامل
```javascript
POST /api/prescription-templates
Headers: {
  Authorization: "Bearer {doctor_token}",
  Content-Type: "application/json"
}
Body: {
  "template_name": "علاج التهاب الحلق",
  "description": "قالب قياسي لالتهاب الحلق البكتيري",
  "items": [
    {
      "medication_id": 3,
      "default_dosage": "500mg",
      "default_frequency": "3 مرات يومياً",
      "default_duration": "7 أيام",
      "default_instructions": "بعد الأكل",
      "default_quantity": "21 حبة"
    },
    {
      "medication_id": 7,
      "default_dosage": "10ml",
      "default_frequency": "عند الحاجة",
      "default_instructions": "للغرغرة"
    }
  ]
}

Response: {
  "success": true,
  "message": "تم إنشاء القالب بنجاح",
  "data": {...},
  "added_items": 2
}
```

### مثال 2: عرض القوالب مع الأدوية
```javascript
GET /api/prescription-templates?include_items=true

Response: {
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "template_name": "علاج نزلة البرد",
      "usage_count": 25,
      "items": [
        {
          "medication_name_ar": "باراسيتامول",
          "default_dosage": "500mg",
          ...
        }
      ]
    }
  ]
}
```

### مثال 3: إضافة دواء لقالب موجود
```javascript
POST /api/prescription-templates/1/items
Body: {
  "medication_id": 10,
  "default_dosage": "250mg",
  "default_frequency": "مرتين يومياً",
  "default_duration": "5 أيام"
}

Response: {
  "success": true,
  "message": "تم إضافة الدواء للقالب بنجاح",
  "item_id": 15
}
```

### مثال 4: زيادة عداد الاستخدام
```javascript
PATCH /api/prescription-templates/1/use

Response: {
  "success": true,
  "message": "تم تحديث عداد الاستخدام"
}
```

---

## ملاحظات مهمة | Important Notes

### للمطورين | For Developers

1. **Transactions**: استخدم transactions عند إنشاء قالب مع أدوية
2. **Validation**: تحقق من ملكية القالب في كل عملية
3. **Cascade Delete**: حذف القالب يحذف عناصره تلقائياً
4. **Usage Count**: لا تنسى زيادة العداد عند استخدام القالب

### للأطباء | For Doctors

1. أنشئ قوالب للحالات المتكررة
2. استخدم أسماء واضحة للقوالب
3. أضف وصف مفصل لكل قالب
4. راجع القوالب دورياً وحدثها
5. القوالب الأكثر استخداماً تظهر أولاً

---

## التحديثات المستقبلية | Future Enhancements

1. مشاركة القوالب بين الأطباء
2. قوالب عامة من الإدارة
3. تصنيف القوالب حسب التخصص
4. نسخ قالب من طبيب آخر
5. تصدير/استيراد القوالب
6. إحصائيات استخدام القوالب
7. اقتراحات ذكية للقوالب

---

## الدعم | Support

للمزيد من المعلومات:
- ملف الاختبار: `PRESCRIPTION_TEMPLATES_API_TESTING.json`
- الكود: `controllers/prescriptionTemplatesController.js`
- Routes: `routes/prescriptionTemplatesRoutes.js`

For more information:
- Testing file: `PRESCRIPTION_TEMPLATES_API_TESTING.json`
- Code: `controllers/prescriptionTemplatesController.js`
- Routes: `routes/prescriptionTemplatesRoutes.js`

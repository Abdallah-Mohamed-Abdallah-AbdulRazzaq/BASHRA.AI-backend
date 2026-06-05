# 📋 Prescription Templates API Documentation
# توثيق APIs قوالب الوصفات الطبية

> **تاريخ الإنشاء:** 25 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/prescription-templates`

---

## 📋 نظرة عامة | Overview

نظام قوالب الوصفات الطبية يسمح للأطباء بإنشاء قوالب جاهزة للوصفات الطبية المتكررة، مما يوفر الوقت ويضمن الدقة.

### **الميزات الرئيسية:**
- ✅ إنشاء قوالب مخصصة لكل طبيب
- ✅ إضافة عدة أدوية لكل قالب
- ✅ تحديد الجرعات والتعليمات الافتراضية
- ✅ تتبع عدد مرات الاستخدام
- ✅ إدارة كاملة للقوالب والعناصر (CRUD)
- ✅ ترتيب القوالب حسب الأكثر استخداماً

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `prescription_templates`:
```sql
CREATE TABLE `prescription_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `doctor_id` int NOT NULL,
  `template_name` varchar(255) NOT NULL,
  `description` text,
  `usage_count` int DEFAULT '0',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_templates_doctor` (`doctor_id`),
  CONSTRAINT `fk_templates_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
);
```

### جدول `prescription_template_items`:
```sql
CREATE TABLE `prescription_template_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `medication_id` int NOT NULL,
  `default_dosage` varchar(100) NOT NULL,
  `default_frequency` varchar(100) NOT NULL,
  `default_duration` varchar(50) DEFAULT NULL,
  `default_instructions` text,
  `default_quantity` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_template_items_template` (`template_id`),
  KEY `idx_template_items_medication` (`medication_id`),
  CONSTRAINT `fk_template_items_parent` FOREIGN KEY (`template_id`) REFERENCES `prescription_templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_template_items_medication` FOREIGN KEY (`medication_id`) REFERENCES `medications` (`id`) ON DELETE RESTRICT
);
```

---

## 🔐 المصادقة | Authentication

### **صلاحيات الوصول:**
- ✅ **Doctor only:** كل طبيب يدير قوالبه الخاصة فقط

```http
Authorization: Bearer DOCTOR_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Get All Templates
**GET** `/api/prescription-templates`

جلب جميع قوالب الطبيب المسجل.

**Query Parameters:**
- `include_items` (optional): include template items (true/false)

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Example Request:**
```http
GET /api/prescription-templates?include_items=true
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "template_name": "علاج الإكزيما الأساسي",
      "description": "قالب شامل لعلاج الإكزيما الخفيفة إلى المتوسطة",
      "usage_count": 45,
      "created_at": "2025-11-20T00:00:00.000Z",
      "updated_at": "2025-11-25T00:00:00.000Z",
      "items": [
        {
          "id": 1,
          "default_dosage": "1%",
          "default_frequency": "مرتين يومياً",
          "default_duration": "14 يوم",
          "default_instructions": "يطبق على المنطقة المصابة بطبقة رقيقة",
          "default_quantity": "أنبوب واحد 30 جرام",
          "medication_id": 1,
          "medication_uuid": "650e8400-e29b-41d4-a716-446655440001",
          "medication_name_ar": "هيدروكورتيزون",
          "medication_name_en": "Hydrocortisone",
          "scientific_name": "Hydrocortisone Acetate",
          "form_type": "cream",
          "available_dosages": ["0.5%", "1%", "2.5%"]
        }
      ]
    }
  ]
}
```

---

# 2️⃣ Get Template by ID
**GET** `/api/prescription-templates/:id`

جلب قالب محدد مع عناصره.

**Parameters:**
- `id`: Template ID (numeric) or UUID (string)

**Example:**
```http
GET /api/prescription-templates/1
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "template_name": "علاج الإكزيما الأساسي",
    "description": "قالب شامل لعلاج الإكزيما",
    "usage_count": 45,
    "created_at": "2025-11-20T00:00:00.000Z",
    "updated_at": "2025-11-25T00:00:00.000Z",
    "items": [
      {
        "id": 1,
        "default_dosage": "1%",
        "default_frequency": "مرتين يومياً",
        "default_duration": "14 يوم",
        "default_instructions": "يطبق على المنطقة المصابة",
        "default_quantity": "أنبوب واحد 30 جرام",
        "medication_id": 1,
        "medication_name_ar": "هيدروكورتيزون",
        "medication_name_en": "Hydrocortisone",
        "form_type": "cream"
      }
    ]
  }
}
```

---

# 3️⃣ Create Template
**POST** `/api/prescription-templates`

إنشاء قالب جديد مع أدويته.

**Body (JSON):**
```json
{
  "template_name": "علاج التهاب الجلد",
  "description": "قالب لعلاج التهابات الجلد البكتيرية",
  "items": [
    {
      "medication_id": 2,
      "default_dosage": "500mg",
      "default_frequency": "3 مرات يومياً",
      "default_duration": "7 أيام",
      "default_instructions": "يؤخذ بعد الأكل",
      "default_quantity": "21 كبسولة"
    },
    {
      "medication_id": 1,
      "default_dosage": "1%",
      "default_frequency": "مرتين يومياً",
      "default_duration": "10 أيام",
      "default_instructions": "يطبق موضعياً",
      "default_quantity": "أنبوب واحد"
    }
  ]
}
```

**Body (form-data):**
```
template_name: علاج التهاب الجلد
description: قالب لعلاج التهابات الجلد البكتيرية
items: [{"medication_id": 2, "default_dosage": "500mg", ...}]
```

**Required Fields:**
- ✅ `template_name` (string)
- ✅ `items` (array, at least 1 item)
  - ✅ `medication_id` (number)
  - ✅ `default_dosage` (string)
  - ✅ `default_frequency` (string)

**Optional Fields:**
- `description` (text)
- Per item:
  - `default_duration` (string)
  - `default_instructions` (text)
  - `default_quantity` (string)

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء القالب بنجاح",
  "data": {
    "id": 2,
    "uuid": "750e8400-e29b-41d4-a716-446655440002",
    "template_name": "علاج التهاب الجلد",
    "description": "قالب لعلاج التهابات الجلد البكتيرية",
    "usage_count": 0
  },
  "added_items": 2
}
```

---

# 4️⃣ Update Template
**PUT** `/api/prescription-templates/:id`

تحديث اسم ووصف القالب فقط (لا يشمل العناصر).

**Body:**
```json
{
  "template_name": "علاج التهاب الجلد المحدث",
  "description": "وصف محدث للقالب"
}
```

**Note:** جميع الحقول Optional

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث القالب بنجاح",
  "data": {
    "id": 2,
    "template_name": "علاج التهاب الجلد المحدث",
    "description": "وصف محدث للقالب"
  }
}
```

---

# 5️⃣ Delete Template
**DELETE** `/api/prescription-templates/:id`

حذف قالب (سيتم حذف جميع عناصره تلقائياً).

**Example:**
```http
DELETE /api/prescription-templates/2
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف القالب بنجاح"
}
```

---

# 6️⃣ Add Item to Template
**POST** `/api/prescription-templates/:id/items`

إضافة دواء جديد لقالب موجود.

**Body:**
```json
{
  "medication_id": 3,
  "default_dosage": "200mg",
  "default_frequency": "مرة واحدة يومياً",
  "default_duration": "5 أيام",
  "default_instructions": "يؤخذ قبل النوم",
  "default_quantity": "5 أقراص"
}
```

**Required Fields:**
- ✅ `medication_id` (number)
- ✅ `default_dosage` (string)
- ✅ `default_frequency` (string)

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة الدواء للقالب بنجاح",
  "item_id": 5
}
```

**Error Response (duplicate):**
```json
{
  "success": false,
  "message": "الدواء موجود بالفعل في القالب"
}
```

---

# 7️⃣ Update Template Item
**PUT** `/api/prescription-templates/:id/items/:itemId`

تحديث دواء في القالب.

**Parameters:**
- `id`: Template ID
- `itemId`: Item ID

**Body:**
```json
{
  "default_dosage": "1000mg",
  "default_frequency": "مرتين يومياً",
  "default_duration": "10 أيام"
}
```

**Note:** جميع الحقول Optional

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الدواء في القالب بنجاح"
}
```

---

# 8️⃣ Delete Template Item
**DELETE** `/api/prescription-templates/:id/items/:itemId`

حذف دواء من القالب.

**Example:**
```http
DELETE /api/prescription-templates/1/items/5
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف الدواء من القالب بنجاح"
}
```

---

# 9️⃣ Increment Usage Count
**PATCH** `/api/prescription-templates/:id/use`

زيادة عداد استخدام القالب (يتم استدعاؤه عند استخدام القالب لإنشاء وصفة).

**Example:**
```http
PATCH /api/prescription-templates/1/use
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث عداد الاستخدام"
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: إنشاء قالب جديد

```bash
# 1. Get available medications
GET /api/medications?is_active=true

# 2. Create template with multiple medications
POST /api/prescription-templates
{
  "template_name": "علاج الصدفية",
  "description": "قالب شامل لعلاج الصدفية",
  "items": [
    {
      "medication_id": 1,
      "default_dosage": "2.5%",
      "default_frequency": "مرة واحدة يومياً",
      "default_duration": "30 يوم"
    },
    {
      "medication_id": 4,
      "default_dosage": "حسب الحاجة",
      "default_frequency": "عند الحاجة",
      "default_instructions": "للترطيب"
    }
  ]
}

# 3. Verify creation
GET /api/prescription-templates/{id}
```

---

### Scenario 2: تعديل قالب موجود

```bash
# 1. Get template details
GET /api/prescription-templates/1

# 2. Update template info
PUT /api/prescription-templates/1
{
  "template_name": "علاج الإكزيما المحدث",
  "description": "وصف محدث"
}

# 3. Add new medication to template
POST /api/prescription-templates/1/items
{
  "medication_id": 5,
  "default_dosage": "10mg",
  "default_frequency": "مرة واحدة يومياً"
}

# 4. Update existing item
PUT /api/prescription-templates/1/items/2
{
  "default_dosage": "2%",
  "default_duration": "21 يوم"
}

# 5. Remove item
DELETE /api/prescription-templates/1/items/3
```

---

### Scenario 3: استخدام القالب في وصفة طبية

```bash
# 1. Get template with all items
GET /api/prescription-templates/1

# 2. Use template data to create prescription
POST /api/prescriptions
{
  "patient_id": 123,
  "template_id": 1,
  # ... other prescription data
}

# 3. Increment usage count
PATCH /api/prescription-templates/1/use
```

---

### Scenario 4: عرض القوالب الأكثر استخداماً

```bash
# Get all templates (sorted by usage_count DESC)
GET /api/prescription-templates?include_items=true

# Response will be sorted by most used first
```

---

## 📊 Template Structure Example

### مثال على قالب كامل:

```json
{
  "template_name": "علاج حب الشباب الشامل",
  "description": "قالب متكامل لعلاج حب الشباب المتوسط إلى الشديد",
  "items": [
    {
      "medication_id": 10,
      "default_dosage": "500mg",
      "default_frequency": "مرتين يومياً",
      "default_duration": "30 يوم",
      "default_instructions": "يؤخذ مع الطعام",
      "default_quantity": "60 كبسولة"
    },
    {
      "medication_id": 11,
      "default_dosage": "5%",
      "default_frequency": "مرة واحدة يومياً مساءً",
      "default_duration": "60 يوم",
      "default_instructions": "يطبق على البشرة النظيفة والجافة",
      "default_quantity": "أنبوب واحد 50 جرام"
    },
    {
      "medication_id": 12,
      "default_dosage": "حسب الحاجة",
      "default_frequency": "مرتين يومياً",
      "default_duration": "مستمر",
      "default_instructions": "غسول للوجه صباحاً ومساءً",
      "default_quantity": "زجاجة واحدة 200 مل"
    }
  ]
}
```

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "اسم القالب مطلوب"
}
```

```json
{
  "success": false,
  "message": "يجب إضافة دواء واحد على الأقل للقالب"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "القالب غير موجود"
}
```

### 400 Duplicate:
```json
{
  "success": false,
  "message": "الدواء موجود بالفعل في القالب"
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Doctor Isolation:**
   - كل طبيب يرى ويدير قوالبه الخاصة فقط
   - لا يمكن الوصول لقوالب أطباء آخرين

2. **Cascade Delete:**
   - حذف قالب يحذف جميع عناصره تلقائياً
   - حذف طبيب يحذف جميع قوالبه

3. **Medication Protection:**
   - لا يمكن حذف دواء مستخدم في قوالب (RESTRICT)
   - يجب حذف القالب أو استبدال الدواء أولاً

4. **Usage Tracking:**
   - يتم ترتيب القوالب حسب `usage_count` (الأكثر استخداماً أولاً)
   - يجب زيادة العداد عند استخدام القالب

5. **Template Items:**
   - كل قالب يجب أن يحتوي على دواء واحد على الأقل
   - لا يمكن إضافة نفس الدواء مرتين في قالب واحد

---

## 🚀 Quick Start

### 1. إنشاء قالب بسيط:
```bash
POST /api/prescription-templates
Authorization: Bearer DOCTOR_TOKEN
{
  "template_name": "علاج الحساسية",
  "items": [
    {
      "medication_id": 1,
      "default_dosage": "10mg",
      "default_frequency": "مرة واحدة يومياً"
    }
  ]
}
```

### 2. جلب جميع القوالب:
```bash
GET /api/prescription-templates?include_items=true
Authorization: Bearer DOCTOR_TOKEN
```

### 3. إضافة دواء لقالب:
```bash
POST /api/prescription-templates/1/items
Authorization: Bearer DOCTOR_TOKEN
{
  "medication_id": 2,
  "default_dosage": "500mg",
  "default_frequency": "3 مرات يومياً"
}
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/prescriptionTemplatesController.js`

### Routes:
- `routes/prescriptionTemplatesRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `prescription_templates`
- جدول `prescription_template_items`

### Related:
- `medications` (دليل الأدوية)
- `prescriptions` (الوصفات الطبية)

---

<div align="center">

**📋 Prescription Templates API - Complete! 📋**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 25 نوفمبر 2025

</div>



















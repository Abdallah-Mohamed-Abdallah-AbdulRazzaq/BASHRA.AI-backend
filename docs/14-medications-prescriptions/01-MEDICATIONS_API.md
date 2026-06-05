# 💊 Medications API Documentation
# توثيق APIs دليل الأدوية

> **تاريخ الإنشاء:** 25 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/medications`

---

## 📋 نظرة عامة | Overview

نظام دليل الأدوية يوفر قاعدة بيانات شاملة للأدوية المتاحة مع معلومات تفصيلية عن كل دواء.

### **الميزات الرئيسية:**
- ✅ إدارة كاملة للأدوية (CRUD)
- ✅ دعم اللغتين العربية والإنجليزية
- ✅ تصنيف الأدوية حسب الفئات
- ✅ 11 نوع من الأدوية (أقراص، مراهم، حقن، تحاميل، فوار، إلخ)
- ✅ الجرعات المتاحة (JSON Array)
- ✅ تحذيرات الاستخدام
- ✅ البحث والفلترة المتقدمة
- ✅ Pagination للنتائج
- ✅ تتبع من أضاف الدواء (Admin أو Doctor)

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `medications`:
```sql
CREATE TABLE `medications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  
  -- رابط الطبيب الذي أضاف الدواء
  -- NULL = Admin أضافه (دواء موثوق 100%)
  -- doctor_id = الطبيب أضافه (يظهر للجميع)
  `created_by_doctor_id` int DEFAULT NULL,
  
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL,
  `scientific_name` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `form_type` enum('tablet','capsule','syrup','cream','ointment','injection','drops','inhaler','suppository','sachet','other') DEFAULT 'tablet',
  `available_dosages` json DEFAULT NULL,
  `indications` text,
  `warning_alert` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `idx_medications_names` (`name_ar`, `name_en`),
  KEY `idx_medications_creator` (`created_by_doctor_id`),
  CONSTRAINT `fk_medications_creator` FOREIGN KEY (`created_by_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
);
```

---

## 🔐 المصادقة | Authentication

### **صلاحيات الوصول:**
- ✅ **Admin:** CRUD كامل (إنشاء، قراءة، تحديث، حذف) - `created_by_doctor_id = NULL`
- ✅ **Doctor:** قراءة + إنشاء فقط - `created_by_doctor_id = doctor.id`

### **ملاحظة مهمة:**
- عندما يضيف **Admin** دواءً: `created_by_doctor_id = NULL` (دواء موثوق 100%)
- عندما يضيف **Doctor** دواءً: `created_by_doctor_id = doctor.id` (يظهر للجميع مع اسم الطبيب)

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Get All Medications
**GET** `/api/medications`

جلب جميع الأدوية مع إمكانية الفلترة والبحث.

**Query Parameters:**
- `is_active` (optional): filter by active status (true/false)
- `category` (optional): filter by category
- `form_type` (optional): filter by form type
- `search` (optional): search in name_ar, name_en, scientific_name
- `page` (optional): page number (default: 1)
- `limit` (optional): items per page (default: 20)

**Headers:**
```
Authorization: Bearer TOKEN
Accept-Language: ar
```

**Example Request:**
```http
GET /api/medications?category=مضاد حيوي&page=1&limit=10
Authorization: Bearer ADMIN_TOKEN
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 5,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "هيدروكورتيزون",
      "name_ar": "هيدروكورتيزون",
      "name_en": "Hydrocortisone",
      "scientific_name": "Hydrocortisone Acetate",
      "category": "كورتيكوستيرويد",
      "form_type": "cream",
      "available_dosages": ["0.5%", "1%", "2.5%"],
      "indications": "علاج الالتهابات الجلدية والإكزيما",
      "warning_alert": "لا يستخدم لأكثر من أسبوعين",
      "is_active": 1,
      "created_by": {
        "type": "admin",
        "verified": true
      },
      "created_at": "2025-11-25T00:00:00.000Z",
      "updated_at": "2025-11-25T00:00:00.000Z"
    }
  ]
}
```

---

# 2️⃣ Get Medication by ID
**GET** `/api/medications/:id`

جلب دواء محدد بواسطة ID أو UUID.

**Parameters:**
- `id`: Medication ID (numeric) or UUID (string)

**Example:**
```http
GET /api/medications/1
GET /api/medications/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "هيدروكورتيزون",
    "name_ar": "هيدروكورتيزون",
    "name_en": "Hydrocortisone",
    "scientific_name": "Hydrocortisone Acetate",
    "category": "كورتيكوستيرويد",
    "form_type": "cream",
    "available_dosages": ["0.5%", "1%", "2.5%"],
    "indications": "علاج الالتهابات الجلدية والإكزيما",
    "warning_alert": "لا يستخدم لأكثر من أسبوعين",
    "is_active": 1,
    "created_by": {
      "type": "doctor",
      "doctor_id": 5,
      "doctor_name": "د. سارة أحمد",
      "doctor_email": "dr.sara@example.com"
    },
    "created_at": "2025-11-25T00:00:00.000Z",
    "updated_at": "2025-11-25T00:00:00.000Z"
  }
}
```

---

# 3️⃣ Create Medication
**POST** `/api/medications`

إنشاء دواء جديد (Admin & Doctor).

**ملاحظة:**
- **Admin:** يُنشئ دواء موثوق (`created_by_doctor_id = NULL`)
- **Doctor:** يُنشئ دواء مرتبط باسمه (`created_by_doctor_id = doctor.id`)

**Body (JSON):**
```json
{
  "name_ar": "أموكسيسيلين",
  "name_en": "Amoxicillin",
  "scientific_name": "Amoxicillin Trihydrate",
  "category": "مضاد حيوي",
  "form_type": "capsule",
  "available_dosages": ["250mg", "500mg", "1g"],
  "indications": "علاج الالتهابات البكتيرية",
  "warning_alert": "يجب إكمال الجرعة كاملة حتى لو تحسنت الأعراض",
  "is_active": true
}
```

**Body (form-data):**
```
name_ar: أموكسيسيلين
name_en: Amoxicillin
scientific_name: Amoxicillin Trihydrate
category: مضاد حيوي
form_type: capsule
available_dosages: ["250mg", "500mg", "1g"]
indications: علاج الالتهابات البكتيرية
warning_alert: يجب إكمال الجرعة كاملة
is_active: true
```

**Required Fields:**
- ✅ `name_ar` (string)
- ✅ `name_en` (string)

**Optional Fields:**
- `scientific_name` (string)
- `category` (string)
- `form_type` (enum: tablet, capsule, syrup, cream, ointment, injection, drops, inhaler, **suppository**, **sachet**, **other**)
- `available_dosages` (JSON array)
- `indications` (text)
- `warning_alert` (text)
- `is_active` (boolean, default: true)

**Form Types الأنواع المتاحة:**
- `tablet` - أقراص
- `capsule` - كبسولات
- `syrup` - شراب
- `cream` - كريم
- `ointment` - مرهم
- `injection` - حقن
- `drops` - قطرات
- `inhaler` - بخاخ
- `suppository` - تحاميل ⭐ جديد
- `sachet` - فوار/أكياس ⭐ جديد
- `other` - أخرى ⭐ جديد

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة الدواء بنجاح",
  "data": {
    "id": 2,
    "uuid": "650e8400-e29b-41d4-a716-446655440001",
    "name_ar": "أموكسيسيلين",
    "name_en": "Amoxicillin",
    "scientific_name": "Amoxicillin Trihydrate",
    "category": "مضاد حيوي",
    "form_type": "capsule",
    "available_dosages": ["250mg", "500mg", "1g"],
    "indications": "علاج الالتهابات البكتيرية",
    "warning_alert": "يجب إكمال الجرعة كاملة",
    "is_active": 1
  }
}
```

---

# 4️⃣ Update Medication
**PUT** `/api/medications/:id`

تحديث دواء موجود (Admin only).

**Body:**
```json
{
  "name_ar": "أموكسيسيلين محدث",
  "available_dosages": ["250mg", "500mg", "1g", "2g"],
  "warning_alert": "تحذير محدث",
  "is_active": false
}
```

**Note:** جميع الحقول Optional

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الدواء بنجاح",
  "data": {
    "id": 2,
    "uuid": "650e8400-e29b-41d4-a716-446655440001",
    "name_ar": "أموكسيسيلين محدث",
    "available_dosages": ["250mg", "500mg", "1g", "2g"],
    "is_active": 0
  }
}
```

---

# 5️⃣ Toggle Medication Status
**PATCH** `/api/medications/:id/toggle-status`

تفعيل/إلغاء تفعيل دواء (Admin only).

**Example:**
```http
PATCH /api/medications/1/toggle-status
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم إلغاء تفعيل الدواء بنجاح",
  "is_active": false
}
```

---

# 6️⃣ Delete Medication
**DELETE** `/api/medications/:id`

حذف دواء (Admin only).

**Example:**
```http
DELETE /api/medications/2
Authorization: Bearer ADMIN_TOKEN
```

**⚠️ تحذير:**
- لا يمكن حذف دواء مستخدم في قوالب وصفات طبية

**Response:**
```json
{
  "success": true,
  "message": "تم حذف الدواء بنجاح"
}
```

**Error Response (if used in templates):**
```json
{
  "success": false,
  "message": "لا يمكن حذف الدواء لأنه مستخدم في قوالب وصفات طبية",
  "templates_count": 3
}
```

---

# 7️⃣ Get Medications by Category
**GET** `/api/medications/category/:category`

جلب جميع الأدوية في تصنيف محدد.

**Example:**
```http
GET /api/medications/category/مضاد حيوي
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "category": "مضاد حيوي",
  "count": 15,
  "data": [
    {
      "id": 2,
      "uuid": "650e8400-e29b-41d4-a716-446655440001",
      "name": "أموكسيسيلين",
      "category": "مضاد حيوي",
      "form_type": "capsule"
    }
  ]
}
```

---

# 8️⃣ Get All Categories
**GET** `/api/medications/categories/list`

جلب جميع تصنيفات الأدوية المتاحة.

**Example:**
```http
GET /api/medications/categories/list
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    "مضاد حيوي",
    "كورتيكوستيرويد",
    "مسكن ألم",
    "مضاد التهاب",
    "فيتامينات"
  ]
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: إضافة دواء جديد للنظام

```bash
# 1. Create medication
POST /api/medications
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "إيبوبروفين",
  "name_en": "Ibuprofen",
  "category": "مسكن ألم",
  "form_type": "tablet",
  "available_dosages": ["200mg", "400mg", "600mg"],
  "indications": "تسكين الألم وخفض الحرارة",
  "warning_alert": "لا يستخدم على معدة فارغة"
}

# 2. Verify creation
GET /api/medications/{id}
```

---

### Scenario 2: البحث عن دواء معين

```bash
# Search by name
GET /api/medications?search=أموكسيسيلين

# Filter by category
GET /api/medications?category=مضاد حيوي

# Filter by form type
GET /api/medications?form_type=tablet

# Combined filters
GET /api/medications?category=مضاد حيوي&form_type=capsule&is_active=true
```

---

### Scenario 3: إدارة حالة الأدوية

```bash
# Deactivate medication
PATCH /api/medications/1/toggle-status

# Get only active medications
GET /api/medications?is_active=true
```

---

## 📊 Form Types | أنواع الأدوية

| القيمة | الوصف | الأيقونة المقترحة |
|--------|-------|-------------------|
| `tablet` | قرص | 💊 |
| `capsule` | كبسولة | 💊 |
| `syrup` | شراب | 🧪 |
| `cream` | كريم | 🧴 |
| `ointment` | مرهم | 🧴 |
| `injection` | حقنة | 💉 |
| `drops` | قطرة | 💧 |
| `inhaler` | بخاخ | 🌬️ |

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "اسم الدواء بالعربية والإنجليزية مطلوب"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "الدواء غير موجود"
}
```

### 400 Conflict:
```json
{
  "success": false,
  "message": "الدواء موجود بالفعل"
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Created By System:**
   - **Admin:** عند إضافة دواء، `created_by_doctor_id = NULL` (دواء موثوق 100%)
   - **Doctor:** عند إضافة دواء، `created_by_doctor_id = doctor.id` (يظهر للجميع مع اسم الطبيب)
   - إذا تم حذف الطبيب، يبقى الدواء ولكن `created_by_doctor_id` يصبح `NULL`

2. **Unique Constraints:**
   - UUID يجب أن يكون فريد
   - اسم الدواء (عربي أو إنجليزي) يجب أن يكون فريد

3. **Cascade Delete Protection:**
   - لا يمكن حذف دواء مستخدم في قوالب وصفات طبية
   - يجب حذف القوالب أولاً أو استبدال الدواء

4. **Form Types (11 نوع):**
   - الأنواع الأساسية: tablet, capsule, syrup, cream, ointment, injection, drops, inhaler
   - الأنواع الجديدة: **suppository** (تحاميل), **sachet** (فوار/أكياس), **other** (أخرى)

5. **JSON Fields:**
   - `available_dosages` يتم تخزينه كـ JSON array
   - يمكن إرساله كـ string أو array في الـ request
   - يتم إرجاعه كـ array في الـ response

6. **Multi-language Support:**
   - استخدم `Accept-Language: ar` للعربية
   - استخدم `Accept-Language: en` للإنجليزية
   - Default: العربية

7. **Pagination:**
   - Default page size: 20 items
   - Maximum page size: 100 items
   - يتم إرجاع معلومات الـ pagination في الـ response

---

## 🚀 Quick Start

### 1. إضافة دواء:
```bash
POST /api/medications
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "باراسيتامول",
  "name_en": "Paracetamol",
  "category": "مسكن ألم",
  "form_type": "tablet",
  "available_dosages": ["500mg", "1000mg"]
}
```

### 2. البحث عن أدوية:
```bash
GET /api/medications?search=باراسيتامول
Authorization: Bearer TOKEN
```

### 3. جلب تصنيفات الأدوية:
```bash
GET /api/medications/categories/list
Authorization: Bearer TOKEN
```

### 4. جلب أدوية تصنيف معين:
```bash
GET /api/medications/category/مضاد حيوي
Authorization: Bearer TOKEN
```

---

## 🎯 أمثلة عملية للتعديلات الجديدة | New Features Examples

### **مثال 1: Admin يضيف دواء موثوق**
```bash
POST /api/medications
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "فولتارين",
  "name_en": "Voltaren",
  "form_type": "suppository",
  "available_dosages": ["12.5mg", "25mg", "50mg"]
}

# Response:
{
  "data": {
    "created_by_doctor_id": null,  # NULL = Admin أضافه
    "created_by": {
      "type": "admin",
      "verified": true
    }
  }
}
```

### **مثال 2: Doctor يضيف دواء جديد**
```bash
POST /api/medications
Authorization: Bearer DOCTOR_TOKEN
{
  "name_ar": "فيتامين سي فوار",
  "name_en": "Vitamin C Effervescent",
  "form_type": "sachet",
  "available_dosages": ["1000mg"]
}

# Response:
{
  "data": {
    "created_by_doctor_id": 5,  # ID الطبيب
    "created_by": {
      "type": "doctor",
      "doctor_id": 5,
      "doctor_name": "د. سارة أحمد",
      "doctor_email": "dr.sara@example.com"
    }
  }
}
```

### **مثال 3: استخدام الأنواع الجديدة**
```bash
# تحاميل (Suppository)
POST /api/medications
{
  "name_ar": "تحاميل خافض حرارة",
  "name_en": "Fever Suppository",
  "form_type": "suppository"
}

# فوار (Sachet)
POST /api/medications
{
  "name_ar": "فوار مضاد للحموضة",
  "name_en": "Antacid Sachet",
  "form_type": "sachet"
}

# أخرى (Other)
POST /api/medications
{
  "name_ar": "لصقة نيكوتين",
  "name_en": "Nicotine Patch",
  "form_type": "other"
}
```

### **مثال 4: عرض الأدوية مع معلومات المُنشئ**
```bash
GET /api/medications

# Response يعرض من أضاف كل دواء:
{
  "data": [
    {
      "name_ar": "أسبرين",
      "created_by": {
        "type": "admin",
        "verified": true
      }
    },
    {
      "name_ar": "دواء تجريبي",
      "created_by": {
        "type": "doctor",
        "doctor_id": 3,
        "doctor_name": "د. أحمد محمد"
      }
    }
  ]
}
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/medicationsController.js`

### Routes:
- `routes/medicationsRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `medications`

---

<div align="center">

**💊 Medications API - Complete! 💊**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 25 نوفمبر 2025

</div>

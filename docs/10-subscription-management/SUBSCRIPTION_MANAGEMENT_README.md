# 📦 Subscription Management API Documentation
# توثيق APIs إدارة الباقات والاشتراكات

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api`

---

## 📋 نظرة عامة | Overview

نظام إدارة الباقات والاشتراكات يتكون من 3 أجزاء رئيسية:

### 1. **Features (الميزات)**
تعريف الميزات المتاحة في النظام (مثل: عدد المساعدين، التخزين السحابي، الإعلانات)

### 2. **Packages (الباقات)**
تعريف الباقات المتاحة للاشتراك (السعر، المدة، الاسم)

### 3. **Package Features (ميزات الباقات)**
ربط الميزات بالباقات وتحديد القيمة لكل ميزة في كل باقة

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `features`:
```sql
CREATE TABLE `features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) DEFAULT NULL,
  `unit_ar` varchar(50) DEFAULT NULL,
  `unit_en` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feature_name_ar` (`name_ar`)
);
```

### جدول `packages`:
```sql
CREATE TABLE `packages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `secondary_name_ar` varchar(255) DEFAULT NULL,
  `secondary_name_en` varchar(255) DEFAULT NULL,
  `duration_days` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `currency_code` CHAR(3) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

### جدول `package_features`:
```sql
CREATE TABLE `package_features` (
  `id` int NOT NULL AUTO_INCREMENT,
  `package_id` int NOT NULL,
  `feature_id` int NOT NULL,
  `feature_value` varchar(255) NOT NULL,
  `is_included` tinyint(1) DEFAULT '1',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_package_feature` (`package_id`,`feature_id`),
  FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`feature_id`) REFERENCES `features` (`id`) ON DELETE CASCADE
);
```

---

## 🔐 المصادقة | Authentication

جميع الـ APIs تحتاج:
- ✅ JWT Token في Header
- ✅ Admin Role فقط

```http
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Features APIs (إدارة الميزات)

## Base Path: `/api/features`

### 1.1 Get All Features
**GET** `/api/features`

جلب جميع الميزات المتاحة.

**Query Parameters:**
- `is_active` (optional): filter by active status (true/false)

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "id": 1,
      "name": "عدد المستخدمين",
      "name_ar": "عدد المستخدمين",
      "name_en": "Max Users",
      "unit": "مستخدم",
      "unit_ar": "مستخدم",
      "unit_en": "User",
      "is_active": 1,
      "created_at": "2025-11-24T00:00:00.000Z"
    }
  ]
}
```

---

### 1.2 Get Feature by ID
**GET** `/api/features/:id`

جلب ميزة محددة.

**Example:**
```http
GET /api/features/1
Authorization: Bearer ADMIN_TOKEN
```

---

### 1.3 Create Feature
**POST** `/api/features`

إنشاء ميزة جديدة.

**Body (JSON):**
```json
{
  "name_ar": "عدد مساعدي الطبيب",
  "name_en": "Max Assistants",
  "unit_ar": "مساعد",
  "unit_en": "Assistant",
  "is_active": true
}
```

**Body (form-data):**
```
name_ar: عدد مساعدي الطبيب
name_en: Max Assistants
unit_ar: مساعد
unit_en: Assistant
is_active: true
```

**Required Fields:**
- ✅ `name_ar`

**Optional Fields:**
- `name_en`
- `unit_ar`
- `unit_en`
- `is_active` (default: true)

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الميزة بنجاح",
  "data": {
    "id": 8,
    "name_ar": "عدد مساعدي الطبيب",
    "name_en": "Max Assistants",
    "unit_ar": "مساعد",
    "unit_en": "Assistant",
    "is_active": 1
  }
}
```

---

### 1.4 Update Feature
**PUT** `/api/features/:id`

تحديث ميزة موجودة.

**Body:**
```json
{
  "name_ar": "عدد مساعدي الطبيب المحدث",
  "is_active": false
}
```

**Note:** جميع الحقول Optional

---

### 1.5 Toggle Feature Status
**PATCH** `/api/features/:id/toggle-status`

تفعيل/إلغاء تفعيل ميزة.

**Example:**
```http
PATCH /api/features/1/toggle-status
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم إلغاء تفعيل الميزة بنجاح",
  "is_active": false
}
```

---

### 1.6 Delete Feature
**DELETE** `/api/features/:id`

حذف ميزة.

**Example:**
```http
DELETE /api/features/8
Authorization: Bearer ADMIN_TOKEN
```

**⚠️ تحذير:**
- لا يمكن حذف ميزة مستخدمة في باقات

---

# 2️⃣ Packages APIs (إدارة الباقات)

## Base Path: `/api/packages`

### 2.1 Get All Packages
**GET** `/api/packages`

جلب جميع الباقات.

**Query Parameters:**
- `is_active` (optional): filter by active status
- `include_features` (optional): include package features (true/false)

**Example:**
```http
GET /api/packages?include_features=true
Authorization: Bearer ADMIN_TOKEN
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 101,
      "name": "الباقة التجريبية",
      "name_ar": "الباقة التجريبية",
      "name_en": "Trial Package",
      "secondary_name": "مجانية لمدة أسبوع",
      "secondary_name_ar": "مجانية لمدة أسبوع",
      "secondary_name_en": "Free for 7 days",
      "duration_days": 7,
      "price": 0.00,
      "currency_code": "SAR",
      "is_active": 1,
      "features": [
        {
          "package_feature_id": 1,
          "feature_id": 1,
          "feature_name": "عدد المستخدمين",
          "feature_value": "1",
          "feature_unit": "مستخدم",
          "is_included": 1
        }
      ]
    }
  ]
}
```

---

### 2.2 Get Package by ID
**GET** `/api/packages/:id`

جلب باقة محددة مع ميزاتها.

**Example:**
```http
GET /api/packages/101
Authorization: Bearer ADMIN_TOKEN
```

---

### 2.3 Create Package
**POST** `/api/packages`

إنشاء باقة جديدة.

**Body (JSON):**
```json
{
  "name_ar": "الباقة الأساسية",
  "name_en": "Basic Package",
  "secondary_name_ar": "للاستخدام الفردي",
  "secondary_name_en": "For individual use",
  "duration_days": 30,
  "price": 50.00,
  "currency_code": "SAR",
  "is_active": true
}
```

**Body (form-data):**
```
name_ar: الباقة الأساسية
name_en: Basic Package
secondary_name_ar: للاستخدام الفردي
secondary_name_en: For individual use
duration_days: 30
price: 50.00
currency_code: SAR
is_active: true
```

**Required Fields:**
- ✅ `name_ar`
- ✅ `duration_days` (must be > 0)
- ✅ `price` (must be >= 0)

**Optional Fields:**
- `name_en`
- `secondary_name_ar`
- `secondary_name_en`
- `currency_code` (ISO 4217 code: SAR, USD, EGP, etc.)
- `is_active` (default: true)

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الباقة بنجاح",
  "data": {
    "id": 106,
    "name_ar": "الباقة الأساسية",
    "duration_days": 30,
    "price": 50.00,
    "is_active": 1
  }
}
```

---

### 2.4 Update Package
**PUT** `/api/packages/:id`

تحديث باقة موجودة.

**Body:**
```json
{
  "price": 45.00,
  "currency_code": "USD",
  "is_active": false
}
```

---

### 2.5 Toggle Package Status
**PATCH** `/api/packages/:id/toggle-status`

تفعيل/إلغاء تفعيل باقة.

---

### 2.6 Delete Package
**DELETE** `/api/packages/:id`

حذف باقة.

**⚠️ تحذير:**
- لا يمكن حذف باقة مستخدمة في اشتراكات
- سيتم حذف جميع ميزات الباقة تلقائياً (CASCADE)

---

# 3️⃣ Package Features APIs (إدارة ميزات الباقات)

## Base Path: `/api/package-features`

### 3.1 Get Package Features
**GET** `/api/package-features/package/:packageId`

جلب جميع ميزات باقة محددة.

**Example:**
```http
GET /api/package-features/package/101
Authorization: Bearer ADMIN_TOKEN
```

**Response:**
```json
{
  "success": true,
  "package": {
    "id": 101,
    "name": "الباقة التجريبية"
  },
  "count": 7,
  "data": [
    {
      "id": 1,
      "package_id": 101,
      "feature_id": 1,
      "feature_name": "عدد المستخدمين",
      "feature_value": "1",
      "feature_unit": "مستخدم",
      "is_included": 1
    }
  ]
}
```

---

### 3.2 Get Feature Packages
**GET** `/api/package-features/feature/:featureId`

جلب جميع الباقات التي تحتوي على ميزة محددة.

**Example:**
```http
GET /api/package-features/feature/4
Authorization: Bearer ADMIN_TOKEN
```

---

### 3.3 Add Feature to Package
**POST** `/api/package-features`

إضافة ميزة لباقة.

**Body (JSON):**
```json
{
  "package_id": 101,
  "feature_id": 4,
  "feature_value": "2",
  "is_included": true
}
```

**Body (form-data):**
```
package_id: 101
feature_id: 4
feature_value: 2
is_included: true
```

**Required Fields:**
- ✅ `package_id`
- ✅ `feature_id`
- ✅ `feature_value`

**Optional Fields:**
- `is_included` (default: true)

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة الميزة للباقة بنجاح",
  "data": {
    "id": 50,
    "package_id": 101,
    "feature_id": 4,
    "feature_value": "2",
    "is_included": 1,
    "feature_name_ar": "عدد مساعدي الطبيب",
    "package_name_ar": "الباقة التجريبية"
  }
}
```

---

### 3.4 Bulk Add Features
**POST** `/api/package-features/bulk`

إضافة عدة ميزات لباقة دفعة واحدة.

**Body (JSON):**
```json
{
  "package_id": 101,
  "features": [
    {
      "feature_id": 1,
      "feature_value": "1",
      "is_included": true
    },
    {
      "feature_id": 2,
      "feature_value": "10",
      "is_included": true
    },
    {
      "feature_id": 4,
      "feature_value": "0",
      "is_included": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة 3 ميزة بنجاح",
  "added_count": 3,
  "errors_count": 0,
  "added": [
    { "feature_id": 1, "feature_value": "1" },
    { "feature_id": 2, "feature_value": "10" },
    { "feature_id": 4, "feature_value": "0" }
  ],
  "errors": []
}
```

---

### 3.5 Update Package Feature
**PUT** `/api/package-features/:id`

تحديث ميزة في باقة.

**Body:**
```json
{
  "feature_value": "5",
  "is_included": true
}
```

---

### 3.6 Delete Package Feature
**DELETE** `/api/package-features/:id`

حذف ميزة من باقة.

**Example:**
```http
DELETE /api/package-features/50
Authorization: Bearer ADMIN_TOKEN
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: إنشاء باقة كاملة مع ميزاتها

```
1. POST /api/features
   → أنشئ الميزات المطلوبة

2. POST /api/packages
   → أنشئ الباقة

3. POST /api/package-features/bulk
   → أضف جميع الميزات للباقة دفعة واحدة

4. GET /api/packages/106?include_features=true
   → تحقق من الباقة وميزاتها
```

---

### Scenario 2: تعديل ميزات باقة موجودة

```
1. GET /api/package-features/package/101
   → اعرض ميزات الباقة الحالية

2. PUT /api/package-features/1
   Body: { "feature_value": "2" }
   → عدل قيمة ميزة

3. POST /api/package-features
   → أضف ميزة جديدة للباقة

4. DELETE /api/package-features/5
   → احذف ميزة من الباقة
```

---

### Scenario 3: إدارة حالة الباقات والميزات

```
1. PATCH /api/packages/101/toggle-status
   → أوقف الباقة مؤقتاً

2. PATCH /api/features/4/toggle-status
   → أوقف ميزة معينة

3. GET /api/packages?is_active=true
   → اعرض الباقات النشطة فقط
```

---

## 📊 Feature Values Examples | أمثلة قيم الميزات

| الميزة | القيمة | المعنى |
|--------|--------|---------|
| عدد المساعدين | `"5"` | 5 مساعدين |
| عدد المساعدين | `"غير محدود"` | عدد غير محدود |
| التخزين السحابي | `"50"` | 50 جيجابايت |
| الإعلانات | `"نعم"` | متاح |
| الإعلانات | `"لا"` | غير متاح |
| الظهور الأولي | `"نعم"` | مفعل |
| عدد الفروع | `"3"` | 3 فروع |

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "اسم الباقة والمدة والسعر مطلوبة"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "الباقة غير موجودة"
}
```

### 400 Conflict:
```json
{
  "success": false,
  "message": "لا يمكن حذف الباقة لأنها مستخدمة في اشتراكات",
  "subscriptions_count": 15
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Unique Constraints:**
   - اسم الميزة بالعربية (`name_ar`) يجب أن يكون فريد
   - كل باقة يمكن أن تحتوي على كل ميزة مرة واحدة فقط

2. **Cascade Delete:**
   - حذف باقة يحذف جميع ميزاتها تلقائياً
   - حذف ميزة أو باقة مستخدمة في اشتراكات ممنوع

3. **Type Conversion:**
   - جميع القيم من form-data يتم تحويلها تلقائياً
   - `duration_days` → integer
   - `price` → decimal
   - `is_active` → boolean

4. **Multi-language Support:**
   - استخدم `Accept-Language: ar` للعربية
   - استخدم `Accept-Language: en` للإنجليزية

---

## 🚀 Quick Start

### 1. الحصول على Admin Token:
```bash
POST /api/auth-admin/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. إنشاء ميزة:
```bash
POST /api/features
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "عدد المساعدين",
  "name_en": "Max Assistants",
  "unit_ar": "مساعد"
}
```

### 3. إنشاء باقة:
```bash
POST /api/packages
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "الباقة الأساسية",
  "duration_days": 30,
  "price": 50.00,
  "currency_code": "SAR"
}
```

### 4. إضافة ميزات للباقة:
```bash
POST /api/package-features/bulk
Authorization: Bearer ADMIN_TOKEN
{
  "package_id": 106,
  "features": [
    { "feature_id": 1, "feature_value": "1" },
    { "feature_id": 4, "feature_value": "2" }
  ]
}
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controllers:
- `controllers/featuresController.js`
- `controllers/packagesController.js`
- `controllers/packageFeaturesController.js`

### Routes:
- `routes/featuresRoutes.js`
- `routes/packagesRoutes.js`
- `routes/packageFeaturesRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `features`
- جدول `packages`
- جدول `package_features`

---

<div align="center">

**📦 Subscription Management API - Complete! 📦**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

# 📍 Addresses API Documentation
# توثيق API العناوين

> **تاريخ الإنشاء:** 23 نوفمبر 2025  
> **الإصدار:** 1.0.0

---

## 📋 نظرة عامة | Overview

نظام إدارة العناوين الكامل يدعم:
- ✅ إدارة عناوين المستخدمين (Users, Doctors, Admins, Assistants)
- ✅ نظام هرمي للمواقع (Country > City > Region > District)
- ✅ دعم متعدد اللغات (عربي/إنجليزي)
- ✅ عناوين متعددة لكل مستخدم
- ✅ تحديد عنوان رئيسي

---

## 🗂️ هيكل قاعدة البيانات | Database Structure

### 1. جدول `countries_cities`
```sql
- countries_cities_id (PK)
- name_ar
- name_en
- parent_id (FK - self reference)
- level_type (country, city, region, district)
- created_at
- updated_at
```

### 2. جدول `addresses`
```sql
- id (PK)
- address_line1
- address_line2
- postal_code
- countries_cities_id (FK)
- latitude
- longitude
- type (home, work, billing, shipping, other)
- is_primary
- created_at
- updated_at
```

### 3. جدول `addressable` (Polymorphic)
```sql
- address_id (FK)
- addressable_type (User, Doctor, Admin, Assistant)
- addressable_id
- creator_id (ID للمستخدم الذي أضاف العنوان)
- creator_type (نوع المستخدم الذي أضاف العنوان)
```

---

## 🔐 المصادقة | Authentication

جميع endpoints تتطلب JWT Token:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 👤 نظام تتبع منشئ العنوان | Creator Tracking System

### ما هو Creator Tracking؟
عند إضافة أي عنوان جديد، يتم تسجيل معلومات المستخدم الذي قام بإضافة العنوان تلقائياً في جدول `addressable`:

- **`creator_id`**: معرف المستخدم الذي أضاف العنوان
- **`creator_type`**: نوع المستخدم (User, Doctor, Admin, Assistant)

### الفائدة من هذا النظام:
1. **التدقيق والمراجعة**: معرفة من قام بإضافة كل عنوان
2. **الأمان**: تتبع العمليات لأغراض أمنية
3. **التقارير**: إمكانية إنشاء تقارير عن من أضاف العناوين

### مثال عملي:
```json
{
  "id": 1,
  "address_line1": "123 شارع الملك فيصل",
  "addressable_type": "User",
  "addressable_id": 5,
  "creator_id": 5,
  "creator_type": "User"
}
```

في هذا المثال:
- العنوان مرتبط بالمستخدم رقم 5 (`addressable_id`)
- المستخدم رقم 5 هو من أضاف العنوان لنفسه (`creator_id`)

---

## 📡 APIs المتوفرة | Available APIs

### 🏠 Address APIs

#### 1. Get All User Addresses
```http
GET /api/addresses
Authorization: Bearer TOKEN
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "address_line1": "123 شارع الملك فيصل",
      "address_line2": "الدور الثالث",
      "postal_code": "12345",
      "countries_cities_id": 100,
      "latitude": 24.7136,
      "longitude": 46.6753,
      "type": "home",
      "is_primary": 1,
      "location_name": "الرياض",
      "location_type": "city",
      "creator_id": 1,
      "creator_type": "User"
    }
  ]
}
```

---

#### 2. Get Primary Address
```http
GET /api/addresses/primary
Authorization: Bearer TOKEN
```

---

#### 3. Get Address by ID
```http
GET /api/addresses/:id
Authorization: Bearer TOKEN
```

---

#### 4. Create New Address
```http
POST /api/addresses
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "address_line1": "123 شارع الملك فيصل",
  "address_line2": "الدور الثالث",
  "postal_code": "12345",
  "countries_cities_id": 100,
  "latitude": 24.7136,
  "longitude": 46.6753,
  "type": "home",
  "is_primary": true
}
```

**Required Fields:**
- `address_line1` ✅

**Optional Fields:**
- `address_line2`
- `postal_code`
- `countries_cities_id`
- `latitude`
- `longitude`
- `type` (default: home)
- `is_primary` (default: false)

---

#### 5. Update Address
```http
PUT /api/addresses/:id
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "address_line1": "456 شارع العليا",
  "is_primary": true
}
```

**All fields are optional**

---

#### 6. Set Address as Primary
```http
PATCH /api/addresses/:id/set-primary
Authorization: Bearer TOKEN
```

---

#### 7. Delete Address
```http
DELETE /api/addresses/:id
Authorization: Bearer TOKEN
```

---

### 🌍 Countries & Cities APIs

#### 1. Get All Locations
```http
GET /api/countries-cities
Query Params:
  - level_type: country|city|region|district (optional)
  - parent_id: number (optional)
  - lang: ar|en (optional, default: ar)
```

---

#### 2. Get All Countries
```http
GET /api/countries-cities/countries?lang=ar
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "countries_cities_id": 1,
      "name_ar": "المملكة العربية السعودية",
      "name_en": "Saudi Arabia",
      "name": "المملكة العربية السعودية",
      "level_type": "country"
    }
  ]
}
```

---

#### 3. Get Cities by Country
```http
GET /api/countries-cities/cities/:country_id?lang=ar
```

---

#### 4. Get Regions by City
```http
GET /api/countries-cities/regions/:city_id?lang=ar
```

---

#### 5. Get Districts by Region
```http
GET /api/countries-cities/districts/:region_id?lang=ar
```

---

#### 6. Get Full Hierarchy
```http
GET /api/countries-cities/hierarchy/:id?lang=ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "full_hierarchy": [
      {
        "countries_cities_id": 1,
        "name": "السعودية",
        "level_type": "country"
      },
      {
        "countries_cities_id": 10,
        "name": "الرياض",
        "level_type": "city"
      },
      {
        "countries_cities_id": 100,
        "name": "العليا",
        "level_type": "region"
      }
    ],
    "country": {...},
    "city": {...},
    "region": {...},
    "district": null
  }
}
```

---

#### 7. Search Locations
```http
GET /api/countries-cities/search?q=الرياض&lang=ar
```

---

#### 8. Get Location by ID
```http
GET /api/countries-cities/:id?lang=ar
```

---

### 🔒 Admin-Only APIs

#### 9. Create Location (Admin Only)
```http
POST /api/countries-cities
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name_ar": "الرياض",
  "name_en": "Riyadh",
  "level_type": "city",
  "parent_id": 1
}
```

**Required Fields:**
- `name_ar` ✅
- `name_en` ✅
- `level_type` ✅ (country, city, region, district)
- `parent_id` (required for city/region/district)

---

#### 10. Update Location (Admin Only)
```http
PUT /api/countries-cities/:id
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "name_ar": "الرياض المحدثة",
  "name_en": "Riyadh Updated"
}
```

---

#### 11. Delete Location (Admin Only)
```http
DELETE /api/countries-cities/:id
Authorization: Bearer ADMIN_TOKEN
```

⚠️ **تحذير:** الحذف سيحذف جميع المواقع الفرعية (Cascade Delete)

---

## 🎯 Use Cases | حالات الاستخدام

### 1. إنشاء عنوان جديد للمستخدم
```javascript
// 1. Get countries
GET /api/countries-cities/countries

// 2. Get cities in selected country
GET /api/countries-cities/cities/1

// 3. Get regions in selected city
GET /api/countries-cities/regions/10

// 4. Get districts in selected region
GET /api/countries-cities/districts/100

// 5. Create address
POST /api/addresses
{
  "address_line1": "123 شارع الملك فيصل",
  "countries_cities_id": 1000,
  "type": "home",
  "is_primary": true
}
```

---

### 2. تغيير العنوان الرئيسي
```javascript
// Set address 5 as primary
PATCH /api/addresses/5/set-primary
```

---

### 3. البحث عن موقع
```javascript
// Search for "الرياض"
GET /api/countries-cities/search?q=الرياض&lang=ar
```

---

## 📝 ملاحظات مهمة | Important Notes

### ✅ العناوين:
- كل مستخدم يمكن أن يكون لديه عناوين متعددة
- عنوان رئيسي واحد فقط لكل مستخدم
- عند تعيين عنوان كرئيسي، يتم إلغاء العنوان الرئيسي السابق تلقائياً
- يتم تسجيل `creator_id` و `creator_type` تلقائياً عند إضافة عنوان جديد
- `creator_id`: معرف المستخدم الذي قام بإضافة العنوان
- `creator_type`: نوع المستخدم (User, Doctor, Admin, Assistant)

### ✅ المواقع:
- نظام هرمي: Country > City > Region > District
- الدول ليس لها parent_id
- المدن/المناطق/الأحياء يجب أن يكون لها parent_id
- الحذف cascade (يحذف جميع الفروع)

### ✅ اللغات:
- دعم العربية والإنجليزية
- استخدم `Accept-Language: ar` أو `en`
- افتراضياً: العربية

---

## 🔗 الملفات ذات الصلة | Related Files

- **Routes:** `routes/addressRoutes.js`, `routes/countriesCitiesRoutes.js`
- **Controllers:** `controllers/addressController.js`, `controllers/countriesCitiesController.js`
- **SQL:** `New-Sql-Update(11-23-2025).sql`

---

## 🚀 البدء السريع | Quick Start

### 1. تشغيل SQL:
```sql
-- Run the SQL file to create tables
source New-Sql-Update(11-23-2025).sql
```

### 2. إضافة بيانات تجريبية:
```sql
-- Add Saudi Arabia
INSERT INTO countries_cities (name_ar, name_en, level_type) 
VALUES ('المملكة العربية السعودية', 'Saudi Arabia', 'country');

-- Add Riyadh
INSERT INTO countries_cities (name_ar, name_en, level_type, parent_id) 
VALUES ('الرياض', 'Riyadh', 'city', 1);

-- Add Al Olaya
INSERT INTO countries_cities (name_ar, name_en, level_type, parent_id) 
VALUES ('العليا', 'Al Olaya', 'region', 2);
```

### 3. اختبار APIs:
```bash
# Get countries
curl http://localhost:3006/api/countries-cities/countries

# Create address (requires auth)
curl -X POST http://localhost:3006/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"address_line1": "123 شارع الملك فيصل", "type": "home"}'
```

---

<div align="center">

**📍 Address Management System - Complete & Ready! 📍**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 23 نوفمبر 2025

</div>

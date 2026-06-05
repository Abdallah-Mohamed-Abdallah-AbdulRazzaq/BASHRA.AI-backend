# 🏥 Clinics API Documentation
# توثيق APIs العيادات

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/clinics`

---

## 📋 نظرة عامة | Overview

نظام إدارة العيادات للأطباء يسمح بـ:
- إضافة عيادات متعددة
- تحديد فرع رئيسي
- إدارة حالة العيادة (نشطة، غير نشطة، تحت الصيانة)
- ربط العيادة بموقع جغرافي

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `clinics`:

```sql
CREATE TABLE `clinics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `address_line_1` varchar(255) NOT NULL,
  `region_id` int DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `is_main_branch` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive','under_maintenance') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`region_id`) REFERENCES `countries_cities` (`countries_cities_id`)
);
```

### الحقول:
- **id**: معرف العيادة
- **doctor_id**: معرف الطبيب (من جدول doctors)
- **name**: اسم العيادة
- **address_line_1**: العنوان (مطلوب)
- **region_id**: المنطقة (من جدول countries_cities)
- **latitude/longitude**: الإحداثيات الجغرافية
- **phone_number**: رقم الهاتف
- **is_main_branch**: هل هو الفرع الرئيسي؟
- **status**: حالة العيادة (active, inactive, under_maintenance)

---

## 🔐 المصادقة | Authentication

جميع الـ APIs تحتاج:
- ✅ JWT Token في Header
- ✅ Doctor Role فقط

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

### 1️⃣ Get All Clinics
**GET** `/api/clinics`

جلب جميع عيادات الطبيب المسجل.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
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
      "doctor_id": 5,
      "name": "عيادة الرياض الطبية",
      "address_line_1": "شارع الملك فهد، الرياض",
      "region_id": 100,
      "latitude": 24.7136,
      "longitude": 46.6753,
      "phone_number": "+966501234567",
      "is_main_branch": 1,
      "status": "active",
      "region_name": "الرياض",
      "created_at": "2025-11-24T00:00:00.000Z"
    }
  ]
}
```

---

### 2️⃣ Get Main Clinic
**GET** `/api/clinics/main`

جلب الفرع الرئيسي للطبيب.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "عيادة الرياض الطبية",
    "is_main_branch": 1,
    "status": "active"
  }
}
```

---

### 3️⃣ Get Clinic by ID
**GET** `/api/clinics/:id`

جلب عيادة محددة.

**Example:**
```http
GET /api/clinics/1
Authorization: Bearer YOUR_TOKEN
```

---

### 4️⃣ Create Clinic
**POST** `/api/clinics`

إنشاء عيادة جديدة.

**Body (JSON):**
```json
{
  "name": "عيادة الرياض الطبية",
  "address_line_1": "شارع الملك فهد، الرياض",
  "region_id": 100,
  "latitude": 24.7136,
  "longitude": 46.6753,
  "phone_number": "+966501234567",
  "is_main_branch": true,
  "status": "active"
}
```

**Body (form-data):**
```
name: عيادة الرياض الطبية
address_line_1: شارع الملك فهد، الرياض
region_id: 100
latitude: 24.7136
longitude: 46.6753
phone_number: +966501234567
is_main_branch: true
status: active
```

**Required Fields:**
- ✅ `name`
- ✅ `address_line_1`

**Optional Fields:**
- `region_id` (integer)
- `latitude` (decimal)
- `longitude` (decimal)
- `phone_number` (string)
- `is_main_branch` (boolean, default: false)
- `status` (enum: active, inactive, under_maintenance, default: active)

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء العيادة بنجاح",
  "data": {
    "id": 1,
    "name": "عيادة الرياض الطبية",
    "address_line_1": "شارع الملك فهد، الرياض",
    "is_main_branch": 1,
    "status": "active"
  }
}
```

---

### 5️⃣ Update Clinic
**PUT** `/api/clinics/:id`

تحديث بيانات العيادة.

**Body:**
```json
{
  "name": "عيادة الرياض الطبية المحدثة",
  "phone_number": "+966509876543",
  "status": "inactive"
}
```

**Note:** جميع الحقول Optional

---

### 6️⃣ Set Main Clinic
**PATCH** `/api/clinics/:id/set-main`

تعيين عيادة كفرع رئيسي.

**Example:**
```http
PATCH /api/clinics/2/set-main
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم تعيين العيادة كفرع رئيسي بنجاح"
}
```

**Note:** سيتم إلغاء الفرع الرئيسي السابق تلقائياً.

---

### 7️⃣ Delete Clinic
**DELETE** `/api/clinics/:id`

حذف عيادة.

**Example:**
```http
DELETE /api/clinics/3
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف العيادة بنجاح"
}
```

**⚠️ تحذير:**
- لا يمكن حذف الفرع الرئيسي إذا كان هناك فروع أخرى
- يجب تعيين فرع آخر كرئيسي أولاً

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: إضافة عيادة جديدة

```
1. POST /api/clinics
   → أنشئ العيادة الأولى (ستكون رئيسية تلقائياً)

2. POST /api/clinics
   → أنشئ عيادة ثانية (فرع)

3. GET /api/clinics
   → اعرض جميع العيادات
```

---

### Scenario 2: تغيير الفرع الرئيسي

```
1. GET /api/clinics
   → اعرض جميع العيادات

2. PATCH /api/clinics/2/set-main
   → اجعل العيادة رقم 2 رئيسية

3. GET /api/clinics/main
   → تحقق من الفرع الرئيسي الجديد
```

---

### Scenario 3: إدارة حالة العيادة

```
1. PUT /api/clinics/1
   Body: { "status": "under_maintenance" }
   → ضع العيادة تحت الصيانة

2. PUT /api/clinics/1
   Body: { "status": "active" }
   → أعد تفعيل العيادة
```

---

## 📊 Status Values | قيم الحالة

| Status | الوصف | الاستخدام |
|--------|-------|----------|
| `active` | نشطة | العيادة تعمل بشكل طبيعي |
| `inactive` | غير نشطة | العيادة مغلقة مؤقتاً |
| `under_maintenance` | تحت الصيانة | العيادة قيد التجديد |

---

## 🔍 Query Parameters

### Language Support:
```http
GET /api/clinics
Accept-Language: ar    # للعربية
Accept-Language: en    # للإنجليزية
```

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "اسم العيادة والعنوان مطلوبان"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "العيادة غير موجودة أو ليس لديك صلاحية للوصول إليها"
}
```

### 500 Server Error:
```json
{
  "success": false,
  "message": "خطأ في إنشاء العيادة",
  "error": "Error details..."
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:
1. **فرع رئيسي واحد فقط:**
   - كل طبيب له فرع رئيسي واحد فقط
   - عند تعيين فرع جديد كرئيسي، يتم إلغاء السابق تلقائياً

2. **حذف الفرع الرئيسي:**
   - لا يمكن حذف الفرع الرئيسي إذا كان هناك فروع أخرى
   - يجب تعيين فرع آخر كرئيسي أولاً

3. **الحقول المطلوبة:**
   - `name` و `address_line_1` فقط مطلوبان عند الإنشاء
   - باقي الحقول اختيارية

4. **الربط الجغرافي:**
   - `region_id` يربط العيادة بمنطقة من جدول `countries_cities`
   - يمكن استخدام `/api/countries-cities` للحصول على المناطق

---

## 🚀 Quick Start

### 1. الحصول على Token:
```bash
POST /api/auth-doctor/login
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

### 2. إنشاء عيادة:
```bash
POST /api/clinics
Authorization: Bearer YOUR_TOKEN
{
  "name": "عيادتي الطبية",
  "address_line_1": "شارع الملك فهد"
}
```

### 3. عرض العيادات:
```bash
GET /api/clinics
Authorization: Bearer YOUR_TOKEN
```

---

## 📁 الملفات ذات الصلة | Related Files

- **Controller:** `controllers/clinicsController.js`
- **Routes:** `routes/clinicsRoutes.js`
- **Main Routes:** `routes/index.js`
- **Database:** جدول `clinics`

---

<div align="center">

**🏥 Clinics API - Complete! 🏥**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

# 🏥 Clinics Images API Documentation
# توثيق APIs صور العيادات

> **تاريخ الإنشاء:** 15 ديسمبر 2025  
> **آخر تحديث:** 15 ديسمبر 2025

---

## 📋 نظرة عامة | Overview

نظام إدارة صور العيادات يسمح بـ:
- رفع صور متعددة للعيادة (حتى 10 صور في المرة الواحدة)
- تعيين صورة رئيسية (Cover Image)
- ترتيب الصور حسب الأولوية
- حذف الصور
- عرض الصور للمستخدمين والزوار

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `clinic_images`:

```sql
CREATE TABLE `clinic_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clinic_id` int NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_main` tinyint(1) DEFAULT '0' COMMENT '1 for main cover image, 0 for gallery',
  `sort_order` int DEFAULT '0' COMMENT 'To arrange images order',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clinic_images_clinic_id` (`clinic_id`),
  CONSTRAINT `fk_clinic_images_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
);
```

### الحقول:
- **id**: معرف الصورة
- **clinic_id**: معرف العيادة (Foreign Key)
- **image_path**: مسار الصورة على السيرفر
- **is_main**: هل هي الصورة الرئيسية؟ (0 أو 1)
- **sort_order**: ترتيب الصورة في المعرض
- **created_at**: تاريخ الإنشاء

---

## 📁 مسار حفظ الصور | Image Storage Path

```
upload/files/clinic-images/
```

**تنسيق اسم الملف:**
```
clinic_{clinic_id}_{uuid}_{timestamp}.{extension}
```

**مثال:**
```
clinic_5_a1b2c3d4-e5f6-7890-abcd-ef1234567890_1702641234567.jpg
```

---

## 🔐 أنواع الـ APIs | API Types

### 1. Doctor APIs (تحتاج Doctor Token)
- إدارة صور العيادات الخاصة بالطبيب

### 2. Public APIs (لا تحتاج Token)
- عرض العيادات والصور للزوار

### 3. User APIs (تحتاج User Token)
- عرض العيادات مع ميزات إضافية للمستخدمين المسجلين

---

## 📡 Doctor APIs (إدارة الصور)

### Base Path: `/api/clinics`

---

### 1️⃣ Get Clinic Images
**GET** `/api/clinics/:id/images`

جلب جميع صور العيادة.

**Headers:**
```
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
      "clinic_id": 5,
      "image_path": "/upload/files/clinic-images/clinic_5_xxx.jpg",
      "image_url": "http://localhost:3006/upload/files/clinic-images/clinic_5_xxx.jpg",
      "is_main": 1,
      "sort_order": 1,
      "created_at": "2025-12-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "clinic_id": 5,
      "image_path": "/upload/files/clinic-images/clinic_5_yyy.jpg",
      "image_url": "http://localhost:3006/upload/files/clinic-images/clinic_5_yyy.jpg",
      "is_main": 0,
      "sort_order": 2,
      "created_at": "2025-12-15T10:01:00.000Z"
    }
  ]
}
```

---

### 2️⃣ Upload Clinic Images
**POST** `/api/clinics/:id/images`

رفع صور للعيادة (حتى 10 صور).

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
Content-Type: multipart/form-data
```

**Body (form-data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| images | File[] | ✅ | الصور (max 10 files, 5MB each) |
| is_main | boolean | ❌ | تعيين أول صورة كرئيسية |

**Supported Formats:** JPEG, PNG, JPG, WebP, GIF

**Response:**
```json
{
  "success": true,
  "message": "تم رفع 3 صورة بنجاح",
  "count": 3,
  "data": [
    {
      "id": 1,
      "clinic_id": 5,
      "image_path": "/upload/files/clinic-images/clinic_5_xxx.jpg",
      "image_url": "http://localhost:3006/upload/files/clinic-images/clinic_5_xxx.jpg",
      "is_main": 1,
      "sort_order": 1
    }
  ]
}
```

---

### 3️⃣ Set Main Image
**PATCH** `/api/clinics/:clinicId/images/:imageId/set-main`

تعيين صورة كصورة رئيسية.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم تعيين الصورة كصورة رئيسية بنجاح"
}
```

---

### 4️⃣ Update Image Order
**PATCH** `/api/clinics/:clinicId/images/:imageId/order`

تحديث ترتيب صورة واحدة.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Body:**
```json
{
  "sort_order": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث ترتيب الصورة بنجاح"
}
```

---

### 5️⃣ Bulk Reorder Images
**PUT** `/api/clinics/:id/images/reorder`

إعادة ترتيب جميع الصور دفعة واحدة.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Body:**
```json
{
  "image_orders": [
    { "id": 1, "sort_order": 3 },
    { "id": 2, "sort_order": 1 },
    { "id": 3, "sort_order": 2 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث ترتيب الصور بنجاح"
}
```

---

### 6️⃣ Delete Clinic Image
**DELETE** `/api/clinics/:clinicId/images/:imageId`

حذف صورة من العيادة.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف الصورة بنجاح"
}
```

**ملاحظة:** إذا كانت الصورة المحذوفة هي الرئيسية، سيتم تعيين صورة أخرى كرئيسية تلقائياً.

---

## 📡 Public APIs (بدون مصادقة)

### Base Path: `/api/public/clinics`

---

### 1️⃣ Get All Public Clinics
**GET** `/api/public/clinics`

جلب جميع العيادات النشطة مع الصورة الرئيسية.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| doctor_id | number | - | فلترة حسب الطبيب |
| region_id | number | - | فلترة حسب المنطقة |
| status | string | active | حالة العيادة |
| page | number | 1 | رقم الصفحة |
| limit | number | 20 | عدد النتائج |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "totalPages": 5,
  "data": [
    {
      "id": 1,
      "doctor_id": 5,
      "name": "عيادة الرياض الطبية",
      "address_line_1": "شارع الملك فهد",
      "region_name": "الرياض",
      "doctor_name": "د. أحمد محمد",
      "specialization": "طب الجلدية",
      "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_xxx.jpg",
      "images_count": 5
    }
  ]
}
```

---

### 2️⃣ Get Public Clinic by ID
**GET** `/api/public/clinics/:id`

جلب عيادة واحدة مع جميع الصور.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "عيادة الرياض الطبية",
    "address_line_1": "شارع الملك فهد",
    "doctor_name": "د. أحمد محمد",
    "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_main.jpg",
    "images": [
      {
        "id": 1,
        "image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_main.jpg",
        "is_main": 1,
        "sort_order": 1
      },
      {
        "id": 2,
        "image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_gallery1.jpg",
        "is_main": 0,
        "sort_order": 2
      }
    ]
  }
}
```

---

### 3️⃣ Get Clinics by Doctor
**GET** `/api/public/clinics/doctor/:doctorId`

جلب جميع عيادات طبيب معين.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "الفرع الرئيسي",
      "is_main_branch": 1,
      "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_xxx.jpg",
      "images_count": 5
    },
    {
      "id": 2,
      "name": "فرع جدة",
      "is_main_branch": 0,
      "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_2_xxx.jpg",
      "images_count": 3
    }
  ]
}
```

---

## 📡 User APIs (للمستخدمين المسجلين)

### Base Path: `/api/user/clinics`

---

### 1️⃣ Get User Clinics
**GET** `/api/user/clinics`

جلب العيادات مع ميزات البحث والفلترة.

**Headers:**
```
Authorization: Bearer USER_TOKEN
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| doctor_id | number | فلترة حسب الطبيب |
| region_id | number | فلترة حسب المنطقة |
| search | string | بحث في اسم العيادة/العنوان/الطبيب |
| page | number | رقم الصفحة |
| limit | number | عدد النتائج |

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "totalPages": 5,
  "data": [
    {
      "id": 1,
      "name": "عيادة الرياض الطبية",
      "doctor_name": "د. أحمد محمد",
      "doctor_rating": 4.8,
      "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_xxx.jpg",
      "images_count": 5
    }
  ]
}
```

---

### 2️⃣ Get User Clinic by ID
**GET** `/api/user/clinics/:id`

جلب تفاصيل عيادة مع معلومات إضافية.

**Headers:**
```
Authorization: Bearer USER_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "عيادة الرياض الطبية",
    "doctor_name": "د. أحمد محمد",
    "doctor_rating": 4.8,
    "doctor_bio": "طبيب جلدية متخصص...",
    "main_image_url": "http://localhost:3006/upload/files/clinic-images/clinic_1_xxx.jpg",
    "images": [...]
  }
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: رفع صور لعيادة جديدة

```
1. POST /api/clinics
   → أنشئ العيادة أولاً

2. POST /api/clinics/1/images
   → ارفع الصور (مع is_main=true للصورة الأولى)

3. GET /api/clinics/1/images
   → تحقق من الصور المرفوعة
```

---

### Scenario 2: تغيير الصورة الرئيسية

```
1. GET /api/clinics/1/images
   → اعرض جميع الصور

2. PATCH /api/clinics/1/images/5/set-main
   → اجعل الصورة رقم 5 رئيسية
```

---

### Scenario 3: إعادة ترتيب الصور

```
1. PUT /api/clinics/1/images/reorder
   Body: {
     "image_orders": [
       { "id": 3, "sort_order": 1 },
       { "id": 1, "sort_order": 2 },
       { "id": 2, "sort_order": 3 }
     ]
   }
```

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "لم يتم رفع أي صور"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "العيادة غير موجودة أو ليس لديك صلاحية"
}
```

### 413 File Too Large:
```json
{
  "success": false,
  "message": "حجم الملف كبير جداً"
}
```

---

## 📁 الملفات ذات الصلة | Related Files

- **Controller:** `controllers/clinicsController.js`
- **Routes (Doctor):** `routes/clinicsRoutes.js`
- **Routes (Public):** `routes/publicClinicsRoutes.js`
- **Routes (User):** `routes/userClinicsRoutes.js`
- **Static Config:** `config/staticFilesConfig.js`
- **Upload Middleware:** `middleware/fileUploadMiddleware.js`
- **Database:** جدول `clinic_images`

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:
1. **صورة رئيسية واحدة فقط:**
   - كل عيادة لها صورة رئيسية واحدة فقط
   - عند تعيين صورة جديدة كرئيسية، يتم إلغاء السابقة تلقائياً

2. **حذف الصورة الرئيسية:**
   - عند حذف الصورة الرئيسية، يتم تعيين صورة أخرى كرئيسية تلقائياً

3. **حذف العيادة:**
   - عند حذف العيادة، يتم حذف جميع صورها من القرص وقاعدة البيانات

4. **حدود الرفع:**
   - الحد الأقصى: 10 صور في المرة الواحدة
   - الحد الأقصى لحجم الصورة: 5MB
   - الأنواع المدعومة: JPEG, PNG, JPG, WebP, GIF

5. **الوصول للصور:**
   - الصور متاحة للعامة عبر: `/upload/files/clinic-images/filename.jpg`
   - لا تحتاج مصادقة للوصول للصور

---

<div align="center">

**🏥 Clinics Images API - Complete! 🏥**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 15 ديسمبر 2025

</div>

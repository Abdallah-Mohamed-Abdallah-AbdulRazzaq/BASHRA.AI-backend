# 🧪 Clinics Images API - Test Guide
# دليل اختبار APIs صور العيادات

> **تاريخ الإنشاء:** 15 ديسمبر 2025

---

## 🔧 متطلبات الاختبار | Prerequisites

1. **تشغيل السيرفر:**
```bash
npm start
# أو
node app.js
```

2. **تنفيذ SQL لإنشاء جدول الصور:**
```sql
CREATE TABLE `clinic_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clinic_id` int NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `is_main` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_clinic_images_clinic_id` (`clinic_id`),
  CONSTRAINT `fk_clinic_images_clinic` FOREIGN KEY (`clinic_id`) REFERENCES `clinics` (`id`) ON DELETE CASCADE
);
```

3. **الحصول على Token:**
   - Doctor Token للـ Doctor APIs
   - User Token للـ User APIs

---

## 📋 اختبارات Postman | Postman Tests

### 🔐 Variables
```
BASE_URL: http://localhost:3006
DOCTOR_TOKEN: <your_doctor_jwt_token>
USER_TOKEN: <your_user_jwt_token>
CLINIC_ID: <clinic_id_to_test>
IMAGE_ID: <image_id_after_upload>
```

---

## 🧪 Doctor APIs Tests

### Test 1: Upload Clinic Images
```
Method: POST
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
  Content-Type: multipart/form-data
Body (form-data):
  images: [Select multiple image files]
  is_main: true

Expected Response (201):
{
  "success": true,
  "message": "تم رفع X صورة بنجاح",
  "count": X,
  "data": [...]
}
```

---

### Test 2: Get Clinic Images
```
Method: GET
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}

Expected Response (200):
{
  "success": true,
  "count": X,
  "data": [
    {
      "id": 1,
      "clinic_id": X,
      "image_path": "/upload/files/clinic-images/...",
      "image_url": "http://localhost:3006/upload/files/clinic-images/...",
      "is_main": 1,
      "sort_order": 1
    }
  ]
}
```

---

### Test 3: Set Main Image
```
Method: PATCH
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images/{{IMAGE_ID}}/set-main
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}

Expected Response (200):
{
  "success": true,
  "message": "تم تعيين الصورة كصورة رئيسية بنجاح"
}
```

---

### Test 4: Update Image Order
```
Method: PATCH
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images/{{IMAGE_ID}}/order
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
  Content-Type: application/json
Body:
{
  "sort_order": 5
}

Expected Response (200):
{
  "success": true,
  "message": "تم تحديث ترتيب الصورة بنجاح"
}
```

---

### Test 5: Bulk Reorder Images
```
Method: PUT
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images/reorder
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
  Content-Type: application/json
Body:
{
  "image_orders": [
    { "id": 1, "sort_order": 3 },
    { "id": 2, "sort_order": 1 },
    { "id": 3, "sort_order": 2 }
  ]
}

Expected Response (200):
{
  "success": true,
  "message": "تم تحديث ترتيب الصور بنجاح"
}
```

---

### Test 6: Delete Clinic Image
```
Method: DELETE
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images/{{IMAGE_ID}}
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}

Expected Response (200):
{
  "success": true,
  "message": "تم حذف الصورة بنجاح"
}
```

---

## 🌐 Public APIs Tests

### Test 7: Get All Public Clinics
```
Method: GET
URL: {{BASE_URL}}/api/public/clinics
Query Params (optional):
  doctor_id: 5
  region_id: 100
  page: 1
  limit: 10

Expected Response (200):
{
  "success": true,
  "count": X,
  "total": Y,
  "page": 1,
  "totalPages": Z,
  "data": [
    {
      "id": 1,
      "name": "عيادة الرياض",
      "doctor_name": "د. أحمد",
      "main_image_url": "http://...",
      "images_count": 5
    }
  ]
}
```

---

### Test 8: Get Public Clinic by ID
```
Method: GET
URL: {{BASE_URL}}/api/public/clinics/{{CLINIC_ID}}

Expected Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "name": "عيادة الرياض",
    "main_image_url": "http://...",
    "images": [
      {
        "id": 1,
        "image_url": "http://...",
        "is_main": 1
      }
    ]
  }
}
```

---

### Test 9: Get Clinics by Doctor
```
Method: GET
URL: {{BASE_URL}}/api/public/clinics/doctor/5

Expected Response (200):
{
  "success": true,
  "count": X,
  "data": [...]
}
```

---

## 👤 User APIs Tests

### Test 10: Get User Clinics with Search
```
Method: GET
URL: {{BASE_URL}}/api/user/clinics
Headers:
  Authorization: Bearer {{USER_TOKEN}}
Query Params:
  search: الرياض
  page: 1
  limit: 10

Expected Response (200):
{
  "success": true,
  "count": X,
  "total": Y,
  "data": [
    {
      "doctor_rating": 4.8,
      "main_image_url": "http://..."
    }
  ]
}
```

---

### Test 11: Get User Clinic by ID
```
Method: GET
URL: {{BASE_URL}}/api/user/clinics/{{CLINIC_ID}}
Headers:
  Authorization: Bearer {{USER_TOKEN}}

Expected Response (200):
{
  "success": true,
  "data": {
    "doctor_bio": "...",
    "doctor_rating": 4.8,
    "images": [...]
  }
}
```

---

## ❌ Error Cases Tests

### Test E1: Upload without images
```
Method: POST
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
Body: (empty)

Expected Response (400):
{
  "success": false,
  "message": "لم يتم رفع أي صور"
}
```

---

### Test E2: Access non-existent clinic
```
Method: GET
URL: {{BASE_URL}}/api/clinics/99999/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}

Expected Response (404):
{
  "success": false,
  "message": "العيادة غير موجودة أو ليس لديك صلاحية"
}
```

---

### Test E3: Access another doctor's clinic
```
Method: GET
URL: {{BASE_URL}}/api/clinics/{{OTHER_DOCTOR_CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}

Expected Response (404):
{
  "success": false,
  "message": "العيادة غير موجودة أو ليس لديك صلاحية"
}
```

---

### Test E4: Upload file too large
```
Method: POST
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
Body:
  images: [file > 5MB]

Expected Response (400):
{
  "success": false,
  "message": "حجم الملف كبير جداً"
}
```

---

### Test E5: Invalid file type
```
Method: POST
URL: {{BASE_URL}}/api/clinics/{{CLINIC_ID}}/images
Headers:
  Authorization: Bearer {{DOCTOR_TOKEN}}
Body:
  images: [.pdf or .exe file]

Expected Response (400):
{
  "success": false,
  "message": "نوع الملف غير مدعوم..."
}
```

---

## ✅ Verification Checklist

### After Upload:
- [ ] الصور محفوظة في `upload/files/clinic-images/`
- [ ] السجلات موجودة في جدول `clinic_images`
- [ ] الصورة الأولى معينة كـ main إذا `is_main=true`
- [ ] الـ `sort_order` يتزايد تلقائياً

### After Set Main:
- [ ] الصورة المحددة `is_main = 1`
- [ ] باقي الصور `is_main = 0`

### After Delete:
- [ ] الملف محذوف من القرص
- [ ] السجل محذوف من قاعدة البيانات
- [ ] إذا كانت main، تم تعيين صورة أخرى

### After Delete Clinic:
- [ ] جميع صور العيادة محذوفة من القرص
- [ ] جميع السجلات محذوفة (CASCADE)

---

## 🔗 cURL Commands

### Upload Images:
```bash
curl -X POST "http://localhost:3006/api/clinics/1/images" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "is_main=true"
```

### Get Public Clinics:
```bash
curl -X GET "http://localhost:3006/api/public/clinics?page=1&limit=10"
```

### Set Main Image:
```bash
curl -X PATCH "http://localhost:3006/api/clinics/1/images/5/set-main" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

<div align="center">

**🧪 Testing Guide Complete! 🧪**

</div>

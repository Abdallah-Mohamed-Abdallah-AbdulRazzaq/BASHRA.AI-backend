# 📞 Doctor Contact Details API Documentation
# توثيق APIs معلومات التواصل للأطباء

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/doctor-contact-details`

---

## 📋 نظرة عامة | Overview

نظام إدارة معلومات التواصل للأطباء يسمح للأطباء بإضافة معلومات تواصل إضافية لكي يتمكن الأدمن من التواصل معهم.

### الصلاحيات:
- **Doctor:** يمكنه إدارة معلوماته الخاصة (CRUD)
- **Admin:** يمكنه فقط عرض معلومات جميع الأطباء (Read Only)

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

```sql
CREATE TABLE `doctor_contact_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `whatsapp_number` varchar(20) DEFAULT NULL,
  `additional_phone` varchar(20) DEFAULT NULL,
  `personal_email` varchar(255) DEFAULT NULL,
  `contact_notes` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doctor_details` (`doctor_id`),
  CONSTRAINT `doctor_contact_details_ibfk_1` 
    FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
);
```

### القيود:
- ✅ كل طبيب يمكنه إضافة معلومات تواصل واحدة فقط (`UNIQUE doctor_id`)
- ✅ حذف الطبيب يحذف معلومات التواصل تلقائياً (`CASCADE`)

---

## 🔐 المصادقة | Authentication

### Doctor APIs:
```http
Authorization: Bearer DOCTOR_JWT_TOKEN
```

### Admin APIs:
```http
Authorization: Bearer ADMIN_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Doctor APIs (إدارة المعلومات الخاصة)

## 1.1 Get My Contact Details
**GET** `/api/doctor-contact-details/my-details`

جلب معلومات التواصل الخاصة بالطبيب المسجل دخوله.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "doctor_id": 15,
    "whatsapp_number": "+966501234567",
    "additional_phone": "+966112345678",
    "personal_email": "doctor@personal.com",
    "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً",
    "created_at": "2025-11-24T10:00:00.000Z",
    "updated_at": "2025-11-24T10:00:00.000Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "message": "لم يتم إضافة معلومات التواصل بعد"
}
```

---

## 1.2 Create or Update Contact Details
**POST** `/api/doctor-contact-details`

إنشاء أو تحديث معلومات التواصل.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "whatsapp_number": "+966501234567",
  "additional_phone": "+966112345678",
  "personal_email": "doctor@personal.com",
  "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً"
}
```

**Body (form-data):**
```
whatsapp_number: +966501234567
additional_phone: +966112345678
personal_email: doctor@personal.com
contact_notes: متاح من 9 صباحاً حتى 5 مساءً
```

**Validation:**
- ⚠️ **يجب إدخال وسيلة تواصل واحدة على الأقل**
- ✅ جميع الحقول اختيارية ولكن لا يمكن أن تكون جميعها فارغة
- ✅ يتم التحقق من صحة البريد الإلكتروني

**Response (Created - 201):**
```json
{
  "success": true,
  "message": "تم إضافة معلومات التواصل بنجاح",
  "data": {
    "id": 1,
    "doctor_id": 15,
    "whatsapp_number": "+966501234567",
    "additional_phone": "+966112345678",
    "personal_email": "doctor@personal.com",
    "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً",
    "created_at": "2025-11-24T10:00:00.000Z",
    "updated_at": "2025-11-24T10:00:00.000Z"
  }
}
```

**Response (Updated - 200):**
```json
{
  "success": true,
  "message": "تم تحديث معلومات التواصل بنجاح",
  "data": { ... }
}
```

**Response (Validation Error - 400):**
```json
{
  "success": false,
  "message": "يجب إدخال وسيلة تواصل واحدة على الأقل"
}
```

```json
{
  "success": false,
  "message": "البريد الإلكتروني غير صالح"
}
```

---

## 1.3 Update Contact Details (Partial)
**PUT** `/api/doctor-contact-details`

تحديث جزئي لمعلومات التواصل (يمكن تحديث حقل واحد أو أكثر).

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json
```

**Body (Example - Update only WhatsApp):**
```json
{
  "whatsapp_number": "+966509999999"
}
```

**Body (Example - Update multiple fields):**
```json
{
  "additional_phone": "+966117777777",
  "contact_notes": "متاح طوال اليوم"
}
```

**Note:**
- ✅ جميع الحقول اختيارية
- ✅ يتم تحديث الحقول المرسلة فقط
- ⚠️ يجب أن تكون المعلومات موجودة مسبقاً

**Response (Success):**
```json
{
  "success": true,
  "message": "تم تحديث معلومات التواصل بنجاح",
  "data": { ... }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "لم يتم إضافة معلومات التواصل بعد. استخدم POST لإنشاء معلومات جديدة"
}
```

---

## 1.4 Delete Contact Details
**DELETE** `/api/doctor-contact-details`

حذف معلومات التواصل الخاصة بالطبيب.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Response (Success):**
```json
{
  "success": true,
  "message": "تم حذف معلومات التواصل بنجاح"
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "لا توجد معلومات تواصل لحذفها"
}
```

---

# 2️⃣ Admin APIs (عرض معلومات جميع الأطباء)

## 2.1 Get All Contact Details
**GET** `/api/doctor-contact-details/all`

جلب معلومات التواصل لجميع الأطباء.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Query Parameters:**
- `doctor_id` (optional): تصفية حسب طبيب محدد

**Example:**
```http
GET /api/doctor-contact-details/all
GET /api/doctor-contact-details/all?doctor_id=15
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": 1,
      "doctor_id": 15,
      "whatsapp_number": "+966501234567",
      "additional_phone": "+966112345678",
      "personal_email": "doctor@personal.com",
      "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً",
      "created_at": "2025-11-24T10:00:00.000Z",
      "updated_at": "2025-11-24T10:00:00.000Z",
      "first_name": "أحمد",
      "last_name": "محمد",
      "doctor_email": "doctor@system.com",
      "doctor_phone": "+966501111111",
      "specialization": "طب الأسنان"
    },
    {
      "id": 2,
      "doctor_id": 20,
      "whatsapp_number": "+966502222222",
      "additional_phone": null,
      "personal_email": "dr.sarah@gmail.com",
      "contact_notes": null,
      "created_at": "2025-11-24T11:00:00.000Z",
      "updated_at": "2025-11-24T11:00:00.000Z",
      "first_name": "سارة",
      "last_name": "علي",
      "doctor_email": "sarah@system.com",
      "doctor_phone": "+966502222222",
      "specialization": "طب الأطفال"
    }
  ]
}
```

---

## 2.2 Get Contact Details by Doctor ID
**GET** `/api/doctor-contact-details/doctor/:doctorId`

جلب معلومات التواصل لطبيب محدد.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Example:**
```http
GET /api/doctor-contact-details/doctor/15
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "doctor_id": 15,
    "whatsapp_number": "+966501234567",
    "additional_phone": "+966112345678",
    "personal_email": "doctor@personal.com",
    "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً",
    "created_at": "2025-11-24T10:00:00.000Z",
    "updated_at": "2025-11-24T10:00:00.000Z",
    "first_name": "أحمد",
    "last_name": "محمد",
    "doctor_email": "doctor@system.com",
    "doctor_phone": "+966501111111",
    "specialization": "طب الأسنان"
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "لم يتم العثور على معلومات تواصل لهذا الطبيب"
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: طبيب يضيف معلومات التواصل لأول مرة

```javascript
// 1. Doctor creates contact details
POST /api/doctor-contact-details
Authorization: Bearer DOCTOR_TOKEN
Body: {
  "whatsapp_number": "+966501234567",
  "personal_email": "doctor@gmail.com"
}

// Response: 201 Created
```

---

### Scenario 2: طبيب يحدث رقم الواتساب فقط

```javascript
// 1. Doctor updates WhatsApp number
PUT /api/doctor-contact-details
Authorization: Bearer DOCTOR_TOKEN
Body: {
  "whatsapp_number": "+966509999999"
}

// Response: 200 OK
```

---

### Scenario 3: أدمن يعرض معلومات جميع الأطباء

```javascript
// 1. Admin gets all contact details
GET /api/doctor-contact-details/all
Authorization: Bearer ADMIN_TOKEN

// Response: List of all doctors' contact details
```

---

### Scenario 4: أدمن يبحث عن معلومات طبيب محدد

```javascript
// 1. Admin gets specific doctor's details
GET /api/doctor-contact-details/doctor/15
Authorization: Bearer ADMIN_TOKEN

// Response: Doctor's contact details
```

---

## 📊 Field Descriptions | وصف الحقول

| الحقل | النوع | مطلوب | الوصف |
|------|------|-------|-------|
| `whatsapp_number` | string(20) | اختياري* | رقم الواتساب |
| `additional_phone` | string(20) | اختياري* | رقم هاتف إضافي |
| `personal_email` | string(255) | اختياري* | بريد إلكتروني شخصي |
| `contact_notes` | text | اختياري | ملاحظات التواصل (أوقات التواصل، تفضيلات، إلخ) |

**\* يجب إدخال وسيلة تواصل واحدة على الأقل**

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "يجب إدخال وسيلة تواصل واحدة على الأقل"
}
```

```json
{
  "success": false,
  "message": "البريد الإلكتروني غير صالح"
}
```

```json
{
  "success": false,
  "message": "لا توجد بيانات للتحديث"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "لم يتم إضافة معلومات التواصل بعد"
}
```

```json
{
  "success": false,
  "message": "لم يتم العثور على معلومات تواصل لهذا الطبيب"
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Unique Constraint:**
   - كل طبيب يمكنه إضافة معلومات تواصل واحدة فقط
   - استخدام POST مرة أخرى يقوم بالتحديث (Upsert)

2. **Validation:**
   - يجب إدخال وسيلة تواصل واحدة على الأقل
   - يتم التحقق من صحة البريد الإلكتروني
   - القيم الفارغة يتم تحويلها إلى `null`

3. **Permissions:**
   - Doctor: CRUD على معلوماته فقط
   - Admin: Read Only على جميع المعلومات

4. **Cascade Delete:**
   - حذف الطبيب يحذف معلومات التواصل تلقائياً

5. **POST vs PUT:**
   - `POST`: Create or Update (Upsert) - تحديث كامل
   - `PUT`: Partial Update - تحديث جزئي

---

## 🚀 Quick Start

### 1. Doctor: إضافة معلومات التواصل
```bash
POST http://localhost:3006/api/doctor-contact-details
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json

{
  "whatsapp_number": "+966501234567",
  "personal_email": "doctor@gmail.com",
  "contact_notes": "متاح من 9 صباحاً حتى 5 مساءً"
}
```

### 2. Doctor: عرض معلوماتي
```bash
GET http://localhost:3006/api/doctor-contact-details/my-details
Authorization: Bearer DOCTOR_TOKEN
```

### 3. Doctor: تحديث رقم الواتساب
```bash
PUT http://localhost:3006/api/doctor-contact-details
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json

{
  "whatsapp_number": "+966509999999"
}
```

### 4. Admin: عرض جميع معلومات الأطباء
```bash
GET http://localhost:3006/api/doctor-contact-details/all
Authorization: Bearer ADMIN_TOKEN
```

### 5. Admin: عرض معلومات طبيب محدد
```bash
GET http://localhost:3006/api/doctor-contact-details/doctor/15
Authorization: Bearer ADMIN_TOKEN
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/doctorContactDetailsController.js`

### Routes:
- `routes/doctorContactDetailsRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `doctor_contact_details`

---

## 🔗 Related APIs

### Doctor Profile:
- `GET /api/profile-doctor` - معلومات الملف الشخصي
- `PUT /api/profile-doctor` - تحديث الملف الشخصي

### Clinics:
- `GET /api/clinics` - عيادات الطبيب
- `POST /api/clinics` - إضافة عيادة

---

<div align="center">

**📞 Doctor Contact Details API - Complete! 📞**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

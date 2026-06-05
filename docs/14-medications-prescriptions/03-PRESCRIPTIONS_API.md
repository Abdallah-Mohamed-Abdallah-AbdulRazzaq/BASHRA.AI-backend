# 📝 Prescriptions API Documentation
# توثيق APIs الوصفات الطبية

> **تاريخ الإنشاء:** 25 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/prescriptions`

---

## 📋 نظرة عامة | Overview

نظام الوصفات الطبية يوفر إدارة كاملة للوصفات الطبية الإلكترونية مع دعم الترجمات المتعددة وتتبع حالة الصرف.

### **الميزات الرئيسية:**
- ✅ إنشاء وصفات طبية إلكترونية
- ✅ ربط الوصفة بالسجل الطبي
- ✅ دعم الترجمات (عربي/إنجليزي)
- ✅ تتبع حالة الوصفة (نشطة، تم صرفها، ملغاة، منتهية)
- ✅ إدارة إعادات الصرف (Refills)
- ✅ رقم وصفة فريد لكل وصفة
- ✅ صلاحيات محددة حسب الدور

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `prescriptions`:
```sql
CREATE TABLE `prescriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `medical_record_id` int NOT NULL,
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `prescription_number` varchar(100) DEFAULT NULL,
  `medication_name` varchar(200) NOT NULL,
  `dosage` varchar(100) NOT NULL,
  `frequency` varchar(100) NOT NULL,
  `duration` varchar(100) DEFAULT NULL,
  `quantity` varchar(50) DEFAULT NULL,
  `route_of_administration` varchar(50) DEFAULT NULL,
  `refills_allowed` int DEFAULT '0',
  `refills_used` int DEFAULT '0',
  `is_generic_allowed` tinyint(1) DEFAULT '1',
  `status` enum('active','filled','expired','cancelled','replaced') DEFAULT 'active',
  `prescribed_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `expiry_date` date DEFAULT NULL,
  `filled_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `prescription_number` (`prescription_number`),
  CONSTRAINT `prescriptions_ibfk_1` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prescriptions_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prescriptions_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE
);
```

### جدول `prescription_translations`:
```sql
CREATE TABLE `prescription_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prescription_id` int NOT NULL,
  `language_code` varchar(10) NOT NULL,
  `instructions` text,
  `indication` varchar(200) DEFAULT NULL,
  `pharmacy_notes` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `prescription_id` (`prescription_id`,`language_code`),
  CONSTRAINT `prescription_translations_ibfk_1` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE
);
```

---

## 🔐 المصادقة | Authentication

### **صلاحيات الوصول:**
- ✅ **Doctor:** إنشاء، تحديث، إلغاء الوصفات
- ✅ **Patient:** عرض وصفاته الخاصة فقط
- ✅ **Admin:** عرض جميع الوصفات
- ✅ **Pharmacy:** صرف الوصفات (Fill)

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Get All Prescriptions
**GET** `/api/prescriptions`

جلب الوصفات الطبية (مفلترة حسب دور المستخدم).

**Query Parameters:**
- `patient_id` (optional): filter by patient
- `status` (optional): filter by status (active, filled, expired, cancelled, replaced)
- `medical_record_id` (optional): filter by medical record
- `page` (optional): page number (default: 1)
- `limit` (optional): items per page (default: 20)

**Headers:**
```
Authorization: Bearer TOKEN
Accept-Language: ar
```

**Example Request:**
```http
GET /api/prescriptions?status=active&page=1&limit=10
Authorization: Bearer DOCTOR_TOKEN
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
      "prescription_number": "RX-1732518000000-ABC123XYZ",
      "medical_record_id": 5,
      "patient_id": 10,
      "patient_name": "أحمد محمد",
      "doctor_id": 2,
      "doctor_name": "د. سارة أحمد",
      "medication_name": "أموكسيسيلين 500mg",
      "dosage": "500mg",
      "frequency": "3 مرات يومياً",
      "duration": "7 أيام",
      "quantity": "21 كبسولة",
      "route_of_administration": "فموي",
      "refills_allowed": 0,
      "refills_used": 0,
      "is_generic_allowed": 1,
      "status": "active",
      "prescribed_date": "2025-11-25T10:00:00.000Z",
      "expiry_date": "2025-12-25",
      "filled_date": null,
      "translations": {
        "instructions": "يؤخذ بعد الأكل مع كوب ماء",
        "indication": "التهاب الحلق البكتيري",
        "pharmacy_notes": "تأكد من إكمال الجرعة كاملة"
      },
      "created_at": "2025-11-25T10:00:00.000Z",
      "updated_at": "2025-11-25T10:00:00.000Z"
    }
  ]
}
```

---

# 2️⃣ Get Prescription by ID
**GET** `/api/prescriptions/:id`

جلب وصفة محددة بواسطة ID أو UUID.

**Parameters:**
- `id`: Prescription ID (numeric) or UUID (string)

**Example:**
```http
GET /api/prescriptions/1
GET /api/prescriptions/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "prescription_number": "RX-1732518000000-ABC123XYZ",
    "medical_record_id": 5,
    "patient": {
      "id": 10,
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "phone": "+966501234567"
    },
    "doctor": {
      "id": 2,
      "name": "د. سارة أحمد",
      "email": "dr.sara@example.com"
    },
    "medication_name": "أموكسيسيلين 500mg",
    "dosage": "500mg",
    "frequency": "3 مرات يومياً",
    "duration": "7 أيام",
    "quantity": "21 كبسولة",
    "route_of_administration": "فموي",
    "refills_allowed": 0,
    "refills_used": 0,
    "is_generic_allowed": 1,
    "status": "active",
    "prescribed_date": "2025-11-25T10:00:00.000Z",
    "expiry_date": "2025-12-25",
    "filled_date": null,
    "translations": {
      "ar": {
        "instructions": "يؤخذ بعد الأكل مع كوب ماء",
        "indication": "التهاب الحلق البكتيري",
        "pharmacy_notes": "تأكد من إكمال الجرعة كاملة"
      },
      "en": {
        "instructions": "Take after meals with a glass of water",
        "indication": "Bacterial throat infection",
        "pharmacy_notes": "Ensure complete course"
      }
    },
    "created_at": "2025-11-25T10:00:00.000Z",
    "updated_at": "2025-11-25T10:00:00.000Z"
  }
}
```

---

# 3️⃣ Create Prescription
**POST** `/api/prescriptions`

إنشاء وصفة طبية جديدة (Doctor only).

**Body (JSON):**
```json
{
  "medical_record_id": 5,
  "patient_id": 10,
  "medication_name": "أموكسيسيلين 500mg",
  "dosage": "500mg",
  "frequency": "3 مرات يومياً",
  "duration": "7 أيام",
  "quantity": "21 كبسولة",
  "route_of_administration": "فموي",
  "refills_allowed": 0,
  "is_generic_allowed": true,
  "expiry_date": "2025-12-25",
  "translations": {
    "ar": {
      "instructions": "يؤخذ بعد الأكل مع كوب ماء",
      "indication": "التهاب الحلق البكتيري",
      "pharmacy_notes": "تأكد من إكمال الجرعة كاملة"
    },
    "en": {
      "instructions": "Take after meals with a glass of water",
      "indication": "Bacterial throat infection",
      "pharmacy_notes": "Ensure complete course"
    }
  }
}
```

**Required Fields:**
- ✅ `medical_record_id` (number)
- ✅ `patient_id` (number)
- ✅ `medication_name` (string)
- ✅ `dosage` (string)
- ✅ `frequency` (string)

**Optional Fields:**
- `duration` (string)
- `quantity` (string)
- `route_of_administration` (string)
- `refills_allowed` (number, default: 0)
- `is_generic_allowed` (boolean, default: true)
- `expiry_date` (date)
- `translations` (object)

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الوصفة الطبية بنجاح",
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "prescription_number": "RX-1732518000000-ABC123XYZ",
    "medical_record_id": 5,
    "patient_id": 10,
    "doctor_id": 2,
    "medication_name": "أموكسيسيلين 500mg",
    "status": "active"
  }
}
```

---

# 4️⃣ Update Prescription
**PUT** `/api/prescriptions/:id`

تحديث وصفة طبية (Doctor only).

**Body:**
```json
{
  "dosage": "1000mg",
  "frequency": "مرتين يومياً",
  "duration": "10 أيام",
  "quantity": "20 كبسولة"
}
```

**Note:** 
- جميع الحقول Optional
- لا يمكن تعديل وصفة تم صرفها أو إلغاؤها

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الوصفة الطبية بنجاح",
  "data": {
    "id": 1,
    "dosage": "1000mg",
    "frequency": "مرتين يومياً"
  }
}
```

---

# 5️⃣ Cancel Prescription
**PATCH** `/api/prescriptions/:id/cancel`

إلغاء وصفة طبية (Doctor only).

**Example:**
```http
PATCH /api/prescriptions/1/cancel
Authorization: Bearer DOCTOR_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم إلغاء الوصفة الطبية بنجاح"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "لا يمكن إلغاء وصفة طبية تم صرفها"
}
```

---

# 6️⃣ Fill Prescription
**PATCH** `/api/prescriptions/:id/fill`

صرف الوصفة الطبية (Pharmacy use).

**Example:**
```http
PATCH /api/prescriptions/1/fill
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "تم صرف الوصفة الطبية بنجاح"
}
```

**Error Response (no refills):**
```json
{
  "success": false,
  "message": "لا توجد إعادات صرف متاحة"
}
```

---

# 7️⃣ Add/Update Translation
**POST** `/api/prescriptions/:id/translations`

إضافة أو تحديث ترجمة الوصفة (Doctor only).

**Body:**
```json
{
  "language_code": "en",
  "instructions": "Take after meals with water",
  "indication": "Bacterial infection",
  "pharmacy_notes": "Complete full course"
}
```

**Required Fields:**
- ✅ `language_code` (string: ar, en)

**Optional Fields:**
- `instructions` (text)
- `indication` (text)
- `pharmacy_notes` (text)

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الترجمة بنجاح"
}
```

---

# 8️⃣ Get Prescriptions by Medical Record
**GET** `/api/prescriptions/medical-record/:recordId`

جلب جميع الوصفات لسجل طبي محدد.

**Example:**
```http
GET /api/prescriptions/medical-record/5
Authorization: Bearer TOKEN
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "prescription_number": "RX-1732518000000-ABC123XYZ",
      "medication_name": "أموكسيسيلين 500mg",
      "status": "filled",
      "prescribed_date": "2025-11-25T10:00:00.000Z"
    }
  ]
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: إنشاء وصفة طبية من قالب

```bash
# 1. Get template with medications
GET /api/prescription-templates/1

# 2. Create prescription using template data
POST /api/prescriptions
{
  "medical_record_id": 5,
  "patient_id": 10,
  "medication_name": "هيدروكورتيزون 1%",
  "dosage": "1%",
  "frequency": "مرتين يومياً",
  "duration": "14 يوم",
  "translations": {
    "ar": {
      "instructions": "يطبق على المنطقة المصابة"
    }
  }
}

# 3. Increment template usage
PATCH /api/prescription-templates/1/use
```

---

### Scenario 2: صرف وصفة طبية

```bash
# 1. Get prescription details
GET /api/prescriptions/RX-1732518000000-ABC123XYZ

# 2. Verify prescription is active
# Check: status = 'active', not expired

# 3. Fill prescription
PATCH /api/prescriptions/1/fill

# 4. Verify filled
GET /api/prescriptions/1
# Check: status = 'filled', filled_date is set
```

---

### Scenario 3: إدارة إعادات الصرف

```bash
# Create prescription with refills
POST /api/prescriptions
{
  "medication_name": "دواء مزمن",
  "refills_allowed": 3,
  ...
}

# First fill
PATCH /api/prescriptions/1/fill
# refills_used = 1

# Second fill (refill)
PATCH /api/prescriptions/1/fill
# refills_used = 2

# Check remaining refills
GET /api/prescriptions/1
# refills_allowed = 3, refills_used = 2
# Remaining = 1
```

---

## 📊 Prescription Status Flow

```
active → filled → (refills if allowed)
   ↓
cancelled
   ↓
expired
```

### **Status Descriptions:**

| Status | الوصف | يمكن التعديل | يمكن الصرف |
|--------|-------|-------------|-----------|
| `active` | نشطة - لم يتم صرفها بعد | ✅ | ✅ |
| `filled` | تم صرفها | ❌ | ✅ (إذا توفرت refills) |
| `expired` | منتهية الصلاحية | ❌ | ❌ |
| `cancelled` | ملغاة | ❌ | ❌ |
| `replaced` | تم استبدالها بوصفة جديدة | ❌ | ❌ |

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "medical_record_id, patient_id, medication_name, dosage, frequency مطلوبة"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "الوصفة الطبية غير موجودة"
}
```

```json
{
  "success": false,
  "message": "السجل الطبي غير موجود أو لا ينتمي للمريض"
}
```

### 400 Cannot Edit:
```json
{
  "success": false,
  "message": "لا يمكن تعديل وصفة طبية تم صرفها أو إلغاؤها"
}
```

### 400 No Refills:
```json
{
  "success": false,
  "message": "لا توجد إعادات صرف متاحة"
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Prescription Number:**
   - يتم توليده تلقائياً بصيغة: `RX-{timestamp}-{random}`
   - فريد لكل وصفة

2. **Role-Based Access:**
   - Doctor: يرى وصفاته فقط
   - Patient: يرى وصفاته الشخصية فقط
   - Admin: يرى جميع الوصفات

3. **Medical Record Validation:**
   - يجب أن يكون السجل الطبي موجوداً
   - يجب أن ينتمي السجل للمريض المحدد

4. **Edit Restrictions:**
   - لا يمكن تعديل وصفة تم صرفها
   - لا يمكن تعديل وصفة ملغاة

5. **Refills Management:**
   - `refills_allowed`: عدد مرات الصرف المسموحة
   - `refills_used`: عدد مرات الصرف المستخدمة
   - لا يمكن الصرف إذا: `refills_used >= refills_allowed`

6. **Translations:**
   - اختيارية عند الإنشاء
   - يمكن إضافتها أو تحديثها لاحقاً
   - تدعم عدة لغات (ar, en)

7. **Cascade Delete:**
   - حذف سجل طبي يحذف جميع وصفاته
   - حذف مريض يحذف جميع وصفاته
   - حذف طبيب يحذف جميع وصفاته

---

## 🚀 Quick Start

### 1. إنشاء وصفة بسيطة:
```bash
POST /api/prescriptions
Authorization: Bearer DOCTOR_TOKEN
{
  "medical_record_id": 5,
  "patient_id": 10,
  "medication_name": "باراسيتامول 500mg",
  "dosage": "500mg",
  "frequency": "عند الحاجة",
  "duration": "حسب الحاجة"
}
```

### 2. جلب وصفات مريض:
```bash
GET /api/prescriptions?patient_id=10
Authorization: Bearer DOCTOR_TOKEN
```

### 3. صرف وصفة:
```bash
PATCH /api/prescriptions/1/fill
Authorization: Bearer TOKEN
```

### 4. إضافة ترجمة:
```bash
POST /api/prescriptions/1/translations
Authorization: Bearer DOCTOR_TOKEN
{
  "language_code": "en",
  "instructions": "Take as needed for pain"
}
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/prescriptionsController.js`

### Routes:
- `routes/prescriptionsRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `prescriptions`
- جدول `prescription_translations`

### Related:
- `medical_records` (السجلات الطبية)
- `medications` (دليل الأدوية)
- `prescription_templates` (القوالب)

---

<div align="center">

**📝 Prescriptions API - Complete! 📝**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 25 نوفمبر 2025

</div>

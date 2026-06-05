# 🏥 Patient Profiles API Documentation
# توثيق APIs ملفات المرضى

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/patient-profiles`

---

## 📋 نظرة عامة | Overview

نظام إدارة ملفات المرضى يسمح بـ:
- إنشاء ملف طبي كامل للمريض (User)
- تخزين المعلومات الصحية والطبية
- دعم متعدد اللغات (عربي/إنجليزي)
- ربط المريض بطبيب مفضل
- إدارة بيانات التأمين الصحي

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

### جدول `patient_profiles`:

```sql
CREATE TABLE `patient_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown') DEFAULT 'unknown',
  `height` decimal(5,2) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `smoking_status` enum('never','former','current','unknown') DEFAULT 'unknown',
  `alcohol_consumption` enum('never','rarely','occasionally','regularly','unknown') DEFAULT 'unknown',
  `exercise_frequency` enum('never','rarely','sometimes','regularly','daily','unknown') DEFAULT 'unknown',
  `insurance_provider` varchar(200) DEFAULT NULL,
  `insurance_policy_number` varchar(100) DEFAULT NULL,
  `preferred_doctor_id` int DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`preferred_doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL
);
```

### جدول `patient_profile_translations`:

```sql
CREATE TABLE `patient_profile_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_profile_id` int NOT NULL,
  `language_code` varchar(10) NOT NULL,
  `medical_history` text,
  `current_medications` text,
  `allergies` text,
  `chronic_conditions` text,
  `family_medical_history` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `patient_profile_id` (`patient_profile_id`,`language_code`),
  FOREIGN KEY (`patient_profile_id`) REFERENCES `patient_profiles` (`id`) ON DELETE CASCADE
);
```

---

## 🔐 المصادقة | Authentication

جميع الـ APIs تحتاج:
- ✅ JWT Token في Header
- ✅ User Role فقط (المريض)

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

### 🔹 APIs للمرضى (Users)

### 1️⃣ Create Patient Profile
**POST** `/api/patient-profiles`

إنشاء ملف مريض جديد للمستخدم الحالي.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "blood_type": "A+",
  "height": 175.5,
  "weight": 70.0,
  "smoking_status": "never",
  "alcohol_consumption": "never",
  "exercise_frequency": "regularly",
  "insurance_provider": "شركة التأمين الصحي",
  "insurance_policy_number": "POL123456",
  "preferred_doctor_id": 5,
  "medical_history_ar": "لا يوجد تاريخ طبي سابق",
  "current_medications_ar": "لا يوجد",
  "allergies_ar": "حساسية من البنسلين",
  "chronic_conditions_ar": "لا يوجد",
  "family_medical_history_ar": "والده مصاب بالسكري"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "message": "تم إنشاء ملف المريض بنجاح",
  "data": {
    "id": 1,
    "user_id": 123,
    "blood_type": "A+",
    "height": 175.5,
    "weight": 70.0,
    "smoking_status": "never",
    "medical_history": "لا يوجد تاريخ طبي سابق",
    "allergies": "حساسية من البنسلين"
  }
}
```

---

### 2️⃣ Get Patient Profile
**GET** `/api/patient-profiles`

جلب ملف المريض مع الترجمة حسب اللغة.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar | en
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم جلب ملف المريض بنجاح",
  "data": {
    "id": 1,
    "user_id": 123,
    "blood_type": "A+",
    "height": 175.5,
    "weight": 70.0,
    "medical_history": "لا يوجد تاريخ طبي سابق"
  }
}
```

---

### 3️⃣ Get Complete Patient Profile
**GET** `/api/patient-profiles/complete`

جلب الملف الكامل مع جميع الترجمات.

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم جلب ملف المريض الكامل بنجاح",
  "data": {
    "profile": {
      "id": 1,
      "blood_type": "A+",
      "height": 175.5
    },
    "translations": {
      "ar": {
        "medical_history": "لا يوجد تاريخ طبي سابق"
      },
      "en": {
        "medical_history": "No previous medical history"
      }
    }
  }
}
```

---

### 4️⃣ Update Patient Profile
**PUT** `/api/patient-profiles`

تحديث ملف المريض.

**Body:**
```json
{
  "weight": 72.5,
  "allergies_ar": "حساسية من البنسلين والأسبرين"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم تحديث ملف المريض بنجاح"
}
```

---

### 5️⃣ Delete Patient Profile
**DELETE** `/api/patient-profiles`

حذف ملف المريض.

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم حذف ملف المريض بنجاح"
}
```

---

### 🔹 APIs للأطباء والإداريين والمساعدين

### 6️⃣ Get All Patient Profiles (Admin Only)
**GET** `/api/patient-profiles/all`

جلب جميع ملفات المرضى مع pagination و search (للإداريين فقط).

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar | en
```

**Query Parameters:**
- `page` (optional): رقم الصفحة (default: 1)
- `limit` (optional): عدد النتائج في الصفحة (default: 10)
- `search` (optional): البحث في الاسم، البريد، الهاتف

**Example:**
```
GET /api/patient-profiles/all?page=1&limit=10&search=ahmed
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم جلب ملفات المرضى بنجاح",
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "email": "patient@example.com",
      "phone": "+966501234567",
      "full_name": "أحمد محمد",
      "date_of_birth": "1990-01-01",
      "gender": "male",
      "blood_type": "A+",
      "height": 175.5,
      "weight": 70.0,
      "medical_history": "لا يوجد تاريخ طبي سابق",
      "allergies": "حساسية من البنسلين",
      "created_at": "2025-11-24T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 7️⃣ Get Patient Profile by User ID
**GET** `/api/patient-profiles/patient/:userId`

جلب ملف مريض محدد بواسطة معرف المستخدم (للأطباء والإداريين والمساعدين).

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar | en
```

**Example:**
```
GET /api/patient-profiles/patient/123
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم جلب ملف المريض بنجاح",
  "data": {
    "id": 1,
    "user_id": 123,
    "email": "patient@example.com",
    "phone": "+966501234567",
    "full_name": "أحمد محمد",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "blood_type": "A+",
    "height": 175.5,
    "weight": 70.0,
    "smoking_status": "never",
    "medical_history": "لا يوجد تاريخ طبي سابق",
    "current_medications": "لا يوجد",
    "allergies": "حساسية من البنسلين",
    "chronic_conditions": "لا يوجد",
    "family_medical_history": "والده مصاب بالسكري",
    "created_at": "2025-11-24T00:00:00.000Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "المستخدم غير موجود"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "ملف المريض غير موجود"
}
```

---

## 📊 Enum Values

### Blood Type:
- A+, A-, B+, B-, AB+, AB-, O+, O-, unknown

### Smoking Status:
- never, former, current, unknown

### Alcohol Consumption:
- never, rarely, occasionally, regularly, unknown

### Exercise Frequency:
- never, rarely, sometimes, regularly, daily, unknown

---

## 💡 ملاحظات مهمة

1. **ملف واحد لكل مستخدم**
2. **دعم متعدد اللغات**
3. **جميع الحقول اختيارية**
4. **الطبيب المفضل يجب أن يكون موجوداً**
5. **الصلاحيات:**
   - المرضى (Users): يمكنهم إنشاء وتعديل وحذف ملفاتهم الخاصة فقط
   - الأطباء والمساعدين: يمكنهم عرض ملفات المرضى
   - الإداريين: يمكنهم عرض جميع ملفات المرضى مع pagination و search

---

## 📁 الملفات ذات الصلة

- **Controller:** `controllers/patientProfileController.js`
- **Routes:** `routes/patientProfileRoutes.js`
- **Validation:** `validations/patientProfileValidation.js`
- **Database:** جداول `patient_profiles` و `patient_profile_translations`

---

<div align="center">

**🏥 Patient Profiles API - Complete! 🏥**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

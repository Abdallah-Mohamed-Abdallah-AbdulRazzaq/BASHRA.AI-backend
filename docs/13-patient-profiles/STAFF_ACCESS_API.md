# 👨‍⚕️ Patient Profiles - Staff Access APIs
# ملفات المرضى - APIs للطاقم الطبي والإداري

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/patient-profiles`

---

## 📋 نظرة عامة | Overview

هذه الـ APIs مخصصة للطاقم الطبي والإداري للوصول إلى ملفات المرضى:
- **الأطباء (Doctors)**: عرض ملفات المرضى
- **المساعدين (Assistants)**: عرض ملفات المرضى
- **الإداريين (Admins)**: عرض جميع ملفات المرضى مع إمكانيات البحث والتصفح

---

## 🔐 الصلاحيات | Permissions

### الأطباء والمساعدين (Doctors & Assistants):
- ✅ عرض ملف مريض محدد بواسطة `userId`
- ❌ لا يمكنهم تعديل أو حذف الملفات
- ❌ لا يمكنهم عرض جميع الملفات

### الإداريين (Admins):
- ✅ عرض جميع ملفات المرضى
- ✅ البحث والتصفح مع pagination
- ✅ عرض ملف مريض محدد
- ❌ لا يمكنهم تعديل أو حذف الملفات (للحماية)

---

## 📡 Available APIs

### 1️⃣ Get All Patient Profiles (Admin Only)
**GET** `/api/patient-profiles/all`

**الصلاحية المطلوبة:** Admin فقط

**Headers:**
```http
Authorization: Bearer YOUR_ADMIN_TOKEN
Accept-Language: ar | en
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | رقم الصفحة |
| `limit` | number | No | 10 | عدد النتائج في الصفحة |
| `search` | string | No | - | البحث في الاسم، البريد، الهاتف |

**Examples:**

```bash
# Get first page (10 results)
GET /api/patient-profiles/all

# Get page 2 with 20 results
GET /api/patient-profiles/all?page=2&limit=20

# Search for specific patient
GET /api/patient-profiles/all?search=ahmed

# Search with pagination
GET /api/patient-profiles/all?page=1&limit=10&search=966501234567
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
      "smoking_status": "never",
      "alcohol_consumption": "never",
      "exercise_frequency": "regularly",
      "insurance_provider": "شركة التأمين الصحي",
      "insurance_policy_number": "POL123456",
      "preferred_doctor_id": 5,
      "medical_history": "لا يوجد تاريخ طبي سابق",
      "current_medications": "لا يوجد",
      "allergies": "حساسية من البنسلين",
      "chronic_conditions": "لا يوجد",
      "family_medical_history": "والده مصاب بالسكري",
      "created_at": "2025-11-24T00:00:00.000Z",
      "updated_at": "2025-11-24T00:00:00.000Z"
    },
    {
      "id": 2,
      "user_id": 124,
      "email": "patient2@example.com",
      "phone": "+966509876543",
      "full_name": "فاطمة علي",
      "date_of_birth": "1985-05-15",
      "gender": "female",
      "blood_type": "O+",
      "height": 165.0,
      "weight": 60.0,
      "smoking_status": "never",
      "alcohol_consumption": "never",
      "exercise_frequency": "sometimes",
      "insurance_provider": null,
      "insurance_policy_number": null,
      "preferred_doctor_id": null,
      "medical_history": "عملية جراحية في الزائدة الدودية 2020",
      "current_medications": "فيتامينات متعددة",
      "allergies": "لا يوجد",
      "chronic_conditions": "لا يوجد",
      "family_medical_history": "لا يوجد",
      "created_at": "2025-11-23T00:00:00.000Z",
      "updated_at": "2025-11-23T00:00:00.000Z"
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

**Response Error (403):**
```json
{
  "error": "Insufficient permissions"
}
```

---

### 2️⃣ Get Patient Profile by User ID
**GET** `/api/patient-profiles/patient/:userId`

**الصلاحية المطلوبة:** Doctor أو Assistant أو Admin

**Headers:**
```http
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar | en
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | number | Yes | معرف المستخدم (المريض) |

**Examples:**

```bash
# Get patient profile for user ID 123
GET /api/patient-profiles/patient/123

# Get with English language
GET /api/patient-profiles/patient/123
Accept-Language: en
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
    "alcohol_consumption": "never",
    "exercise_frequency": "regularly",
    "insurance_provider": "شركة التأمين الصحي",
    "insurance_policy_number": "POL123456",
    "preferred_doctor_id": 5,
    "medical_history": "لا يوجد تاريخ طبي سابق",
    "current_medications": "لا يوجد",
    "allergies": "حساسية من البنسلين",
    "chronic_conditions": "لا يوجد",
    "family_medical_history": "والده مصاب بالسكري",
    "created_at": "2025-11-24T00:00:00.000Z",
    "updated_at": "2025-11-24T00:00:00.000Z"
  }
}
```

**Response Error (400) - Invalid User ID:**
```json
{
  "success": false,
  "message": "معرف المستخدم غير صحيح"
}
```

**Response Error (404) - User Not Found:**
```json
{
  "success": false,
  "message": "المستخدم غير موجود"
}
```

**Response Error (404) - Profile Not Found:**
```json
{
  "success": false,
  "message": "ملف المريض غير موجود"
}
```

**Response Error (403) - Insufficient Permissions:**
```json
{
  "error": "Insufficient permissions"
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: طبيب يعرض ملف مريض

```javascript
// 1. Login as Doctor
const loginResponse = await fetch('/api/auth-doctor/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@example.com',
    password: 'password123'
  })
});
const { accessToken } = await loginResponse.json();

// 2. Get patient profile by user ID
const patientProfile = await fetch('/api/patient-profiles/patient/123', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept-Language': 'ar'
  }
});

const data = await patientProfile.json();
console.log('Patient Profile:', data.data);
```

---

### Scenario 2: إداري يبحث عن مرضى

```javascript
// 1. Login as Admin
const loginResponse = await fetch('/api/auth-admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'admin123'
  })
});
const { accessToken } = await loginResponse.json();

// 2. Search for patients
const searchResults = await fetch('/api/patient-profiles/all?search=ahmed&page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept-Language': 'ar'
  }
});

const data = await searchResults.json();
console.log('Total Results:', data.pagination.total);
console.log('Patients:', data.data);
```

---

### Scenario 3: مساعد يعرض ملف مريض محدد

```javascript
// 1. Login as Assistant
const loginResponse = await fetch('/api/auth-assistant/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'assistant@example.com',
    password: 'password123'
  })
});
const { accessToken } = await loginResponse.json();

// 2. Get specific patient profile
const patientProfile = await fetch('/api/patient-profiles/patient/456', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept-Language': 'en'
  }
});

const data = await patientProfile.json();
console.log('Patient Medical History:', data.data.medical_history);
console.log('Patient Allergies:', data.data.allergies);
```

---

## 🧪 Testing with Postman

### Collection Setup:

**Environment Variables:**
```
base_url: http://localhost:3006
admin_token: <your_admin_jwt_token>
doctor_token: <your_doctor_jwt_token>
assistant_token: <your_assistant_jwt_token>
```

### Test Cases:

#### Test 1: Get All Profiles (Admin)
```
GET {{base_url}}/api/patient-profiles/all
Authorization: Bearer {{admin_token}}
Accept-Language: ar

Expected: 200 OK with pagination
```

#### Test 2: Get All Profiles with Search (Admin)
```
GET {{base_url}}/api/patient-profiles/all?search=ahmed&page=1&limit=5
Authorization: Bearer {{admin_token}}
Accept-Language: ar

Expected: 200 OK with filtered results
```

#### Test 3: Get Patient by User ID (Doctor)
```
GET {{base_url}}/api/patient-profiles/patient/123
Authorization: Bearer {{doctor_token}}
Accept-Language: ar

Expected: 200 OK with patient data
```

#### Test 4: Get Patient by User ID (Assistant)
```
GET {{base_url}}/api/patient-profiles/patient/123
Authorization: Bearer {{assistant_token}}
Accept-Language: en

Expected: 200 OK with patient data in English
```

#### Test 5: Try to Get All Profiles (Doctor - Should Fail)
```
GET {{base_url}}/api/patient-profiles/all
Authorization: Bearer {{doctor_token}}

Expected: 403 Forbidden
```

#### Test 6: Get Non-Existent Patient
```
GET {{base_url}}/api/patient-profiles/patient/99999
Authorization: Bearer {{doctor_token}}

Expected: 404 Not Found
```

---

## 📊 Response Data Structure

### Patient Profile Object:

```typescript
interface PatientProfile {
  // Basic Info
  id: number;
  user_id: number;
  email: string;
  phone: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  
  // Health Info
  blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  height: number | null; // cm
  weight: number | null; // kg
  smoking_status: 'never' | 'former' | 'current' | 'unknown';
  alcohol_consumption: 'never' | 'rarely' | 'occasionally' | 'regularly' | 'unknown';
  exercise_frequency: 'never' | 'rarely' | 'sometimes' | 'regularly' | 'daily' | 'unknown';
  
  // Insurance
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  
  // Medical Info (Translated)
  medical_history: string | null;
  current_medications: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  family_medical_history: string | null;
  
  // Relationships
  preferred_doctor_id: number | null;
  
  // Timestamps
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ Best Practices:

1. **دائماً استخدم Accept-Language:**
   - للحصول على الترجمة الصحيحة للحقول الطبية
   - القيمة الافتراضية: `ar`

2. **استخدم Pagination:**
   - عند جلب جميع الملفات، استخدم pagination لتحسين الأداء
   - الحد الأقصى الموصى به: 50 نتيجة في الصفحة

3. **البحث:**
   - يمكن البحث في: الاسم الأول، الاسم الأخير، البريد، الهاتف
   - البحث غير حساس لحالة الأحرف

4. **الأمان:**
   - جميع الـ APIs تتطلب JWT Token صالح
   - الصلاحيات يتم التحقق منها تلقائياً
   - لا يمكن للطاقم تعديل أو حذف ملفات المرضى

### ⚠️ Limitations:

1. **الأطباء والمساعدين:**
   - لا يمكنهم عرض جميع الملفات
   - يجب معرفة `userId` المحدد

2. **الإداريين:**
   - يمكنهم فقط العرض (Read-Only)
   - لا يمكنهم التعديل أو الحذف

3. **البحث:**
   - متاح فقط للإداريين في `/all` endpoint
   - غير متاح للأطباء والمساعدين

---

## 🔒 Security Considerations

### Authentication:
- ✅ JWT Token مطلوب في كل request
- ✅ Token يجب أن يكون صالح وغير منتهي الصلاحية
- ✅ يتم التحقق من نوع الحساب (entityType)

### Authorization:
- ✅ `/all` - Admin فقط
- ✅ `/patient/:userId` - Doctor أو Assistant أو Admin
- ✅ يتم رفض الطلبات غير المصرح بها تلقائياً

### Data Privacy:
- ✅ المعلومات الطبية حساسة ويجب حمايتها
- ✅ يتم تسجيل جميع عمليات الوصول (Audit Log)
- ✅ لا يمكن للطاقم تعديل البيانات

---

## 📁 Related Files

- **Controller:** `controllers/patientProfileController.js`
  - `getAllPatientProfiles()` - Admin endpoint
  - `getPatientProfileByUserId()` - Staff endpoint
  
- **Routes:** `routes/patientProfileRoutes.js`
  - GET `/all` - Admin route
  - GET `/patient/:userId` - Staff route
  
- **Middleware:** `middleware/authMiddleware.js`
  - `authorizeAnyAdmin` - Admin authorization
  - `authorizeRole(['admin', 'doctor', 'assistant'])` - Staff authorization

---

<div align="center">

## ✅ Staff Access APIs - Ready!

**👨‍⚕️ Patient Profiles - Staff Access 👨‍⚕️**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

---

**للتوثيق الكامل:**  
راجع `PATIENT_PROFILES_API_GUIDE.md` و `README.md`

</div>

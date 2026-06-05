# 🏥 Patient Profiles System - Complete Documentation
# نظام ملفات المرضى - التوثيق الكامل

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **الإصدار:** 1.0.0  
> **الحالة:** ✅ مكتمل وجاهز للاستخدام

---

## 📑 جدول المحتويات | Table of Contents

1. [نظرة عامة](#نظرة-عامة)
2. [هيكل قاعدة البيانات](#هيكل-قاعدة-البيانات)
3. [الملفات المنشأة](#الملفات-المنشأة)
4. [APIs المتوفرة](#apis-المتوفرة)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)
6. [اختبار APIs](#اختبار-apis)
7. [ملاحظات مهمة](#ملاحظات-مهمة)

---

## 🎯 نظرة عامة

### ما هو نظام ملفات المرضى؟

نظام شامل لإدارة الملفات الطبية للمرضى (Users) يتضمن:

✅ **المعلومات الصحية الأساسية:**
- فصيلة الدم
- الطول والوزن
- حالة التدخين
- استهلاك الكحول
- تكرار التمارين الرياضية

✅ **المعلومات الطبية:**
- التاريخ الطبي
- الأدوية الحالية
- الحساسية
- الأمراض المزمنة
- التاريخ الطبي للعائلة

✅ **معلومات التأمين:**
- شركة التأمين
- رقم البوليصة

✅ **الطبيب المفضل:**
- ربط المريض بطبيب محدد

✅ **دعم متعدد اللغات:**
- عربي وإنجليزي للحقول الطبية

---

## 🗄️ هيكل قاعدة البيانات

### جدول `patient_profiles`

يحتوي على المعلومات الأساسية للمريض:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | معرف الملف |
| `user_id` | INT | معرف المستخدم (UNIQUE) |
| `blood_type` | ENUM | فصيلة الدم |
| `height` | DECIMAL(5,2) | الطول بالسنتيمتر |
| `weight` | DECIMAL(5,2) | الوزن بالكيلوجرام |
| `smoking_status` | ENUM | حالة التدخين |
| `alcohol_consumption` | ENUM | استهلاك الكحول |
| `exercise_frequency` | ENUM | تكرار التمارين |
| `insurance_provider` | VARCHAR(200) | شركة التأمين |
| `insurance_policy_number` | VARCHAR(100) | رقم البوليصة |
| `preferred_doctor_id` | INT | معرف الطبيب المفضل |
| `created_at` | TIMESTAMP | تاريخ الإنشاء |
| `updated_at` | TIMESTAMP | تاريخ آخر تحديث |

### جدول `patient_profile_translations`

يحتوي على الترجمات للحقول الطبية:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | معرف الترجمة |
| `patient_profile_id` | INT | معرف ملف المريض |
| `language_code` | VARCHAR(10) | كود اللغة (ar/en) |
| `medical_history` | TEXT | التاريخ الطبي |
| `current_medications` | TEXT | الأدوية الحالية |
| `allergies` | TEXT | الحساسية |
| `chronic_conditions` | TEXT | الأمراض المزمنة |
| `family_medical_history` | TEXT | التاريخ الطبي للعائلة |

### العلاقات:
- `user_id` → `users.id` (ONE-TO-ONE, CASCADE DELETE)
- `preferred_doctor_id` → `doctors.id` (MANY-TO-ONE, SET NULL ON DELETE)
- `patient_profile_id` → `patient_profiles.id` (ONE-TO-MANY, CASCADE DELETE)

---

## 📁 الملفات المنشأة

### 1. Validation
**الملف:** `validations/patientProfileValidation.js`

**المحتوى:**
- `validateCreatePatientProfile` - التحقق من بيانات الإنشاء
- `validateUpdatePatientProfile` - التحقق من بيانات التحديث

**القواعد:**
- فصيلة الدم: من القيم المحددة فقط
- الطول/الوزن: أرقام عشرية بين 0-999.99
- حالة التدخين/الكحول/التمارين: من القيم المحددة
- شركة التأمين: حد أقصى 200 حرف
- رقم البوليصة: حد أقصى 100 حرف

### 2. Controller
**الملف:** `controllers/patientProfileController.js`

**الوظائف:**
- `createPatientProfile` - إنشاء ملف مريض
- `getPatientProfile` - جلب الملف مع ترجمة محددة
- `getCompletePatientProfile` - جلب الملف مع كل الترجمات
- `updatePatientProfile` - تحديث الملف
- `deletePatientProfile` - حذف الملف
- `getPatientProfileById` - دالة مساعدة

**المميزات:**
- دعم Transactions لضمان سلامة البيانات
- معالجة الأخطاء الشاملة
- دعم متعدد اللغات
- التحقق من صحة البيانات

### 3. Routes
**الملف:** `routes/patientProfileRoutes.js`

**المسارات:**
- `POST /api/patient-profiles` - إنشاء
- `GET /api/patient-profiles` - جلب
- `GET /api/patient-profiles/complete` - جلب كامل
- `PUT /api/patient-profiles` - تحديث
- `DELETE /api/patient-profiles` - حذف

**الحماية:**
- Authentication: JWT Token مطلوب
- Authorization: User Role فقط
- Account Active Check: الحساب يجب أن يكون نشط

### 4. Main Routes Registration
**الملف:** `routes/index.js`

تم تسجيل المسارات في:
```javascript
router.use("/patient-profiles", patientProfileRoutes);
```

---

## 📡 APIs المتوفرة

### 1. Create Patient Profile
```http
POST /api/patient-profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "blood_type": "A+",
  "height": 175.5,
  "weight": 70.0,
  "smoking_status": "never",
  "medical_history_ar": "لا يوجد تاريخ طبي سابق",
  "allergies_ar": "حساسية من البنسلين"
}
```

### 2. Get Patient Profile
```http
GET /api/patient-profiles
Authorization: Bearer <token>
Accept-Language: ar
```

### 3. Get Complete Profile
```http
GET /api/patient-profiles/complete
Authorization: Bearer <token>
```

### 4. Update Patient Profile
```http
PUT /api/patient-profiles
Authorization: Bearer <token>
Content-Type: application/json

{
  "weight": 72.5,
  "current_medications_ar": "أسبرين 100 ملغ"
}
```

### 5. Delete Patient Profile
```http
DELETE /api/patient-profiles
Authorization: Bearer <token>
```

---

## 💻 أمثلة الاستخدام

### مثال 1: إنشاء ملف مريض كامل

```javascript
const response = await fetch('/api/patient-profiles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  },
  body: JSON.stringify({
    // معلومات أساسية
    blood_type: 'A+',
    height: 175.5,
    weight: 70.0,
    
    // نمط الحياة
    smoking_status: 'never',
    alcohol_consumption: 'never',
    exercise_frequency: 'regularly',
    
    // التأمين
    insurance_provider: 'شركة التأمين الصحي',
    insurance_policy_number: 'POL123456',
    
    // الطبيب المفضل
    preferred_doctor_id: 5,
    
    // المعلومات الطبية بالعربية
    medical_history_ar: 'لا يوجد تاريخ طبي سابق',
    current_medications_ar: 'لا يوجد',
    allergies_ar: 'حساسية من البنسلين',
    chronic_conditions_ar: 'لا يوجد',
    family_medical_history_ar: 'والده مصاب بالسكري',
    
    // المعلومات الطبية بالإنجليزية
    medical_history_en: 'No previous medical history',
    current_medications_en: 'None',
    allergies_en: 'Penicillin allergy',
    chronic_conditions_en: 'None',
    family_medical_history_en: 'Father has diabetes'
  })
});

const data = await response.json();
console.log(data);
```

### مثال 2: جلب الملف بلغات مختلفة

```javascript
// جلب بالعربية
const profileAr = await fetch('/api/patient-profiles', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept-Language': 'ar'
  }
});

// جلب بالإنجليزية
const profileEn = await fetch('/api/patient-profiles', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept-Language': 'en'
  }
});

// جلب كل الترجمات
const completeProfile = await fetch('/api/patient-profiles/complete', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### مثال 3: تحديث جزئي

```javascript
// تحديث الوزن فقط
await fetch('/api/patient-profiles', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    weight: 72.5
  })
});

// تحديث الأدوية الحالية بالعربية
await fetch('/api/patient-profiles', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  },
  body: JSON.stringify({
    current_medications_ar: 'أسبرين 100 ملغ يومياً'
  })
});
```

---

## 🧪 اختبار APIs

### Postman Collection

#### Environment Variables:
```
base_url: http://localhost:3006
user_token: <your_jwt_token>
```

#### Test 1: Create Profile
```
POST {{base_url}}/api/patient-profiles
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "blood_type": "A+",
  "height": 175,
  "weight": 70,
  "allergies_ar": "حساسية من البنسلين"
}

Expected: 201 Created
```

#### Test 2: Get Profile (Arabic)
```
GET {{base_url}}/api/patient-profiles
Authorization: Bearer {{user_token}}
Accept-Language: ar

Expected: 200 OK
```

#### Test 3: Get Profile (English)
```
GET {{base_url}}/api/patient-profiles
Authorization: Bearer {{user_token}}
Accept-Language: en

Expected: 200 OK
```

#### Test 4: Get Complete Profile
```
GET {{base_url}}/api/patient-profiles/complete
Authorization: Bearer {{user_token}}

Expected: 200 OK
```

#### Test 5: Update Profile
```
PUT {{base_url}}/api/patient-profiles
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "weight": 72.5,
  "smoking_status": "former"
}

Expected: 200 OK
```

#### Test 6: Delete Profile
```
DELETE {{base_url}}/api/patient-profiles
Authorization: Bearer {{user_token}}

Expected: 200 OK
```

### cURL Examples

```bash
# Create Profile
curl -X POST http://localhost:3006/api/patient-profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "blood_type": "A+",
    "height": 175,
    "weight": 70
  }'

# Get Profile
curl -X GET http://localhost:3006/api/patient-profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar"

# Update Profile
curl -X PUT http://localhost:3006/api/patient-profiles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "weight": 72.5
  }'

# Delete Profile
curl -X DELETE http://localhost:3006/api/patient-profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ ملاحظات مهمة

### ✅ القواعد والقيود:

1. **ملف واحد لكل مستخدم:**
   - كل User له ملف مريض واحد فقط
   - محاولة إنشاء ملف ثاني ترجع خطأ 400

2. **دعم متعدد اللغات:**
   - يمكن إضافة ترجمات عربية وإنجليزية
   - عند الجلب، يتم عرض الترجمة حسب Accept-Language
   - استخدم /complete للحصول على كل الترجمات

3. **الحقول الاختيارية:**
   - جميع الحقول اختيارية عند الإنشاء والتحديث
   - يمكن تحديث أي حقل بشكل منفصل

4. **الطبيب المفضل:**
   - يجب أن يكون موجوداً في جدول doctors
   - إذا حُذف الطبيب، يتم تعيين preferred_doctor_id إلى NULL

5. **الحذف:**
   - حذف الملف يحذف جميع الترجمات (CASCADE)
   - حذف المستخدم يحذف الملف تلقائياً (CASCADE)

### 🔒 الأمان:

- ✅ JWT Authentication مطلوب
- ✅ User Role فقط
- ✅ كل مستخدم يصل لملفه فقط
- ✅ Validation شامل للبيانات
- ✅ Transaction Support لضمان سلامة البيانات

### 📊 القيم المحددة (Enums):

**Blood Type:**
- A+, A-, B+, B-, AB+, AB-, O+, O-, unknown

**Smoking Status:**
- never, former, current, unknown

**Alcohol Consumption:**
- never, rarely, occasionally, regularly, unknown

**Exercise Frequency:**
- never, rarely, sometimes, regularly, daily, unknown

---

## 🚀 Quick Start Guide

### الخطوة 1: تسجيل الدخول
```bash
POST /api/auth-user/login
{
  "email": "patient@example.com",
  "password": "password123"
}
```

### الخطوة 2: إنشاء ملف المريض
```bash
POST /api/patient-profiles
Authorization: Bearer <token>
{
  "blood_type": "A+",
  "height": 175,
  "weight": 70
}
```

### الخطوة 3: جلب الملف
```bash
GET /api/patient-profiles
Authorization: Bearer <token>
Accept-Language: ar
```

---

## 📁 الملفات ذات الصلة

```
backend/
├── controllers/
│   └── patientProfileController.js     # Controller الرئيسي
├── routes/
│   ├── patientProfileRoutes.js         # Routes التفصيلية
│   └── index.js                         # تسجيل Routes
├── validations/
│   └── patientProfileValidation.js     # Validation Rules
└── docs/
    └── 13-patient-profiles/
        ├── README.md                    # هذا الملف
        └── PATIENT_PROFILES_API_GUIDE.md # دليل API المفصل
```

---

## 🔄 التحديثات المستقبلية

### مقترحات للتطوير:

- [ ] إضافة صور للمستندات الطبية
- [ ] نظام الإشعارات للأدوية
- [ ] تتبع الوزن والطول عبر الزمن
- [ ] تقارير صحية دورية
- [ ] ربط مع أجهزة القياس الصحية

---

<div align="center">

## ✅ النظام جاهز للاستخدام!

**🏥 Patient Profiles System - Complete! 🏥**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025  
**الإصدار:** 1.0.0

---

**للأسئلة أو الدعم:**  
راجع ملف `PATIENT_PROFILES_API_GUIDE.md` للتفاصيل الكاملة

</div>

# 💊 Medications & Prescriptions System
# نظام الأدوية والوصفات الطبية

> **تاريخ الإنشاء:** 25 نوفمبر 2025  
> **الإصدار:** 1.0.0  
> **Base URL:** `http://localhost:3006/api`

---

## 📋 نظرة عامة | Overview

نظام متكامل لإدارة الأدوية والوصفات الطبية الإلكترونية، يتكون من 3 أنظمة فرعية مترابطة:

### **1. دليل الأدوية (Medications Directory)**
قاعدة بيانات شاملة للأدوية المتاحة مع معلومات تفصيلية.

### **2. قوالب الوصفات (Prescription Templates)**
قوالب جاهزة للوصفات الطبية المتكررة لتوفير الوقت.

### **3. الوصفات الطبية (Prescriptions)**
نظام الوصفات الطبية الإلكترونية مع تتبع الصرف.

---

## 🏗️ البنية المعمارية | Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Medications System                      │
│                  (دليل الأدوية)                         │
│  - CRUD للأدوية                                         │
│  - تصنيفات الأدوية                                      │
│  - أنواع الأدوية (أقراص، مراهم، إلخ)                   │
│  - الجرعات المتاحة                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            Prescription Templates System                 │
│            (نظام قوالب الوصفات)                        │
│  - إنشاء قوالب مخصصة لكل طبيب                          │
│  - إضافة أدوية متعددة لكل قالب                         │
│  - تحديد الجرعات والتعليمات الافتراضية                 │
│  - تتبع عدد مرات الاستخدام                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Prescriptions System                        │
│              (نظام الوصفات الطبية)                     │
│  - إنشاء وصفات طبية إلكترونية                          │
│  - ربط بالسجل الطبي                                    │
│  - دعم الترجمات (عربي/إنجليزي)                        │
│  - تتبع حالة الصرف                                      │
│  - إدارة إعادات الصرف                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ قاعدة البيانات | Database Schema

### **الجداول الأربعة:**

#### 1. `medications` - دليل الأدوية
```sql
- id (PK)
- uuid (UNIQUE)
- created_by_doctor_id (FK → doctors, NULL for Admin) ⭐ جديد
- name_ar, name_en
- scientific_name
- category
- form_type (enum: 11 نوع) ⭐ محدّث
- available_dosages (JSON)
- indications
- warning_alert
- is_active
```

**التعديلات الجديدة:**
- ✅ `created_by_doctor_id`: تتبع من أضاف الدواء (Admin أو Doctor)
- ✅ `form_type`: إضافة 3 أنواع جديدة (suppository, sachet, other)
- ✅ `ON DELETE SET NULL`: عند حذف طبيب، الدواء يبقى ولكن يُمسح اسم الطبيب

#### 2. `prescription_templates` - القوالب
```sql
- id (PK)
- uuid (UNIQUE)
- doctor_id (FK → doctors)
- template_name
- description
- usage_count
```

#### 3. `prescription_template_items` - عناصر القوالب
```sql
- id (PK)
- template_id (FK → prescription_templates)
- medication_id (FK → medications)
- default_dosage
- default_frequency
- default_duration
- default_instructions
- default_quantity
```

#### 4. `prescriptions` - الوصفات الطبية
```sql
- id (PK)
- uuid (UNIQUE)
- prescription_number (UNIQUE)
- medical_record_id (FK → medical_records)
- patient_id (FK → users)
- doctor_id (FK → doctors)
- medication_name
- dosage, frequency, duration
- quantity, route_of_administration
- refills_allowed, refills_used
- is_generic_allowed
- status (enum)
- prescribed_date, expiry_date, filled_date
```

#### 5. `prescription_translations` - ترجمات الوصفات
```sql
- id (PK)
- prescription_id (FK → prescriptions)
- language_code
- instructions
- indication
- pharmacy_notes
```

---

## 🔐 الصلاحيات | Permissions

### **Medications (دليل الأدوية)** ⭐ محدّث
| الدور | قراءة | إنشاء | تحديث | حذف | ملاحظات |
|-------|------|-------|-------|-----|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | `created_by_doctor_id = NULL` |
| Doctor | ✅ | ✅ | ❌ | ❌ | `created_by_doctor_id = doctor.id` ⭐ |
| Patient | ❌ | ❌ | ❌ | ❌ | - |

### **Prescription Templates (القوالب)**
| الدور | قراءة | إنشاء | تحديث | حذف |
|-------|------|-------|-------|-----|
| Doctor | ✅ (قوالبه فقط) | ✅ | ✅ | ✅ |
| Patient | ❌ | ❌ | ❌ | ❌ |
| Admin | ❌ | ❌ | ❌ | ❌ |

### **Prescriptions (الوصفات)**
| الدور | قراءة | إنشاء | تحديث | حذف | صرف |
|-------|------|-------|-------|-----|-----|
| Doctor | ✅ (وصفاته) | ✅ | ✅ | ❌ | ❌ |
| Patient | ✅ (وصفاته) | ❌ | ❌ | ❌ | ❌ |
| Admin | ✅ (الكل) | ❌ | ❌ | ❌ | ❌ |
| Pharmacy | ✅ | ❌ | ❌ | ❌ | ✅ |

---

## 📡 APIs Overview

### **1. Medications APIs**
```
GET    /api/medications                    # Get all medications
GET    /api/medications/:id                # Get medication by ID
GET    /api/medications/category/:category # Get by category
GET    /api/medications/categories/list    # Get all categories
POST   /api/medications                    # Create medication (Admin)
PUT    /api/medications/:id                # Update medication (Admin)
PATCH  /api/medications/:id/toggle-status  # Toggle status (Admin)
DELETE /api/medications/:id                # Delete medication (Admin)
```

### **2. Prescription Templates APIs**
```
GET    /api/prescription-templates              # Get all templates
GET    /api/prescription-templates/:id          # Get template by ID
POST   /api/prescription-templates              # Create template
PUT    /api/prescription-templates/:id          # Update template
DELETE /api/prescription-templates/:id          # Delete template
POST   /api/prescription-templates/:id/items    # Add item to template
PUT    /api/prescription-templates/:id/items/:itemId  # Update item
DELETE /api/prescription-templates/:id/items/:itemId  # Delete item
PATCH  /api/prescription-templates/:id/use      # Increment usage count
```

### **3. Prescriptions APIs**
```
GET    /api/prescriptions                       # Get all prescriptions
GET    /api/prescriptions/:id                   # Get prescription by ID
GET    /api/prescriptions/medical-record/:recordId  # Get by medical record
POST   /api/prescriptions                       # Create prescription
PUT    /api/prescriptions/:id                   # Update prescription
PATCH  /api/prescriptions/:id/cancel            # Cancel prescription
PATCH  /api/prescriptions/:id/fill              # Fill prescription
POST   /api/prescriptions/:id/translations      # Add/Update translation
```

---

## 🚀 Quick Start Guide

### **Step 1: إضافة أدوية للنظام (Admin)**

```bash
# 1. Add medication
POST /api/medications
Authorization: Bearer ADMIN_TOKEN
{
  "name_ar": "أموكسيسيلين",
  "name_en": "Amoxicillin",
  "category": "مضاد حيوي",
  "form_type": "capsule",
  "available_dosages": ["250mg", "500mg", "1g"]
}

# 2. Verify
GET /api/medications
```

---

### **Step 2: إنشاء قالب وصفة (Doctor)**

```bash
# 1. Get available medications
GET /api/medications?is_active=true

# 2. Create template
POST /api/prescription-templates
Authorization: Bearer DOCTOR_TOKEN
{
  "template_name": "علاج التهاب الحلق",
  "description": "قالب لعلاج التهاب الحلق البكتيري",
  "items": [
    {
      "medication_id": 1,
      "default_dosage": "500mg",
      "default_frequency": "3 مرات يومياً",
      "default_duration": "7 أيام"
    }
  ]
}

# 3. Verify
GET /api/prescription-templates
```

---

### **Step 3: إنشاء وصفة طبية (Doctor)**

```bash
# 1. Get patient's medical record
GET /api/patient-profiles/{patientId}/medical-records

# 2. Create prescription
POST /api/prescriptions
Authorization: Bearer DOCTOR_TOKEN
{
  "medical_record_id": 5,
  "patient_id": 10,
  "medication_name": "أموكسيسيلين 500mg",
  "dosage": "500mg",
  "frequency": "3 مرات يومياً",
  "duration": "7 أيام",
  "translations": {
    "ar": {
      "instructions": "يؤخذ بعد الأكل"
    }
  }
}

# 3. Increment template usage (if used from template)
PATCH /api/prescription-templates/1/use
```

---

### **Step 4: صرف الوصفة (Pharmacy)**

```bash
# 1. Get prescription details
GET /api/prescriptions/RX-1732518000000-ABC123XYZ

# 2. Verify prescription is active and not expired

# 3. Fill prescription
PATCH /api/prescriptions/1/fill
Authorization: Bearer TOKEN
```

---

## 📊 Workflow Examples

### **Workflow 1: من القالب إلى الوصفة**

```
1. Doctor creates template
   ↓
2. Doctor adds medications to template
   ↓
3. Doctor uses template to create prescription
   ↓
4. System increments template usage_count
   ↓
5. Patient receives prescription
   ↓
6. Pharmacy fills prescription
```

### **Workflow 2: إدارة الأدوية**

```
1. Admin adds medication to directory
   ↓
2. Doctor views medication in directory
   ↓
3. Doctor adds medication to template
   ↓
4. Doctor uses in prescription
   ↓
5. System tracks medication usage
```

---

## 🎯 Use Cases

### **Use Case 1: طبيب يعالج حالة متكررة**

```bash
# Scenario: طبيب يعالج التهاب الحلق بشكل متكرر

# 1. Create template once
POST /api/prescription-templates
{
  "template_name": "علاج التهاب الحلق",
  "items": [
    {"medication_id": 1, "dosage": "500mg", "frequency": "3x daily"},
    {"medication_id": 2, "dosage": "10mg", "frequency": "as needed"}
  ]
}

# 2. For each patient, use template
GET /api/prescription-templates/1
# Copy template data

POST /api/prescriptions
# Use template data with patient-specific info

PATCH /api/prescription-templates/1/use
# Track usage
```

---

### **Use Case 2: مريض يحتاج إعادة صرف**

```bash
# Scenario: مريض لديه دواء مزمن مع 3 refills

# 1. Doctor creates prescription with refills
POST /api/prescriptions
{
  "medication_name": "دواء مزمن",
  "refills_allowed": 3,
  ...
}

# 2. First fill
PATCH /api/prescriptions/1/fill
# refills_used = 1

# 3. After 30 days, second fill
PATCH /api/prescriptions/1/fill
# refills_used = 2

# 4. Check remaining refills
GET /api/prescriptions/1
# refills_allowed = 3, refills_used = 2
# Remaining = 1
```

---

### **Use Case 3: وصفة بلغات متعددة**

```bash
# Scenario: مريض أجنبي يحتاج وصفة بالإنجليزية

# 1. Create prescription
POST /api/prescriptions
{
  "medication_name": "أموكسيسيلين",
  ...
}

# 2. Add Arabic translation
POST /api/prescriptions/1/translations
{
  "language_code": "ar",
  "instructions": "يؤخذ بعد الأكل مع كوب ماء"
}

# 3. Add English translation
POST /api/prescriptions/1/translations
{
  "language_code": "en",
  "instructions": "Take after meals with a glass of water"
}

# 4. Patient can view in preferred language
GET /api/prescriptions/1
Accept-Language: en
```

---

## 📁 File Structure

```
BASHRA.AI-backend/
├── controllers/
│   ├── medicationsController.js
│   ├── prescriptionTemplatesController.js
│   └── prescriptionsController.js
├── routes/
│   ├── medicationsRoutes.js
│   ├── prescriptionTemplatesRoutes.js
│   ├── prescriptionsRoutes.js
│   └── index.js
├── docs/
│   └── 14-medications-prescriptions/
│       ├── README.md (هذا الملف)
│       ├── 01-MEDICATIONS_API.md
│       ├── 02-PRESCRIPTION_TEMPLATES_API.md
│       └── 03-PRESCRIPTIONS_API.md
└── New-Sql-Update(11-25-2025).sql
```

---

## 🔗 Related Systems

### **المتطلبات:**
- ✅ Authentication System (نظام المصادقة)
- ✅ Doctors Management (إدارة الأطباء)
- ✅ Patients Management (إدارة المرضى)
- ✅ Medical Records (السجلات الطبية)

### **الأنظمة المرتبطة:**
- 📋 Patient Profiles (ملفات المرضى)
- 🏥 Medical Records (السجلات الطبية)
- 👨‍⚕️ Doctor Management (إدارة الأطباء)
- 📦 Subscription Management (إدارة الاشتراكات)

---

## ⚠️ Important Notes

### **1. Security Considerations:**
- ✅ جميع APIs محمية بـ JWT Authentication
- ✅ Role-based access control
- ✅ Doctor isolation (كل طبيب يرى بياناته فقط)
- ✅ Patient privacy (المريض يرى وصفاته فقط)

### **2. Data Integrity:**
- ✅ Foreign key constraints
- ✅ Cascade delete protection
- ✅ Unique constraints (UUID, prescription_number)
- ✅ Status validation

### **3. Business Rules:**
- ✅ لا يمكن حذف دواء مستخدم في قوالب
- ✅ لا يمكن تعديل وصفة تم صرفها
- ✅ لا يمكن صرف وصفة ملغاة أو منتهية
- ✅ Refills management

---

## 📚 Documentation Links

### **Detailed API Documentation:**
1. [Medications API](./01-MEDICATIONS_API.md) - دليل الأدوية
2. [Prescription Templates API](./02-PRESCRIPTION_TEMPLATES_API.md) - القوالب
3. [Prescriptions API](./03-PRESCRIPTIONS_API.md) - الوصفات الطبية

### **Related Documentation:**
- [Authentication System](../01-authentication/)
- [Patient Profiles](../13-patient-profiles/)
- [Doctor Management](../02-profile-system/)

---

## 🧪 Testing

### **Test Scenarios:**

#### **1. Medications:**
```bash
# Create medication
# Get medications
# Update medication
# Delete medication (should fail if used in templates)
# Toggle status
```

#### **2. Templates:**
```bash
# Create template with items
# Get templates
# Add item to template
# Update item
# Delete item
# Delete template
# Use template (increment count)
```

#### **3. Prescriptions:**
```bash
# Create prescription
# Get prescriptions (role-based)
# Update prescription
# Cancel prescription
# Fill prescription
# Refill prescription
# Add translations
```

---

## 🔄 Version History

### **Version 1.0.0 (25 Nov 2025)**
- ✅ Initial release
- ✅ Medications CRUD
- ✅ Prescription Templates CRUD
- ✅ Prescriptions CRUD
- ✅ Multi-language support
- ✅ Refills management
- ✅ Status tracking

---

## 👥 Contributors

**تم التطوير بواسطة:** Cascade AI  
**التاريخ:** 25 نوفمبر 2025  
**المشروع:** BASHRA.AI Backend

---

<div align="center">

**💊 Medications & Prescriptions System - Complete! 💊**

**نظام متكامل لإدارة الأدوية والوصفات الطبية الإلكترونية**

</div>

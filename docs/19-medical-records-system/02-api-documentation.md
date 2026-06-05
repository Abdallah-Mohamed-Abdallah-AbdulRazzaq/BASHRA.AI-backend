# Medical Records API Documentation
# توثيق API للسجلات الطبية

---

## 📌 Base URLs

```
Patient APIs:  /api/patient/medical-records
Doctor APIs:   /api/doctor/medical-records
Admin APIs:    /api/admin/medical-records
```

---

## 👨‍⚕️ Doctor APIs (الأطباء)

### 1. Create Medical Record
**إنشاء سجل طبي**

```http
POST /api/doctor/medical-records
```

**Headers:**
```
Authorization: Bearer {doctor_token}
Accept-Language: ar|en
Content-Type: application/json | multipart/form-data
```

**Body:**
```json
{
  "appointment_id": 15,
  "patient_id": 5,
  "next_appointment_recommended": true,
  "follow_up_date": "2024-12-20",
  "vital_signs": {
    "blood_pressure": "120/80",
    "heart_rate": 75,
    "temperature": 37.0,
    "weight": 70,
    "height": 170,
    "respiratory_rate": 16,
    "oxygen_saturation": 98
  },
  "skin_condition_severity": "moderate",
  "affected_body_areas": ["face", "arms", "back"],
  "treatment_response": "good",
  "patient_consent": true,
  "record_status": "final",
  "translations": {
    "ar": {
      "chief_complaint": "صداع مستمر منذ 3 أيام",
      "history_of_present_illness": "بدأ الصداع تدريجياً",
      "physical_examination": "فحص عام طبيعي",
      "assessment": "صداع نصفي محتمل",
      "diagnosis": "صداع نصفي",
      "differential_diagnosis": "صداع توتري، صداع عنقودي",
      "treatment_plan": "أدوية مسكنة وراحة",
      "follow_up_instructions": "مراجعة بعد أسبوع",
      "doctor_notes": "المريض يستجيب جيداً للعلاج"
    },
    "en": {
      "chief_complaint": "Persistent headache for 3 days",
      "history_of_present_illness": "Headache started gradually",
      "physical_examination": "Normal general examination",
      "assessment": "Possible migraine",
      "diagnosis": "Migraine",
      "differential_diagnosis": "Tension headache, cluster headache",
      "treatment_plan": "Pain relievers and rest",
      "follow_up_instructions": "Follow up after one week",
      "doctor_notes": "Patient responding well to treatment"
    }
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "تم إنشاء السجل الطبي بنجاح",
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_id": 15,
    "patient_id": 5,
    "doctor_id": 2,
    "visit_date": "2024-12-05T10:30:00.000Z",
    "record_status": "final",
    "chief_complaint": "صداع مستمر منذ 3 أيام",
    "diagnosis": "صداع نصفي",
    "treatment_plan": "أدوية مسكنة وراحة"
  }
}
```

---

### 2. Get My Medical Records
**جلب سجلاتي الطبية**

```http
GET /api/doctor/medical-records
```

**Query Parameters:**
```javascript
{
  patient_id: number,           // optional
  record_status: "draft|final|amended",  // optional
  from_date: "YYYY-MM-DD",     // optional
  to_date: "YYYY-MM-DD",       // optional
  page: 1,                     // optional
  limit: 20                    // optional
}
```

**Response 200:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "pages": 3,
  "data": [
    {
      "id": 25,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "appointment_id": 15,
      "patient_id": 5,
      "patient_name": "محمد أحمد",
      "patient_email": "patient@example.com",
      "visit_date": "2024-12-05T10:30:00.000Z",
      "record_status": "final",
      "chief_complaint": "صداع مستمر",
      "diagnosis": "صداع نصفي"
    }
  ]
}
```

---

### 3. Get Medical Record Details
**تفاصيل سجل طبي**

```http
GET /api/doctor/medical-records/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "appointment_id": 15,
    "patient_id": 5,
    "patient_name": "محمد أحمد",
    "patient_email": "patient@example.com",
    "patient_phone": "+20123456789",
    "patient_dob": "1990-01-01",
    "patient_gender": "male",
    "doctor_id": 2,
    "visit_date": "2024-12-05T10:30:00.000Z",
    "next_appointment_recommended": true,
    "follow_up_date": "2024-12-20",
    "vital_signs": {
      "blood_pressure": "120/80",
      "heart_rate": 75,
      "temperature": 37.0
    },
    "skin_condition_severity": "moderate",
    "affected_body_areas": ["face", "arms"],
    "treatment_response": "good",
    "patient_consent": true,
    "record_status": "final",
    "translations": {
      "ar": {
        "chief_complaint": "صداع مستمر",
        "diagnosis": "صداع نصفي",
        "treatment_plan": "أدوية مسكنة"
      },
      "en": {
        "chief_complaint": "Persistent headache",
        "diagnosis": "Migraine",
        "treatment_plan": "Pain relievers"
      }
    }
  }
}
```

---

### 4. Update Medical Record
**تحديث سجل طبي**

```http
PUT /api/doctor/medical-records/:id
```

**Body:**
```json
{
  "record_status": "final",
  "vital_signs": {
    "blood_pressure": "125/82"
  },
  "translations": {
    "ar": {
      "doctor_notes": "ملاحظات إضافية"
    }
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم تحديث السجل الطبي بنجاح"
}
```

---

### 5. Delete Medical Record
**حذف سجل طبي (مسودة فقط)**

```http
DELETE /api/doctor/medical-records/:id
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم حذف السجل الطبي بنجاح"
}
```

---

### 6. Get Patient Medical History
**التاريخ الطبي للمريض**

```http
GET /api/doctor/medical-records/patient/:patient_id/history
```

**Response 200:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 25,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "visit_date": "2024-12-05T10:30:00.000Z",
      "record_status": "final",
      "vital_signs": {...},
      "diagnosis": "صداع نصفي",
      "treatment_plan": "أدوية مسكنة",
      "doctor_name": "د. أحمد محمد",
      "doctor_specialty": "طب الجلدية"
    }
  ]
}
```

---

## 👤 Patient APIs (المرضى)

### 1. Get My Medical Records
**جلب سجلاتي الطبية**

```http
GET /api/patient/medical-records
```

**Query Parameters:**
```javascript
{
  doctor_id: number,           // optional
  from_date: "YYYY-MM-DD",    // optional
  to_date: "YYYY-MM-DD",      // optional
  page: 1,                    // optional
  limit: 20                   // optional
}
```

**Response 200:**
```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "id": 25,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "appointment_id": 15,
      "visit_date": "2024-12-05T10:30:00.000Z",
      "record_status": "final",
      "vital_signs": {...},
      "doctor_name": "د. أحمد محمد",
      "doctor_specialty": "طب الجلدية",
      "doctor_email": "doctor@example.com",
      "chief_complaint": "صداع مستمر",
      "diagnosis": "صداع نصفي",
      "treatment_plan": "أدوية مسكنة"
    }
  ]
}
```

**Note:** المرضى يرون فقط السجلات النهائية (final)

---

### 2. Get Medical Record Details
**تفاصيل سجل طبي**

```http
GET /api/patient/medical-records/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "visit_date": "2024-12-05T10:30:00.000Z",
    "vital_signs": {...},
    "doctor_name": "د. أحمد محمد",
    "doctor_specialty": "طب الجلدية",
    "translations": {
      "ar": {...},
      "en": {...}
    }
  }
}
```

---

### 3. Get Medical Records Summary
**ملخص السجلات الطبية**

```http
GET /api/patient/medical-records/summary
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_records": 12,
      "total_doctors": 3,
      "last_visit_date": "2024-12-05T10:30:00.000Z",
      "follow_ups_recommended": 2
    },
    "recent_records": [
      {
        "id": 25,
        "uuid": "550e8400-e29b-41d4-a716-446655440000",
        "visit_date": "2024-12-05T10:30:00.000Z",
        "doctor_name": "د. أحمد محمد",
        "doctor_specialty": "طب الجلدية",
        "diagnosis": "صداع نصفي"
      }
    ]
  }
}
```

---

## 👨‍💼 Admin APIs (الإداريين)

### 1. Get All Medical Records
**جلب جميع السجلات الطبية**

```http
GET /api/admin/medical-records
```

**Query Parameters:**
```javascript
{
  patient_id: number,          // optional
  doctor_id: number,           // optional
  record_status: "draft|final|amended",  // optional
  from_date: "YYYY-MM-DD",    // optional
  to_date: "YYYY-MM-DD",      // optional
  page: 1,                    // optional
  limit: 20                   // optional
}
```

**Response 200:**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "data": [
    {
      "id": 25,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "appointment_id": 15,
      "patient_id": 5,
      "patient_name": "محمد أحمد",
      "patient_email": "patient@example.com",
      "doctor_id": 2,
      "doctor_name": "د. أحمد محمد",
      "doctor_specialty": "طب الجلدية",
      "doctor_email": "doctor@example.com",
      "visit_date": "2024-12-05T10:30:00.000Z",
      "record_status": "final",
      "chief_complaint": "صداع مستمر",
      "diagnosis": "صداع نصفي"
    }
  ]
}
```

---

### 2. Get Medical Record Details
**تفاصيل سجل طبي**

```http
GET /api/admin/medical-records/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 25,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "patient_name": "محمد أحمد",
    "patient_email": "patient@example.com",
    "doctor_name": "د. أحمد محمد",
    "doctor_specialty": "طب الجلدية",
    "visit_date": "2024-12-05T10:30:00.000Z",
    "vital_signs": {...},
    "translations": {
      "ar": {...},
      "en": {...}
    }
  }
}
```

---

### 3. Delete Medical Record
**حذف سجل طبي نهائياً**

```http
DELETE /api/admin/medical-records/:id
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم حذف السجل الطبي بنجاح"
}
```

---

### 4. Get Statistics
**الإحصائيات**

```http
GET /api/admin/medical-records/statistics
```

**Query Parameters:**
```javascript
{
  from_date: "YYYY-MM-DD",    // optional
  to_date: "YYYY-MM-DD",      // optional
  doctor_id: number           // optional
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "draft": 10,
    "final": 130,
    "amended": 10,
    "follow_ups_recommended": 25,
    "unique_patients": 80,
    "unique_doctors": 15
  }
}
```

---

### 5. Get Patient Medical History
**التاريخ الطبي الكامل للمريض**

```http
GET /api/admin/medical-records/patient/:patient_id/history
```

**Response 200:**
```json
{
  "success": true,
  "patient": {
    "id": 5,
    "email": "patient@example.com",
    "phone": "+20123456789",
    "full_name": "محمد أحمد",
    "date_of_birth": "1990-01-01",
    "gender": "male"
  },
  "records_count": 12,
  "data": [...]
}
```

---

## 🔴 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "معرف الموعد والمريض مطلوبان"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "السجل الطبي غير موجود"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "يوجد سجل طبي لهذا الموعد بالفعل"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "لا يمكن حذف السجلات النهائية أو المعدلة"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "خطأ في إنشاء السجل الطبي",
  "error": "Error details (development only)"
}
```

---

## 📝 Notes

### Record Status Flow
```
draft → final → amended
  ↓
delete (doctor: draft only)
delete (admin: any status)
```

### Permissions
- **Doctor**: Own records only, can delete drafts
- **Patient**: Own records only (final), read-only
- **Admin**: All records, can delete any

### Language Support
All endpoints support `Accept-Language` header:
- `ar` - Arabic (default)
- `en` - English

### Vital Signs Format
```json
{
  "blood_pressure": "120/80",
  "heart_rate": 75,
  "temperature": 37.0,
  "weight": 70,
  "height": 170,
  "respiratory_rate": 16,
  "oxygen_saturation": 98
}
```

---

**Total Endpoints:** 14  
**Doctor APIs:** 6  
**Patient APIs:** 3  
**Admin APIs:** 5

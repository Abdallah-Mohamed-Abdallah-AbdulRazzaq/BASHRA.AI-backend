# Appointments API Endpoints
# نقاط نهاية API للمواعيد

---

## 📌 Base URLs

```
Patient APIs:  /api/patient/appointments
Doctor APIs:   /api/doctor/appointments
Admin APIs:    /api/admin/appointments
```

---

## 👤 Patient APIs (المرضى)

### 1. Get Available Slots
**جلب المواعيد المتاحة حسب اليوم**

```http
GET /api/patient/appointments/available-slots
```

**Headers:**
```
Authorization: Bearer {patient_token}
Accept-Language: ar|en
```

**Query Parameters:**
```javascript
{
  doctor_id: number,        // required
  day_of_week: "saturday|sunday|monday|tuesday|wednesday|thursday|friday",  // required
  consultation_type: "online|in_clinic"  // optional
}
```

**Example:**
```
GET /api/patient/appointments/available-slots?doctor_id=3&day_of_week=sunday&consultation_type=online
```

**Response 200:**
```json
{
  "success": true,
  "day_of_week": "sunday",
  "total_slots": 8,
  "data": [
    {
      "time": "09:00:00",
      "duration": 30,
      "price": "200.00",
      "consultation_type": "online",
      "clinic_id": 1,
      "clinic_name": "عيادة القاهرة"
    },
    {
      "time": "09:30:00",
      "duration": 30,
      "price": "200.00",
      "consultation_type": "online",
      "clinic_id": 1,
      "clinic_name": "عيادة القاهرة"
    }
  ]
}
```

**Notes:**
- يعرض جميع الفترات المتاحة في اليوم المحدد
- لا يتحقق من المواعيد المحجوزة في تواريخ محددة
- المريض يختار اليوم ثم التاريخ عند الحجز

---

### 2. Book Appointment
**حجز موعد**

```http
POST /api/patient/appointments
```

**Headers:**
```
Authorization: Bearer {patient_token}
Accept-Language: ar|en
Content-Type: application/json | multipart/form-data
```

**Body:**
```json
{
  "doctor_id": 2,
  "clinic_id": 1,
  "scheduled_date": "2024-12-10",
  "scheduled_time": "09:00:00",
  "duration_minutes": 30,
  "appointment_type": "consultation",
  "urgency_level": "medium",
  "consultation_fee": 200.00,
  "currency_code": "EGP",
  "translations": {
    "ar": {
      "chief_complaint": "صداع مستمر",
      "symptoms_description": "صداع منذ 3 أيام",
      "notes": "ملاحظات إضافية"
    },
    "en": {
      "chief_complaint": "Persistent headache",
      "symptoms_description": "Headache for 3 days",
      "notes": "Additional notes"
    }
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "تم حجز الموعد بنجاح",
  "data": {
    "id": 15,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "patient_id": 5,
    "doctor_id": 2,
    "doctor_name": "د. أحمد محمد",
    "doctor_specialty": "طب الجلدية",
    "clinic_name": "عيادة القاهرة",
    "scheduled_date": "2024-12-10",
    "scheduled_time": "09:00:00",
    "status": "pending",
    "consultation_fee": "200.00"
  }
}
```

---

### 3. Get My Appointments
**جلب مواعيدي**

```http
GET /api/patient/appointments
```

**Query Parameters:**
```javascript
{
  status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled",
  from_date: "YYYY-MM-DD",
  to_date: "YYYY-MM-DD",
  page: 1,
  limit: 20
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
      "id": 15,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "doctor_name": "د. أحمد محمد",
      "doctor_specialty": "طب الجلدية",
      "clinic_name": "عيادة القاهرة",
      "scheduled_date": "2024-12-10",
      "scheduled_time": "09:00:00",
      "status": "pending",
      "translations": {
        "chief_complaint": "صداع مستمر",
        "symptoms_description": "صداع منذ 3 أيام"
      }
    }
  ]
}
```

---

### 4. Get Appointment Details
**جلب تفاصيل موعد**

```http
GET /api/patient/appointments/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "patient_id": 5,
    "doctor_id": 2,
    "doctor_name": "د. أحمد محمد",
    "doctor_specialty": "طب الجلدية",
    "doctor_email": "doctor@example.com",
    "clinic_name": "عيادة القاهرة",
    "clinic_phone": "+20123456789",
    "clinic_email": "clinic@example.com",
    "scheduled_date": "2024-12-10",
    "scheduled_time": "09:00:00",
    "duration_minutes": 30,
    "status": "pending",
    "consultation_fee": "200.00",
    "translations": {
      "ar": {
        "chief_complaint": "صداع مستمر",
        "symptoms_description": "صداع منذ 3 أيام",
        "notes": "ملاحظات"
      },
      "en": {
        "chief_complaint": "Persistent headache",
        "symptoms_description": "Headache for 3 days",
        "notes": "Notes"
      }
    }
  }
}
```

---

### 5. Cancel Appointment
**إلغاء موعد**

```http
PATCH /api/patient/appointments/:id/cancel
```

**Body:**
```json
{
  "cancellation_reason": "ظروف طارئة"
}
// OR
{
  "cancellation_reason": {
    "ar": "ظروف طارئة",
    "en": "Emergency circumstances"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم إلغاء الموعد بنجاح"
}
```

---

### 6. Reschedule Appointment
**إعادة جدولة موعد**

```http
PATCH /api/patient/appointments/:id/reschedule
```

**Body:**
```json
{
  "scheduled_date": "2024-12-12",
  "scheduled_time": "10:00:00"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم إعادة جدولة الموعد بنجاح"
}
```

---

## 👨‍⚕️ Doctor APIs (الأطباء)

### 1. Get Today's Appointments
**مواعيد اليوم**

```http
GET /api/doctor/appointments/today
```

**Response 200:**
```json
{
  "success": true,
  "date": "2024-12-05",
  "count": 5,
  "data": [
    {
      "id": 15,
      "patient_name": "محمد أحمد",
      "patient_phone": "+20123456789",
      "clinic_name": "عيادة القاهرة",
      "scheduled_time": "09:00:00",
      "duration_minutes": 30,
      "status": "confirmed",
      "appointment_type": "consultation"
    }
  ]
}
```

---

### 2. Get Statistics
**الإحصائيات**

```http
GET /api/doctor/appointments/statistics
```

**Query Parameters:**
```javascript
{
  from_date: "YYYY-MM-DD",
  to_date: "YYYY-MM-DD"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "pending": 10,
    "confirmed": 20,
    "in_progress": 2,
    "completed": 100,
    "cancelled": 15,
    "no_show": 3,
    "rescheduled": 0
  }
}
```

---

### 3. Get My Appointments
**جلب مواعيدي**

```http
GET /api/doctor/appointments
```

**Query Parameters:**
```javascript
{
  status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled",
  appointment_type: "consultation|follow_up|urgent|routine",
  from_date: "YYYY-MM-DD",
  to_date: "YYYY-MM-DD",
  page: 1,
  limit: 20
}
```

---

### 4. Confirm Appointment
**تأكيد موعد**

```http
PATCH /api/doctor/appointments/:id/confirm
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم تأكيد الموعد بنجاح"
}
```

---

### 5. Start Appointment
**بدء موعد**

```http
PATCH /api/doctor/appointments/:id/start
```

---

### 6. Complete Appointment
**إكمال موعد**

```http
PATCH /api/doctor/appointments/:id/complete
```

---

### 7. Mark No-Show
**تسجيل عدم حضور**

```http
PATCH /api/doctor/appointments/:id/no-show
```

---

### 8. Cancel Appointment
**إلغاء موعد**

```http
PATCH /api/doctor/appointments/:id/cancel
```

**Body:**
```json
{
  "cancellation_reason": {
    "ar": "ظروف طارئة",
    "en": "Emergency"
  }
}
```

---

## 👨‍💼 Admin APIs (الإداريين)

### 1. Get All Appointments
**جلب جميع المواعيد**

```http
GET /api/admin/appointments
```

**Query Parameters:**
```javascript
{
  status: "pending|confirmed|in_progress|completed|cancelled|no_show|rescheduled",
  doctor_id: number,
  patient_id: number,
  appointment_type: "consultation|follow_up|urgent|routine",
  urgency_level: "low|medium|high|emergency",
  payment_status: "pending|paid|refunded|failed",
  from_date: "YYYY-MM-DD",
  to_date: "YYYY-MM-DD",
  page: 1,
  limit: 20
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
      "id": 15,
      "patient_name": "محمد أحمد",
      "patient_email": "patient@example.com",
      "patient_phone": "+20123456789",
      "doctor_name": "د. أحمد محمد",
      "doctor_specialty": "طب الجلدية",
      "doctor_email": "doctor@example.com",
      "clinic_name": "عيادة القاهرة",
      "scheduled_date": "2024-12-10",
      "scheduled_time": "09:00:00",
      "status": "pending",
      "payment_status": "pending",
      "consultation_fee": "200.00"
    }
  ]
}
```

---

### 2. Get Appointment Details
**تفاصيل موعد**

```http
GET /api/admin/appointments/:id
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "patient_name": "محمد أحمد",
    "patient_email": "patient@example.com",
    "patient_phone": "+20123456789",
    "patient_dob": "1990-01-01",
    "patient_gender": "male",
    "doctor_name": "د. أحمد محمد",
    "doctor_specialty": "طب الجلدية",
    "doctor_email": "doctor@example.com",
    "clinic_name": "عيادة القاهرة",
    "clinic_phone": "+20123456789",
    "clinic_email": "clinic@example.com",
    "created_by_user_email": "patient@example.com",
    "created_by_user_name": "محمد أحمد",
    "cancelled_by_doctor_email": null,
    "scheduled_date": "2024-12-10",
    "scheduled_time": "09:00:00",
    "duration_minutes": 30,
    "status": "pending",
    "consultation_fee": "200.00",
    "payment_status": "pending",
    "translations": {
      "ar": {...},
      "en": {...}
    }
  }
}
```

---

### 3. Create Appointment
**إنشاء موعد**

```http
POST /api/admin/appointments
```

**Body:**
```json
{
  "patient_id": 5,
  "doctor_id": 2,
  "clinic_id": 1,
  "scheduled_date": "2024-12-10",
  "scheduled_time": "09:00:00",
  "duration_minutes": 30,
  "appointment_type": "consultation",
  "urgency_level": "medium",
  "consultation_fee": 200.00,
  "currency_code": "EGP",
  "payment_status": "pending",
  "translations": {
    "ar": {
      "chief_complaint": "صداع",
      "symptoms_description": "صداع مستمر",
      "notes": "ملاحظات"
    }
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "تم إنشاء الموعد بنجاح",
  "data": {...}
}
```

---

### 4. Update Appointment
**تحديث موعد**

```http
PUT /api/admin/appointments/:id
```

**Body:**
```json
{
  "scheduled_date": "2024-12-12",
  "scheduled_time": "10:00:00",
  "status": "confirmed",
  "payment_status": "paid",
  "consultation_fee": 250.00
}
```

---

### 5. Cancel Appointment
**إلغاء موعد**

```http
PATCH /api/admin/appointments/:id/cancel
```

**Body:**
```json
{
  "cancellation_reason": {
    "ar": "إلغاء إداري",
    "en": "Administrative cancellation"
  }
}
```

---

### 6. Delete Appointment
**حذف موعد**

```http
DELETE /api/admin/appointments/:id
```

**Response 200:**
```json
{
  "success": true,
  "message": "تم حذف الموعد بنجاح"
}
```

---

### 7. Get Statistics
**الإحصائيات**

```http
GET /api/admin/appointments/statistics
```

**Query Parameters:**
```javascript
{
  from_date: "YYYY-MM-DD",
  to_date: "YYYY-MM-DD",
  doctor_id: number
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total": 500,
    "pending": 50,
    "confirmed": 100,
    "in_progress": 10,
    "completed": 300,
    "cancelled": 30,
    "no_show": 10,
    "rescheduled": 0,
    "total_revenue": "50000.00",
    "pending_revenue": "10000.00"
  }
}
```

---

## 🔴 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "معرف الطبيب والتاريخ والوقت مطلوبة"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "غير مصرح"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "الطبيب غير متاح حالياً"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "الموعد غير موجود"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "هذا الموعد محجوز بالفعل"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "خطأ في جلب المواعيد",
  "error": "Error details (development only)"
}
```

---

## 📝 Notes

### Status Transitions
```
pending → confirmed → in_progress → completed ✅
pending → cancelled ✅
confirmed → cancelled ✅
in_progress → cancelled ✅
completed → cancelled ❌
```

### Permissions
- **Patient**: Can only access their own appointments
- **Doctor**: Can only access their own appointments
- **Admin**: Can access all appointments

### Language Support
All endpoints support `Accept-Language` header:
- `ar` - Arabic (default)
- `en` - English

---

**Total Endpoints:** 22  
**Patient APIs:** 6  
**Doctor APIs:** 9  
**Admin APIs:** 7

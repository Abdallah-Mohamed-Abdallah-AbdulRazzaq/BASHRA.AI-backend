# Assistant Profile API Documentation
# توثيق واجهة برمجة التطبيقات للملف الشخصي للمساعد

## Base URL
```
/api/profile-assistant
```

## Authentication
جميع endpoints تتطلب JWT token في الـ header وصلاحيات Assistant:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get Assistant Profile
### جلب الملف الشخصي للمساعد

**Endpoint:** `GET /api/profile-assistant`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (optional, default: ar)
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم جلب الملف الشخصي بنجاح",
  "data": {
    "id": 1,
    "assistant_id": 10,
    "doctor_id": 50,
    "date_of_birth": "1995-02-15",
    "gender": "female",
    "nationality": "Egyptian",
    "profile_picture_url": "/upload/files/profile-picture/assistant/assistant_10_123.jpg",
    "emergency_contact_phone": "+201000000000",
    "timezone": "Africa/Cairo",
    "language_preference": "ar",
    "full_name": "مساعدة الطبيب",
    "job_title": "Medical Assistant",
    "emergency_contact_name": "والد المساعدة",
    "emergency_contact_relationship": "Father",
    "hire_date": "2023-01-01",
    "employment_status": "active"
  }
}
```

---

### 2. Get Complete Assistant Data
### جلب بيانات المساعد الكاملة

**Endpoint:** `GET /api/profile-assistant/complete`

**Headers:**
```
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": 10,
      "email": "assistant@example.com",
      "status": "active"
    },
    "profile": {
      "id": 1,
      "assistant_id": 10,
      "doctor_id": 50,
      ...
    },
    "translations": {
      "ar": {
        "full_name": "مساعدة الطبيب",
        "job_title": "مساعدة طبية",
        ...
      },
      "en": {
        "full_name": "Medical Assistant",
        "job_title": "Medical Assistant",
        ...
      }
    }
  }
}
```

---

### 3. Update Assistant Profile
### تحديث الملف الشخصي للمساعد

**Endpoint:** `PUT /api/profile-assistant`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (required for single language update)
Content-Type: application/json
```

**Request Body (Single Language):**
```json
{
  "date_of_birth": "1995-02-15",
  "gender": "female",
  "nationality": "Egyptian",
  "emergency_contact_phone": "+201000000000",
  "timezone": "Africa/Cairo",
  "language_preference": "ar",
  "full_name": "مساعدة الطبيب",
  "job_title": "مساعدة إدارية",
  "emergency_contact_name": "الطوارئ",
  "emergency_contact_relationship": "أب"
}
```

**Request Body (Multi-Language):**
```json
{
  "date_of_birth": "1995-02-15",
  "translations": {
    "ar": {
      "full_name": "مساعدة الطبيب",
      "job_title": "مساعدة إدارية"
    },
    "en": {
      "full_name": "Doctor Assistant",
      "job_title": "Admin Assistant"
    }
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم تحديث الملف الشخصي بنجاح",
  "data": { ... }
}
```

---

### 4. Upload Profile Picture
### رفع الصورة الشخصية

**Endpoint:** `POST /api/profile-assistant/picture`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
- Field: `profile_picture`
- Type: File (Image)

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "/upload/files/profile-picture/assistant/assistant_10_uuid.jpg",
    "file_uuid": "...",
    "file_id": 124
  }
}
```

---

### 5. Delete Profile Picture
### حذف الصورة الشخصية

**Endpoint:** `DELETE /api/profile-assistant/picture`

**Headers:**
```
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم حذف الصورة الشخصية بنجاح"
}
```

---

### 6. Deactivate Account
### تعطيل الحساب

**Endpoint:** `DELETE /api/profile-assistant`

**Headers:**
```
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم تعطيل الحساب بنجاح"
}
```

---

### 7. Reactivate Account
### إعادة تفعيل الحساب

**Endpoint:** `PATCH /api/profile-assistant/reactivate`

**Headers:**
```
Authorization: Bearer <token>
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم إعادة تفعيل الحساب بنجاح"
}
```

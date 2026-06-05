# Admin Profile API Documentation
# توثيق واجهة برمجة التطبيقات للملف الشخصي للمسؤول

## Base URL
```
/api/profile-admin
```

## Authentication
جميع endpoints تتطلب JWT token في الـ header وصلاحيات Admin:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get Admin Profile
### جلب الملف الشخصي للمسؤول

**Endpoint:** `GET /api/profile-admin`

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
    "admin_id": 5,
    "date_of_birth": "1985-05-20",
    "gender": "male",
    "nationality": "Saudi",
    "profile_picture_url": "/upload/files/profile-picture/admin/admin_5_123.jpg",
    "emergency_contact_phone": "+966500000000",
    "timezone": "Asia/Riyadh",
    "language_preference": "ar",
    "full_name": "مدير النظام",
    "job_title": "Senior System Administrator",
    "department": "IT",
    "emergency_contact_name": "شقيق المدير",
    "emergency_contact_relationship": "Brother",
    "hire_date": "2020-01-01",
    "employment_status": "active"
  }
}
```

---

### 2. Get Complete Admin Data
### جلب بيانات المسؤول الكاملة

**Endpoint:** `GET /api/profile-admin/complete`

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
      "id": 5,
      "email": "admin@example.com",
      "admin_type": "super_admin",
      "status": "active"
    },
    "profile": {
      "id": 1,
      "admin_id": 5,
      "date_of_birth": "1985-05-20",
      ...
    },
    "translations": {
      "ar": {
        "full_name": "مدير النظام",
        "job_title": "مدير نظام أول",
        ...
      },
      "en": {
        "full_name": "System Admin",
        "job_title": "Senior System Administrator",
        ...
      }
    }
  }
}
```

---

### 3. Update Admin Profile
### تحديث الملف الشخصي للمسؤول

**Endpoint:** `PUT /api/profile-admin`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (required for single language update)
Content-Type: application/json
```

**Request Body (Single Language):**
```json
{
  "date_of_birth": "1985-05-20",
  "gender": "male",
  "nationality": "Saudi",
  "emergency_contact_phone": "+966500000000",
  "timezone": "Asia/Riyadh",
  "language_preference": "ar",
  "full_name": "مدير النظام",
  "job_title": "مدير تقنية المعلومات",
  "department": "IT",
  "emergency_contact_name": "الطوارئ",
  "emergency_contact_relationship": "أخ"
}
```

**Request Body (Multi-Language):**
```json
{
  "date_of_birth": "1985-05-20",
  "translations": {
    "ar": {
      "full_name": "مدير النظام",
      "job_title": "مدير تقنية المعلومات",
      "department": "تقنية المعلومات"
    },
    "en": {
      "full_name": "System Admin",
      "job_title": "IT Manager",
      "department": "IT"
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

**Endpoint:** `POST /api/profile-admin/picture`

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
    "profile_picture_url": "/upload/files/profile-picture/admin/admin_5_uuid.jpg",
    "file_uuid": "...",
    "file_id": 123
  }
}
```

---

### 5. Delete Profile Picture
### حذف الصورة الشخصية

**Endpoint:** `DELETE /api/profile-admin/picture`

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

**Endpoint:** `DELETE /api/profile-admin`

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

**Endpoint:** `PATCH /api/profile-admin/reactivate`

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

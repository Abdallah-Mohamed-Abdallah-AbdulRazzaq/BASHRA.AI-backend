# User Profile API Documentation
# توثيق واجهة برمجة التطبيقات للملف الشخصي للمستخدم

## Base URL
```
/api/profile-user
```

## Authentication
جميع endpoints تتطلب JWT token في الـ header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Get User Profile
### جلب الملف الشخصي للمستخدم

**Endpoint:** `GET /api/profile-user`

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
    "user_id": 123,
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "nationality": "Egyptian",
    "profile_picture_url": "/upload/profiles/user/user_123_1234567890.jpg",
    "emergency_contact_phone": "+20123456789",
    "timezone": "Africa/Cairo",
    "language_preference": "ar",
    "full_name": "أحمد محمد",
    "emergency_contact_name": "فاطمة أحمد",
    "emergency_contact_relationship": "أخت",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T10:00:00.000Z"
  }
}
```

**ملاحظة:** الحقول تظهر بدون `_ar` أو `_en` بناءً على اللغة المطلوبة.

---

### 2. Update User Profile
### تحديث الملف الشخصي للمستخدم

**Endpoint:** `PUT /api/profile-user`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (required - determines which translation to update)
Content-Type: application/json
```

**Request Body (Simplified - New Version):**
```json
{
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "nationality": "Egyptian",
  "emergency_contact_phone": "+20123456789",
  "timezone": "Africa/Cairo",
  "language_preference": "ar",
  "full_name": "أحمد محمد علي",
  "emergency_contact_name": "فاطمة أحمد",
  "emergency_contact_relationship": "أخت"
}
```

**Field Descriptions:**

**Basic Fields (user_profiles table):**
- `date_of_birth`: تاريخ الميلاد (YYYY-MM-DD format) - اختياري
- `gender`: الجنس (`male`, `female`, `other`, `prefer_not_to_say`) - اختياري
- `nationality`: الجنسية - اختياري
- `emergency_contact_phone`: رقم هاتف جهة الاتصال في حالات الطوارئ - اختياري
- `timezone`: المنطقة الزمنية - اختياري
- `language_preference`: اللغة المفضلة (`ar` أو `en`) - اختياري

**Translation Fields (user_profile_translations table):**
- `full_name`: الاسم الكامل - اختياري (يتم تحديثه حسب Accept-Language header)
- `emergency_contact_name`: اسم جهة الاتصال - اختياري
- `emergency_contact_relationship`: العلاقة بجهة الاتصال - اختياري

**Important Notes:**
- حقول الترجمة (`full_name`, `emergency_contact_name`, `emergency_contact_relationship`) يتم تحديثها حسب اللغة المُرسلة في `Accept-Language` header
- لتحديث كلا اللغتين، أرسل طلبين منفصلين (واحد لكل لغة)
- يمكنك إرسال أي عدد من الحقول - فقط ما تريد تحديثه

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم تحديث الملف الشخصي بنجاح",
  "data": {
    "id": 1,
    "user_id": 123,
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "nationality": "Egyptian",
    "profile_picture_url": "/upload/profiles/user/user_123_1234567890.jpg",
    "emergency_contact_phone": "+20123456789",
    "timezone": "Africa/Cairo",
    "language_preference": "ar",
    "full_name": "أحمد محمد علي",
    "emergency_contact_name": "فاطمة أحمد",
    "emergency_contact_relationship": "أخت",
    "created_at": "2024-01-01T10:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "message": "صيغة تاريخ الميلاد غير صحيحة. استخدم YYYY-MM-DD"
}
```

---

### 3. Upload Profile Picture
### رفع الصورة الشخصية

**Endpoint:** `POST /api/profile-user/picture`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (optional)
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
- Field name: `profile_picture`
- File type: JPEG, PNG, JPG, WebP
- Max size: 5MB

**Example using cURL:**
```bash
curl -X POST \
  http://localhost:3006/api/profile-user/picture \
  -H 'Authorization: Bearer <token>' \
  -F 'profile_picture=@/path/to/image.jpg'
```

**Example using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('profile_picture', fileInput.files[0]);

fetch('/api/profile-user/picture', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "/upload/profiles/user/user_123_1234567890.jpg"
  }
}
```

**Validation Errors (400):**
```json
{
  "success": false,
  "message": "نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP)"
}
```

```json
{
  "success": false,
  "message": "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت"
}
```

---

### 4. Delete Profile Picture
### حذف الصورة الشخصية

**Endpoint:** `DELETE /api/profile-user/picture`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (optional)
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم حذف الصورة الشخصية بنجاح"
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "لا توجد صورة شخصية لحذفها"
}
```

---

### 5. Delete User Profile (Deactivate Account)
### حذف الملف الشخصي (إلغاء تفعيل الحساب)

**Endpoint:** `DELETE /api/profile-user`

**Headers:**
```
Authorization: Bearer <token>
Accept-Language: ar | en (optional)
```

**ملاحظة:** هذا الـ endpoint لا يحذف البيانات فعلياً، بل يقوم بإلغاء تفعيل الحساب.

**Response Success (200):**
```json
{
  "success": true,
  "message": "تم إلغاء تفعيل الحساب بنجاح"
}
```

---

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "غير مصرح"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "الملف الشخصي غير موجود"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "خطأ في الخادم",
  "error": "Error details..."
}
```

---

## Notes
## ملاحظات

1. **Multi-language Support:**
   - جميع الـ responses تدعم اللغتين العربية والإنجليزية
   - استخدم header `Accept-Language: ar` أو `Accept-Language: en`
   - الحقول المترجمة تظهر بدون `_ar` أو `_en` suffix

2. **Profile Creation:**
   - يتم إنشاء الملف الشخصي تلقائياً عند تسجيل المستخدم
   - يتم إدخال البيانات الأساسية فقط (id, user_id, timezone, language_preference)

3. **Update Behavior:**
   - يمكن تحديث أي حقل بشكل منفصل
   - الحقول غير المرسلة لا يتم تعديلها
   - يمكن إرسال ترجمة واحدة فقط أو كلتاهما

4. **File Upload:**
   - يتم حذف الصورة القديمة تلقائياً عند رفع صورة جديدة
   - الصور تُحفظ في `/upload/profiles/user/`

5. **Validation:**
   - تاريخ الميلاد: YYYY-MM-DD format
   - الجنس: male, female, other, prefer_not_to_say
   - رقم الهاتف: 8-20 رقم، يمكن أن يحتوي على (+, -, spaces, parentheses)

---

## Example Workflow
## مثال على سير العمل

### 1. Get current profile
```javascript
const response = await fetch('/api/profile-user', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'ar'
  }
});
const data = await response.json();
```

### 2. Update profile information
```javascript
const response = await fetch('/api/profile-user', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'ar',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    date_of_birth: '1990-01-01',
    gender: 'male',
    nationality: 'Egyptian',
    translations: {
      ar: {
        full_name: 'أحمد محمد',
        emergency_contact_name: 'فاطمة أحمد',
        emergency_contact_relationship: 'أخت'
      }
    }
  })
});
```

### 3. Upload profile picture
```javascript
const formData = new FormData();
formData.append('profile_picture', fileInput.files[0]);

const response = await fetch('/api/profile-user/picture', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

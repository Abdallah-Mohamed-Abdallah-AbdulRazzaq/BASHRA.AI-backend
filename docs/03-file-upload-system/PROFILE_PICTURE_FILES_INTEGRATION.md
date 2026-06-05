# Profile Picture & Files System Integration
# ربط نظام الصور الشخصية مع نظام الملفات

## 🔗 التكامل | Integration

تم ربط نظام رفع الصور الشخصية مع نظام Files Management الشامل.

---

## ✅ ما تم تنفيذه | What Was Done

### 1. تحديث `ProfileService.uploadProfilePicture()`

**قبل:**
```javascript
// كان يرفع الملف ويرجع URL فقط
const pictureUrl = await ProfileService.uploadProfilePicture(file, userId, 'user');
// Returns: "http://localhost:3006/upload/profiles/user/user_23_123.jpg"
```

**بعد:**
```javascript
// الآن يستخدم FileService ويسجل في جدول files
const fileRecord = await ProfileService.uploadProfilePicture(
  file, 
  userId, 
  'user',
  profileId  // للربط
);

// Returns object:
{
  file_url: "http://localhost:3006/upload/files/profile-picture/...",
  file_uuid: "550e8400-e29b-41d4-a716-446655440000",
  file_id: 1
}
```

### 2. تحديث `ProfileUserController.uploadProfilePicture()`

الآن يستقبل object من `uploadProfilePicture` ويحفظ المعلومات الإضافية:

```javascript
const fileRecord = await ProfileService.uploadProfilePicture(
  req.file, 
  userId, 
  'user',
  profileId
);

// Update database with file_url
await connection.execute(
  'UPDATE user_profiles SET profile_picture_url = ? WHERE id = ?',
  [fileRecord.file_url, profileId]
);

// Return complete info
return res.json({
  success: true,
  data: {
    profile_picture_url: fileRecord.file_url,
    file_uuid: fileRecord.file_uuid,  // جديد
    file_id: fileRecord.file_id        // جديد
  }
});
```

---

## 📊 ما يحدث عند رفع صورة شخصية | What Happens

### الخطوات:

1. **المستخدم يرفع الصورة:**
   ```bash
   POST /api/profile-user/picture
   Authorization: Bearer USER_TOKEN
   
   Form-data:
   - profile_picture: [FILE]
   ```

2. **ProfileService يستخدم FileService:**
   ```javascript
   FileService.uploadFile(file, uploadedBy, options)
   ```

3. **FileService يقوم بـ:**
   - ✅ حفظ الملف على القرص
   - ✅ إنشاء UUID فريد
   - ✅ تسجيل الملف في جدول `files`
   - ✅ إرجاع معلومات الملف كاملة

4. **تسجيل في جدول `files`:**
   ```sql
   INSERT INTO files (
     uuid,
     uploaded_by_user_id,
     related_to_type,
     related_to_id,
     file_category,
     original_filename,
     file_url,
     mime_type,
     file_size,
     is_public,
     metadata,
     ...
   ) VALUES (
     '550e8400-...',
     23,                    -- User ID
     'user_profile',        -- Related type
     15,                    -- Profile ID
     'profile_picture',     -- Category
     'my-photo.jpg',
     'http://...',
     'image/jpeg',
     524288,
     1,                     -- Public
     '{"uploaded_from":"profile_update","profile_type":"user"}',
     ...
   );
   ```

5. **تحديث `user_profiles`:**
   ```sql
   UPDATE user_profiles 
   SET profile_picture_url = 'http://...' 
   WHERE id = 15;
   ```

---

## 🔍 مثال كامل | Complete Example

### Request:
```bash
POST http://localhost:3006/api/profile-user/picture
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: ar
Content-Type: multipart/form-data

Form-data:
- profile_picture: [computer.png]
```

### Response:
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "http://localhost:3006/upload/files/profile-picture/profile_picture_550e8400-e29b-41d4-a716-446655440000_1699012345678.png",
    "file_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "file_id": 1
  }
}
```

### ما تم حفظه في `files` table:
```json
{
  "id": 1,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "uploaded_by_user_id": 23,
  "uploaded_by_admin_id": null,
  "uploaded_by_doctor_id": null,
  "uploaded_by_assistant_id": null,
  "related_to_type": "user_profile",
  "related_to_id": 15,
  "file_category": "profile_picture",
  "original_filename": "computer.png",
  "stored_filename": "profile_picture_550e8400-e29b-41d4-a716-446655440000_1699012345678.png",
  "file_path": "/upload/files/profile-picture/profile_picture_550e8400-e29b-41d4-a716-446655440000_1699012345678.png",
  "file_url": "http://localhost:3006/upload/files/profile-picture/profile_picture_550e8400-e29b-41d4-a716-446655440000_1699012345678.png",
  "mime_type": "image/png",
  "file_size": 524288,
  "file_extension": "png",
  "is_public": 1,
  "is_encrypted": 0,
  "encryption_key": null,
  "thumbnail_url": null,
  "metadata": {
    "uploaded_from": "profile_update",
    "profile_type": "user"
  },
  "virus_scan_status": "pending",
  "virus_scan_date": null,
  "storage_provider": "local",
  "storage_reference": null,
  "access_count": 0,
  "last_accessed_at": null,
  "expires_at": null,
  "is_deleted": 0,
  "deleted_at": null,
  "created_at": "2024-11-03T18:55:00.000Z"
}
```

---

## 🎯 الفوائد | Benefits

### 1. **تتبع شامل**
- ✅ معرفة من رفع الملف
- ✅ متى تم الرفع
- ✅ كم مرة تم الوصول للملف
- ✅ آخر وصول

### 2. **إدارة مركزية**
```bash
# Admin يمكنه رؤية جميع الصور الشخصية
GET /api/files?fileCategory=profile_picture

# أو صور مستخدم محدد
GET /api/files/uploader/user/23?fileCategory=profile_picture
```

### 3. **أمان متقدم**
- ✅ فحص فيروسات
- ✅ تشفير (اختياري)
- ✅ صلاحيات دقيقة
- ✅ soft delete

### 4. **إحصائيات**
```bash
# كم صورة شخصية تم رفعها؟
GET /api/files/statistics

# Response:
{
  "byCategory": [
    {
      "file_category": "profile_picture",
      "count": 450,
      "total_size": 45000000,
      "avg_size": 100000
    }
  ]
}
```

---

## 🔧 استخدامات Admin | Admin Usage

### 1. عرض جميع الصور الشخصية:
```bash
GET /api/files?fileCategory=profile_picture&page=1&limit=50
Authorization: Bearer ADMIN_TOKEN
```

### 2. صور مستخدم محدد:
```bash
GET /api/files/uploader/user/23?fileCategory=profile_picture
Authorization: Bearer ADMIN_TOKEN
```

### 3. البحث عن صورة معينة:
```bash
GET /api/files?searchTerm=computer.png
Authorization: Bearer ADMIN_TOKEN
```

### 4. حذف صورة شخصية:
```bash
DELETE /api/files/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer ADMIN_TOKEN
```

### 5. إحصائيات الصور:
```bash
GET /api/files/statistics
Authorization: Bearer ADMIN_TOKEN
```

---

## 📝 ملاحظات مهمة | Important Notes

### 1. **backward compatibility**
- ✅ الـ API القديم يعمل بدون تغيير
- ✅ فقط أضفنا معلومات إضافية في الـ response

### 2. **الملفات القديمة**
الصور المرفوعة قبل التحديث لن تكون في جدول `files`.

**الحل:** يمكن إضافة script للـ migration:
```javascript
// Migration script (optional)
const oldFiles = await db.execute(
  `SELECT id, user_id, profile_picture_url 
   FROM user_profiles 
   WHERE profile_picture_url IS NOT NULL`
);

for (const profile of oldFiles) {
  // Register old file in files table
  // ...
}
```

### 3. **الحذف**
عند حذف صورة شخصية:
- ✅ يتم حذف الملف الفعلي من القرص
- ✅ يتم تحديث `user_profiles.profile_picture_url = NULL`
- ⚠️ السجل في `files` يبقى (مع is_deleted=0)

إذا أردت حذفها من `files` أيضاً، يمكن للـ Admin استخدام:
```bash
DELETE /api/files/{uuid}?deleteFromDisk=true
```

---

## 🧪 Testing

### Test 1: رفع صورة جديدة
```bash
POST /api/profile-user/picture
Authorization: Bearer USER_TOKEN

Expected:
- ✅ file saved to disk
- ✅ record in files table
- ✅ user_profiles.profile_picture_url updated
- ✅ response includes file_uuid and file_id
```

### Test 2: Admin يعرض الصورة
```bash
GET /api/files/{file_uuid}
Authorization: Bearer ADMIN_TOKEN

Expected:
- ✅ file details returned
- ✅ access_count incremented
```

### Test 3: حذف الصورة
```bash
DELETE /api/profile-user/picture
Authorization: Bearer USER_TOKEN

Expected:
- ✅ file deleted from disk
- ✅ user_profiles.profile_picture_url = NULL
```

---

## 🚀 المميزات الجديدة | New Features

### 1. **UUID Tracking**
كل صورة لها UUID فريد يمكن استخدامه للتتبع:
```javascript
// استخدام UUID بدلاً من URL
const fileUuid = response.data.file_uuid;
```

### 2. **Metadata**
يمكن إضافة معلومات إضافية:
```json
{
  "metadata": {
    "uploaded_from": "mobile_app",
    "profile_type": "user",
    "image_quality": "high",
    "filters_applied": ["crop", "resize"]
  }
}
```

### 3. **Expiration**
يمكن جعل الصور تنتهي تلقائياً:
```javascript
{
  expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // سنة
}
```

---

## 📚 انظر أيضاً | See Also

- `docs/FILES_MANAGEMENT_SYSTEM.md` - نظرة شاملة
- `docs/FILES_API_EXAMPLES.json` - أمثلة API كاملة
- `docs/UPLOAD_PROFILE_PICTURE_GUIDE.md` - دليل رفع الصور
- `services/fileService.js` - الكود المصدري

---

**Status:** ✅ Complete  
**Version:** 1.0  
**Integration Date:** November 2024

# Upload Profile Picture Guide
# دليل رفع الصورة الشخصية

## ⚠️ Important | مهم جداً

**اسم الحقل المطلوب:** `profile_picture`

يجب أن يكون اسم الحقل في الـ form-data هو **بالضبط** `profile_picture` وليس أي اسم آخر!

---

## الخطأ الشائع | Common Error

### ❌ خطأ: Unexpected field

**السبب:** استخدام اسم حقل مختلف عن `profile_picture`

**مثال خاطئ:**
- `file` ❌
- `image` ❌
- `picture` ❌
- `avatar` ❌
- `profilePicture` ❌ (camelCase)
- `profile-picture` ❌ (kebab-case)

**الاسم الصحيح:**
- `profile_picture` ✅

---

## استخدام Postman | Using Postman

### الخطوات:

1. **Method:** POST
2. **URL:** `http://localhost:3006/api/profile-user/picture`
3. **Headers:**
   - `Authorization: Bearer YOUR_TOKEN`
   - `Accept-Language: ar` (optional)
   - **⚠️ لا تضع `Content-Type` header - Postman سيضعه تلقائياً**

4. **Body:**
   - اختر **form-data**
   - Key: `profile_picture` (type: File)
   - Value: اختر الصورة من جهازك

### صورة توضيحية:

```
┌─────────────────────────────────────────────┐
│ Postman Body Tab                            │
├─────────────────────────────────────────────┤
│ ○ none                                      │
│ ◉ form-data                                 │
│ ○ x-www-form-urlencoded                     │
│ ○ raw                                       │
│ ○ binary                                    │
├─────────────────────────────────────────────┤
│ KEY              │ VALUE      │ TYPE        │
├──────────────────┼────────────┼─────────────┤
│ profile_picture  │ [File]     │ File ▼      │
│                  │ Choose File│             │
└─────────────────────────────────────────────┘
```

---

## استخدام cURL | Using cURL

```bash
curl -X POST http://localhost:3006/api/profile-user/picture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept-Language: ar" \
  -F "profile_picture=@/path/to/image.jpg"
```

**ملاحظة:** الـ `-F` flag تُستخدم لإرسال form-data، و `@` يشير إلى ملف محلي.

---

## استخدام JavaScript Fetch | Using JavaScript Fetch

```javascript
const uploadProfilePicture = async (file, token) => {
  const formData = new FormData();
  formData.append('profile_picture', file); // ⚠️ الاسم يجب أن يكون profile_picture
  
  const response = await fetch('http://localhost:3006/api/profile-user/picture', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'ar'
      // ⚠️ لا تضع Content-Type - المتصفح سيضعه تلقائياً مع boundary
    },
    body: formData
  });
  
  return response.json();
};

// استخدام
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await uploadProfilePicture(file, 'YOUR_TOKEN');
```

---

## استخدام Axios | Using Axios

```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const uploadProfilePicture = async (filePath, token) => {
  const formData = new FormData();
  formData.append('profile_picture', fs.createReadStream(filePath));
  
  try {
    const response = await axios.post(
      'http://localhost:3006/api/profile-user/picture',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept-Language': 'ar',
          ...formData.getHeaders() // مهم لإضافة boundary
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    throw error;
  }
};

// استخدام
uploadProfilePicture('/path/to/image.jpg', 'YOUR_TOKEN')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

---

## React Example | مثال React

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function ProfilePictureUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }
    
    setUploading(true);
    setError(null);
    setSuccess(false);
    
    const formData = new FormData();
    formData.append('profile_picture', file); // ⚠️ Must be 'profile_picture'
    
    try {
      const token = localStorage.getItem('token'); // أو من حيث تخزن الـ token
      
      const response = await axios.post(
        'http://localhost:3006/api/profile-user/picture',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept-Language': 'ar'
          }
        }
      );
      
      setSuccess(true);
      console.log('Upload successful:', response.data);
      
      // تحديث الـ UI بالصورة الجديدة
      // updateProfilePicture(response.data.data.profile_picture_url);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="upload-container">
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      {file && (
        <div>
          <p>Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Picture'}
          </button>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Upload successful!</div>}
    </div>
  );
}

export default ProfilePictureUpload;
```

---

## المواصفات المطلوبة | Requirements

### File Type | نوع الملف
- ✅ JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ WebP (`.webp`)
- ❌ GIF (not supported)
- ❌ SVG (not supported)
- ❌ PDF (not supported)

### File Size | حجم الملف
- **Maximum:** 5 MB
- **Recommended:** أقل من 2 MB للأداء الأفضل

### Field Name | اسم الحقل
- **Required:** `profile_picture` (exact match, case-sensitive)

---

## Response Examples | أمثلة الاستجابة

### Success Response ✅
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "/upload/profiles/user/user_23_1699012345678.jpg"
  }
}
```

### Error: Invalid Field Name ❌
```json
{
  "success": false,
  "message": "اسم حقل الملف غير صحيح. استخدم \"profile_picture\" كاسم للحقل",
  "expectedFieldName": "profile_picture"
}
```

### Error: File Too Large ❌
```json
{
  "success": false,
  "message": "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت"
}
```

### Error: Invalid File Type ❌
```json
{
  "success": false,
  "message": "نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP)"
}
```

### Error: No File Provided ❌
```json
{
  "success": false,
  "message": "الرجاء رفع ملف الصورة"
}
```

---

## Troubleshooting | حل المشاكل

### 1. خطأ: "Unexpected field"
**السبب:** اسم الحقل ليس `profile_picture`
**الحل:** تأكد من استخدام `profile_picture` بالضبط

### 2. خطأ: "File size too large"
**السبب:** حجم الصورة أكبر من 5MB
**الحل:** ضغط الصورة أو اختيار صورة أصغر

### 3. خطأ: "Invalid file type"
**السبب:** نوع الملف غير مدعوم
**الحل:** استخدم JPEG, PNG, أو WebP

### 4. خطأ: "Profile not found"
**السبب:** المستخدم ليس لديه ملف شخصي في قاعدة البيانات
**الحل:** تأكد من وجود سجل في جدول `user_profiles`

### 5. لا يحدث شيء / No response
**السبب:** مشكلة في الـ token أو الـ Authorization header
**الحل:** تأكد من صحة الـ token وأنه يبدأ بـ `Bearer `

---

## Best Practices | أفضل الممارسات

1. **تقليل حجم الصورة قبل الرفع:**
   ```javascript
   // استخدم مكتبة مثل browser-image-compression
   import imageCompression from 'browser-image-compression';
   
   const compressImage = async (file) => {
     const options = {
       maxSizeMB: 1,
       maxWidthOrHeight: 1024,
       useWebWorker: true
     };
     
     return await imageCompression(file, options);
   };
   ```

2. **عرض preview قبل الرفع:**
   ```javascript
   const showPreview = (file) => {
     const reader = new FileReader();
     reader.onload = (e) => {
       document.getElementById('preview').src = e.target.result;
     };
     reader.readAsDataURL(file);
   };
   ```

3. **إضافة progress indicator:**
   ```javascript
   axios.post(url, formData, {
     onUploadProgress: (progressEvent) => {
       const percentCompleted = Math.round(
         (progressEvent.loaded * 100) / progressEvent.total
       );
       console.log(`Upload progress: ${percentCompleted}%`);
     }
   });
   ```

---

**Version:** 1.0  
**Last Updated:** November 2024  
**Status:** ✅ Active

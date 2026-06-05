# 🖼️ Upload Profile Picture - Quick Guide
# دليل سريع لرفع الصورة الشخصية

---

## ⚠️ الخطأ: "Unexpected field"

### السبب | Cause:
**استخدام اسم حقل خاطئ في الـ form-data**

---

## ✅ الحل | Solution:

### في Postman:

```
1. Method: POST
2. URL: http://localhost:3006/api/profile-user/picture

3. Headers:
   Authorization: Bearer YOUR_TOKEN
   Accept-Language: ar

4. Body:
   ┌─────────────────────────────────┐
   │ Select: form-data               │
   ├─────────────────────────────────┤
   │ KEY         │ VALUE   │ TYPE    │
   ├─────────────┼─────────┼─────────┤
   │ profile_    │ [File]  │ File ▼  │
   │ picture     │ Browse  │         │
   └─────────────────────────────────┘

   ⚠️ الاسم يجب أن يكون:
   profile_picture
   
   ❌ ليس: file, image, picture, photo
```

---

## 📋 الخطوات التفصيلية | Detailed Steps:

### 1️⃣ افتح Postman
### 2️⃣ اختر Method: **POST**
### 3️⃣ URL: `http://localhost:3006/api/profile-user/picture`

### 4️⃣ Headers Tab:
```
Key: Authorization
Value: Bearer YOUR_JWT_TOKEN_HERE

Key: Accept-Language
Value: ar
```

### 5️⃣ Body Tab:
- اختر **form-data** (ليس raw أو x-www-form-urlencoded)

### 6️⃣ في form-data:
- **Key:** اكتب `profile_picture`
- **Type:** اختر **File** من القائمة المنسدلة
- **Value:** اضغط "Choose Files" واختر الصورة

### 7️⃣ اضغط **Send**

---

## ✅ Response متوقع | Expected Response:

```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "/upload/profiles/user/user_23_1234567890.jpg"
  }
}
```

---

## ❌ أخطاء شائعة | Common Errors:

### 1. Unexpected field
```json
{
  "success": false,
  "message": "اسم حقل الملف غير صحيح. استخدم \"profile_picture\" كاسم للحقل",
  "expectedFieldName": "profile_picture"
}
```
**الحل:** تأكد من أن اسم الحقل هو `profile_picture` بالضبط

---

### 2. File size too large
```json
{
  "success": false,
  "message": "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت"
}
```
**الحل:** اختر صورة أصغر أو قم بضغطها

---

### 3. Invalid file type
```json
{
  "success": false,
  "message": "نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP)"
}
```
**الحل:** استخدم صورة بصيغة JPEG, PNG, أو WebP

---

### 4. No file provided
```json
{
  "success": false,
  "message": "الرجاء رفع ملف الصورة"
}
```
**الحل:** تأكد من اختيار ملف في الـ form-data

---

## 🔧 اختبار سريع | Quick Test:

### استخدام cURL:

```bash
curl -X POST http://localhost:3006/api/profile-user/picture \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profile_picture=@/path/to/image.jpg"
```

**تغيير `/path/to/image.jpg` بمسار الصورة الفعلي على جهازك**

---

## 📝 ملاحظات مهمة | Important Notes:

1. ✅ **الاسم الصحيح:** `profile_picture`
2. ✅ **الحجم الأقصى:** 5 MB
3. ✅ **الأنواع المدعومة:** JPEG, PNG, WebP
4. ✅ **استخدم form-data** وليس raw JSON
5. ✅ **لا تضع Content-Type header يدوياً**

---

## 🎯 Visual Guide | دليل بصري:

```
Postman Interface:
┌─────────────────────────────────────────────────────┐
│ POST ▼  http://localhost:3006/api/profile-user/... │
├─────────────────────────────────────────────────────┤
│ Params  Authorization  Headers  Body  Pre-req  ... │
├─────────────────────────────────────────────────────┤
│ Headers Tab:                                        │
│ ┌─────────────────┬─────────────────────┐          │
│ │ Authorization   │ Bearer eyJhbGc...   │ ✓        │
│ │ Accept-Language │ ar                  │ ✓        │
│ └─────────────────┴─────────────────────┘          │
├─────────────────────────────────────────────────────┤
│ Body Tab:                                           │
│ ○ none                                              │
│ ● form-data  ← اختر هذا                            │
│ ○ x-www-form-urlencoded                             │
│ ○ raw                                               │
│                                                     │
│ ┌──────────────────┬──────────────┬─────────┐      │
│ │ KEY              │ VALUE        │ TYPE    │      │
│ ├──────────────────┼──────────────┼─────────┤      │
│ │ profile_picture  │ [image.jpg]  │ File ▼  │ ✓    │
│ │                  │ Choose Files │         │      │
│ └──────────────────┴──────────────┴─────────┘      │
├─────────────────────────────────────────────────────┤
│                                     [Send] ←اضغط   │
└─────────────────────────────────────────────────────┘
```

---

## 🌐 Test في المتصفح | Browser Test:

```html
<!DOCTYPE html>
<html>
<body>
  <input type="file" id="fileInput" accept="image/*">
  <button onclick="upload()">Upload</button>
  
  <script>
    async function upload() {
      const file = document.getElementById('fileInput').files[0];
      if (!file) {
        alert('Please select a file');
        return;
      }
      
      const formData = new FormData();
      formData.append('profile_picture', file); // ⚠️ Must be 'profile_picture'
      
      const response = await fetch('http://localhost:3006/api/profile-user/picture', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN',
          'Accept-Language': 'ar'
        },
        body: formData
      });
      
      const result = await response.json();
      console.log(result);
      alert(result.message);
    }
  </script>
</body>
</html>
```

---

**الآن جرب في Postman - يجب أن يعمل! ✨**

**Status:** ✅ Fixed  
**Date:** November 2024

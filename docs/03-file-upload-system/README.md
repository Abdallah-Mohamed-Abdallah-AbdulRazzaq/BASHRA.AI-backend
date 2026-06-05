# 📁 File Upload System Documentation
# توثيق نظام رفع الملفات

> **المجلد:** `03-file-upload-system/`  
> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 المحتويات | Contents

هذا المجلد يحتوي على التوثيق الكامل لنظام رفع وإدارة الملفات.

### 📄 الملفات:

1. **`FILE-UPLOAD-SYSTEM.md`** - دليل النظام الكامل والشامل
2. **`FILE-UPLOAD-QUICK-START.md`** - دليل البدء السريع
3. **`FILE-UPLOAD-COMPLETE.md`** - التوثيق الكامل
4. **`FILE-UPLOAD-FINAL-SUMMARY.md`** - الملخص النهائي
5. **`FILES_MANAGEMENT_SYSTEM.md`** - نظام إدارة الملفات
6. **`FILES_API_EXAMPLES.json`** - أمثلة API بصيغة JSON
7. **`UPLOAD_PICTURE_QUICK_GUIDE.md`** - دليل سريع لرفع الصور
8. **`UPLOAD_PROFILE_PICTURE_GUIDE.md`** - دليل رفع الصورة الشخصية
9. **`PROFILE_PICTURE_FILES_INTEGRATION.md`** - تكامل الصور مع النظام
10. **`PROFILE_PICTURE_URL_UPDATE.md`** - تحديث روابط الصور
11. **`FORM_DATA_SUPPORT.md`** - دعم FormData

---

## 🎯 الميزات الرئيسية | Main Features

### ✅ رفع الملفات
- رفع الصور (JPG, PNG, GIF, WebP)
- رفع المستندات (PDF, DOC, DOCX)
- التحقق من نوع وحجم الملف
- تخزين آمن

### ✅ إدارة الملفات
- عرض قائمة الملفات
- حذف الملفات
- تحديث معلومات الملف
- ربط الملفات بالمستخدمين

### ✅ الصور الشخصية
- رفع صورة شخصية
- تحديث الصورة
- حذف الصورة
- عرض الصورة

---

## 🚀 البدء السريع | Quick Start

### رفع صورة شخصية:

```bash
POST /api/profile-doctor/picture
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

# FormData:
profile_picture: [FILE]
```

### ⚠️ مهم جداً:
- **اسم الحقل يجب أن يكون:** `profile_picture`
- **ليس:** `file`, `image`, `picture`, أو أي اسم آخر!

---

## 📖 الملفات المرجعية | Reference Files

### للبدء:
1. **`FILE-UPLOAD-QUICK-START.md`** - ابدأ من هنا!
2. **`UPLOAD_PICTURE_QUICK_GUIDE.md`** - دليل سريع للصور

### للتفاصيل:
1. **`FILE-UPLOAD-SYSTEM.md`** - الدليل الشامل
2. **`FILES_MANAGEMENT_SYSTEM.md`** - إدارة الملفات

### للاختبار:
1. **`FILES_API_EXAMPLES.json`** - أمثلة جاهزة
2. **`UPLOAD_PROFILE_PICTURE_GUIDE.md`** - دليل الاختبار

---

## 🔧 APIs المتوفرة | Available APIs

### رفع الملفات:
```
POST /api/profile-doctor/picture      # رفع صورة شخصية للطبيب
POST /api/profile-user/picture        # رفع صورة شخصية للمستخدم
POST /api/files/upload                # رفع ملف عام
```

### إدارة الملفات:
```
GET    /api/files                     # عرض جميع الملفات
GET    /api/files/:id                 # عرض ملف محدد
DELETE /api/files/:id                 # حذف ملف
```

---

## 💡 نصائح مهمة | Important Tips

### ✅ عند رفع صورة شخصية:
1. استخدم `multipart/form-data`
2. اسم الحقل: `profile_picture`
3. لا تضع `Content-Type` header يدوياً
4. الحجم الأقصى: 5MB
5. الصيغ المدعومة: jpg, jpeg, png, gif, webp

### ✅ الأخطاء الشائعة:
- ❌ استخدام اسم حقل خاطئ
- ❌ نسيان Authorization header
- ❌ ملف أكبر من 5MB
- ❌ صيغة ملف غير مدعومة

---

## 📝 أمثلة | Examples

### Postman:
1. Method: POST
2. URL: `{{base_url}}/api/profile-doctor/picture`
3. Headers:
   - `Authorization: Bearer {{jwt_token}}`
4. Body:
   - اختر `form-data`
   - Key: `profile_picture` (type: File)
   - Value: اختر الصورة

### cURL:
```bash
curl -X POST 'http://localhost:3006/api/profile-doctor/picture' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'profile_picture=@/path/to/image.jpg'
```

---

## 🔗 روابط ذات صلة | Related Links

- [نظام الملفات الشخصية](../02-profile-system/)
- [دليل الاختبار](../05-testing-guides/)

---

**العودة إلى:** [التوثيق الرئيسي](../README.md)

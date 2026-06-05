# 👤 Profile System Documentation
# توثيق نظام الملفات الشخصية

> **المجلد:** `02-profile-system/`  
> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 المحتويات | Contents

هذا المجلد يحتوي على التوثيق الكامل لنظام الملفات الشخصية للمستخدمين والأطباء.

### 📄 الملفات الرئيسية:

#### 🩺 ملفات الأطباء:
1. **`profile-doctor-api-testing.json`** - دليل اختبار شامل لجميع APIs
2. **`profile-doctor-api-complete-guide.json`** - الدليل الكامل
3. **`profile-doctor-endpoints-detailed.json`** - تفاصيل الـ endpoints
4. **`postman-test-data-profile-doctor.json`** - بيانات اختبار جاهزة لـ Postman
5. **`profile-doctor-fix-summary.md`** - ملخص الإصلاحات

#### 👥 ملفات المستخدمين:
1. **`PROFILE_USER_API.md`** - توثيق API للمستخدمين
2. **`PROFILE_USER_IMPLEMENTATION.md`** - دليل التنفيذ
3. **`PROFILE_USER_UPDATE_EXAMPLES.md`** - أمثلة التحديث
4. **`PROFILE_USER_EXAMPLES.json`** - أمثلة JSON
5. **`USER_BASIC_DATA_API.json`** - API البيانات الأساسية
6. **`USER_COMPLETE_DATA_API.json`** - API البيانات الكاملة
7. **`USER_COMPLETE_DATA_API.md`** - دليل البيانات الكاملة

#### 📚 ملفات عامة:
1. **`PROFILE_SYSTEM_README.md`** - دليل النظام الكامل
2. **`PROFILE-SYSTEM-COMPLETE-FIX.md`** - الإصلاحات الشاملة
3. **`Profile-API-Examples.md`** - أمثلة API
4. **`ProfileService-Usage-Guide.md`** - دليل استخدام الـ Service
5. **`account-deactivation-reactivation-logic.json`** - منطق إلغاء/إعادة التفعيل

---

## 🎯 الميزات الرئيسية | Main Features

### ✅ إدارة الملفات الشخصية
- جلب البيانات (أساسية، كاملة، مع ترجمات)
- تحديث البيانات (جزئي أو كامل)
- دعم متعدد اللغات (عربي/إنجليزي)

### ✅ إدارة الصور الشخصية
- رفع صورة شخصية
- حذف الصورة
- تحديث الصورة

### ✅ إدارة الحسابات
- إلغاء تفعيل الحساب (Soft Delete)
- إعادة تفعيل الحساب
- حذف البيانات

---

## 🚀 APIs المتوفرة | Available APIs

### للأطباء (Doctors):

```
GET    /api/profile-doctor              # جلب الملف الشخصي
GET    /api/profile-doctor/basic        # جلب البيانات الأساسية
GET    /api/profile-doctor/complete     # جلب البيانات الكاملة
PUT    /api/profile-doctor              # تحديث الملف الشخصي
PUT    /api/profile-doctor/basic        # تحديث البيانات الأساسية
POST   /api/profile-doctor/picture      # رفع صورة شخصية
DELETE /api/profile-doctor/picture      # حذف الصورة
DELETE /api/profile-doctor              # إلغاء تفعيل الحساب
PATCH  /api/profile-doctor/reactivate   # إعادة تفعيل الحساب
```

### للمستخدمين (Users):

```
GET    /api/profile-user                # جلب الملف الشخصي
GET    /api/profile-user/basic          # جلب البيانات الأساسية
PUT    /api/profile-user                # تحديث الملف الشخصي
POST   /api/profile-user/picture        # رفع صورة شخصية
DELETE /api/profile-user/picture        # حذف الصورة
DELETE /api/profile-user                # إلغاء تفعيل الحساب
```

---

## 📖 دليل الاستخدام | Usage Guide

### 1. للاختبار في Postman:
استخدم ملف: **`postman-test-data-profile-doctor.json`**
- يحتوي على 18 test case جاهز
- بيانات كاملة للنسخ واللصق
- أمثلة على جميع السيناريوهات

### 2. لفهم النظام:
اقرأ: **`PROFILE_SYSTEM_README.md`**
- شرح شامل للنظام
- معمارية النظام
- أفضل الممارسات

### 3. للتطوير:
راجع: **`ProfileService-Usage-Guide.md`**
- كيفية استخدام ProfileService
- أمثلة كود
- Best Practices

---

## 🔍 ملفات مهمة | Important Files

### للبدء السريع:
1. `postman-test-data-profile-doctor.json` - ابدأ من هنا!
2. `PROFILE_SYSTEM_README.md` - اقرأ هذا أولاً

### للتفاصيل:
1. `profile-doctor-api-testing.json` - دليل شامل
2. `profile-doctor-api-complete-guide.json` - الدليل الكامل

### للمستخدمين:
1. `PROFILE_USER_API.md` - API المستخدمين
2. `USER_COMPLETE_DATA_API.md` - البيانات الكاملة

---

## 💡 نصائح | Tips

- **جميع حقول التحديث اختيارية** - يمكنك تحديث أي حقل منفرد
- **دعم متعدد اللغات** - يمكن تحديث لغة واحدة أو عدة لغات
- **Soft Delete** - إلغاء التفعيل لا يحذف البيانات نهائياً
- **استخدم البيانات الجاهزة** - في ملف postman-test-data

---

## 🔗 روابط ذات صلة | Related Links

- [نظام المصادقة](../01-authentication/)
- [نظام رفع الملفات](../03-file-upload-system/)
- [دليل الاختبار](../05-testing-guides/)

---

**العودة إلى:** [التوثيق الرئيسي](../README.md)

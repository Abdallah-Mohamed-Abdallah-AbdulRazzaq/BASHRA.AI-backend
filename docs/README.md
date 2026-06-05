# 📚 BASHRA.AI Backend Documentation
# توثيق نظام BASHRA.AI الخلفي

> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 جدول المحتويات | Table of Contents

1. [نظرة عامة](#نظرة-عامة)
2. [هيكل التوثيق](#هيكل-التوثيق)
3. [البدء السريع](#البدء-السريع)
4. [الأنظمة الرئيسية](#الأنظمة-الرئيسية)
5. [روابط سريعة](#روابط-سريعة)

---

## 🎯 نظرة عامة | Overview

هذا المجلد يحتوي على التوثيق الشامل لنظام BASHRA.AI Backend، مقسم إلى فولدرات منظمة حسب الموضوع لسهولة الوصول والصيانة.

---

## 📁 هيكل التوثيق | Documentation Structure

```
docs/
├── 📂 01-authentication/              # نظام المصادقة والتسجيل
│   ├── DOCTOR_AUTH_README.md
│   ├── doctor-authentication-system.json
│   ├── Logic_Doctors_Subscription_to_the_System.json
│   └── Logic_Doctors_Subscription_to_the_System.md
│
├── 📂 02-profile-system/              # نظام الملفات الشخصية
│   ├── PROFILE-SYSTEM-COMPLETE-FIX.md
│   ├── PROFILE_SYSTEM_README.md
│   ├── PROFILE_USER_API.md
│   ├── Profile-API-Examples.md
│   ├── ProfileService-Usage-Guide.md
│   ├── profile-doctor-*.json (4 files)
│   ├── postman-test-data-profile-doctor.json
│   ├── account-deactivation-reactivation-logic.json
│   ├── USER_BASIC_DATA_API.json
│   ├── USER_COMPLETE_DATA_API.json
│   └── PROFILE_USER_EXAMPLES.json
│
├── 📂 03-file-upload-system/          # نظام رفع الملفات
│   ├── FILE-UPLOAD-COMPLETE.md
│   ├── FILE-UPLOAD-FINAL-SUMMARY.md
│   ├── FILE-UPLOAD-QUICK-START.md
│   ├── FILE-UPLOAD-SYSTEM.md
│   ├── FILES_API_EXAMPLES.json
│   ├── FILES_MANAGEMENT_SYSTEM.md
│   ├── UPLOAD_PICTURE_QUICK_GUIDE.md
│   ├── UPLOAD_PROFILE_PICTURE_GUIDE.md
│   ├── PROFILE_PICTURE_FILES_INTEGRATION.md
│   ├── PROFILE_PICTURE_URL_UPDATE.md
│   └── FORM_DATA_SUPPORT.md
│
├── 📂 04-chat-socket-system/          # نظام الشات والـ Socket.IO
│   ├── CHAT_PHASE_1_COMPLETE.md
│   ├── CHAT_PHASE_2_COMPLETE.md
│   ├── CHAT_TEST_SUMMARY.md
│   ├── CONVERSATIONS_API.md
│   ├── SOCKET_CHAT_API.md
│   ├── SOCKET_IO_INTEGRATION_GUIDE.md
│   ├── SOCKET_IO_TESTING_POSTMAN.md
│   ├── SOCKET_README.md
│   ├── SOCKET_TESTING_GUIDE.md
│   └── test-socket-client.js
│
├── 📂 05-testing-guides/              # أدلة الاختبار
│   ├── TESTING_GUIDE.md
│   ├── TESTING_SUMMARY.md
│   ├── TEST_BASIC_API.md
│   ├── QUICK_START.md
│   └── test-token-security.js
│
├── 📂 06-security-fixes/              # إصلاحات الأمان
│   ├── TOKEN_SECURITY_FIXES.md
│   ├── CORS_FIX.md
│   ├── CSP_FIX.md
│   └── CSP_FINAL_FIX.md
│
├── 📂 07-implementation-summaries/    # ملخصات التنفيذ
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── BUGFIXES_PHASE_1.md
│   ├── FINAL_INSTRUCTIONS.md
│   ├── FRONTEND_BACKEND_SEPARATION.md
│   └── REAL_USERS_INTEGRATION.md
│
└── 📄 README.md                       # هذا الملف
```

---

## 🚀 البدء السريع | Quick Start

### للمطورين الجدد:
1. **ابدأ بـ:** [`05-testing-guides/QUICK_START.md`](./05-testing-guides/QUICK_START.md)
2. **ثم اقرأ:** [`01-authentication/DOCTOR_AUTH_README.md`](./01-authentication/DOCTOR_AUTH_README.md)
3. **بعدها:** [`02-profile-system/PROFILE_SYSTEM_README.md`](./02-profile-system/PROFILE_SYSTEM_README.md)

### للاختبار:
- **Postman Test Data:** [`02-profile-system/postman-test-data-profile-doctor.json`](./02-profile-system/postman-test-data-profile-doctor.json)
- **Testing Guide:** [`05-testing-guides/TESTING_GUIDE.md`](./05-testing-guides/TESTING_GUIDE.md)

---

## 🏗️ الأنظمة الرئيسية | Main Systems

### 1️⃣ نظام المصادقة | Authentication System
**المجلد:** [`01-authentication/`](./01-authentication/)

**الملفات الرئيسية:**
- `DOCTOR_AUTH_README.md` - دليل شامل لنظام مصادقة الأطباء
- `doctor-authentication-system.json` - API Documentation
- `Logic_Doctors_Subscription_to_the_System.md` - منطق الاشتراك

**الميزات:**
- ✅ تسجيل الأطباء
- ✅ تسجيل الدخول
- ✅ التحقق من OTP (Email & Phone)
- ✅ JWT Token Management
- ✅ Refresh Token

---

### 2️⃣ نظام الملفات الشخصية | Profile System
**المجلد:** [`02-profile-system/`](./02-profile-system/)

**الملفات الرئيسية:**
- `PROFILE_SYSTEM_README.md` - دليل النظام الكامل
- `profile-doctor-api-testing.json` - دليل اختبار شامل
- `postman-test-data-profile-doctor.json` - بيانات اختبار جاهزة
- `ProfileService-Usage-Guide.md` - دليل استخدام الـ Service

**الميزات:**
- ✅ إدارة الملفات الشخصية (Users, Doctors, Admins, Assistants)
- ✅ دعم متعدد اللغات (عربي/إنجليزي)
- ✅ تحديث البيانات الأساسية والكاملة
- ✅ رفع وحذف الصور الشخصية
- ✅ إلغاء تفعيل وإعادة تفعيل الحسابات

**APIs المتوفرة:**
- `GET /api/profile-doctor` - جلب الملف الشخصي
- `GET /api/profile-doctor/basic` - جلب البيانات الأساسية
- `GET /api/profile-doctor/complete` - جلب البيانات الكاملة
- `PUT /api/profile-doctor` - تحديث الملف الشخصي
- `PUT /api/profile-doctor/basic` - تحديث البيانات الأساسية
- `POST /api/profile-doctor/picture` - رفع صورة شخصية
- `DELETE /api/profile-doctor/picture` - حذف الصورة
- `DELETE /api/profile-doctor` - إلغاء تفعيل الحساب
- `PATCH /api/profile-doctor/reactivate` - إعادة تفعيل الحساب

---

### 3️⃣ نظام رفع الملفات | File Upload System
**المجلد:** [`03-file-upload-system/`](./03-file-upload-system/)

**الملفات الرئيسية:**
- `FILE-UPLOAD-SYSTEM.md` - دليل النظام الكامل
- `FILE-UPLOAD-QUICK-START.md` - البدء السريع
- `FILES_API_EXAMPLES.json` - أمثلة API
- `UPLOAD_PROFILE_PICTURE_GUIDE.md` - دليل رفع الصور

**الميزات:**
- ✅ رفع الملفات (صور، مستندات، PDF)
- ✅ التحقق من نوع وحجم الملف
- ✅ تخزين آمن للملفات
- ✅ إدارة الملفات (عرض، حذف)
- ✅ ربط الملفات بالمستخدمين

---

### 4️⃣ نظام الشات والـ Socket.IO | Chat & Socket System
**المجلد:** [`04-chat-socket-system/`](./04-chat-socket-system/)

**الملفات الرئيسية:**
- `SOCKET_IO_INTEGRATION_GUIDE.md` - دليل التكامل الشامل
- `SOCKET_CHAT_API.md` - توثيق API
- `CONVERSATIONS_API.md` - API المحادثات
- `test-socket-client.js` - كود اختبار جاهز

**الميزات:**
- ✅ Real-time Chat
- ✅ إدارة المحادثات
- ✅ إرسال واستقبال الرسائل
- ✅ Online/Offline Status
- ✅ Typing Indicators
- ✅ Read Receipts

---

### 5️⃣ أدلة الاختبار | Testing Guides
**المجلد:** [`05-testing-guides/`](./05-testing-guides/)

**الملفات الرئيسية:**
- `TESTING_GUIDE.md` - دليل الاختبار الشامل
- `QUICK_START.md` - البدء السريع
- `TEST_BASIC_API.md` - اختبار APIs الأساسية

**يحتوي على:**
- ✅ خطوات الاختبار
- ✅ أمثلة Postman
- ✅ أكواد اختبار جاهزة
- ✅ سيناريوهات الاختبار

---

### 6️⃣ إصلاحات الأمان | Security Fixes
**المجلد:** [`06-security-fixes/`](./06-security-fixes/)

**الملفات:**
- `TOKEN_SECURITY_FIXES.md` - إصلاحات أمان الـ Token
- `CORS_FIX.md` - إصلاح CORS
- `CSP_FIX.md` - Content Security Policy

**يغطي:**
- ✅ JWT Security
- ✅ CORS Configuration
- ✅ CSP Headers
- ✅ XSS Protection

---

### 7️⃣ ملخصات التنفيذ | Implementation Summaries
**المجلد:** [`07-implementation-summaries/`](./07-implementation-summaries/)

**الملفات:**
- `IMPLEMENTATION_SUMMARY.md` - ملخص التنفيذ الكامل
- `BUGFIXES_PHASE_1.md` - إصلاحات المرحلة الأولى
- `FINAL_INSTRUCTIONS.md` - التعليمات النهائية

---

### 8️⃣ نظام البحث عن الأطباء حسب الموقع | Doctors By Location System
**المجلد:** [`09-doctors-location/`](./09-doctors-location/)

**الملفات الرئيسية:**
- `DOCTORS_BY_LOCATION_COMPLETE_GUIDE.md` - دليل شامل للنظام
- `DOCTORS_LOCATION_FIX_SUMMARY.md` - ملخص الإصلاحات
- `doctors-by-location-api-testing.json` - مجموعة Postman كاملة
- `test-data-doctors-location.sql` - بيانات اختبار SQL
- `test-doctors-location.js` - سكريبت اختبار JavaScript

**الميزات:**
- ✅ البحث عن الأطباء حسب الموقع الجغرافي
- ✅ دعم الهرمية الجغرافية (دولة > مدينة > منطقة > حي)
- ✅ البحث باستخدام إحداثيات GPS (Haversine Formula)
- ✅ البحث المتقدم مع فلاتر (التخصص، الخبرة، التقييم)
- ✅ عرض إحصائيات توزيع الأطباء
- ✅ إدارة العناوين للأطباء والمستخدمين

**APIs المتوفرة:**

**إدارة العناوين:**
- `POST /api/addresses` - إنشاء عنوان جديد
- `GET /api/addresses` - جلب جميع العناوين
- `GET /api/addresses/primary` - جلب العنوان الرئيسي
- `PUT /api/addresses/:id` - تحديث عنوان
- `DELETE /api/addresses/:id` - حذف عنوان

**البحث عن الأطباء (Public APIs):**
- `GET /api/doctors-by-location` - البحث حسب الموقع
- `GET /api/doctors-by-location/count` - عدد الأطباء في موقع
- `GET /api/doctors-by-location/grouped` - الأطباء مجمعين حسب المواقع
- `GET /api/doctors-by-location/search` - البحث المتقدم مع فلاتر
- `GET /api/doctors-by-location/nearby` - البحث باستخدام GPS

**الإصلاحات المطبقة:**
- ✅ إزالة الشروط الصارمة (`is_verified`, `approval_status`)
- ✅ استخدام `LEFT JOIN` للترجمات
- ✅ تحسين الاستعلامات لتجنب مشاكل N+1
- ✅ دعم البحث في المواقع الفرعية تلقائياً

---

## 🔗 روابط سريعة | Quick Links

### 📖 للمطورين:
- [دليل البدء السريع](./05-testing-guides/QUICK_START.md)
- [نظام المصادقة](./01-authentication/DOCTOR_AUTH_README.md)
- [نظام الملفات الشخصية](./02-profile-system/PROFILE_SYSTEM_README.md)
- [دليل رفع الملفات](./03-file-upload-system/FILE-UPLOAD-QUICK-START.md)

### 🧪 للاختبار:
- [دليل الاختبار الشامل](./05-testing-guides/TESTING_GUIDE.md)
- [بيانات اختبار Postman](./02-profile-system/postman-test-data-profile-doctor.json)
- [أمثلة API](./02-profile-system/profile-doctor-api-testing.json)

### 🔐 الأمان:
- [إصلاحات أمان Token](./06-security-fixes/TOKEN_SECURITY_FIXES.md)
- [إعدادات CORS](./06-security-fixes/CORS_FIX.md)

### 💬 الشات:
- [دليل Socket.IO](./04-chat-socket-system/SOCKET_IO_INTEGRATION_GUIDE.md)
- [API المحادثات](./04-chat-socket-system/CONVERSATIONS_API.md)

### 📍 البحث عن الأطباء:
- [دليل نظام البحث حسب الموقع](./DOCTORS_BY_LOCATION_COMPLETE_GUIDE.md)
- [ملخص الإصلاحات](./DOCTORS_LOCATION_FIX_SUMMARY.md)
- [مجموعة Postman](./doctors-by-location-api-testing.json)
- [بيانات اختبار SQL](./test-data-doctors-location.sql)

---

## 📝 ملاحظات مهمة | Important Notes

### 🎨 أنواع الملفات:
- **`.md`** - ملفات Markdown للتوثيق
- **`.json`** - ملفات JSON للـ API Documentation وبيانات الاختبار
- **`.js`** - أكواد JavaScript للاختبار

### 🔄 التحديثات:
- يتم تحديث التوثيق بشكل مستمر
- تحقق من تاريخ آخر تحديث في كل ملف
- الملفات الجديدة يتم إضافتها في الفولدر المناسب

### 📧 للدعم:
- راجع الملف المناسب في الفولدر المناسب
- استخدم أمثلة الاختبار الجاهزة
- اتبع الأدلة خطوة بخطوة

---

## 🎯 الخطوات التالية | Next Steps

1. **للمطورين الجدد:**
   - اقرأ [QUICK_START.md](./05-testing-guides/QUICK_START.md)
   - جرب APIs باستخدام Postman
   - راجع أمثلة الاختبار

2. **لتطوير ميزة جديدة:**
   - راجع التوثيق في الفولدر المناسب
   - اتبع نفس البنية والأسلوب
   - أضف التوثيق الخاص بك

3. **للاختبار:**
   - استخدم بيانات الاختبار الجاهزة
   - اتبع سيناريوهات الاختبار
   - سجل النتائج

---

## ✨ مساهمة | Contributing

عند إضافة توثيق جديد:
1. ضعه في الفولدر المناسب
2. اتبع نفس تنسيق الملفات الموجودة
3. حدّث هذا الملف (README.md) إذا لزم الأمر
4. أضف أمثلة عملية

---

**تم التنظيم بواسطة:** Cascade AI  
**التاريخ:** 23 نوفمبر 2025  
**الإصدار:** 1.0.0

---

<div align="center">

**🌟 BASHRA.AI - نظام صحي متكامل 🌟**

Made with ❤️ for better healthcare

</div>

# 🔐 Authentication System Documentation
# توثيق نظام المصادقة

> **المجلد:** `01-authentication/`  
> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 المحتويات | Contents

هذا المجلد يحتوي على التوثيق الكامل لنظام المصادقة والتسجيل للأطباء في BASHRA.AI.

### 📄 الملفات:

1. **`DOCTOR_AUTH_README.md`**
   - دليل شامل لنظام مصادقة الأطباء
   - شرح كامل لجميع APIs
   - أمثلة عملية

2. **`doctor-authentication-system.json`**
   - توثيق API بصيغة JSON
   - جاهز للاستيراد في Postman
   - يحتوي على جميع الـ endpoints

3. **`Logic_Doctors_Subscription_to_the_System.json`**
   - منطق اشتراك الأطباء بصيغة JSON
   - خطوات التسجيل والتفعيل

4. **`Logic_Doctors_Subscription_to_the_System.md`**
   - شرح مفصل لمنطق الاشتراك
   - Flow Charts
   - حالات الاستخدام

---

## 🎯 الميزات الرئيسية | Main Features

### ✅ التسجيل (Registration)
- تسجيل حساب طبيب جديد
- التحقق من البيانات
- إنشاء ملف شخصي تلقائي

### ✅ تسجيل الدخول (Login)
- تسجيل دخول بـ Email/Phone
- JWT Token Generation
- Refresh Token Support

### ✅ التحقق من OTP
- إرسال OTP عبر Email
- إرسال OTP عبر SMS
- التحقق من الكود

### ✅ إدارة الجلسات
- JWT Token Management
- Refresh Token
- Logout

---

## 🚀 البدء السريع | Quick Start

### 1. التسجيل:
```bash
POST /api/auth-doctor/register
Content-Type: application/json

{
  "email": "doctor@example.com",
  "phone": "+201234567890",
  "password": "SecurePassword123!",
  "full_name": "د. أحمد محمد",
  "specialty": "أمراض القلب"
}
```

### 2. تسجيل الدخول:
```bash
POST /api/auth-doctor/login
Content-Type: application/json

{
  "email": "doctor@example.com",
  "password": "SecurePassword123!"
}
```

### 3. استخدام Token:
```bash
GET /api/profile-doctor
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📚 الملفات المرجعية | Reference Files

- **للبدء:** اقرأ `DOCTOR_AUTH_README.md`
- **للاختبار:** استخدم `doctor-authentication-system.json` في Postman
- **لفهم المنطق:** راجع `Logic_Doctors_Subscription_to_the_System.md`

---

## 🔗 روابط ذات صلة | Related Links

- [نظام الملفات الشخصية](../02-profile-system/)
- [دليل الاختبار](../05-testing-guides/)
- [إصلاحات الأمان](../06-security-fixes/)

---

**العودة إلى:** [التوثيق الرئيسي](../README.md)

# Profile Doctor API Fix Summary

## المشكلة (Problem)
```
{
    "success": false,
    "message": "خطأ في جلب الملف الشخصي",
    "error": "خطأ في جلب الملف الشخصي: Unknown column 'p.user_id' in 'where clause'"
}
```

## السبب (Root Cause)
كانت دالة `getProfileByUserId` في `profileService.js` تستخدم `user_id` كاسم عمود ثابت، ولكن جدول `doctor_profiles` يستخدم `doctor_id` بدلاً من `user_id`.

بالإضافة إلى ذلك، جدول الترجمة `doctor_profile_translations` يستخدم `doctor_profile_id` بدلاً من `profile_id`.

## الإصلاحات المطبقة (Applied Fixes)

### 1. تحديث `profileService.js`

#### تحديث `getProfileByUserId`:
- أضفنا معامل `foreignKeyColumn` (القيمة الافتراضية: 'user_id')
- أضفنا معامل `translationForeignKey` (القيمة الافتراضية: 'profile_id')
- أضفنا حقول `specialty`, `sub_specialty`, `biography` إلى SELECT

#### تحديث `profileExists`:
- أضفنا معامل `foreignKeyColumn` (القيمة الافتراضية: 'user_id')

### 2. تحديث `profileDoctorController.js`

#### تحديث جميع استدعاءات `getProfileByUserId`:
```javascript
await ProfileService.getProfileByUserId(
  doctorId,
  'doctor_profiles',
  'doctor_profile_translations',
  language,
  'doctor_id',           // Foreign key في جدول doctor_profiles
  'doctor_profile_id'    // Foreign key في جدول doctor_profile_translations
);
```

#### تحديث جميع استدعاءات `profileExists`:
```javascript
await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');
```

## الملفات المعدلة (Modified Files)
1. `services/profileService.js`
   - `getProfileByUserId()` method
   - `profileExists()` method

2. `controllers/profileDoctorController.js`
   - `getProfile()` method (lines 40-48)
   - `updateProfile()` method (lines 189-197)
   - `deleteProfile()` method (line 241)
   - `uploadProfilePicture()` method (line 832)
   - `deleteProfilePicture()` method (line 912)

## الاختبار (Testing)
بعد هذه الإصلاحات، يجب أن يعمل API التالي بشكل صحيح:
```
GET http://localhost:3006/api/profile-doctor/
```

مع header:
```
Authorization: Bearer <doctor_token>
```

## ملاحظات (Notes)
- هذا الإصلاح متوافق مع الأنظمة الموجودة (user profiles) لأننا استخدمنا قيم افتراضية
- الحل قابل للتوسع لأنواع أخرى من الملفات الشخصية (assistant, admin)

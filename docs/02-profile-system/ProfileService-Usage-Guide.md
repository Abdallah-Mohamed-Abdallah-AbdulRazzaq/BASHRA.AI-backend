# ProfileService Usage Guide
## دليل استخدام خدمة الملفات الشخصية

هذا الدليل يوضح كيفية استخدام `ProfileService` مع جميع أنواع المستخدمين الأربعة في النظام.

---

## 📊 بنية قاعدة البيانات

### ملخص العلاقات بين الجداول

| نوع المستخدم | جدول الحساب | جدول الملف الشخصي | جدول الترجمة | FK في Profile | FK في Translation |
|--------------|-------------|-------------------|---------------|---------------|-------------------|
| **Users** | `users` | `user_profiles` | `user_profile_translations` | `user_id` | `profile_id` |
| **Doctors** | `doctors` | `doctor_profiles` | `doctor_profile_translations` | `doctor_id` | `doctor_profile_id` |
| **Admins** | `admins` | `admin_profiles` | `admin_profile_translations` | `admin_id` | `profile_id` |
| **Assistants** | `assistants` | `assistant_profiles` | `assistant_profile_translations` | `assistant_id` | `assistant_profile_id` |

---

## 🔧 استخدام `getProfileByUserId()`

### التوقيع (Signature)
```javascript
ProfileService.getProfileByUserId(
  userId,                    // معرف المستخدم
  tableName,                 // اسم جدول الملف الشخصي
  translationTable,          // اسم جدول الترجمة
  language = 'ar',          // كود اللغة (اختياري)
  foreignKeyColumn = 'user_id',           // اسم العمود الخارجي في جدول Profile (اختياري)
  translationForeignKey = 'profile_id'    // اسم العمود الخارجي في جدول Translation (اختياري)
)
```

### 1️⃣ استخدام مع **Users** (القيم الافتراضية)

```javascript
const profile = await ProfileService.getProfileByUserId(
  userId,
  'user_profiles',
  'user_profile_translations',
  language
  // لا حاجة لتمرير foreignKeyColumn و translationForeignKey
  // سيتم استخدام القيم الافتراضية: 'user_id' و 'profile_id'
);
```

**الحقول المُعادة:**
- جميع حقول `user_profiles`
- `full_name` من الترجمة
- `emergency_contact_name` من الترجمة
- `emergency_contact_relationship` من الترجمة
- `language_code`

---

### 2️⃣ استخدام مع **Doctors**

```javascript
const profile = await ProfileService.getProfileByUserId(
  doctorId,
  'doctor_profiles',
  'doctor_profile_translations',
  language,
  'doctor_id',           // ⚠️ مهم: استخدام doctor_id
  'doctor_profile_id'    // ⚠️ مهم: استخدام doctor_profile_id
);
```

**الحقول المُعادة:**
- جميع حقول `doctor_profiles`
- `full_name` من الترجمة
- `specialty` من الترجمة ⭐
- `sub_specialty` من الترجمة ⭐
- `biography` من الترجمة ⭐
- `emergency_contact_name` من الترجمة
- `emergency_contact_relationship` من الترجمة
- `language_code`

---

### 3️⃣ استخدام مع **Admins** (القيم الافتراضية)

```javascript
const profile = await ProfileService.getProfileByUserId(
  adminId,
  'admin_profiles',
  'admin_profile_translations',
  language
  // لا حاجة لتمرير foreignKeyColumn
  // سيتم استخدام القيم الافتراضية: 'user_id' و 'profile_id'
  // ⚠️ ملاحظة: على الرغم من أن جدول admin_profiles يستخدم admin_id
  // يجب تمرير 'admin_id' بشكل صريح
);
```

**⚠️ تصحيح للـ Admins:**
```javascript
const profile = await ProfileService.getProfileByUserId(
  adminId,
  'admin_profiles',
  'admin_profile_translations',
  language,
  'admin_id',      // ⚠️ يجب تمرير admin_id
  'profile_id'     // القيمة الافتراضية صحيحة
);
```

**الحقول المُعادة:**
- جميع حقول `admin_profiles`
- `full_name` من الترجمة
- `job_title` من الترجمة (⚠️ لا يتم إرجاعه حالياً - يحتاج تحديث)
- `department` من الترجمة (⚠️ لا يتم إرجاعه حالياً - يحتاج تحديث)
- `emergency_contact_name` من الترجمة
- `emergency_contact_relationship` من الترجمة
- `language_code`

---

### 4️⃣ استخدام مع **Assistants**

```javascript
const profile = await ProfileService.getProfileByUserId(
  assistantId,
  'assistant_profiles',
  'assistant_profile_translations',
  language,
  'assistant_id',           // ⚠️ مهم: استخدام assistant_id
  'assistant_profile_id'    // ⚠️ مهم: استخدام assistant_profile_id
);
```

**الحقول المُعادة:**
- جميع حقول `assistant_profiles`
- `full_name` من الترجمة
- `job_title` من الترجمة (⚠️ لا يتم إرجاعه حالياً - يحتاج تحديث)
- `emergency_contact_name` من الترجمة
- `emergency_contact_relationship` من الترجمة
- `language_code`

---

## 🔧 استخدام `profileExists()`

### التوقيع (Signature)
```javascript
ProfileService.profileExists(
  userId,                    // معرف المستخدم
  tableName,                 // اسم جدول الملف الشخصي
  foreignKeyColumn = 'user_id'  // اسم العمود الخارجي (اختياري)
)
```

### أمثلة الاستخدام

```javascript
// ✅ Users
const profileId = await ProfileService.profileExists(userId, 'user_profiles');

// ✅ Doctors
const profileId = await ProfileService.profileExists(doctorId, 'doctor_profiles', 'doctor_id');

// ✅ Admins
const profileId = await ProfileService.profileExists(adminId, 'admin_profiles', 'admin_id');

// ✅ Assistants
const profileId = await ProfileService.profileExists(assistantId, 'assistant_profiles', 'assistant_id');
```

---

## 📝 ملاحظات مهمة

### ✅ ما يعمل حالياً:
1. **Users**: يعمل بدون مشاكل مع القيم الافتراضية
2. **Doctors**: يعمل بشكل صحيح بعد التحديث الأخير
3. **Admins & Assistants**: يحتاجون لتمرير المعاملات الصحيحة

### ⚠️ نقاط تحتاج تحسين:

1. **حقول الترجمة للـ Admins:**
   - `job_title` و `department` غير مُضافة في SELECT
   - يجب تحديث `getProfileByUserId()` لإضافتهم

2. **حقول الترجمة للـ Assistants:**
   - `job_title` غير مُضاف في SELECT
   - يجب تحديث `getProfileByUserId()` لإضافته

3. **تحسين الدالة لتكون أكثر ديناميكية:**
   - يمكن إنشاء دالة helper لتحديد الأعمدة تلقائياً بناءً على نوع الجدول

---

## 🎯 خطة التحسين المقترحة

### المرحلة 1: تحديث `getProfileByUserId()`
```javascript
// إضافة منطق ديناميكي لاختيار الحقول المناسبة
static async getProfileByUserId(userId, tableName, translationTable, language = 'ar', foreignKeyColumn = 'user_id', translationForeignKey = 'profile_id') {
  // تحديد الحقول بناءً على نوع الجدول
  let translationFields = `
    t.full_name, 
    t.emergency_contact_name, 
    t.emergency_contact_relationship,
    t.language_code
  `;
  
  // إضافة حقول خاصة بالأطباء
  if (translationTable === 'doctor_profile_translations') {
    translationFields = `
      t.full_name, 
      t.specialty,
      t.sub_specialty,
      t.biography,
      t.emergency_contact_name, 
      t.emergency_contact_relationship,
      t.language_code
    `;
  }
  
  // إضافة حقول خاصة بالإداريين
  if (translationTable === 'admin_profile_translations') {
    translationFields = `
      t.full_name, 
      t.job_title,
      t.department,
      t.emergency_contact_name, 
      t.emergency_contact_relationship,
      t.language_code
    `;
  }
  
  // إضافة حقول خاصة بالمساعدين
  if (translationTable === 'assistant_profile_translations') {
    translationFields = `
      t.full_name, 
      t.job_title,
      t.emergency_contact_name, 
      t.emergency_contact_relationship,
      t.language_code
    `;
  }
  
  // ... بقية الكود
}
```

### المرحلة 2: إنشاء Controllers للأنواع المفقودة
- `profileAdminController.js`
- `profileAssistantController.js`

---

## 📚 مراجع إضافية

- **ملف بنية الجداول:** `docs/Types-of-users-in-a-database.sql`
- **ملف الإصلاح السابق:** `docs/profile-doctor-fix-summary.md`
- **Service الرئيسي:** `services/profileService.js`
- **Controllers الموجودة:**
  - `controllers/profileUserController.js`
  - `controllers/profileDoctorController.js`

---

## ✨ مثال كامل لاستخدام مع جميع الأنواع

```javascript
// في Controller خاص بك
class ProfileController {
  static async getProfile(req, res, userType) {
    const userId = req.user.id;
    const language = req.headers['accept-language'] || 'ar';
    
    // تحديد التكوين بناءً على نوع المستخدم
    const configs = {
      user: {
        table: 'user_profiles',
        translation: 'user_profile_translations',
        fk: 'user_id',
        translationFk: 'profile_id'
      },
      doctor: {
        table: 'doctor_profiles',
        translation: 'doctor_profile_translations',
        fk: 'doctor_id',
        translationFk: 'doctor_profile_id'
      },
      admin: {
        table: 'admin_profiles',
        translation: 'admin_profile_translations',
        fk: 'admin_id',
        translationFk: 'profile_id'
      },
      assistant: {
        table: 'assistant_profiles',
        translation: 'assistant_profile_translations',
        fk: 'assistant_id',
        translationFk: 'assistant_profile_id'
      }
    };
    
    const config = configs[userType];
    
    const profile = await ProfileService.getProfileByUserId(
      userId,
      config.table,
      config.translation,
      language,
      config.fk,
      config.translationFk
    );
    
    return res.json({ success: true, data: profile });
  }
}
```

---

تم التوثيق بواسطة: Cascade AI  
التاريخ: نوفمبر 2024

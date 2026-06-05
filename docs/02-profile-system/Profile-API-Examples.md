# Profile API - أمثلة الاستخدام الكاملة
## Complete Usage Examples for All User Types

هذا الملف يحتوي على أمثلة عملية لكيفية استخدام Profile APIs مع جميع أنواع المستخدمين الأربعة.

---

## 📦 الملفات المطلوبة

```
utils/profileTypeConfig.js    - تكوينات أنواع المستخدمين
services/profileService.js    - خدمة الملفات الشخصية (محدّثة)
controllers/*Controller.js    - Controllers لكل نوع مستخدم
```

---

## 🎯 الطريقة الموصى بها - استخدام Helper Config

### 1. استخدام مباشر مع ProfileService

```javascript
const ProfileService = require('../services/profileService');
const { getProfileConfig } = require('../utils/profileTypeConfig');

// مثال 1: جلب ملف شخصي لمستخدم عادي
async function getUserProfile(userId, language = 'ar') {
  const config = getProfileConfig('user');
  
  const profile = await ProfileService.getProfileByUserId(
    userId,
    config.profileTable,           // 'user_profiles'
    config.translationTable,       // 'user_profile_translations'
    language,                      // 'ar' or 'en'
    config.foreignKeyColumn,       // 'user_id'
    config.translationForeignKey   // 'profile_id'
  );
  
  return profile;
}

// مثال 2: جلب ملف شخصي لطبيب
async function getDoctorProfile(doctorId, language = 'ar') {
  const config = getProfileConfig('doctor');
  
  const profile = await ProfileService.getProfileByUserId(
    doctorId,
    config.profileTable,           // 'doctor_profiles'
    config.translationTable,       // 'doctor_profile_translations'
    language,                      // 'ar' or 'en'
    config.foreignKeyColumn,       // 'doctor_id'
    config.translationForeignKey   // 'doctor_profile_id'
  );
  
  return profile;
}

// مثال 3: جلب ملف شخصي لمشرف
async function getAdminProfile(adminId, language = 'ar') {
  const config = getProfileConfig('admin');
  
  const profile = await ProfileService.getProfileByUserId(
    adminId,
    config.profileTable,           // 'admin_profiles'
    config.translationTable,       // 'admin_profile_translations'
    language,                      // 'ar' or 'en'
    config.foreignKeyColumn,       // 'admin_id'
    config.translationForeignKey   // 'profile_id'
  );
  
  return profile;
}

// مثال 4: جلب ملف شخصي لمساعد
async function getAssistantProfile(assistantId, language = 'ar') {
  const config = getProfileConfig('assistant');
  
  const profile = await ProfileService.getProfileByUserId(
    assistantId,
    config.profileTable,           // 'assistant_profiles'
    config.translationTable,       // 'assistant_profile_translations'
    language,                      // 'ar' or 'en'
    config.foreignKeyColumn,       // 'assistant_id'
    config.translationForeignKey   // 'assistant_profile_id'
  );
  
  return profile;
}
```

---

## 🚀 استخدام متقدم - دالة موحدة لجميع الأنواع

```javascript
const ProfileService = require('../services/profileService');
const { getProfileConfig, isValidUserType } = require('../utils/profileTypeConfig');

/**
 * Universal profile fetcher - works with all user types
 * دالة موحدة لجلب الملف الشخصي لأي نوع مستخدم
 * @param {Number} userId - User/Doctor/Admin/Assistant ID
 * @param {String} userType - Type: 'user', 'doctor', 'admin', 'assistant'
 * @param {String} language - Language code: 'ar' or 'en'
 * @returns {Object|null} Profile data or null
 */
async function getProfileByType(userId, userType, language = 'ar') {
  try {
    // Validate user type
    if (!isValidUserType(userType)) {
      throw new Error(`Invalid user type: ${userType}`);
    }
    
    // Get configuration
    const config = getProfileConfig(userType);
    
    // Fetch profile using ProfileService
    const profile = await ProfileService.getProfileByUserId(
      userId,
      config.profileTable,
      config.translationTable,
      language,
      config.foreignKeyColumn,
      config.translationForeignKey
    );
    
    return profile;
  } catch (error) {
    console.error(`Error fetching ${userType} profile:`, error);
    throw error;
  }
}

/**
 * Check if profile exists - works with all user types
 * التحقق من وجود ملف شخصي لأي نوع مستخدم
 */
async function checkProfileExists(userId, userType) {
  try {
    if (!isValidUserType(userType)) {
      throw new Error(`Invalid user type: ${userType}`);
    }
    
    const config = getProfileConfig(userType);
    
    const profileId = await ProfileService.profileExists(
      userId,
      config.profileTable,
      config.foreignKeyColumn
    );
    
    return profileId !== null;
  } catch (error) {
    console.error(`Error checking ${userType} profile:`, error);
    throw error;
  }
}

// استخدام الدوال الموحدة
async function example() {
  // جلب ملف شخصي لمستخدم عادي
  const userProfile = await getProfileByType(1, 'user', 'ar');
  
  // جلب ملف شخصي لطبيب
  const doctorProfile = await getProfileByType(5, 'doctor', 'en');
  
  // جلب ملف شخصي لمشرف
  const adminProfile = await getProfileByType(2, 'admin', 'ar');
  
  // جلب ملف شخصي لمساعد
  const assistantProfile = await getProfileByType(3, 'assistant', 'ar');
  
  // التحقق من وجود ملف شخصي
  const exists = await checkProfileExists(1, 'user');
  console.log('Profile exists:', exists);
}
```

---

## 🎨 مثال Controller كامل - Generic Profile Controller

```javascript
const ProfileService = require('../services/profileService');
const { getProfileConfig, isValidUserType } = require('../utils/profileTypeConfig');

/**
 * Generic Profile Controller
 * Controller عام يمكن استخدامه مع أي نوع مستخدم
 */
class GenericProfileController {
  
  /**
   * Get profile for any user type
   * جلب الملف الشخصي لأي نوع مستخدم
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type; // 'user', 'doctor', 'admin', 'assistant'
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';
      
      // Validate user type
      if (!isValidUserType(userType)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستخدم غير صالح',
          message_en: 'Invalid user type'
        });
      }
      
      // Get configuration
      const config = getProfileConfig(userType);
      
      // Fetch profile
      const profile = await ProfileService.getProfileByUserId(
        userId,
        config.profileTable,
        config.translationTable,
        language,
        config.foreignKeyColumn,
        config.translationForeignKey
      );
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' 
            ? 'الملف الشخصي غير موجود' 
            : 'Profile not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: profile
      });
      
    } catch (error) {
      console.error('Error in getProfile:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في جلب الملف الشخصي',
        message_en: 'Error fetching profile',
        error: error.message
      });
    }
  }
  
  /**
   * Check if profile exists
   * التحقق من وجود الملف الشخصي
   */
  static async profileExists(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type;
      
      if (!isValidUserType(userType)) {
        return res.status(400).json({
          success: false,
          message: 'نوع المستخدم غير صالح'
        });
      }
      
      const config = getProfileConfig(userType);
      
      const profileId = await ProfileService.profileExists(
        userId,
        config.profileTable,
        config.foreignKeyColumn
      );
      
      return res.status(200).json({
        success: true,
        exists: profileId !== null,
        profileId: profileId
      });
      
    } catch (error) {
      console.error('Error checking profile:', error);
      return res.status(500).json({
        success: false,
        message: 'خطأ في التحقق من الملف الشخصي',
        error: error.message
      });
    }
  }
}

module.exports = GenericProfileController;
```

---

## 📝 مثال كامل لـ Controller متخصص (Doctor)

```javascript
const ProfileService = require('../services/profileService');
const { getProfileConfig } = require('../utils/profileTypeConfig');

class ProfileDoctorController {
  
  /**
   * Get doctor profile
   * جلب الملف الشخصي للطبيب
   */
  static async getProfile(req, res) {
    try {
      const doctorId = req.user.id;
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';
      
      // استخدام التكوين من helper
      const config = getProfileConfig('doctor');
      
      const profile = await ProfileService.getProfileByUserId(
        doctorId,
        config.profileTable,
        config.translationTable,
        language,
        config.foreignKeyColumn,
        config.translationForeignKey
      );
      
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: profile
      });
      
    } catch (error) {
      console.error('Error in getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الملف الشخصي',
        error: error.message
      });
    }
  }
  
  /**
   * Update doctor profile
   * تحديث الملف الشخصي للطبيب
   */
  static async updateProfile(req, res) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const doctorId = req.user.id;
      const language = req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'ar';
      
      // استخدام التكوين
      const config = getProfileConfig('doctor');
      
      // Check if profile exists
      const profileId = await ProfileService.profileExists(
        doctorId,
        config.profileTable,
        config.foreignKeyColumn
      );
      
      if (!profileId) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: language === 'ar' ? 'الملف الشخصي غير موجود' : 'Profile not found'
        });
      }
      
      // ... update logic ...
      
      await connection.commit();
      
      // Get updated profile
      const updatedProfile = await ProfileService.getProfileByUserId(
        doctorId,
        config.profileTable,
        config.translationTable,
        language,
        config.foreignKeyColumn,
        config.translationForeignKey
      );
      
      res.status(200).json({
        success: true,
        message: language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully',
        data: updatedProfile
      });
      
    } catch (error) {
      await connection.rollback();
      console.error('Error in updateProfile:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في التحديث',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
}

module.exports = ProfileDoctorController;
```

---

## 🧪 أمثلة الاختبار (Testing Examples)

```javascript
const { getProfileConfig } = require('../utils/profileTypeConfig');

// Test 1: Get all configurations
console.log('All configs:', getAllProfileConfigs());

// Test 2: Get specific configuration
const doctorConfig = getProfileConfig('doctor');
console.log('Doctor config:', doctorConfig);
// Output:
// {
//   profileTable: 'doctor_profiles',
//   translationTable: 'doctor_profile_translations',
//   foreignKeyColumn: 'doctor_id',
//   translationForeignKey: 'doctor_profile_id',
//   accountTable: 'doctors',
//   translatableFields: [...]
// }

// Test 3: Validate user type
console.log(isValidUserType('doctor'));  // true
console.log(isValidUserType('patient')); // false

// Test 4: Get specific fields
console.log(getForeignKeyColumn('admin'));           // 'admin_id'
console.log(getTranslationForeignKey('assistant'));  // 'assistant_profile_id'
console.log(getTranslatableFields('user'));          // ['full_name', ...]
```

---

## 🔐 استخدام مع Middleware للتحقق من الصلاحيات

```javascript
const { getProfileConfig } = require('../utils/profileTypeConfig');

/**
 * Middleware للتحقق من نوع المستخدم وتحميل التكوين
 */
function loadProfileConfig(req, res, next) {
  try {
    const userType = req.user?.type;
    
    if (!userType || !isValidUserType(userType)) {
      return res.status(403).json({
        success: false,
        message: 'نوع المستخدم غير صالح أو غير محدد'
      });
    }
    
    // تحميل التكوين وإضافته للـ request
    req.profileConfig = getProfileConfig(userType);
    next();
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'خطأ في تحميل تكوين الملف الشخصي',
      error: error.message
    });
  }
}

// استخدام في الـ routes
router.get('/profile', authenticateJWT, loadProfileConfig, async (req, res) => {
  const userId = req.user.id;
  const config = req.profileConfig; // التكوين متاح هنا
  
  const profile = await ProfileService.getProfileByUserId(
    userId,
    config.profileTable,
    config.translationTable,
    'ar',
    config.foreignKeyColumn,
    config.translationForeignKey
  );
  
  res.json({ success: true, data: profile });
});
```

---

## ✅ الملخص

### ✨ المميزات:
1. ✅ **دعم جميع أنواع المستخدمين** (users, doctors, admins, assistants)
2. ✅ **كود موحد وقابل لإعادة الاستخدام**
3. ✅ **سهولة الصيانة** - تكوين مركزي واحد
4. ✅ **Type-safe** - التحقق من الأنواع
5. ✅ **قابل للتوسع** - إضافة أنواع جديدة بسهولة

### 📚 الملفات المحدثة:
- ✅ `services/profileService.js` - دعم ديناميكي للحقول
- ✅ `utils/profileTypeConfig.js` - تكوينات مركزية
- ✅ `controllers/profileDoctorController.js` - يستخدم التكوينات الجديدة
- ⏳ `controllers/profileAdminController.js` - يحتاج إنشاء
- ⏳ `controllers/profileAssistantController.js` - يحتاج إنشاء

---

تم التوثيق بواسطة: Cascade AI  
التاريخ: نوفمبر 2024

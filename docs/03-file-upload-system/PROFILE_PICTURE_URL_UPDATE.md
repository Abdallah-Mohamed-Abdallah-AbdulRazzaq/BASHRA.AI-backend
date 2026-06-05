# Profile Picture URL Update
# تحديث رابط الصورة الشخصية

## 🔄 التغيير | The Change

### قبل (Before):
الـ URL كان مسار نسبي فقط:
```json
{
  "profile_picture_url": "/upload/profiles/user/user_23_1762193171473.png"
}
```

### بعد (After):
الـ URL أصبح كامل:
```json
{
  "profile_picture_url": "http://localhost:3006/upload/profiles/user/user_23_1762193171473.png"
}
```

---

## ✅ المميزات | Benefits

### 1. سهولة الاستخدام في Frontend
```javascript
// قبل - تحتاج لإضافة BASE_URL يدوياً
const imageUrl = `${BASE_URL}${profile.profile_picture_url}`;

// بعد - جاهز للاستخدام مباشرة
const imageUrl = profile.profile_picture_url;
```

### 2. يعمل مع CDN
إذا استخدمت CDN في المستقبل، يمكنك تغيير `BASE_URL` فقط.

### 3. متوافق مع Mobile Apps
التطبيقات المحمولة تحتاج URL كامل عادةً.

---

## ⚙️ الإعدادات المطلوبة | Required Settings

### في ملف `.env`:

```bash
# Development
BASE_URL=http://localhost:3006

# Production
BASE_URL=https://api.bashra.ai
```

**⚠️ مهم جداً:** تأكد من إضافة `BASE_URL` في ملف `.env`!

---

## 🔧 التعديلات التي تمت | Changes Made

### 1. `services/profileService.js`

#### uploadProfilePicture():
```javascript
// قبل
const fileUrl = `/upload/profiles/${profileType}/${filename}`;

// بعد
const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
const fileUrl = `${baseUrl}/upload/profiles/${profileType}/${filename}`;
```

#### deleteProfilePicture():
تم تحديثها للتعامل مع URL كامل:
```javascript
// تستخرج المسار النسبي من URL الكامل
if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
  const url = new URL(pictureUrl);
  relativePath = url.pathname;
}
```

---

## 📋 أمثلة | Examples

### Development Environment:
```json
{
  "profile_picture_url": "http://localhost:3006/upload/profiles/user/user_23_1762193171473.png"
}
```

### Production Environment:
```json
{
  "profile_picture_url": "https://api.bashra.ai/upload/profiles/user/user_23_1762193171473.png"
}
```

---

## 🧪 الاختبار | Testing

### 1. تحديث ملف `.env`:
```bash
BASE_URL=http://localhost:3006
```

### 2. رفع صورة جديدة:
```bash
POST http://localhost:3006/api/profile-user/picture
Authorization: Bearer YOUR_TOKEN

Form-data:
- profile_picture: [file]
```

### 3. التحقق من Response:
```json
{
  "success": true,
  "message": "تم رفع الصورة الشخصية بنجاح",
  "data": {
    "profile_picture_url": "http://localhost:3006/upload/profiles/user/user_23_1234567890.png"
  }
}
```

### 4. جلب Profile:
```bash
GET http://localhost:3006/api/profile-user
Authorization: Bearer YOUR_TOKEN
```

Response:
```json
{
  "success": true,
  "data": {
    "profile_picture_url": "http://localhost:3006/upload/profiles/user/user_23_1234567890.png"
  }
}
```

---

## 🌐 الاستخدام في Frontend | Frontend Usage

### React Example:
```jsx
function ProfilePicture({ profile }) {
  return (
    <img 
      src={profile.profile_picture_url} 
      alt="Profile"
      onError={(e) => {
        e.target.src = '/default-avatar.png'; // Fallback
      }}
    />
  );
}
```

### استخدام مباشر:
```html
<img src="http://localhost:3006/upload/profiles/user/user_23_123.png" alt="Profile">
```

---

## 🔄 Migration للبيانات القديمة | Migrating Old Data

إذا كان لديك بيانات قديمة بمسارات نسبية:

### SQL Update Query:
```sql
UPDATE user_profiles 
SET profile_picture_url = CONCAT('http://localhost:3006', profile_picture_url)
WHERE profile_picture_url IS NOT NULL 
  AND profile_picture_url NOT LIKE 'http%';
```

### أو يمكنك تحديثها في Backend:
```javascript
// في langHelper.js أو middleware
if (profile.profile_picture_url && !profile.profile_picture_url.startsWith('http')) {
  profile.profile_picture_url = `${process.env.BASE_URL}${profile.profile_picture_url}`;
}
```

---

## ⚠️ ملاحظات مهمة | Important Notes

### 1. CORS Settings
تأكد من إعدادات CORS تسمح بالوصول للصور:
```javascript
// في app.js
app.use('/upload', express.static(path.join(__dirname, 'upload'), {
  maxAge: '1d',
  etag: true
}));
```

### 2. Production Deployment
عند النشر على production:
```bash
# .env في السيرفر
BASE_URL=https://api.bashra.ai
```

### 3. CDN Integration (مستقبلي)
إذا أردت استخدام CDN:
```bash
BASE_URL=https://cdn.bashra.ai
```

---

## 🔐 الأمان | Security

### 1. تحقق من الـ URL في Frontend:
```javascript
// تأكد أن الـ URL من نطاقك فقط
const isValidUrl = (url) => {
  const allowedDomains = [
    'localhost:3006',
    'api.bashra.ai',
    'cdn.bashra.ai'
  ];
  
  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.host.includes(domain));
  } catch {
    return false;
  }
};
```

### 2. استخدم HTTPS في Production:
```bash
BASE_URL=https://api.bashra.ai  # ✅ آمن
BASE_URL=http://api.bashra.ai   # ❌ غير آمن
```

---

## 📱 Mobile Apps

### React Native:
```jsx
import { Image } from 'react-native';

<Image 
  source={{ uri: profile.profile_picture_url }}
  style={{ width: 100, height: 100, borderRadius: 50 }}
/>
```

### Flutter:
```dart
Image.network(profile.profilePictureUrl)
```

الـ URL الكامل يعمل مباشرة بدون أي تعديل!

---

## ✅ Checklist

- [x] تحديث `uploadProfilePicture()` لإرجاع URL كامل
- [x] تحديث `deleteProfilePicture()` للتعامل مع URL كامل
- [x] إضافة `BASE_URL` في `.env.example`
- [x] إنشاء توثيق للتغيير
- [ ] إضافة `BASE_URL` في ملف `.env` الفعلي (يدوياً)
- [ ] اختبار رفع صورة جديدة
- [ ] اختبار حذف صورة
- [ ] (اختياري) تحديث البيانات القديمة في قاعدة البيانات

---

**Status:** ✅ Complete  
**Version:** 2.0  
**Date:** November 2024

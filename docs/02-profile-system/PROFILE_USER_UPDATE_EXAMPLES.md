# User Profile Update - Simple Examples
# أمثلة بسيطة لتحديث الملف الشخصي

## التحديث الجديد المُبسط | New Simplified Update

تم تبسيط API بحيث لا تحتاج لإرسال `translations` object معقد. 

**الطريقة القديمة (المعقدة):**
```json
{
  "translations": {
    "ar": {
      "full_name": "أحمد محمد"
    },
    "en": {
      "full_name": "Ahmed Mohamed"
    }
  }
}
```

**الطريقة الجديدة (البسيطة):**
```json
{
  "full_name": "أحمد محمد"
}
```

## كيف يعمل | How It Works

- يتم تحديث الحقول حسب اللغة المُرسلة في الـ header
- الـ `Accept-Language` header يحدد أي ترجمة سيتم تحديثها
- إذا أرسلت `Accept-Language: ar` - سيتم تحديث الترجمة العربية
- إذا أرسلت `Accept-Language: en` - سيتم تحديث الترجمة الإنجليزية

---

## Examples | أمثلة

### 1. Update Arabic Profile
### تحديث الملف الشخصي بالعربية

```http
PUT /api/profile-user
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "full_name": "أحمد محمد علي",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "nationality": "مصري",
  "emergency_contact_name": "فاطمة أحمد",
  "emergency_contact_phone": "+20123456789",
  "emergency_contact_relationship": "أخت"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الملف الشخصي بنجاح",
  "data": {
    "id": 1,
    "user_id": 23,
    "full_name": "أحمد محمد علي",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "nationality": "مصري",
    "emergency_contact_name": "فاطمة أحمد",
    "emergency_contact_phone": "+20123456789",
    "emergency_contact_relationship": "أخت"
  }
}
```

---

### 2. Update English Profile
### تحديث الملف الشخصي بالإنجليزية

```http
PUT /api/profile-user
Authorization: Bearer YOUR_TOKEN
Accept-Language: en
Content-Type: application/json

{
  "full_name": "Ahmed Mohamed Ali",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "nationality": "Egyptian",
  "emergency_contact_name": "Fatima Ahmed",
  "emergency_contact_phone": "+20123456789",
  "emergency_contact_relationship": "Sister"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "user_id": 23,
    "full_name": "Ahmed Mohamed Ali",
    "date_of_birth": "1990-01-15",
    "gender": "male",
    "nationality": "Egyptian",
    "emergency_contact_name": "Fatima Ahmed",
    "emergency_contact_phone": "+20123456789",
    "emergency_contact_relationship": "Sister"
  }
}
```

---

### 3. Partial Update
### تحديث جزئي

يمكنك إرسال فقط الحقول التي تريد تحديثها:

```http
PUT /api/profile-user
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "full_name": "أحمد محمد السيد",
  "gender": "male"
}
```

---

### 4. Update Only Basic Fields
### تحديث الحقول الأساسية فقط

```http
PUT /api/profile-user
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "date_of_birth": "1990-05-20",
  "gender": "female",
  "timezone": "Africa/Cairo",
  "language_preference": "ar"
}
```

---

### 5. Update Only Translation Fields
### تحديث حقول الترجمة فقط

```http
PUT /api/profile-user
Authorization: Bearer YOUR_TOKEN
Accept-Language: ar
Content-Type: application/json

{
  "full_name": "سارة أحمد محمد",
  "emergency_contact_name": "محمد أحمد",
  "emergency_contact_relationship": "أب"
}
```

---

## Available Fields | الحقول المتاحة

### Basic Profile Fields (user_profiles table)
### الحقول الأساسية (جدول user_profiles)

- `date_of_birth` - تاريخ الميلاد (YYYY-MM-DD)
- `gender` - الجنس (male, female, other, prefer_not_to_say)
- `nationality` - الجنسية
- `emergency_contact_phone` - رقم هاتف جهة الاتصال
- `timezone` - المنطقة الزمنية
- `language_preference` - اللغة المفضلة (ar, en)

### Translation Fields (user_profile_translations table)
### حقول الترجمة (جدول user_profile_translations)

- `full_name` - الاسم الكامل
- `emergency_contact_name` - اسم جهة الاتصال
- `emergency_contact_relationship` - العلاقة بجهة الاتصال

---

## Important Notes | ملاحظات مهمة

### ✅ Advantages | المميزات

1. **أبسط** - لا حاجة لـ nested objects
2. **أسرع** - عدد أقل من الـ queries
3. **أكثر أماناً** - transaction واحدة فقط
4. **سهل الاستخدام** - مباشر وواضح

### ⚠️ Important | مهم

1. **اللغة الحالية فقط** - التحديث يطبق على اللغة المُرسلة في الـ header
2. **لتحديث لغتين** - أرسل طلبين منفصلين (واحد لكل لغة)
3. **الحقول الاختيارية** - أرسل فقط ما تريد تحديثه

---

## Use Cases | حالات الاستخدام

### Case 1: User switches language and updates name
### الحالة 1: المستخدم يغير اللغة ويحدث الاسم

```javascript
// First: Update Arabic name
fetch('/api/profile-user', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'ar',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    full_name: 'أحمد محمد'
  })
});

// Then: Update English name
fetch('/api/profile-user', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'en',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    full_name: 'Ahmed Mohamed'
  })
});
```

### Case 2: Update all information at once
### الحالة 2: تحديث جميع المعلومات دفعة واحدة

```javascript
fetch('/api/profile-user', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Accept-Language': 'ar',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    // Basic fields
    date_of_birth: '1990-01-15',
    gender: 'male',
    nationality: 'مصري',
    emergency_contact_phone: '+20123456789',
    timezone: 'Africa/Cairo',
    language_preference: 'ar',
    
    // Translation fields
    full_name: 'أحمد محمد علي',
    emergency_contact_name: 'فاطمة أحمد',
    emergency_contact_relationship: 'أخت'
  })
});
```

---

## Error Handling | معالجة الأخطاء

### Invalid Date Format
```json
{
  "success": false,
  "message": "صيغة تاريخ الميلاد غير صحيحة. استخدم YYYY-MM-DD"
}
```

### Invalid Gender
```json
{
  "success": false,
  "message": "قيمة الجنس غير صحيحة"
}
```

### Invalid Phone Number
```json
{
  "success": false,
  "message": "رقم هاتف جهة الاتصال غير صحيح"
}
```

---

## Testing with Postman | الاختبار باستخدام Postman

### Setup
1. **Method:** PUT
2. **URL:** `http://localhost:3006/api/profile-user`
3. **Headers:**
   - `Authorization: Bearer YOUR_TOKEN`
   - `Accept-Language: ar` (or `en`)
   - `Content-Type: application/json`
4. **Body:** Raw JSON

### Example Body:
```json
{
  "full_name": "أحمد محمد علي",
  "date_of_birth": "1990-01-15",
  "gender": "male",
  "nationality": "مصري"
}
```

---

**Version:** 2.0 (Simplified)  
**Date:** November 2024  
**Status:** ✅ Active

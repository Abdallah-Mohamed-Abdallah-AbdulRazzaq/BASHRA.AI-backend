# 👤 نظام تتبع منشئ العنوان - Creator Tracking System

> **تاريخ التحديث:** 28 نوفمبر 2025  
> **الإصدار:** 2.0.0

---

## 📋 نظرة عامة | Overview

تم تحديث نظام العناوين لإضافة ميزة تتبع منشئ العنوان (Creator Tracking). هذه الميزة تسمح بتسجيل معلومات المستخدم الذي قام بإضافة كل عنوان في النظام.

---

## 🔄 التحديثات على قاعدة البيانات | Database Updates

### جدول `addressable`

تم إضافة عمودين جديدين:

```sql
ALTER TABLE `addressable`
ADD COLUMN `creator_id` INT DEFAULT NULL COMMENT 'ID للشخص الذي قام بالإضافة',
ADD COLUMN `creator_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'نوع الجدول: User, Doctor, Admin, Assistant',
ADD INDEX `idx_addressable_creator` (`creator_type`, `creator_id`);
```

### الحقول الجديدة:

| الحقل | النوع | الوصف |
|------|------|-------|
| `creator_id` | INT | معرف المستخدم الذي أضاف العنوان |
| `creator_type` | VARCHAR(50) | نوع المستخدم (User, Doctor, Admin, Assistant) |

---

## 💡 كيف يعمل النظام | How It Works

### عند إضافة عنوان جديد:

1. المستخدم يقوم بتسجيل الدخول ويحصل على JWT Token
2. المستخدم يرسل طلب لإضافة عنوان جديد
3. النظام يستخرج معلومات المستخدم من الـ Token:
   - `userId` من `req.user.id`
   - `userType` من `req.user.entityType` أو `req.user.role`
4. النظام يقوم بـ:
   - إضافة العنوان في جدول `addresses`
   - ربط العنوان بالمستخدم في جدول `addressable`
   - تسجيل `creator_id` و `creator_type` تلقائياً

### مثال على الكود:

```javascript
// Link address to user in addressable table with creator info
await connection.execute(`
  INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type)
  VALUES (?, ?, ?, ?, ?)
`, [addressId, addressableType, userId, userId, addressableType]);
```

---

## 📊 أمثلة عملية | Practical Examples

### مثال 1: مستخدم عادي يضيف عنوان لنفسه

**Request:**
```http
POST /api/addresses
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "address_line1": "123 شارع الملك فيصل",
  "type": "home",
  "is_primary": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء العنوان بنجاح",
  "data": {
    "id": 10,
    "address_line1": "123 شارع الملك فيصل",
    "type": "home",
    "is_primary": 1,
    "creator_id": 5,
    "creator_type": "User",
    "created_at": "2025-11-28T10:30:00.000Z"
  }
}
```

**في قاعدة البيانات:**
```sql
-- جدول addresses
id: 10
address_line1: "123 شارع الملك فيصل"
type: "home"
is_primary: 1

-- جدول addressable
address_id: 10
addressable_type: "User"
addressable_id: 5
creator_id: 5
creator_type: "User"
```

---

### مثال 2: طبيب يضيف عنوان لنفسه

**Request:**
```http
POST /api/addresses
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json

{
  "address_line1": "456 شارع العليا",
  "type": "work",
  "is_primary": true
}
```

**في قاعدة البيانات:**
```sql
-- جدول addressable
address_id: 11
addressable_type: "Doctor"
addressable_id: 3
creator_id: 3
creator_type: "Doctor"
```

---

## 🔍 الاستعلامات المحدثة | Updated Queries

### 1. جلب جميع العناوين مع معلومات المنشئ

```sql
SELECT 
  a.*,
  cc.name_ar as location_name,
  cc.level_type as location_type,
  ad.creator_id,
  ad.creator_type
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
WHERE ad.addressable_type = 'User' AND ad.addressable_id = 5
ORDER BY a.is_primary DESC, a.created_at DESC;
```

### 2. جلب العنوان الرئيسي مع معلومات المنشئ

```sql
SELECT 
  a.*,
  cc.name_ar as location_name,
  cc.level_type as location_type,
  ad.creator_id,
  ad.creator_type
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
WHERE ad.addressable_type = 'User' 
  AND ad.addressable_id = 5 
  AND a.is_primary = 1
LIMIT 1;
```

---

## 🎯 حالات الاستخدام | Use Cases

### 1. التدقيق والمراجعة (Auditing)
```sql
-- معرفة من أضاف عناوين معينة
SELECT 
  a.id,
  a.address_line1,
  ad.creator_id,
  ad.creator_type,
  a.created_at
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
WHERE ad.creator_type = 'Admin'
ORDER BY a.created_at DESC;
```

### 2. تقارير النشاط (Activity Reports)
```sql
-- عدد العناوين المضافة من قبل كل نوع مستخدم
SELECT 
  ad.creator_type,
  COUNT(*) as total_addresses
FROM addressable ad
GROUP BY ad.creator_type;
```

### 3. تتبع عناوين مستخدم معين (User Address Tracking)
```sql
-- جميع العناوين التي أضافها مستخدم معين
SELECT 
  a.*,
  ad.addressable_type,
  ad.addressable_id
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
WHERE ad.creator_id = 5 AND ad.creator_type = 'User';
```

---

## 🔒 الأمان والصلاحيات | Security & Permissions

### القواعد الأساسية:

1. **المستخدم العادي (User):**
   - يمكنه إضافة عناوين لنفسه فقط
   - `creator_id` = `addressable_id`
   - `creator_type` = `addressable_type`

2. **الطبيب (Doctor):**
   - يمكنه إضافة عناوين لنفسه فقط
   - `creator_id` = `addressable_id`
   - `creator_type` = `addressable_type`

3. **المسؤول (Admin):**
   - يمكنه إضافة عناوين لنفسه
   - في المستقبل: قد يتم السماح بإضافة عناوين للآخرين

4. **المساعد (Assistant):**
   - يمكنه إضافة عناوين لنفسه فقط
   - `creator_id` = `addressable_id`
   - `creator_type` = `addressable_type`

---

## 📝 ملاحظات مهمة | Important Notes

### ✅ التنفيذ التلقائي:
- لا يحتاج المستخدم لإرسال `creator_id` أو `creator_type` في الطلب
- النظام يستخرج هذه المعلومات تلقائياً من JWT Token
- يتم التسجيل تلقائياً عند كل عملية إضافة عنوان

### ✅ التوافق مع الإصدارات السابقة:
- العناوين القديمة التي تم إضافتها قبل هذا التحديث:
  - `creator_id` = NULL
  - `creator_type` = NULL
- لا يؤثر ذلك على عمل النظام

### ✅ الفهرسة (Indexing):
- تم إضافة فهرس مركب على (`creator_type`, `creator_id`)
- يحسن أداء الاستعلامات التي تبحث عن عناوين حسب المنشئ

---

## 🔄 التحديثات المستقبلية | Future Updates

### ميزات مخطط لها:

1. **إضافة عناوين للآخرين:**
   - السماح للـ Admin بإضافة عناوين للمستخدمين الآخرين
   - في هذه الحالة: `creator_id` ≠ `addressable_id`

2. **سجل التعديلات:**
   - تتبع من قام بتعديل العنوان
   - إضافة `updater_id` و `updater_type`

3. **تقارير متقدمة:**
   - Dashboard لعرض إحصائيات العناوين
   - تقارير حسب المنطقة الجغرافية والمنشئ

---

## 📚 الملفات المحدثة | Updated Files

### 1. Controller
- **File:** `controllers/addressController.js`
- **Function:** `createAddress()`
- **Changes:** 
  - تحديث INSERT query لإضافة `creator_id` و `creator_type`
  - تحديث جميع SELECT queries لإرجاع معلومات المنشئ

### 2. Documentation
- **File:** `docs/08-api-examples/ADDRESSES_API_README.md`
- **Changes:**
  - تحديث هيكل جدول `addressable`
  - إضافة قسم Creator Tracking System
  - تحديث أمثلة الـ Response

### 3. Database Migration
- **File:** `New-Sql-Update(11-28-2025).sql`
- **Changes:**
  - إضافة `creator_id` column
  - إضافة `creator_type` column
  - إضافة index على (`creator_type`, `creator_id`)

---

## 🧪 اختبار النظام | Testing

### اختبار إضافة عنوان:

```bash
# 1. تسجيل دخول مستخدم
curl -X POST http://localhost:3006/api/auth-user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# 2. إضافة عنوان (استخدم الـ token من الخطوة السابقة)
curl -X POST http://localhost:3006/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address_line1": "123 شارع الملك فيصل",
    "type": "home",
    "is_primary": true
  }'

# 3. جلب جميع العناوين
curl -X GET http://localhost:3006/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### التحقق من قاعدة البيانات:

```sql
-- التحقق من البيانات المسجلة
SELECT 
  a.id,
  a.address_line1,
  ad.addressable_type,
  ad.addressable_id,
  ad.creator_id,
  ad.creator_type,
  a.created_at
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
ORDER BY a.created_at DESC
LIMIT 10;
```

---

<div align="center">

**✅ نظام تتبع منشئ العنوان - جاهز للاستخدام! ✅**

**تم التحديث بواسطة:** Cascade AI  
**التاريخ:** 28 نوفمبر 2025

</div>

# 📝 سجل التغييرات - Addresses API
# Changelog - Addresses API

> **تاريخ التحديث:** 28 نوفمبر 2025  
> **الإصدار:** 2.0.0

---

## 🎯 ملخص التحديثات | Update Summary

تم تحديث نظام إدارة العناوين لإضافة ميزة **تتبع منشئ العنوان (Creator Tracking)**. هذا التحديث يسمح بتسجيل معلومات المستخدم الذي قام بإضافة كل عنوان في النظام.

---

## ✨ الميزات الجديدة | New Features

### 1. تتبع منشئ العنوان (Creator Tracking)
- ✅ تسجيل `creator_id` تلقائياً عند إضافة عنوان
- ✅ تسجيل `creator_type` تلقائياً عند إضافة عنوان
- ✅ إرجاع معلومات المنشئ في جميع الـ APIs

### 2. تحسينات قاعدة البيانات
- ✅ إضافة عمود `creator_id` في جدول `addressable`
- ✅ إضافة عمود `creator_type` في جدول `addressable`
- ✅ إضافة فهرس مركب على (`creator_type`, `creator_id`)

---

## 🔄 التغييرات التفصيلية | Detailed Changes

### 1. قاعدة البيانات (Database)

**ملف:** `New-Sql-Update(11-28-2025).sql`

```sql
ALTER TABLE `addressable`
ADD COLUMN `creator_id` INT DEFAULT NULL COMMENT 'ID للشخص الذي قام بالإضافة',
ADD COLUMN `creator_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'نوع الجدول: User, Doctor, Admin, Assistant',
ADD INDEX `idx_addressable_creator` (`creator_type`, `creator_id`);
```

**التأثير:**
- العناوين الجديدة ستحتوي على معلومات المنشئ
- العناوين القديمة ستبقى كما هي (`creator_id` = NULL, `creator_type` = NULL)

---

### 2. Controller

**ملف:** `controllers/addressController.js`

#### التعديلات:

**أ. دالة `createAddress()`:**
```javascript
// قبل التحديث:
await connection.execute(`
  INSERT INTO addressable (address_id, addressable_type, addressable_id)
  VALUES (?, ?, ?)
`, [addressId, addressableType, userId]);

// بعد التحديث:
await connection.execute(`
  INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type)
  VALUES (?, ?, ?, ?, ?)
`, [addressId, addressableType, userId, userId, addressableType]);
```

**ب. دالة `getUserAddresses()`:**
```javascript
// تم إضافة creator_id و creator_type في SELECT
SELECT 
  a.*,
  cc.name_ar as location_name,
  cc.level_type as location_type,
  ad.creator_id,      // ← جديد
  ad.creator_type     // ← جديد
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
...
```

**ج. دالة `getPrimaryAddress()`:**
```javascript
// تم إضافة creator_id و creator_type في SELECT
SELECT 
  a.*,
  cc.name_ar as location_name,
  cc.level_type as location_type,
  ad.creator_id,      // ← جديد
  ad.creator_type     // ← جديد
FROM addresses a
...
```

**د. دالة `getAddressById()`:**
```javascript
// تم إضافة creator_id و creator_type في SELECT
SELECT 
  a.*,
  cc.name_ar as location_name,
  cc.level_type as location_type,
  ad.creator_id,      // ← جديد
  ad.creator_type     // ← جديد
FROM addresses a
...
```

**هـ. دالة `updateAddress()`:**
```javascript
// تم تحديث الـ query لجلب معلومات المنشئ بعد التحديث
SELECT a.*, 
  cc.name_ar as location_name_ar,
  cc.name_en as location_name_en,
  cc.level_type as location_type,
  ad.creator_id,      // ← جديد
  ad.creator_type     // ← جديد
FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
...
```

---

### 3. التوثيق (Documentation)

**ملف:** `docs/08-api-examples/ADDRESSES_API_README.md`

#### التحديثات:

**أ. هيكل جدول `addressable`:**
```markdown
### 3. جدول `addressable` (Polymorphic)
- address_id (FK)
- addressable_type (User, Doctor, Admin, Assistant)
- addressable_id
- creator_id (ID للمستخدم الذي أضاف العنوان)     ← جديد
- creator_type (نوع المستخدم الذي أضاف العنوان)   ← جديد
```

**ب. إضافة قسم جديد:**
```markdown
## 👤 نظام تتبع منشئ العنوان | Creator Tracking System
...
```

**ج. تحديث أمثلة الـ Response:**
```json
{
  "id": 1,
  "address_line1": "123 شارع الملك فيصل",
  ...
  "creator_id": 1,        // ← جديد
  "creator_type": "User"  // ← جديد
}
```

**د. إضافة ملاحظات جديدة:**
```markdown
- يتم تسجيل `creator_id` و `creator_type` تلقائياً عند إضافة عنوان جديد
- `creator_id`: معرف المستخدم الذي قام بإضافة العنوان
- `creator_type`: نوع المستخدم (User, Doctor, Admin, Assistant)
```

---

### 4. ملفات توثيق جديدة

**أ. ملف:** `docs/08-api-examples/ADDRESSES_CREATOR_TRACKING.md`
- شرح تفصيلي لنظام تتبع المنشئ
- أمثلة عملية
- حالات الاستخدام
- استعلامات SQL

**ب. ملف:** `docs/08-api-examples/CHANGELOG_ADDRESSES_28-11-2025.md` (هذا الملف)
- سجل التغييرات
- ملخص التحديثات
- خطوات الترقية

---

## 📊 مقارنة قبل وبعد | Before & After Comparison

### قبل التحديث:

**جدول `addressable`:**
```
address_id | addressable_type | addressable_id
-----------|------------------|---------------
1          | User             | 5
2          | Doctor           | 3
```

**Response من API:**
```json
{
  "id": 1,
  "address_line1": "123 شارع الملك فيصل",
  "type": "home",
  "is_primary": 1
}
```

---

### بعد التحديث:

**جدول `addressable`:**
```
address_id | addressable_type | addressable_id | creator_id | creator_type
-----------|------------------|----------------|------------|-------------
1          | User             | 5              | 5          | User
2          | Doctor           | 3              | 3          | Doctor
```

**Response من API:**
```json
{
  "id": 1,
  "address_line1": "123 شارع الملك فيصل",
  "type": "home",
  "is_primary": 1,
  "creator_id": 5,
  "creator_type": "User"
}
```

---

## 🚀 خطوات الترقية | Upgrade Steps

### 1. تحديث قاعدة البيانات

```bash
# تشغيل ملف SQL
mysql -u username -p database_name < New-Sql-Update(11-28-2025).sql
```

أو من داخل MySQL:
```sql
source /path/to/New-Sql-Update(11-28-2025).sql;
```

### 2. التحقق من التحديث

```sql
-- التحقق من إضافة الأعمدة الجديدة
DESCRIBE addressable;

-- التحقق من الفهرس الجديد
SHOW INDEX FROM addressable WHERE Key_name = 'idx_addressable_creator';
```

### 3. إعادة تشغيل التطبيق

```bash
# إيقاف التطبيق
pm2 stop bashra-backend

# إعادة التشغيل
pm2 start bashra-backend

# أو باستخدام npm
npm start
```

### 4. اختبار النظام

```bash
# اختبار إضافة عنوان جديد
curl -X POST http://localhost:3006/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address_line1": "123 شارع الملك فيصل",
    "type": "home",
    "is_primary": true
  }'

# التحقق من النتيجة
curl -X GET http://localhost:3006/api/addresses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ ملاحظات مهمة | Important Notes

### التوافق مع الإصدارات السابقة:
✅ **متوافق بالكامل**
- العناوين القديمة ستستمر في العمل بشكل طبيعي
- `creator_id` و `creator_type` سيكونان NULL للعناوين القديمة
- لا حاجة لتحديث البيانات القديمة

### الأداء:
✅ **لا تأثير سلبي**
- الفهرس الجديد يحسن أداء الاستعلامات
- الحقول الجديدة لا تؤثر على سرعة الإدراج

### الأمان:
✅ **محسّن**
- تتبع أفضل للعمليات
- إمكانية التدقيق والمراجعة

---

## 🐛 إصلاح المشاكل | Troubleshooting

### مشكلة: الحقول الجديدة لا تظهر في الـ Response

**الحل:**
```bash
# تأكد من تحديث الكود
git pull origin main

# إعادة تشغيل التطبيق
pm2 restart bashra-backend
```

---

### مشكلة: خطأ في قاعدة البيانات عند تشغيل SQL

**الحل:**
```sql
-- تحقق من وجود الجدول
SHOW TABLES LIKE 'addressable';

-- تحقق من الأعمدة الحالية
DESCRIBE addressable;

-- إذا كانت الأعمدة موجودة بالفعل، تخطى هذه الخطوة
```

---

### مشكلة: creator_id و creator_type يظهران NULL

**السبب:** العنوان تم إضافته قبل التحديث

**الحل:** هذا طبيعي، العناوين الجديدة فقط ستحتوي على هذه المعلومات

---

## 📈 الإحصائيات | Statistics

### الملفات المعدلة:
- ✅ 1 ملف SQL
- ✅ 1 ملف Controller
- ✅ 1 ملف توثيق محدث
- ✅ 2 ملف توثيق جديد

### الأكواد المضافة:
- ✅ 3 أسطر SQL
- ✅ ~50 سطر في Controller
- ✅ ~400 سطر توثيق

### الوقت المتوقع للترقية:
- ⏱️ تحديث قاعدة البيانات: 1 دقيقة
- ⏱️ إعادة تشغيل التطبيق: 30 ثانية
- ⏱️ الاختبار: 5 دقائق
- **⏱️ الإجمالي: ~7 دقائق**

---

## 🔗 روابط مفيدة | Useful Links

- [ADDRESSES_API_README.md](./ADDRESSES_API_README.md) - التوثيق الرئيسي
- [ADDRESSES_CREATOR_TRACKING.md](./ADDRESSES_CREATOR_TRACKING.md) - شرح تفصيلي للميزة الجديدة
- [New-Sql-Update(11-28-2025).sql](../../New-Sql-Update(11-28-2025).sql) - ملف SQL للتحديث

---

## 👥 الفريق | Team

**تم التطوير بواسطة:**
- Cascade AI

**تاريخ الإصدار:**
- 28 نوفمبر 2025

**الإصدار:**
- 2.0.0

---

<div align="center">

**✅ تم التحديث بنجاح! ✅**

**للدعم الفني، يرجى التواصل مع فريق التطوير**

</div>

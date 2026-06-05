# دليل شامل: نظام البحث عن الأطباء حسب الموقع

## 📋 جدول المحتويات
1. [نظرة عامة](#نظرة-عامة)
2. [تشخيص المشكلة وحلها](#تشخيص-المشكلة-وحلها)
3. [بنية قاعدة البيانات](#بنية-قاعدة-البيانات)
4. [APIs المتاحة](#apis-المتاحة)
5. [أمثلة الاستخدام](#أمثلة-الاستخدام)
6. [اختبار النظام](#اختبار-النظام)

---

## 🎯 نظرة عامة

نظام البحث عن الأطباء حسب الموقع يتيح للمستخدمين:
- البحث عن الأطباء في موقع جغرافي محدد
- البحث بناءً على الهرمية الجغرافية (دولة > مدينة > منطقة > حي)
- البحث باستخدام إحداثيات GPS
- فلترة النتائج حسب التخصص والخبرة
- عرض إحصائيات توزيع الأطباء

---

## 🔧 تشخيص المشكلة وحلها

### المشكلة الأصلية
كانت APIs البحث عن الأطباء لا تعرض النتائج بشكل صحيح بسبب:

1. **شروط صارمة جداً في الاستعلامات**:
   ```sql
   AND dp.is_verified = 1
   AND dp.approval_status = 'approved'
   ```
   هذه الشروط كانت تمنع ظهور الأطباء الجدد أو غير المعتمدين

2. **عدم وجود بيانات في جدول `doctor_profile_translations`**:
   - الاستعلامات كانت تعتمد على هذا الجدول
   - الأطباء الجدد لا يملكون ترجمات بعد

### الحل المطبق


#### 1. تخفيف الشروط في الاستعلامات
```sql
-- قبل التعديل
AND dp.is_verified = 1
AND dp.approval_status = 'approved'

-- بعد التعديل (إزالة هذه الشروط)
-- يعرض جميع الأطباء النشطين
AND d.is_active = 1
AND d.status = 'active'
```

#### 2. استخدام LEFT JOIN بدلاً من INNER JOIN
```sql
-- للسماح بظهور الأطباء حتى بدون ترجمات
LEFT JOIN doctor_profile_translations dpt 
  ON dpt.doctor_profile_id = dp.id 
  AND dpt.language_code = 'ar'
```

#### 3. التحقق من صحة الربط بين الجداول
```sql
-- الربط الصحيح
INNER JOIN addressable ad 
  ON ad.addressable_id = d.id 
  AND ad.addressable_type = 'Doctor'
INNER JOIN addresses a 
  ON a.id = ad.address_id
```

---

## 🗄️ بنية قاعدة البيانات

### الجداول الرئيسية

#### 1. `doctors`
```sql
- id (PK)
- uuid
- email (UNIQUE)
- phone (UNIQUE)
- status (active, inactive, suspended, pending_verification)
- is_active (boolean)
```

#### 2. `doctor_profiles`
```sql
- id (PK)
- doctor_id (FK -> doctors.id)
- license_number (UNIQUE)
- years_of_experience
- is_verified (boolean)
- approval_status (pending, approved, rejected, suspended)
- rating_average
- is_available
```

#### 3. `addresses`
```sql
- id (PK)
- address_line1
- address_line2
- postal_code
- countries_cities_id (FK -> countries_cities)
- latitude (decimal)
- longitude (decimal)
- type (home, work, billing, shipping)
- is_primary (boolean)
```

#### 4. `addressable` (جدول الربط)
```sql
- address_id (FK -> addresses.id)
- addressable_type (Doctor, User, Admin, Assistant)
- addressable_id (ID في الجدول المرتبط)
- creator_id
- creator_type
```

#### 5. `countries_cities` (الهرمية الجغرافية)
```sql
- countries_cities_id (PK)
- name_ar
- name_en
- parent_id (FK -> countries_cities_id)
- level_type (country, city, region, district)
```

### العلاقات بين الجداول
```
doctors (1) -----> (1) doctor_profiles
doctors (1) -----> (N) addressable -----> (1) addresses
addresses (N) -----> (1) countries_cities
countries_cities (1) -----> (N) countries_cities (parent_id)
```

---

## 🚀 APIs المتاحة

### 1. إدارة العناوين (Addresses Management)

#### 1.1 إنشاء عنوان جديد
```http
POST /api/addresses
Authorization: Bearer {token}
Content-Type: application/json

{
  "address_line1": "123 شارع الملك فهد",
  "address_line2": "مبنى رقم 5",
  "postal_code": "12345",
  "countries_cities_id": 2,
  "latitude": 24.7136,
  "longitude": 46.6753,
  "type": "work",
  "is_primary": true
}
```

**الاستجابة:**
```json
{
  "success": true,
  "message": "تم إنشاء العنوان بنجاح",
  "data": {
    "id": 1,
    "address_line1": "123 شارع الملك فهد",
    "countries_cities_id": 2,
    "location_name_ar": "الرياض",
    "is_primary": 1
  }
}
```

#### 1.2 جلب جميع العناوين
```http
GET /api/addresses
Authorization: Bearer {token}
```

#### 1.3 جلب العنوان الرئيسي
```http
GET /api/addresses/primary
Authorization: Bearer {token}
```

#### 1.4 تحديث عنوان
```http
PUT /api/addresses/{id}
Authorization: Bearer {token}
```

#### 1.5 حذف عنوان
```http
DELETE /api/addresses/{id}
Authorization: Bearer {token}
```

---

### 2. البحث عن الأطباء (Doctors By Location)

#### 2.1 البحث حسب الموقع
```http
GET /api/doctors-by-location?countries_cities_id=2&page=1&limit=10&lang=ar
```

**المعاملات:**
- `countries_cities_id` (مطلوب): معرف الموقع
- `level_type` (اختياري): نوع المستوى (country, city, region, district)
- `include_children` (اختياري): تضمين المواقع الفرعية (افتراضي: true)
- `page` (اختياري): رقم الصفحة (افتراضي: 1)
- `limit` (اختياري): عدد النتائج (افتراضي: 20، الحد الأقصى: 100)
- `lang` (اختياري): اللغة (ar/en)

**الاستجابة:**
```json
{
  "success": true,
  "message": "تم العثور على 5 طبيب في هذا الموقع",
  "data": {
    "doctors": [
      {
        "doctor_id": 1,
        "email": "doctor@example.com",
        "full_name": "د. أحمد محمد",
        "specialty": "طب القلب",
        "years_of_experience": 10,
        "rating_average": "4.50",
        "address_line1": "123 شارع الملك فهد",
        "location_name": "الرياض"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_doctors": 5,
      "per_page": 10
    }
  }
}
```

#### 2.2 عدد الأطباء في موقع
```http
GET /api/doctors-by-location/count?countries_cities_id=2
```

#### 2.3 الأطباء مجمعين حسب المواقع
```http
GET /api/doctors-by-location/grouped?level_type=city&lang=ar
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "countries_cities_id": 2,
        "location_name": "الرياض",
        "level_type": "city",
        "doctors_count": 15
      },
      {
        "countries_cities_id": 3,
        "location_name": "جدة",
        "level_type": "city",
        "doctors_count": 12
      }
    ]
  }
}
```

#### 2.4 البحث المتقدم
```http
GET /api/doctors-by-location/search?countries_cities_id=2&specialization=قلب&min_experience=5&sort_by=rating&order=desc
```

**المعاملات الإضافية:**
- `specialization`: التخصص
- `min_experience`: الحد الأدنى لسنوات الخبرة
- `sort_by`: الترتيب حسب (experience, name, created_at, rating)
- `order`: اتجاه الترتيب (asc, desc)

#### 2.5 البحث باستخدام GPS
```http
GET /api/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=10
```

**المعاملات:**
- `latitude` (مطلوب): خط العرض
- `longitude` (مطلوب): خط الطول
- `radius` (اختياري): نصف القطر بالكيلومتر (افتراضي: 5)

**أمثلة إحداثيات المدن السعودية:**
- الرياض: `24.7136, 46.6753`
- جدة: `21.5433, 39.1728`
- الدمام: `26.4207, 50.0888`
- مكة: `21.4225, 39.8262`
- المدينة: `24.5247, 39.5692`

---

## 💡 أمثلة الاستخدام

### مثال 1: تسجيل طبيب وإضافة عنوان

```javascript
// 1. تسجيل الطبيب
const registerResponse = await fetch('http://localhost:3006/api/auth-doctor/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@example.com',
    password: 'Test@123456',
    phone: '+966501234567',
    license_number: 'DOC-2024-001',
    years_of_experience: 10,
    full_name_ar: 'د. أحمد محمد',
    specialty_ar: 'طب القلب'
  })
});

// 2. تسجيل الدخول
const loginResponse = await fetch('http://localhost:3006/api/auth-doctor/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@example.com',
    password: 'Test@123456'
  })
});

const { token } = await loginResponse.json();

// 3. إضافة عنوان
const addressResponse = await fetch('http://localhost:3006/api/addresses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    address_line1: '123 شارع الملك فهد',
    countries_cities_id: 2,
    latitude: 24.7136,
    longitude: 46.6753,
    type: 'work',
    is_primary: true
  })
});

// 4. البحث عن الطبيب
const searchResponse = await fetch(
  'http://localhost:3006/api/doctors-by-location?countries_cities_id=2'
);
const doctors = await searchResponse.json();
```

### مثال 2: البحث عن أطباء القلب في الرياض

```bash
curl -X GET "http://localhost:3006/api/doctors-by-location/search?countries_cities_id=2&specialization=قلب&min_experience=5&sort_by=rating&order=desc&lang=ar"
```

### مثال 3: البحث عن أطباء قريبين (10 كم)

```bash
curl -X GET "http://localhost:3006/api/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=10&lang=ar"
```

---

## 🧪 اختبار النظام

### الخطوة 1: استيراد مجموعة Postman
1. افتح Postman
2. اضغط على Import
3. اختر ملف `docs/doctors-by-location-api-testing.json`

### الخطوة 2: إعداد المتغيرات
```
base_url = http://localhost:3006/api
doctor_token = (سيتم ملؤه بعد تسجيل الدخول)
```

### الخطوة 3: تنفيذ السيناريو الكامل
1. **تسجيل طبيب جديد** (Step 1)
2. **تسجيل الدخول** (Step 2) - احفظ الـ token
3. **إضافة عنوان** (Step 3)
4. **البحث عن الطبيب** (Step 4) - يجب أن يظهر في النتائج

### الخطوة 4: اختبار APIs البحث
- اختبر البحث حسب الموقع
- اختبر البحث المتقدم مع الفلاتر
- اختبر البحث باستخدام GPS
- اختبر عرض الإحصائيات

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا تظهر نتائج البحث

**الحلول:**
1. تحقق من وجود عنوان للطبيب:
```sql
SELECT * FROM addresses a
INNER JOIN addressable ad ON a.id = ad.address_id
WHERE ad.addressable_type = 'Doctor' AND ad.addressable_id = {doctor_id};
```

2. تحقق من صحة `countries_cities_id`:
```sql
SELECT * FROM countries_cities WHERE countries_cities_id = 2;
```

3. تحقق من حالة الطبيب:
```sql
SELECT id, email, status, is_active FROM doctors WHERE id = {doctor_id};
```

### المشكلة: خطأ في إنشاء العنوان

**الحلول:**
1. تحقق من صحة التوكن
2. تحقق من وجود `countries_cities_id` في قاعدة البيانات
3. تحقق من صحة الإحداثيات (latitude, longitude)

---

## 📊 ملاحظات مهمة

### 1. الهرمية الجغرافية
- النظام يدعم 4 مستويات: country > city > region > district
- عند البحث في مدينة، يتم تضمين جميع المناطق والأحياء التابعة لها تلقائياً
- يمكن تعطيل هذا السلوك باستخدام `include_children=false`

### 2. الأداء
- جميع الاستعلامات محسّنة باستخدام JOIN واحد
- يتم استخدام الفهارس (indexes) على الحقول المهمة
- الحد الأقصى للنتائج في الصفحة: 100

### 3. الأمان
- APIs العناوين تتطلب مصادقة (Authentication)
- APIs البحث عامة (Public) - لا تتطلب مصادقة
- كل مستخدم يمكنه فقط إدارة عناوينه الخاصة

### 4. اللغات
- النظام يدعم العربية والإنجليزية
- يمكن التبديل باستخدام معامل `lang=ar` أو `lang=en`

---

## 🔄 التحديثات المستقبلية

- [ ] إضافة فلترة حسب التقييم
- [ ] إضافة فلترة حسب التوفر (is_available)
- [ ] إضافة البحث النصي في الاسم والسيرة الذاتية
- [ ] إضافة دعم للمسافات بالأميال (بالإضافة للكيلومترات)
- [ ] إضافة cache للنتائج لتحسين الأداء

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، يرجى التواصل مع فريق التطوير.

---

**آخر تحديث:** 2024
**الإصدار:** 2.0

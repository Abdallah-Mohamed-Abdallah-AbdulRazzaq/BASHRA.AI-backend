# 📮 Postman Testing Guide - Addresses API
# دليل اختبار Postman لـ APIs العناوين

> **تاريخ الإنشاء:** 23 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api`

---

## 🚀 إعداد Postman | Setup

### 1. إنشاء Environment Variables

في Postman، أنشئ Environment جديد بالمتغيرات التالية:

```
base_url = http://localhost:3006/api
token = YOUR_JWT_TOKEN_HERE
admin_token = ADMIN_JWT_TOKEN_HERE
address_id = 1
country_id = 1
city_id = 10
region_id = 100
location_id = 1
```

### 2. الحصول على JWT Token

قم بتسجيل الدخول أولاً للحصول على Token:

```http
POST {{base_url}}/auth-user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

احفظ الـ `token` من الـ Response في Environment Variable.

---

## 📍 Address Management APIs

### ✅ 1. Get All User Addresses

```http
GET {{base_url}}/addresses
Authorization: Bearer {{token}}
Accept-Language: ar
```

**Response Example:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "address_line1": "123 شارع الملك فيصل",
      "address_line2": "الدور الثالث",
      "postal_code": "12345",
      "countries_cities_id": 100,
      "latitude": 24.7136,
      "longitude": 46.6753,
      "type": "home",
      "is_primary": 1,
      "location_name": "الرياض",
      "location_type": "city"
    }
  ]
}
```

---

### ✅ 2. Get Primary Address

```http
GET {{base_url}}/addresses/primary
Authorization: Bearer {{token}}
Accept-Language: ar
```

---

### ✅ 3. Get Address by ID

```http
GET {{base_url}}/addresses/{{address_id}}
Authorization: Bearer {{token}}
Accept-Language: ar
```

---

### ✅ 4. Create Address - Home (Full)

```http
POST {{base_url}}/addresses
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "address_line1": "123 شارع الملك فيصل",
  "address_line2": "الدور الثالث، شقة 301",
  "postal_code": "12345",
  "countries_cities_id": 100,
  "latitude": 24.7136,
  "longitude": 46.6753,
  "type": "home",
  "is_primary": true
}
```

**Required:** `address_line1` فقط  
**Optional:** جميع الحقول الأخرى

**Types Available:**
- `home` - منزل
- `work` - عمل
- `billing` - فواتير
- `shipping` - شحن
- `other` - أخرى

---

### ✅ 5. Create Address - Work

```http
POST {{base_url}}/addresses
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "address_line1": "456 طريق الملك عبدالله",
  "address_line2": "برج الأعمال، الطابق 15",
  "postal_code": "11564",
  "countries_cities_id": 101,
  "latitude": 24.7242,
  "longitude": 46.6544,
  "type": "work",
  "is_primary": false
}
```

---

### ✅ 6. Create Address - Minimal

```http
POST {{base_url}}/addresses
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "address_line1": "789 شارع العليا"
}
```

---

### ✅ 7. Update Address - Full

```http
PUT {{base_url}}/addresses/{{address_id}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "address_line1": "123 شارع الملك فيصل المحدث",
  "address_line2": "الدور الخامس، شقة 501",
  "postal_code": "12346",
  "countries_cities_id": 102,
  "latitude": 24.7150,
  "longitude": 46.6760,
  "type": "home",
  "is_primary": true
}
```

**Note:** جميع الحقول Optional

---

### ✅ 8. Update Address - Partial

```http
PUT {{base_url}}/addresses/{{address_id}}
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "address_line1": "عنوان محدث جزئياً",
  "type": "billing"
}
```

---

### ✅ 9. Set Address as Primary

```http
PATCH {{base_url}}/addresses/{{address_id}}/set-primary
Authorization: Bearer {{token}}
```

**Note:** سيتم إلغاء العنوان الرئيسي السابق تلقائياً

---

### ✅ 10. Delete Address

```http
DELETE {{base_url}}/addresses/{{address_id}}
Authorization: Bearer {{token}}
```

---

## 🌍 Countries & Cities APIs (Public)

### ✅ 1. Get All Locations

```http
GET {{base_url}}/countries-cities?lang=ar
```

**Query Parameters:**
- `lang` - ar or en (optional, default: ar)
- `level_type` - country, city, region, district (optional)
- `parent_id` - number (optional)

---

### ✅ 2. Get All Countries

```http
GET {{base_url}}/countries-cities/countries?lang=ar
```

**Response Example:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "countries_cities_id": 1,
      "name_ar": "المملكة العربية السعودية",
      "name_en": "Saudi Arabia",
      "name": "المملكة العربية السعودية",
      "level_type": "country"
    }
  ]
}
```

---

### ✅ 3. Get Cities by Country

```http
GET {{base_url}}/countries-cities/cities/{{country_id}}?lang=ar
```

---

### ✅ 4. Get Regions by City

```http
GET {{base_url}}/countries-cities/regions/{{city_id}}?lang=ar
```

---

### ✅ 5. Get Districts by Region

```http
GET {{base_url}}/countries-cities/districts/{{region_id}}?lang=ar
```

---

### ✅ 6. Get Full Hierarchy

```http
GET {{base_url}}/countries-cities/hierarchy/{{location_id}}?lang=ar
```

**Response Example:**
```json
{
  "success": true,
  "data": {
    "full_hierarchy": [
      {
        "countries_cities_id": 1,
        "name": "السعودية",
        "level_type": "country"
      },
      {
        "countries_cities_id": 10,
        "name": "الرياض",
        "level_type": "city"
      },
      {
        "countries_cities_id": 100,
        "name": "العليا",
        "level_type": "region"
      }
    ],
    "country": {...},
    "city": {...},
    "region": {...},
    "district": null
  }
}
```

---

### ✅ 7. Search Locations

```http
GET {{base_url}}/countries-cities/search?q=الرياض&lang=ar
```

**Query Parameters:**
- `q` - Search query (required)
- `lang` - ar or en (optional)
- `level_type` - country, city, region, district (optional)

---

### ✅ 8. Get Location by ID

```http
GET {{base_url}}/countries-cities/{{location_id}}?lang=ar
```

---

## 🔒 Countries & Cities APIs (Admin Only)

### ✅ 1. Create Country

```http
POST {{base_url}}/countries-cities
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name_ar": "المملكة العربية السعودية",
  "name_en": "Saudi Arabia",
  "level_type": "country"
}
```

**Required Fields:**
- `name_ar` ✅
- `name_en` ✅
- `level_type` ✅ (country, city, region, district)

**Note:** للدول، لا تحتاج `parent_id`

---

### ✅ 2. Create City

```http
POST {{base_url}}/countries-cities
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name_ar": "الرياض",
  "name_en": "Riyadh",
  "level_type": "city",
  "parent_id": 1
}
```

**Note:** `parent_id` مطلوب للمدن (يشير إلى الدولة)

---

### ✅ 3. Create Region

```http
POST {{base_url}}/countries-cities
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name_ar": "العليا",
  "name_en": "Al Olaya",
  "level_type": "region",
  "parent_id": 10
}
```

**Note:** `parent_id` مطلوب للمناطق (يشير إلى المدينة)

---

### ✅ 4. Create District

```http
POST {{base_url}}/countries-cities
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name_ar": "حي السفارات",
  "name_en": "Diplomatic Quarter",
  "level_type": "district",
  "parent_id": 100
}
```

**Note:** `parent_id` مطلوب للأحياء (يشير إلى المنطقة)

---

### ✅ 5. Update Location

```http
PUT {{base_url}}/countries-cities/{{location_id}}
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name_ar": "الرياض المحدثة",
  "name_en": "Riyadh Updated"
}
```

**Note:** جميع الحقول Optional

---

### ✅ 6. Delete Location

```http
DELETE {{base_url}}/countries-cities/{{location_id}}
Authorization: Bearer {{admin_token}}
```

⚠️ **تحذير:** الحذف Cascade - سيحذف جميع المواقع الفرعية!

---

## 🎯 Use Cases | سيناريوهات الاستخدام

### Scenario 1: إنشاء عنوان كامل للمستخدم

```
1. GET /countries-cities/countries
   → احصل على قائمة الدول

2. GET /countries-cities/cities/1
   → احصل على مدن السعودية

3. GET /countries-cities/regions/10
   → احصل على مناطق الرياض

4. GET /countries-cities/districts/100
   → احصل على أحياء العليا

5. POST /addresses
   → أنشئ العنوان مع countries_cities_id
```

---

### Scenario 2: تغيير العنوان الرئيسي

```
1. GET /addresses
   → احصل على جميع العناوين

2. PATCH /addresses/5/set-primary
   → اجعل العنوان رقم 5 رئيسياً
```

---

### Scenario 3: البحث عن موقع

```
1. GET /countries-cities/search?q=الرياض&lang=ar
   → ابحث عن "الرياض"

2. GET /countries-cities/hierarchy/10
   → احصل على التسلسل الهرمي الكامل
```

---

## 📊 Testing Checklist

### Address APIs:
- [ ] Get all addresses
- [ ] Get primary address
- [ ] Get address by ID
- [ ] Create home address
- [ ] Create work address
- [ ] Create minimal address
- [ ] Update full address
- [ ] Update partial address
- [ ] Set as primary
- [ ] Delete address

### Countries & Cities (Public):
- [ ] Get all locations
- [ ] Get countries
- [ ] Get cities by country
- [ ] Get regions by city
- [ ] Get districts by region
- [ ] Get hierarchy
- [ ] Search locations
- [ ] Get location by ID

### Countries & Cities (Admin):
- [ ] Create country
- [ ] Create city
- [ ] Create region
- [ ] Create district
- [ ] Update location
- [ ] Delete location

---

## 🔧 Troubleshooting

### خطأ 401 Unauthorized
```
الحل: تأكد من وجود JWT Token صحيح في Authorization header
```

### خطأ 404 Not Found
```
الحل: تأكد من صحة الـ ID المستخدم
```

### خطأ 400 Bad Request
```
الحل: تأكد من إرسال address_line1 (مطلوب)
```

### خطأ 403 Forbidden
```
الحل: للـ Admin APIs، تأكد من استخدام admin_token
```

---

## 📝 ملاحظات مهمة

### ✅ العناوين:
- `address_line1` هو الحقل الوحيد المطلوب
- يمكن للمستخدم الواحد أن يكون لديه عناوين متعددة
- عنوان رئيسي واحد فقط لكل مستخدم
- عند تعيين عنوان كرئيسي، يتم إلغاء الرئيسي السابق تلقائياً

### ✅ المواقع:
- APIs العامة لا تحتاج Authentication
- Admin APIs تحتاج Admin Token
- الحذف Cascade (يحذف جميع الفروع)
- دعم متعدد اللغات (ar/en)

### ✅ اللغات:
- استخدم `Accept-Language: ar` للعربية
- استخدم `Accept-Language: en` للإنجليزية
- أو استخدم query parameter: `?lang=ar`

---

<div align="center">

**📮 Postman Testing Guide Complete! 📮**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 23 نوفمبر 2025

</div>

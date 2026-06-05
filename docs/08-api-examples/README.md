# 📚 API Examples & Testing Guides
# أمثلة APIs وأدلة الاختبار

> **آخر تحديث:** 23 نوفمبر 2025

---

## 📋 المحتويات | Contents

هذا الفولدر يحتوي على أمثلة شاملة وأدلة اختبار لجميع APIs في النظام.

---

## 📁 الملفات | Files

### 1. **ADDRESSES_API_README.md**
- توثيق شامل لـ Address Management APIs
- توثيق Countries & Cities APIs
- أمثلة Request/Response
- Use Cases
- Quick Start Guide

### 2. **POSTMAN_TESTING_GUIDE.md**
- دليل اختبار كامل لـ Postman
- جميع الـ endpoints مع أمثلة
- Environment Variables Setup
- Testing Checklist
- Troubleshooting

---

## 🎯 APIs المتوفرة | Available APIs

### 📍 Address Management (7 APIs)
```
GET    /api/addresses                      - Get all addresses
GET    /api/addresses/primary              - Get primary address
GET    /api/addresses/:id                  - Get address by ID
POST   /api/addresses                      - Create address
PUT    /api/addresses/:id                  - Update address
PATCH  /api/addresses/:id/set-primary      - Set as primary
DELETE /api/addresses/:id                  - Delete address
```

### 🌍 Countries & Cities - Public (8 APIs)
```
GET /api/countries-cities                  - Get all locations
GET /api/countries-cities/countries        - Get countries
GET /api/countries-cities/cities/:id       - Get cities
GET /api/countries-cities/regions/:id      - Get regions
GET /api/countries-cities/districts/:id    - Get districts
GET /api/countries-cities/hierarchy/:id    - Get hierarchy
GET /api/countries-cities/search           - Search locations
GET /api/countries-cities/:id              - Get by ID
```

### 🔒 Countries & Cities - Admin (3 APIs)
```
POST   /api/countries-cities               - Create location
PUT    /api/countries-cities/:id           - Update location
DELETE /api/countries-cities/:id           - Delete location
```

---

## 🚀 البدء السريع | Quick Start

### 1. إعداد Postman
```
1. افتح Postman
2. أنشئ Environment جديد
3. أضف المتغيرات:
   - base_url: http://localhost:3006/api
   - token: YOUR_JWT_TOKEN
   - admin_token: ADMIN_JWT_TOKEN
```

### 2. الحصول على Token
```http
POST http://localhost:3006/api/auth-user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3. اختبار Address API
```http
GET http://localhost:3006/api/addresses
Authorization: Bearer YOUR_TOKEN
```

---

## 📝 أمثلة سريعة | Quick Examples

### إنشاء عنوان:
```bash
curl -X POST http://localhost:3006/api/addresses \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address_line1": "123 شارع الملك فيصل",
    "type": "home",
    "is_primary": true
  }'
```

### جلب الدول:
```bash
curl http://localhost:3006/api/countries-cities/countries?lang=ar
```

### البحث عن موقع:
```bash
curl "http://localhost:3006/api/countries-cities/search?q=الرياض&lang=ar"
```

---

## 🔗 روابط ذات صلة | Related Links

### التوثيق:
- [Address API README](./ADDRESSES_API_README.md)
- [Postman Testing Guide](./POSTMAN_TESTING_GUIDE.md)

### الكود:
- [Address Routes](../../routes/addressRoutes.js)
- [Address Controller](../../controllers/addressController.js)
- [Countries Routes](../../routes/countriesCitiesRoutes.js)
- [Countries Controller](../../controllers/countriesCitiesController.js)

### قاعدة البيانات:
- [SQL Schema](../../New-Sql-Update(11-23-2025).sql)

---

## 📊 Testing Checklist

### ✅ Address APIs:
- [ ] Get all addresses
- [ ] Get primary address
- [ ] Get address by ID
- [ ] Create address (home)
- [ ] Create address (work)
- [ ] Create address (minimal)
- [ ] Update address (full)
- [ ] Update address (partial)
- [ ] Set as primary
- [ ] Delete address

### ✅ Countries & Cities (Public):
- [ ] Get all locations
- [ ] Get countries
- [ ] Get cities by country
- [ ] Get regions by city
- [ ] Get districts by region
- [ ] Get full hierarchy
- [ ] Search locations
- [ ] Get location by ID

### ✅ Countries & Cities (Admin):
- [ ] Create country
- [ ] Create city
- [ ] Create region
- [ ] Create district
- [ ] Update location
- [ ] Delete location

---

## 💡 نصائح | Tips

### للمطورين:
1. استخدم Environment Variables في Postman
2. احفظ الـ Token بعد تسجيل الدخول
3. اختبر الـ Public APIs أولاً (لا تحتاج Token)
4. ثم اختبر الـ Private APIs

### للاختبار:
1. ابدأ بـ GET requests
2. ثم POST لإنشاء بيانات
3. ثم PUT/PATCH للتحديث
4. وأخيراً DELETE

### للـ Admin:
1. استخدم Admin Token للـ Admin APIs
2. احذر من Cascade Delete
3. أنشئ بيانات تجريبية أولاً

---

## 🎯 Use Cases

### 1. إنشاء عنوان كامل:
```
GET /countries-cities/countries
  ↓
GET /countries-cities/cities/1
  ↓
GET /countries-cities/regions/10
  ↓
POST /addresses
```

### 2. تغيير العنوان الرئيسي:
```
GET /addresses
  ↓
PATCH /addresses/5/set-primary
```

### 3. البحث والاختيار:
```
GET /countries-cities/search?q=الرياض
  ↓
GET /countries-cities/hierarchy/10
  ↓
POST /addresses
```

---

<div align="center">

**📚 API Examples & Testing Guides - Complete! 📚**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 23 نوفمبر 2025

</div>

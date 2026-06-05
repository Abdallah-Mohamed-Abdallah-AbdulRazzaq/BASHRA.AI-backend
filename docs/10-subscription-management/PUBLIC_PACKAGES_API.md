# 🌐 Public Packages API Documentation
# توثيق APIs الباقات العامة (بدون مصادقة)

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/public`

---

## 📋 نظرة عامة | Overview

هذه APIs عامة ولا تحتاج إلى مصادقة (No Authentication Required).  
مصممة لعرض الباقات والميزات للمستخدمين في:
- صفحة التسعير (Pricing Page)
- الصفحة الرئيسية (Homepage)
- صفحات التسويق (Marketing Pages)

---

## 🔓 المصادقة | Authentication

✅ **لا تحتاج إلى مصادقة!**  
جميع هذه الـ APIs عامة ومتاحة للجميع.

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Get All Packages
**GET** `/api/public/packages`

جلب جميع الباقات النشطة مع ميزاتها.

**Headers:**
```
Accept-Language: ar    # للعربية (default)
Accept-Language: en    # للإنجليزية
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 101,
      "name": "الباقة التجريبية",
      "name_ar": "الباقة التجريبية",
      "name_en": "Trial Package",
      "secondary_name": "مجانية لمدة أسبوع",
      "secondary_name_ar": "مجانية لمدة أسبوع",
      "secondary_name_en": "Free for 7 days",
      "duration_days": 7,
      "price": 0.00,
      "currency_code": "SAR",
      "features": [
        {
          "feature_id": 1,
          "feature_name": "عدد المستخدمين",
          "feature_value": "1",
          "feature_unit": "مستخدم",
          "is_included": 1
        },
        {
          "feature_id": 2,
          "feature_name": "سعة التخزين السحابي",
          "feature_value": "1",
          "feature_unit": "جيجابايت",
          "is_included": 1
        }
      ]
    },
    {
      "id": 102,
      "name": "الباقة الأساسية",
      "duration_days": 30,
      "price": 50.00,
      "currency_code": "SAR",
      "features": [...]
    }
  ]
}
```

**Use Case:**
- عرض جميع الباقات في صفحة التسعير
- مقارنة الباقات

---

# 2️⃣ Get Package by ID
**GET** `/api/public/packages/:id`

جلب باقة محددة مع ميزاتها.

**Example:**
```http
GET /api/public/packages/101
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "الباقة التجريبية",
    "name_ar": "الباقة التجريبية",
    "name_en": "Trial Package",
    "secondary_name": "مجانية لمدة أسبوع",
    "duration_days": 7,
    "price": 0.00,
    "currency_code": "SAR",
    "features": [
      {
        "feature_id": 1,
        "feature_name": "عدد المستخدمين",
        "feature_value": "1",
        "feature_unit": "مستخدم",
        "is_included": 1
      }
    ]
  }
}
```

**Use Case:**
- عرض تفاصيل باقة محددة
- صفحة تفاصيل الباقة

---

# 3️⃣ Get Packages Comparison
**GET** `/api/public/packages/comparison`

جلب مصفوفة مقارنة الباقات (Comparison Matrix).

**Example:**
```http
GET /api/public/packages/comparison
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "features": [
      {
        "id": 1,
        "feature_name": "عدد المستخدمين",
        "feature_unit": "مستخدم"
      },
      {
        "id": 2,
        "feature_name": "سعة التخزين السحابي",
        "feature_unit": "جيجابايت"
      },
      {
        "id": 4,
        "feature_name": "عدد مساعدي الطبيب",
        "feature_unit": "مساعد"
      }
    ],
    "packages": [
      {
        "id": 101,
        "name": "الباقة التجريبية",
        "duration_days": 7,
        "price": 0.00,
        "currency_code": "SAR",
        "features": [
          {
            "feature_id": 1,
            "feature_name": "عدد المستخدمين",
            "feature_unit": "مستخدم",
            "value": "1",
            "is_included": 1
          },
          {
            "feature_id": 2,
            "feature_name": "سعة التخزين السحابي",
            "feature_unit": "جيجابايت",
            "value": "1",
            "is_included": 1
          },
          {
            "feature_id": 4,
            "feature_name": "عدد مساعدي الطبيب",
            "feature_unit": "مساعد",
            "value": "لا",
            "is_included": 0
          }
        ]
      },
      {
        "id": 102,
        "name": "الباقة الأساسية",
        "duration_days": 30,
        "price": 50.00,
        "currency_code": "SAR",
        "features": [...]
      }
    ]
  }
}
```

**Use Case:**
- إنشاء جدول مقارنة الباقات
- Pricing comparison table
- Feature matrix display

**مثال على الاستخدام في UI:**

| الميزة | التجريبية | الأساسية | الاحترافية |
|--------|-----------|----------|------------|
| عدد المستخدمين | 1 | 1 | 1 |
| التخزين | 1 GB | 10 GB | 50 GB |
| المساعدين | لا | 1 | 5 |
| **السعر** | **مجاناً** | **50 ريال** | **150 ريال** |

---

# 4️⃣ Get Featured Package
**GET** `/api/public/packages/featured`

جلب الباقة المميزة/الموصى بها.

**Example:**
```http
GET /api/public/packages/featured
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 103,
    "name": "الباقة الاحترافية",
    "secondary_name": "للاستخدام الجماعي ونمو الأعمال",
    "duration_days": 30,
    "price": 150.00,
    "currency_code": "SAR",
    "is_featured": true,
    "features": [...]
  }
}
```

**Use Case:**
- عرض الباقة المميزة في الصفحة الرئيسية
- "Most Popular" badge
- Recommended package highlight

---

# 5️⃣ Get Cheapest Package
**GET** `/api/public/packages/cheapest`

جلب أرخص باقة متاحة.

**Example:**
```http
GET /api/public/packages/cheapest
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "الباقة التجريبية",
    "duration_days": 7,
    "price": 0.00,
    "currency_code": "SAR",
    "features": [...]
  }
}
```

**Use Case:**
- عرض "ابدأ مجاناً" في الصفحة الرئيسية
- "Start Free" CTA button
- Budget-friendly option

---

# 6️⃣ Get Premium Package
**GET** `/api/public/packages/premium`

جلب أغلى باقة (الباقة المتميزة).

**Example:**
```http
GET /api/public/packages/premium
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 105,
    "name": "الباقة الشاملة",
    "secondary_name": "حلول متكاملة وإعلانات حصرية",
    "duration_days": 365,
    "price": 3000.00,
    "currency_code": "SAR",
    "features": [...]
  }
}
```

**Use Case:**
- عرض "Enterprise" package
- Premium/Ultimate plan highlight
- Full-featured option

---

# 7️⃣ Get All Features
**GET** `/api/public/features`

جلب جميع الميزات النشطة.

**Example:**
```http
GET /api/public/features
Accept-Language: ar
```

**Response:**
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "id": 1,
      "feature_name": "عدد المستخدمين",
      "feature_unit": "مستخدم",
      "name_ar": "عدد المستخدمين",
      "name_en": "Max Users",
      "unit_ar": "مستخدم",
      "unit_en": "User"
    },
    {
      "id": 4,
      "feature_name": "عدد مساعدي الطبيب",
      "feature_unit": "مساعد",
      "name_ar": "عدد مساعدي الطبيب",
      "name_en": "Max Assistants"
    }
  ]
}
```

**Use Case:**
- عرض قائمة الميزات المتاحة
- Features list page
- "What's included" section

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: صفحة التسعير (Pricing Page)

```javascript
// 1. Get packages comparison
GET /api/public/packages/comparison

// 2. Display in pricing table
// Show all packages with their features in a comparison matrix
```

**مثال على الـ UI:**
```html
<div class="pricing-table">
  <div class="package featured">
    <h3>الباقة الاحترافية</h3>
    <span class="badge">الأكثر شعبية</span>
    <p class="price">150 ريال / شهرياً</p>
    <ul class="features">
      <li>✓ 5 مساعدين</li>
      <li>✓ 50 GB تخزين</li>
      <li>✓ ظهور أولي</li>
    </ul>
    <button>اشترك الآن</button>
  </div>
</div>
```

---

### Scenario 2: الصفحة الرئيسية (Homepage)

```javascript
// 1. Get featured package
GET /api/public/packages/featured

// 2. Get cheapest package
GET /api/public/packages/cheapest

// 3. Display both
// Show "Start Free" and "Most Popular" options
```

**مثال على الـ UI:**
```html
<section class="hero-pricing">
  <div class="free-trial">
    <h3>ابدأ مجاناً</h3>
    <p>الباقة التجريبية - 7 أيام</p>
    <button>جرب الآن</button>
  </div>
  
  <div class="featured">
    <h3>الأكثر شعبية</h3>
    <p>الباقة الاحترافية - 150 ريال</p>
    <button>اشترك الآن</button>
  </div>
</section>
```

---

### Scenario 3: صفحة تفاصيل الباقة

```javascript
// 1. Get specific package
GET /api/public/packages/103

// 2. Display full details
// Show all features, pricing, and benefits
```

---

## 📊 Response Examples | أمثلة الاستجابات

### مثال 1: باقة مجانية
```json
{
  "id": 101,
  "name": "الباقة التجريبية",
  "price": 0.00,
  "currency_code": "SAR",
  "duration_days": 7
}
```

### مثال 2: باقة شهرية
```json
{
  "id": 102,
  "name": "الباقة الأساسية",
  "price": 50.00,
  "currency_code": "SAR",
  "duration_days": 30
}
```

### مثال 3: باقة سنوية
```json
{
  "id": 104,
  "name": "الباقة المتميزة",
  "price": 1500.00,
  "currency_code": "SAR",
  "duration_days": 365
}
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Public Access:**
   - جميع APIs لا تحتاج مصادقة
   - متاحة للجميع بدون قيود

2. **Active Only:**
   - يتم عرض الباقات النشطة فقط (`is_active = 1`)
   - يتم عرض الميزات النشطة فقط (`is_active = 1`)

3. **Included Features Only:**
   - يتم عرض الميزات المضمنة فقط (`is_included = 1`)
   - الميزات غير المضمنة لا تظهر

4. **Multi-language:**
   - استخدم `Accept-Language: ar` للعربية
   - استخدم `Accept-Language: en` للإنجليزية
   - Default: العربية

5. **Sorting:**
   - الباقات مرتبة حسب السعر (من الأرخص للأغلى)
   - الميزات مرتبة حسب ID

---

## 🎨 UI Integration Examples

### React Example:
```jsx
import { useState, useEffect } from 'react';

function PricingPage() {
  const [packages, setPackages] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3006/api/public/packages')
      .then(res => res.json())
      .then(data => setPackages(data.data));
  }, []);
  
  return (
    <div className="pricing-grid">
      {packages.map(pkg => (
        <div key={pkg.id} className="package-card">
          <h3>{pkg.name}</h3>
          <p className="price">{pkg.price} ريال</p>
          <ul>
            {pkg.features.map(f => (
              <li key={f.feature_id}>
                {f.feature_name}: {f.feature_value}
              </li>
            ))}
          </ul>
          <button>اشترك الآن</button>
        </div>
      ))}
    </div>
  );
}
```

---

### Vue Example:
```vue
<template>
  <div class="pricing-comparison">
    <table>
      <thead>
        <tr>
          <th>الميزة</th>
          <th v-for="pkg in packages" :key="pkg.id">
            {{ pkg.name }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="feature in features" :key="feature.id">
          <td>{{ feature.feature_name }}</td>
          <td v-for="pkg in packages" :key="pkg.id">
            {{ getFeatureValue(pkg, feature.id) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      comparison: null
    }
  },
  async mounted() {
    const res = await fetch('/api/public/packages/comparison');
    this.comparison = await res.json();
  },
  computed: {
    packages() {
      return this.comparison?.data.packages || [];
    },
    features() {
      return this.comparison?.data.features || [];
    }
  },
  methods: {
    getFeatureValue(pkg, featureId) {
      const f = pkg.features.find(f => f.feature_id === featureId);
      return f ? f.value : 'لا';
    }
  }
}
</script>
```

---

## 🚀 Quick Start

### 1. جلب جميع الباقات:
```bash
curl http://localhost:3006/api/public/packages
```

### 2. جلب مقارنة الباقات:
```bash
curl http://localhost:3006/api/public/packages/comparison
```

### 3. جلب الباقة المميزة:
```bash
curl http://localhost:3006/api/public/packages/featured
```

### 4. جلب باقة محددة:
```bash
curl http://localhost:3006/api/public/packages/101
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/publicPackagesController.js`

### Routes:
- `routes/publicPackagesRoutes.js`
- `routes/publicFeaturesRoutes.js`

### Main Routes:
- `routes/index.js`

---

## 🔗 Related APIs

### Admin APIs (تحتاج مصادقة):
- `POST /api/packages` - إنشاء باقة
- `PUT /api/packages/:id` - تحديث باقة
- `DELETE /api/packages/:id` - حذف باقة

### Public APIs (لا تحتاج مصادقة):
- `GET /api/public/packages` - جلب الباقات
- `GET /api/public/packages/comparison` - مقارنة الباقات
- `GET /api/public/features` - جلب الميزات

---

<div align="center">

**🌐 Public Packages API - Complete! 🌐**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

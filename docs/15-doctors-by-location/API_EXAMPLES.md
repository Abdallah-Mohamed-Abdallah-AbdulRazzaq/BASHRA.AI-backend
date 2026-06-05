# 📘 أمثلة استخدام API | API Examples
# Doctors By Location API V2

> **أمثلة عملية وجاهزة للاستخدام**

---

## 🎯 حالات الاستخدام | Use Cases

### 1️⃣ عرض جميع الأطباء في مدينة الرياض

```bash
GET /api/doctors-by-location?countries_cities_id=1&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 45 طبيب في هذا الموقع",
  "message_en": "Found 45 doctors in this location",
  "data": {
    "doctors": [
      {
        "doctor_id": 1,
        "doctor_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "email": "doctor@example.com",
        "phone": "+966501234567",
        "full_name": "د. أحمد محمد العلي",
        "specialty": "قلب وأوعية دموية",
        "sub_specialty": "قسطرة القلب",
        "years_of_experience": 15,
        "rating_average": 4.85,
        "consultation_fee": 300.00,
        "address_line1": "شارع الملك فهد، برج الطبي",
        "location_name": "الرياض",
        "distance_km": null
      }
    ],
    "hierarchy_info": {
      "searched_location_id": 1,
      "included_location_ids": [1, 10, 11, 12, 13],
      "include_children": true
    },
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_doctors": 45,
      "per_page": 20,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

### 2️⃣ البحث عن أطباء القلب في جدة

```bash
GET /api/doctors-by-location/search?countries_cities_id=2&specialization=قلب&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 12 طبيب",
  "data": {
    "doctors": [
      {
        "doctor_id": 5,
        "full_name": "د. فاطمة أحمد",
        "specialty": "قلب وأوعية دموية",
        "sub_specialty": "أمراض القلب التداخلية",
        "years_of_experience": 20,
        "rating_average": 4.95,
        "consultation_fee": 400.00
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_doctors": 12
    }
  }
}
```

---

### 3️⃣ أطباء بخبرة +10 سنوات مرتبين حسب التقييم

```bash
GET /api/doctors-by-location/search?countries_cities_id=1&min_experience=10&sort_by=rating&order=desc&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 18 طبيب",
  "data": {
    "doctors": [
      {
        "full_name": "د. محمد سعيد",
        "specialty": "جراحة عامة",
        "years_of_experience": 25,
        "rating_average": 5.00,
        "rating_count": 250
      },
      {
        "full_name": "د. سارة خالد",
        "specialty": "أطفال",
        "years_of_experience": 18,
        "rating_average": 4.97,
        "rating_count": 180
      }
    ],
    "filters": {
      "min_experience": 10,
      "sort_by": "rating",
      "order": "desc"
    }
  }
}
```

---

### 4️⃣ البحث عن أطباء قريبين من موقعي (GPS)

```bash
GET /api/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=5&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 8 طبيب في نطاق 5 كم",
  "data": {
    "doctors": [
      {
        "doctor_id": 3,
        "full_name": "د. عبدالله أحمد",
        "specialty": "أسنان",
        "years_of_experience": 12,
        "rating_average": 4.80,
        "latitude": 24.7150,
        "longitude": 46.6760,
        "distance_km": 0.18  // ← 180 متر فقط!
      },
      {
        "doctor_id": 7,
        "full_name": "د. منى سالم",
        "specialty": "جلدية",
        "years_of_experience": 10,
        "rating_average": 4.75,
        "latitude": 24.7200,
        "longitude": 46.6800,
        "distance_km": 0.95  // ← 950 متر
      }
    ],
    "search_location": {
      "latitude": 24.7136,
      "longitude": 46.6753,
      "radius_km": 5
    }
  }
}
```

---

### 5️⃣ عرض عدد الأطباء في كل مدينة

```bash
GET /api/doctors-by-location/grouped?level_type=city&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 5 موقع يحتوي على أطباء",
  "data": {
    "locations": [
      {
        "countries_cities_id": 1,
        "location_name": "الرياض",
        "level_type": "city",
        "doctors_count": 45
      },
      {
        "countries_cities_id": 2,
        "location_name": "جدة",
        "level_type": "city",
        "doctors_count": 38
      },
      {
        "countries_cities_id": 3,
        "location_name": "الدمام",
        "level_type": "city",
        "doctors_count": 22
      }
    ]
  }
}
```

---

### 6️⃣ عرض الأطباء في حي محدد فقط (بدون الهرمية)

```bash
GET /api/doctors-by-location?countries_cities_id=10&include_children=false&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 5 طبيب في هذا الموقع",
  "data": {
    "doctors": [
      {
        "full_name": "د. خالد عمر",
        "specialty": "عيون",
        "location_name": "حي العليا"
      }
    ],
    "hierarchy_info": {
      "searched_location_id": 10,
      "included_location_ids": [10],
      "include_children": false  // ← فقط حي العليا، بدون الشوارع الفرعية
    }
  }
}
```

---

### 7️⃣ أطباء الأطفال في الرياض مرتبين حسب الخبرة

```bash
GET /api/doctors-by-location/search?countries_cities_id=1&specialization=أطفال&sort_by=experience&order=desc&lang=ar
```

**Response:**
```json
{
  "success": true,
  "message": "تم العثور على 15 طبيب",
  "data": {
    "doctors": [
      {
        "full_name": "د. رانيا محمد",
        "specialty": "أطفال",
        "sub_specialty": "حديثي الولادة",
        "years_of_experience": 22,
        "rating_average": 4.90
      },
      {
        "full_name": "د. أحمد سعيد",
        "specialty": "أطفال",
        "sub_specialty": "حساسية ومناعة",
        "years_of_experience": 18,
        "rating_average": 4.85
      }
    ],
    "filters": {
      "specialization": "أطفال",
      "sort_by": "experience",
      "order": "desc"
    }
  }
}
```

---

## 🌐 أمثلة بلغات البرمجة | Code Examples

### JavaScript (Fetch API)
```javascript
// البحث عن الأطباء في الرياض
async function getDoctorsByLocation(cityId) {
  const response = await fetch(
    `http://localhost:3006/api/doctors-by-location?countries_cities_id=${cityId}&lang=ar`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log(`عدد الأطباء: ${data.data.pagination.total_doctors}`);
    data.data.doctors.forEach(doctor => {
      console.log(`- ${doctor.full_name} (${doctor.specialty})`);
    });
  }
}

getDoctorsByLocation(1);
```

### JavaScript (Axios)
```javascript
const axios = require('axios');

// البحث بناءً على GPS
async function getNearbyDoctors(lat, lng, radius) {
  try {
    const response = await axios.get('http://localhost:3006/api/doctors-by-location/nearby', {
      params: {
        latitude: lat,
        longitude: lng,
        radius: radius,
        lang: 'ar'
      }
    });
    
    return response.data.data.doctors;
  } catch (error) {
    console.error('خطأ:', error.message);
  }
}

// استخدام
getNearbyDoctors(24.7136, 46.6753, 5).then(doctors => {
  doctors.forEach(doc => {
    console.log(`${doc.full_name} - ${doc.distance_km} كم`);
  });
});
```

### React Component
```jsx
import React, { useEffect, useState } from 'react';

function DoctorsList({ cityId }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/doctors-by-location?countries_cities_id=${cityId}&lang=ar`)
      .then(res => res.json())
      .then(data => {
        setDoctors(data.data.doctors);
        setLoading(false);
      });
  }, [cityId]);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div>
      <h2>الأطباء في المدينة</h2>
      {doctors.map(doctor => (
        <div key={doctor.doctor_id} className="doctor-card">
          <h3>{doctor.full_name}</h3>
          <p>التخصص: {doctor.specialty}</p>
          <p>الخبرة: {doctor.years_of_experience} سنة</p>
          <p>التقييم: ⭐ {doctor.rating_average}</p>
        </div>
      ))}
    </div>
  );
}

export default DoctorsList;
```

### Python (requests)
```python
import requests

# البحث عن أطباء القلب
def search_doctors(city_id, specialty):
    url = "http://localhost:3006/api/doctors-by-location/search"
    params = {
        "countries_cities_id": city_id,
        "specialization": specialty,
        "lang": "ar"
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if data['success']:
        doctors = data['data']['doctors']
        print(f"عدد الأطباء: {len(doctors)}")
        for doc in doctors:
            print(f"- {doc['full_name']} ({doc['specialty']})")

search_doctors(1, "قلب")
```

### PHP (cURL)
```php
<?php
// البحث عن الأطباء القريبين
function getNearbyDoctors($lat, $lng, $radius) {
    $url = "http://localhost:3006/api/doctors-by-location/nearby";
    $params = http_build_query([
        'latitude' => $lat,
        'longitude' => $lng,
        'radius' => $radius,
        'lang' => 'ar'
    ]);
    
    $ch = curl_init("$url?$params");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if ($data['success']) {
        foreach ($data['data']['doctors'] as $doctor) {
            echo "{$doctor['full_name']} - {$doctor['distance_km']} كم\n";
        }
    }
}

getNearbyDoctors(24.7136, 46.6753, 5);
?>
```

---

## 🧪 اختبار مع Postman | Postman Testing

### Collection Settings:
```json
{
  "info": {
    "name": "Doctors By Location API V2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Doctors by Location",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/doctors-by-location?countries_cities_id=1&lang=ar",
          "host": ["{{base_url}}"],
          "path": ["doctors-by-location"],
          "query": [
            { "key": "countries_cities_id", "value": "1" },
            { "key": "lang", "value": "ar" }
          ]
        }
      }
    }
  ]
}
```

### Environment Variables:
```json
{
  "base_url": "http://localhost:3006/api",
  "test_city_id": "1",
  "test_lat": "24.7136",
  "test_lng": "46.6753"
}
```

---

<div align="center">

**📘 API Examples & Code Samples**  
**أمثلة عملية جاهزة للاستخدام**

**تم التحديث:** ديسمبر 2024

</div>

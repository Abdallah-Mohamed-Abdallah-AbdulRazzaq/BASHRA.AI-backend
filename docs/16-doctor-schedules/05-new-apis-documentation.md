# New Doctor Schedules APIs Documentation
# توثيق APIs الجديدة لجداول مواعيد الأطباء

---

## نظرة عامة | Overview

تم إضافة 7 APIs جديدة لتوفير طرق متنوعة لعرض وإدارة جداول المواعيد:

1. **Grouped by Day** - عرض الجداول مجمعة حسب اليوم
2. **Grouped by Type** - عرض الجداول مجمعة حسب نوع الكشف
3. **Grouped by Clinic** - عرض الجداول مجمعة حسب العيادة
4. **Weekly Summary** - ملخص إحصائي أسبوعي
5. **Available Slots** - عرض الأوقات المتاحة بالتفصيل
6. **Bulk Create** - إنشاء جداول متعددة دفعة واحدة
7. **Toggle Status** - تبديل حالة التفعيل بسرعة

---

## 1. Get Schedules Grouped by Day
## عرض الجداول مجمعة حسب اليوم

**Endpoint:** `GET /api/doctor-schedules/grouped/by-day`

**Description:**  
يعرض جميع جداول الطبيب مجمعة حسب أيام الأسبوع، مما يسهل رؤية جدول كل يوم بشكل منفصل.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Query Parameters:**
- `consultation_type` (optional): `online` | `in_clinic`
- `is_active` (optional): `true` | `false`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "saturday": [
      {
        "id": 1,
        "doctor_id": 2,
        "clinic_id": 1,
        "day_of_week": "saturday",
        "start_time": "09:00:00",
        "end_time": "13:00:00",
        "session_price": "200.00",
        "session_duration": 30,
        "consultation_type": "in_clinic",
        "is_active": 1,
        "clinic_name": "عيادة القاهرة",
        "clinic_address": "شارع التحرير"
      },
      {
        "id": 5,
        "doctor_id": 2,
        "clinic_id": null,
        "day_of_week": "saturday",
        "start_time": "18:00:00",
        "end_time": "21:00:00",
        "session_price": "150.00",
        "session_duration": 30,
        "consultation_type": "online",
        "is_active": 1,
        "clinic_name": null,
        "clinic_address": null
      }
    ],
    "sunday": [
      {
        "id": 2,
        "doctor_id": 2,
        "clinic_id": null,
        "day_of_week": "sunday",
        "start_time": "18:00:00",
        "end_time": "22:00:00",
        "session_price": "150.00",
        "session_duration": 30,
        "consultation_type": "online",
        "is_active": 1,
        "clinic_name": null,
        "clinic_address": null
      }
    ],
    "monday": [
      {
        "id": 3,
        "doctor_id": 2,
        "clinic_id": 2,
        "day_of_week": "monday",
        "start_time": "10:00:00",
        "end_time": "14:00:00",
        "session_price": "220.00",
        "session_duration": 45,
        "consultation_type": "in_clinic",
        "is_active": 1,
        "clinic_name": "عيادة الإسكندرية",
        "clinic_address": "شارع الجيش"
      }
    ]
  }
}
```

**Use Cases:**
- عرض جدول أسبوعي منظم
- تطبيقات التقويم
- لوحات التحكم

---

## 2. Get Schedules Grouped by Type
## عرض الجداول مجمعة حسب نوع الكشف

**Endpoint:** `GET /api/doctor-schedules/grouped/by-type`

**Description:**  
يفصل الجداول إلى مجموعتين: أونلاين وفي العيادة، مع إحصائيات لكل نوع.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Query Parameters:**
- `is_active` (optional): `true` | `false`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "online": [
      {
        "id": 2,
        "doctor_id": 2,
        "clinic_id": null,
        "day_of_week": "sunday",
        "start_time": "18:00:00",
        "end_time": "22:00:00",
        "session_price": "150.00",
        "session_duration": 30,
        "consultation_type": "online",
        "is_active": 1,
        "clinic_name": null,
        "clinic_address": null
      },
      {
        "id": 5,
        "doctor_id": 2,
        "clinic_id": null,
        "day_of_week": "saturday",
        "start_time": "18:00:00",
        "end_time": "21:00:00",
        "session_price": "150.00",
        "session_duration": 30,
        "consultation_type": "online",
        "is_active": 1,
        "clinic_name": null,
        "clinic_address": null
      }
    ],
    "in_clinic": [
      {
        "id": 1,
        "doctor_id": 2,
        "clinic_id": 1,
        "day_of_week": "saturday",
        "start_time": "09:00:00",
        "end_time": "13:00:00",
        "session_price": "200.00",
        "session_duration": 30,
        "consultation_type": "in_clinic",
        "is_active": 1,
        "clinic_name": "عيادة القاهرة",
        "clinic_address": "شارع التحرير"
      },
      {
        "id": 3,
        "doctor_id": 2,
        "clinic_id": 2,
        "day_of_week": "monday",
        "start_time": "10:00:00",
        "end_time": "14:00:00",
        "session_price": "220.00",
        "session_duration": 45,
        "consultation_type": "in_clinic",
        "is_active": 1,
        "clinic_name": "عيادة الإسكندرية",
        "clinic_address": "شارع الجيش"
      }
    ]
  },
  "count": {
    "online": 2,
    "in_clinic": 2,
    "total": 4
  }
}
```

**Use Cases:**
- مقارنة بين الكشف الأونلاين والعيادات
- إحصائيات سريعة
- فلترة حسب نوع الخدمة

---

## 3. Get Schedules Grouped by Clinic
## عرض الجداول مجمعة حسب العيادة

**Endpoint:** `GET /api/doctor-schedules/grouped/by-clinic`

**Description:**  
يعرض جداول العيادات فقط، مجمعة حسب كل عيادة مع معلومات العيادة.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Query Parameters:**
- `is_active` (optional): `true` | `false`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "1": {
      "clinic_info": {
        "id": 1,
        "name": "عيادة القاهرة",
        "address": "شارع التحرير، القاهرة",
        "phone": "01234567890"
      },
      "schedules": [
        {
          "id": 1,
          "day_of_week": "saturday",
          "start_time": "09:00:00",
          "end_time": "13:00:00",
          "session_price": "200.00",
          "session_duration": 30,
          "is_active": 1
        },
        {
          "id": 4,
          "day_of_week": "tuesday",
          "start_time": "15:00:00",
          "end_time": "19:00:00",
          "session_price": "200.00",
          "session_duration": 30,
          "is_active": 1
        }
      ]
    },
    "2": {
      "clinic_info": {
        "id": 2,
        "name": "عيادة الإسكندرية",
        "address": "شارع الجيش، الإسكندرية",
        "phone": "01098765432"
      },
      "schedules": [
        {
          "id": 3,
          "day_of_week": "monday",
          "start_time": "10:00:00",
          "end_time": "14:00:00",
          "session_price": "220.00",
          "session_duration": 45,
          "is_active": 1
        }
      ]
    }
  }
}
```

**Use Cases:**
- إدارة جداول العيادات
- عرض مواعيد كل عيادة بشكل منفصل
- تقارير العيادات

---

## 4. Get Weekly Summary
## ملخص الجدول الأسبوعي

**Endpoint:** `GET /api/doctor-schedules/summary/weekly`

**Description:**  
يوفر ملخص إحصائي شامل لجميع جداول الطبيب الأسبوعية.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "daily_breakdown": [
      {
        "day_of_week": "saturday",
        "consultation_type": "in_clinic",
        "schedule_count": 1,
        "earliest_start": "09:00:00",
        "latest_end": "13:00:00",
        "total_minutes": 240,
        "avg_price": "200.00"
      },
      {
        "day_of_week": "saturday",
        "consultation_type": "online",
        "schedule_count": 1,
        "earliest_start": "18:00:00",
        "latest_end": "21:00:00",
        "total_minutes": 180,
        "avg_price": "150.00"
      },
      {
        "day_of_week": "sunday",
        "consultation_type": "online",
        "schedule_count": 1,
        "earliest_start": "18:00:00",
        "latest_end": "22:00:00",
        "total_minutes": 240,
        "avg_price": "150.00"
      },
      {
        "day_of_week": "monday",
        "consultation_type": "in_clinic",
        "schedule_count": 1,
        "earliest_start": "10:00:00",
        "latest_end": "14:00:00",
        "total_minutes": 240,
        "avg_price": "220.00"
      }
    ],
    "weekly_summary": {
      "total_schedules": 4,
      "total_working_hours": 15,
      "working_days_count": 3,
      "online_schedules": 2,
      "in_clinic_schedules": 2
    }
  }
}
```

**Use Cases:**
- لوحة تحكم الطبيب
- تقارير الأداء
- تحليل ساعات العمل
- تخطيط الجدول

---

## 5. Get Available Slots
## عرض الأوقات المتاحة

**Endpoint:** `GET /api/doctor-schedules/available-slots/:day`

**Description:**  
يقسم جداول اليوم إلى فترات زمنية (slots) حسب مدة الجلسة، مما يسهل الحجز.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**URL Parameters:**
- `day` (required): `saturday` | `sunday` | `monday` | `tuesday` | `wednesday` | `thursday` | `friday`

**Query Parameters:**
- `consultation_type` (optional): `online` | `in_clinic`

**Example Request:**
```
GET /api/doctor-schedules/available-slots/saturday?consultation_type=online
```

**Success Response (200):**
```json
{
  "success": true,
  "day": "saturday",
  "data": [
    {
      "schedule_id": 1,
      "consultation_type": "in_clinic",
      "clinic_name": "عيادة القاهرة",
      "total_slots": 8,
      "slots": [
        {
          "start": "09:00",
          "end": "09:30",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "09:30",
          "end": "10:00",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "10:00",
          "end": "10:30",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "10:30",
          "end": "11:00",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "11:00",
          "end": "11:30",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "11:30",
          "end": "12:00",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "12:00",
          "end": "12:30",
          "price": "200.00",
          "duration": 30
        },
        {
          "start": "12:30",
          "end": "13:00",
          "price": "200.00",
          "duration": 30
        }
      ]
    },
    {
      "schedule_id": 5,
      "consultation_type": "online",
      "clinic_name": null,
      "total_slots": 6,
      "slots": [
        {
          "start": "18:00",
          "end": "18:30",
          "price": "150.00",
          "duration": 30
        },
        {
          "start": "18:30",
          "end": "19:00",
          "price": "150.00",
          "duration": 30
        },
        {
          "start": "19:00",
          "end": "19:30",
          "price": "150.00",
          "duration": 30
        },
        {
          "start": "19:30",
          "end": "20:00",
          "price": "150.00",
          "duration": 30
        },
        {
          "start": "20:00",
          "end": "20:30",
          "price": "150.00",
          "duration": 30
        },
        {
          "start": "20:30",
          "end": "21:00",
          "price": "150.00",
          "duration": 30
        }
      ]
    }
  ]
}
```

**Use Cases:**
- نظام الحجز
- عرض الأوقات المتاحة للمرضى
- حساب عدد المواعيد الممكنة
- تكامل مع نظام الحجوزات

---

## 6. Bulk Create Schedules
## إنشاء جداول متعددة دفعة واحدة

**Endpoint:** `POST /api/doctor-schedules/bulk`

**Description:**  
يسمح بإنشاء عدة جداول في طلب واحد، مع معالجة الأخطاء لكل جدول بشكل منفصل.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
Accept-Language: ar | en
```

**Request Body:**
```json
{
  "schedules": [
    {
      "day_of_week": "monday",
      "start_time": "09:00:00",
      "end_time": "13:00:00",
      "session_price": 200.00,
      "session_duration": 30,
      "consultation_type": "online"
    },
    {
      "day_of_week": "tuesday",
      "start_time": "14:00:00",
      "end_time": "18:00:00",
      "session_price": 180.00,
      "session_duration": 30,
      "consultation_type": "online"
    },
    {
      "clinic_id": 1,
      "day_of_week": "wednesday",
      "start_time": "10:00:00",
      "end_time": "14:00:00",
      "session_price": 220.00,
      "session_duration": 45,
      "consultation_type": "in_clinic"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء 3 جدول بنجاح",
  "data": {
    "created": [
      {
        "index": 0,
        "id": 10
      },
      {
        "index": 1,
        "id": 11
      },
      {
        "index": 2,
        "id": 12
      }
    ],
    "errors": [],
    "summary": {
      "total": 3,
      "success": 3,
      "failed": 0
    }
  }
}
```

**Partial Success Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء 2 جدول بنجاح",
  "data": {
    "created": [
      {
        "index": 0,
        "id": 10
      },
      {
        "index": 2,
        "id": 12
      }
    ],
    "errors": [
      {
        "index": 1,
        "error": "تعارض في المواعيد"
      }
    ],
    "summary": {
      "total": 3,
      "success": 2,
      "failed": 1
    }
  }
}
```

**Use Cases:**
- إعداد جدول أسبوعي كامل
- استيراد جداول من ملف
- نسخ جداول من أسبوع لآخر
- توفير الوقت في الإدخال

---

## 7. Toggle Schedule Status
## تبديل حالة تفعيل الجدول

**Endpoint:** `PATCH /api/doctor-schedules/:id/toggle`

**Description:**  
يبدل حالة الجدول بين نشط وغير نشط بطلب واحد بسيط.

**Headers:**
```
Authorization: Bearer {token}
Accept-Language: ar | en
```

**Success Response (200) - Activated:**
```json
{
  "success": true,
  "message": "تم تفعيل الجدول",
  "data": {
    "id": 1,
    "is_active": 1
  }
}
```

**Success Response (200) - Deactivated:**
```json
{
  "success": true,
  "message": "تم تعطيل الجدول",
  "data": {
    "id": 1,
    "is_active": 0
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "الجدول غير موجود"
}
```

**Use Cases:**
- تعطيل جدول مؤقتاً (إجازة، مرض)
- إعادة تفعيل جدول
- واجهة مستخدم بسيطة (زر تبديل)

---

## Summary of New Features
## ملخص الميزات الجديدة

### للأطباء | For Doctors

1. **عرض منظم** - 3 طرق مختلفة لعرض الجداول (يوم، نوع، عيادة)
2. **إحصائيات** - ملخص أسبوعي شامل بالأرقام
3. **إدارة سريعة** - إنشاء متعدد وتبديل سريع للحالة
4. **تخطيط أفضل** - رؤية الأوقات المتاحة بالتفصيل

### للمطورين | For Developers

1. **APIs مرنة** - خيارات متعددة حسب الحاجة
2. **أداء محسّن** - استعلامات مُحسّنة
3. **سهولة التكامل** - استجابات واضحة ومنظمة
4. **معالجة أخطاء** - Bulk create يعالج كل جدول بشكل منفصل

---

## Performance Considerations
## اعتبارات الأداء

### Caching Recommendations
- Cache grouped views لمدة 5 دقائق
- Cache weekly summary لمدة 15 دقيقة
- Cache available slots لمدة 10 دقائق
- Invalidate cache عند التحديث

### Database Indexes
تأكد من وجود الـ indexes التالية:
```sql
INDEX idx_schedules_doctor (doctor_id)
INDEX idx_schedules_day (day_of_week)
INDEX idx_schedules_type (consultation_type)
INDEX idx_schedules_active (is_active)
INDEX idx_schedules_clinic (clinic_id)
```

---

## Testing Checklist
## قائمة الاختبار

- [ ] Grouped by day يعرض جميع الأيام
- [ ] Grouped by type يفصل online و in_clinic
- [ ] Grouped by clinic يعرض معلومات العيادة
- [ ] Weekly summary يحسب الإحصائيات بشكل صحيح
- [ ] Available slots يقسم الوقت بشكل صحيح
- [ ] Bulk create يعالج الأخطاء بشكل منفصل
- [ ] Toggle status يبدل الحالة بشكل صحيح
- [ ] جميع الـ APIs تدعم اللغتين
- [ ] معالجة الأخطاء تعمل بشكل صحيح

---

**Last Updated:** March 8, 2026  
**Version:** 2.0.0  
**Author:** Kiro AI Assistant

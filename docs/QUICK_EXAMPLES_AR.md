# أمثلة سريعة - نظام إدارة حالة التحقق من الأطباء
## Quick Examples - Admin Doctor Verification Status

---

## 🚀 أمثلة جاهزة للنسخ واللصق

---

## 1️⃣ الموافقة على طبيب جديد

### cURL
```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم التحقق من جميع المستندات والبيانات المهنية بنجاح"
  }'
```

### JavaScript (Fetch)
```javascript
fetch('http://localhost:3006/api/admin/doctors/1/verification-status', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  },
  body: JSON.stringify({
    is_verified: true,
    approval_status: 'approved',
    reason: 'تم التحقق من جميع المستندات والبيانات المهنية بنجاح'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

### Axios
```javascript
const axios = require('axios');

axios.patch('http://localhost:3006/api/admin/doctors/1/verification-status', {
  is_verified: true,
  approval_status: 'approved',
  reason: 'تم التحقق من جميع المستندات والبيانات المهنية بنجاح'
}, {
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  }
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

---

## 2️⃣ رفض طبيب

### cURL
```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/2/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "rejected",
    "reason": "المستندات المقدمة غير صحيحة أو منتهية الصلاحية"
  }'
```

### JavaScript (Fetch)
```javascript
fetch('http://localhost:3006/api/admin/doctors/2/verification-status', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  },
  body: JSON.stringify({
    is_verified: false,
    approval_status: 'rejected',
    reason: 'المستندات المقدمة غير صحيحة أو منتهية الصلاحية'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 3️⃣ تعليق حساب طبيب

### cURL
```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/3/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "suspended",
    "reason": "تم تعليق الحساب بسبب شكاوى متعددة من المرضى"
  }'
```

### JavaScript (Fetch)
```javascript
fetch('http://localhost:3006/api/admin/doctors/3/verification-status', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json',
    'Accept-Language': 'ar'
  },
  body: JSON.stringify({
    is_verified: false,
    approval_status: 'suspended',
    reason: 'تم تعليق الحساب بسبب شكاوى متعددة من المرضى'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 4️⃣ إعادة طبيب للمراجعة

### cURL
```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/4/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": false,
    "approval_status": "pending",
    "reason": "يتطلب مراجعة إضافية للمستندات المحدثة"
  }'
```

---

## 5️⃣ التحقق فقط (بدون تحديد approval_status)

### cURL
```bash
curl -X PATCH http://localhost:3006/api/admin/doctors/5/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{
    "is_verified": true,
    "reason": "تم التحقق من الهوية والمستندات الأساسية"
  }'
```

**ملاحظة:** سيتم تعيين `approval_status = "approved"` تلقائياً

---

## 6️⃣ جلب تفاصيل طبيب

### cURL
```bash
curl -X GET http://localhost:3006/api/admin/doctors/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept-Language: ar"
```

### JavaScript (Fetch)
```javascript
fetch('http://localhost:3006/api/admin/doctors/1', {
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Accept-Language': 'ar'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 7️⃣ جلب الأطباء المعتمدين

### cURL
```bash
curl -X GET "http://localhost:3006/api/admin/doctors?is_verified=true&approval_status=approved&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept-Language: ar"
```

### JavaScript (Fetch)
```javascript
const params = new URLSearchParams({
  is_verified: 'true',
  approval_status: 'approved',
  page: '1',
  limit: '20'
});

fetch(`http://localhost:3006/api/admin/doctors?${params}`, {
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Accept-Language': 'ar'
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 8️⃣ جلب الأطباء قيد المراجعة

### cURL
```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept-Language: ar"
```

---

## 9️⃣ جلب الأطباء المرفوضين

### cURL
```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=rejected" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept-Language: ar"
```

---

## 🔟 جلب الأطباء المعلقين

### cURL
```bash
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=suspended" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Accept-Language: ar"
```

---

## 📊 SQL - التحقق من النتائج

### عرض حالة طبيب معين
```sql
SELECT 
    d.id,
    d.email,
    d.status AS doctor_status,
    dp.is_verified,
    dp.verification_date,
    dp.verified_by,
    dp.approval_status,
    dpt.full_name,
    a.email AS verified_by_email
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
LEFT JOIN admins a ON dp.verified_by = a.id
WHERE d.id = 1;
```

### عرض آخر 5 تحديثات
```sql
SELECT 
    aal.created_at,
    a.email AS admin_email,
    d.email AS doctor_email,
    JSON_EXTRACT(aal.new_values, '$.approval_status') AS new_status,
    JSON_EXTRACT(aal.new_values, '$.reason') AS reason
FROM admin_action_logs aal
JOIN admins a ON aal.admin_id = a.id
JOIN doctor_profiles dp ON aal.target_id = dp.id
JOIN doctors d ON dp.doctor_id = d.id
WHERE aal.action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
ORDER BY aal.created_at DESC
LIMIT 5;
```

---

## 🎯 سيناريوهات عملية

### سيناريو 1: معالجة طلب طبيب جديد

```bash
# 1. جلب الأطباء قيد المراجعة
curl -X GET "http://localhost:3006/api/admin/doctors?approval_status=pending" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 2. مراجعة تفاصيل الطبيب
curl -X GET http://localhost:3006/api/admin/doctors/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. الموافقة على الطبيب
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم التحقق من جميع المستندات"
  }'
```

---

### سيناريو 2: معالجة شكوى على طبيب

```bash
# 1. جلب تفاصيل الطبيب
curl -X GET http://localhost:3006/api/admin/doctors/5 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 2. تعليق الحساب مؤقتاً
curl -X PATCH http://localhost:3006/api/admin/doctors/5/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": false,
    "approval_status": "suspended",
    "reason": "تحقيق جاري في شكوى مريض"
  }'

# 3. بعد التحقيق - إعادة التفعيل
curl -X PATCH http://localhost:3006/api/admin/doctors/5/verification-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "is_verified": true,
    "approval_status": "approved",
    "reason": "تم حل الشكوى وإعادة التفعيل"
  }'
```

---

### سيناريو 3: مراجعة دورية للأطباء

```bash
# 1. جلب إحصائيات الأطباء
curl -X GET http://localhost:3006/api/admin/doctors/statistics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 2. جلب الأطباء المعتمدين
curl -X GET "http://localhost:3006/api/admin/doctors?is_verified=true&approval_status=approved" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. مراجعة طبيب معين
curl -X GET http://localhost:3006/api/admin/doctors/10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔧 نصائح الاستخدام

### 1. استبدال المتغيرات
```bash
# استبدل هذه القيم:
YOUR_ADMIN_TOKEN    → التوكن الفعلي للأدمن
localhost:3006      → عنوان السيرفر الفعلي
1, 2, 3, ...       → معرف الطبيب الفعلي
```

### 2. حفظ التوكن في متغير
```bash
# Bash/Linux
export ADMIN_TOKEN="your_actual_token_here"
curl -H "Authorization: Bearer $ADMIN_TOKEN" ...

# PowerShell
$env:ADMIN_TOKEN="your_actual_token_here"
curl -H "Authorization: Bearer $env:ADMIN_TOKEN" ...
```

### 3. استخدام ملف للبيانات
```bash
# حفظ البيانات في ملف
echo '{
  "is_verified": true,
  "approval_status": "approved",
  "reason": "تم التحقق من جميع المستندات"
}' > approve.json

# استخدام الملف
curl -X PATCH http://localhost:3006/api/admin/doctors/1/verification-status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @approve.json
```

---

## 📱 أمثلة React/Vue/Angular

### React
```jsx
import { useState } from 'react';
import axios from 'axios';

function DoctorVerification({ doctorId, adminToken }) {
  const [loading, setLoading] = useState(false);

  const approveDoctor = async () => {
    setLoading(true);
    try {
      const response = await axios.patch(
        `http://localhost:3006/api/admin/doctors/${doctorId}/verification-status`,
        {
          is_verified: true,
          approval_status: 'approved',
          reason: 'تم التحقق من جميع المستندات'
        },
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
            'Accept-Language': 'ar'
          }
        }
      );
      console.log('Success:', response.data);
      alert('تم الموافقة على الطبيب بنجاح');
    } catch (error) {
      console.error('Error:', error);
      alert('حدث خطأ أثناء الموافقة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={approveDoctor} disabled={loading}>
      {loading ? 'جاري المعالجة...' : 'الموافقة على الطبيب'}
    </button>
  );
}
```

### Vue
```vue
<template>
  <button @click="approveDoctor" :disabled="loading">
    {{ loading ? 'جاري المعالجة...' : 'الموافقة على الطبيب' }}
  </button>
</template>

<script>
import axios from 'axios';

export default {
  props: ['doctorId', 'adminToken'],
  data() {
    return {
      loading: false
    };
  },
  methods: {
    async approveDoctor() {
      this.loading = true;
      try {
        const response = await axios.patch(
          `http://localhost:3006/api/admin/doctors/${this.doctorId}/verification-status`,
          {
            is_verified: true,
            approval_status: 'approved',
            reason: 'تم التحقق من جميع المستندات'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.adminToken}`,
              'Content-Type': 'application/json',
              'Accept-Language': 'ar'
            }
          }
        );
        console.log('Success:', response.data);
        alert('تم الموافقة على الطبيب بنجاح');
      } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء الموافقة');
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

---

## ✅ قائمة التحقق السريعة

قبل تشغيل الأمثلة، تأكد من:

- [ ] السيرفر يعمل
- [ ] لديك توكن أدمن صالح
- [ ] لديك معرف طبيب للاختبار
- [ ] استبدلت `YOUR_ADMIN_TOKEN` بالتوكن الفعلي
- [ ] استبدلت `localhost:3006` بعنوان السيرفر الفعلي
- [ ] استبدلت معرف الطبيب بالمعرف الفعلي

---

**جاهز للاستخدام! 🚀**

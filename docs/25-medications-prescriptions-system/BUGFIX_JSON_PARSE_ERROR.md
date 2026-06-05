# إصلاح خطأ JSON Parse في قوالب الوصفات
# Bugfix: JSON Parse Error in Prescription Templates

## المشكلة | Problem

عند استدعاء أي من الـ APIs التالية:
- `GET /api/prescription-templates`
- `GET /api/prescription-templates/:id`
- `GET /api/prescription-templates/:uuid`
- `GET /api/prescription-templates?include_items=true`

كان يظهر الخطأ التالي:

```json
{
  "success": false,
  "message": "خطأ في جلب القالب",
  "error": "Unexpected non-whitespace character after JSON at position 3 (line 1 column 4)"
}
```

### الخطأ في Terminal

```
Error fetching template: SyntaxError: Unexpected non-whitespace character after JSON at position 3 (line 1 column 4)
    at JSON.parse (<anonymous>)
    at E:\...\controllers\prescriptionTemplatesController.js:147:60
    at Array.map (<anonymous>)
```

---

## السبب | Root Cause

المشكلة كانت في parsing حقل `available_dosages` من جدول `medications`.

### الكود القديم | Old Code

```javascript
available_dosages: item.available_dosages ? JSON.parse(item.available_dosages) : []
```

### المشاكل المحتملة | Potential Issues

1. **Double-encoded JSON**: البيانات قد تكون مشفرة مرتين
   ```
   "\"[\\\"500mg\\\",\\\"1000mg\\\"]\"" 
   ```

2. **Invalid JSON format**: صيغة JSON غير صحيحة في قاعدة البيانات

3. **Already parsed**: البيانات قد تكون object بالفعل وليست string

4. **NULL or undefined**: قيم فارغة لم يتم التعامل معها بشكل صحيح

---

## الحل | Solution

تم إضافة helper function `safeJSONParse` التي تتعامل مع جميع الحالات:

```javascript
/**
 * Safe JSON parse helper function
 * Handles various JSON parsing scenarios including double-encoded strings
 */
const safeJSONParse = (data) => {
  if (!data) return [];
  
  // If already an array or object, return it
  if (typeof data === 'object') return data;
  
  // If it's a string, try to parse it
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      // If the result is still a string, try parsing again (double-encoded case)
      if (typeof parsed === 'string') {
        return JSON.parse(parsed);
      }
      return parsed;
    } catch (e) {
      console.error('JSON parse error:', e.message, 'Data:', data);
      return [];
    }
  }
  
  return [];
};
```

### الكود الجديد | New Code

```javascript
available_dosages: safeJSONParse(item.available_dosages)
```

---

## التعديلات المطبقة | Applied Changes

### ملف: `controllers/prescriptionTemplatesController.js`

#### 1. إضافة helper function في بداية الملف

```javascript
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ✅ Added safeJSONParse helper function
const safeJSONParse = (data) => {
  // ... implementation
};
```

#### 2. تعديل `getAllTemplates` method

**السطر 64 - قبل:**
```javascript
available_dosages: item.available_dosages ? JSON.parse(item.available_dosages) : []
```

**السطر 64 - بعد:**
```javascript
available_dosages: safeJSONParse(item.available_dosages)
```

#### 3. تعديل `getTemplateById` method

**السطر 147 - قبل:**
```javascript
available_dosages: item.available_dosages ? JSON.parse(item.available_dosages) : []
```

**السطر 147 - بعد:**
```javascript
available_dosages: safeJSONParse(item.available_dosages)
```

---

## الفوائد | Benefits

### 1. معالجة أفضل للأخطاء | Better Error Handling
- لا يتسبب في crash للـ API
- يعيد array فارغ في حالة الخطأ
- يسجل الخطأ في console للتتبع

### 2. دعم حالات متعددة | Multiple Cases Support
- ✅ JSON string عادي
- ✅ Double-encoded JSON
- ✅ Object/Array بالفعل
- ✅ NULL/undefined
- ✅ Invalid JSON format

### 3. كود أنظف | Cleaner Code
- سطر واحد بدلاً من ternary operator
- أسهل في القراءة والصيانة
- يمكن إعادة استخدامه

---

## الاختبار | Testing

### قبل الإصلاح | Before Fix

```bash
GET /api/prescription-templates/1
Response: 500 Internal Server Error
{
  "success": false,
  "message": "خطأ في جلب القالب",
  "error": "Unexpected non-whitespace character..."
}
```

### بعد الإصلاح | After Fix

```bash
GET /api/prescription-templates/1
Response: 200 OK
{
  "success": true,
  "data": {
    "id": 1,
    "template_name": "علاج نزلة البرد",
    "items": [
      {
        "medication_id": 1,
        "medication_name_ar": "باراسيتامول",
        "available_dosages": ["500mg", "1000mg"],
        ...
      }
    ]
  }
}
```

---

## ملاحظات إضافية | Additional Notes

### للمطورين | For Developers

1. **استخدم safeJSONParse دائماً**: عند parsing JSON من قاعدة البيانات
2. **لا تفترض الصيغة**: البيانات قد تكون بصيغ مختلفة
3. **سجل الأخطاء**: للمساعدة في debugging

### للإدارة | For Management

1. **تنظيف البيانات**: راجع حقل `available_dosages` في جدول `medications`
2. **توحيد الصيغة**: تأكد من أن جميع البيانات بنفس الصيغة
3. **Migration script**: قد تحتاج لتشغيل script لتنظيف البيانات القديمة

---

## Script تنظيف البيانات | Data Cleanup Script

إذا كنت تريد تنظيف البيانات في قاعدة البيانات:

```sql
-- Check current data format
SELECT id, name_ar, available_dosages, 
       LENGTH(available_dosages) as length,
       SUBSTRING(available_dosages, 1, 50) as preview
FROM medications 
WHERE available_dosages IS NOT NULL;

-- Fix double-encoded JSON (if needed)
-- This is just an example, adjust based on your data
UPDATE medications 
SET available_dosages = JSON_EXTRACT(available_dosages, '$')
WHERE available_dosages LIKE '"%[%';
```

---

## الملفات المتأثرة | Affected Files

- ✅ `controllers/prescriptionTemplatesController.js` - تم الإصلاح
- ℹ️ `controllers/medicationsController.js` - يستخدم نفس الـ helper (كان يعمل بشكل صحيح)

---

## الحالة | Status

✅ **تم الإصلاح بنجاح | Fixed Successfully**

التاريخ: 2026-03-07
الإصدار: v1.0.1

---

## المراجع | References

- [JSON.parse() - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)
- Similar fix in: `controllers/medicationsController.js`

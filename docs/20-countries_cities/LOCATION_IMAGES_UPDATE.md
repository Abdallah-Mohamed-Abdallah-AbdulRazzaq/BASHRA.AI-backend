# تحديث نظام الصور للمواقع الجغرافية
## Location Images System Update

---

## 📝 التعديلات المنفذة

### **1. تغيير طريقة تخزين مسار الصورة**

#### **قبل التعديل:**
```javascript
imagePath = `/upload/files/location-images/${filename}`;
```
**النتيجة في قاعدة البيانات:**
```
/upload/files/location-images/location_1765080145258.png
```

#### **بعد التعديل:**
```javascript
const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
imagePath = `${baseUrl}/upload/files/location-images/${filename}`;
```
**النتيجة في قاعدة البيانات:**
```
http://localhost:3006/upload/files/location-images/location_1765080145258.png
```

---

## 🔧 التعديلات التقنية

### **A. دالة `create()` في countriesCitiesController.js**

```javascript
// Generate full URL for database
const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
imagePath = `${baseUrl}/upload/files/location-images/${filename}`;
```

**الميزات:**
- ✅ يحفظ URL كامل في قاعدة البيانات
- ✅ يدعم HTTP و HTTPS حسب المتغير البيئي
- ✅ يعمل مع التخزين المحلي (Local) والعام (Public)

---

### **B. دالة `update()` في countriesCitiesController.js**

**تعديل حذف الصورة القديمة:**
```javascript
// Delete old image if exists
const oldImage = existing[0].image;
if (oldImage) {
  try {
    // Extract filename from URL
    const oldImageUrl = new URL(oldImage);
    const oldImagePath = path.join(__dirname, '..', oldImageUrl.pathname);
    await fs.unlink(oldImagePath);
  } catch (err) {
    console.error('Error deleting old image:', err);
  }
}
```

**تعديل رفع الصورة الجديدة:**
```javascript
// Generate full URL for database
const baseUrl = process.env.BASE_URL || 'http://localhost:3006';
imagePath = `${baseUrl}/upload/files/location-images/${filename}`;
```

**الميزات:**
- ✅ يستخرج المسار من URL الكامل باستخدام `new URL()`
- ✅ يحذف الصورة القديمة من القرص بشكل صحيح
- ✅ يحفظ URL الجديد كامل

---

### **C. دالة `delete()` في countriesCitiesController.js**

```javascript
// Delete image file if exists
const imageToDelete = existing[0].image;
if (imageToDelete) {
  try {
    // Extract filename from URL
    const imageUrl = new URL(imageToDelete);
    const imagePath = path.join(__dirname, '..', imageUrl.pathname);
    await fs.unlink(imagePath);
  } catch (err) {
    console.error('Error deleting image file:', err);
  }
}
```

**الميزات:**
- ✅ يستخرج المسار من URL الكامل
- ✅ يحذف الصورة من القرص بشكل صحيح

---

## ⚙️ إعداد المتغيرات البيئية

### **ملف `.env`**

يجب إضافة المتغير `BASE_URL` في ملف `.env`:

```env
# Server
PORT=3006
NODE_ENV=development
BACKEND_URL=http://localhost:3006
FRONTEND_URL=http://localhost:3000
BASE_URL=http://localhost:3006
```

### **للبيئة المحلية (Development):**
```env
BASE_URL=http://localhost:3006
```

### **للبيئة الإنتاجية (Production):**
```env
BASE_URL=https://api.bashraai.com
```

---

## 📊 أمثلة على البيانات

### **مثال 1: إنشاء موقع مع صورة**

**Request:**
```bash
POST /api/countries-cities
Content-Type: multipart/form-data
Authorization: Bearer {admin_token}

Body:
- name_ar: "المملكة العربية السعودية"
- name_en: "Saudi Arabia"
- level_type: "country"
- image: [file]
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء الموقع بنجاح",
  "data": {
    "countries_cities_id": 1,
    "name_ar": "المملكة العربية السعودية",
    "name_en": "Saudi Arabia",
    "level_type": "country",
    "parent_id": null,
    "image": "http://localhost:3006/upload/files/location-images/location_1765080145258.png",
    "created_at": "2024-12-07T04:00:00.000Z",
    "updated_at": "2024-12-07T04:00:00.000Z"
  }
}
```

### **مثال 2: الحصول على جميع الدول**

**Request:**
```bash
GET /api/countries-cities/countries?lang=ar
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "countries_cities_id": 1,
      "name_ar": "المملكة العربية السعودية",
      "name_en": "Saudi Arabia",
      "name": "المملكة العربية السعودية",
      "level_type": "country",
      "image": "http://localhost:3006/upload/files/location-images/location_1765080145258.png",
      "created_at": "2024-12-07T04:00:00.000Z"
    },
    {
      "countries_cities_id": 2,
      "name_ar": "مصر",
      "name_en": "Egypt",
      "name": "مصر",
      "level_type": "country",
      "image": "http://localhost:3006/upload/files/location-images/location_1765080145259.png",
      "created_at": "2024-12-07T04:00:00.000Z"
    }
  ]
}
```

---

## 🌐 دعم البيئات المختلفة

### **Local Development:**
```
BASE_URL=http://localhost:3006
النتيجة: http://localhost:3006/upload/files/location-images/location_xxx.png
```

### **Production (HTTP):**
```
BASE_URL=http://api.bashraai.com
النتيجة: http://api.bashraai.com/upload/files/location-images/location_xxx.png
```

### **Production (HTTPS):**
```
BASE_URL=https://api.bashraai.com
النتيجة: https://api.bashraai.com/upload/files/location-images/location_xxx.png
```

### **CDN/Cloud Storage:**
```
BASE_URL=https://cdn.bashraai.com
النتيجة: https://cdn.bashraai.com/upload/files/location-images/location_xxx.png
```

---

## ✅ الفوائد

1. **URL كامل جاهز للاستخدام:**
   - لا يحتاج Frontend لإضافة domain
   - يمكن استخدام الرابط مباشرة في `<img src="...">`

2. **مرونة في التخزين:**
   - يدعم Local Storage
   - يدعم CDN
   - يدعم Cloud Storage (S3, Azure, etc.)

3. **سهولة الانتقال بين البيئات:**
   - تغيير `BASE_URL` فقط
   - لا حاجة لتعديل الكود

4. **توافق مع معايير REST API:**
   - يرجع URLs كاملة
   - يتبع best practices

---

## 🔄 ترحيل البيانات القديمة (Migration)

إذا كان لديك بيانات قديمة بمسارات نسبية، يمكنك تحديثها:

```sql
-- تحديث جميع الصور لإضافة BASE_URL
UPDATE countries_cities 
SET image = CONCAT('http://localhost:3006', image)
WHERE image IS NOT NULL 
  AND image NOT LIKE 'http%';
```

**للإنتاج:**
```sql
UPDATE countries_cities 
SET image = CONCAT('https://api.bashraai.com', image)
WHERE image IS NOT NULL 
  AND image NOT LIKE 'http%';
```

---

## 📌 ملاحظات مهمة

1. **تأكد من وجود `BASE_URL` في `.env`:**
   ```bash
   BASE_URL=http://localhost:3006
   ```

2. **القيمة الافتراضية:**
   - إذا لم يتم تعريف `BASE_URL`، سيستخدم `http://localhost:3006`

3. **HTTPS في الإنتاج:**
   - استخدم `https://` في البيئة الإنتاجية
   - مثال: `BASE_URL=https://api.bashraai.com`

4. **CDN Support:**
   - يمكن استخدام CDN domain
   - مثال: `BASE_URL=https://cdn.bashraai.com`

---

## 🧪 اختبار التعديلات

### **1. إنشاء موقع مع صورة:**
```bash
curl -X POST http://localhost:3006/api/countries-cities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name_ar=السعودية" \
  -F "name_en=Saudi Arabia" \
  -F "level_type=country" \
  -F "image=@/path/to/image.png"
```

### **2. التحقق من URL في قاعدة البيانات:**
```sql
SELECT image FROM countries_cities WHERE countries_cities_id = 1;
```

**النتيجة المتوقعة:**
```
http://localhost:3006/upload/files/location-images/location_1765080145258.png
```

### **3. الوصول للصورة من المتصفح:**
```
http://localhost:3006/upload/files/location-images/location_1765080145258.png
```

---

## 📁 الملفات المعدلة

1. ✅ `controllers/countriesCitiesController.js`
   - دالة `create()`
   - دالة `update()`
   - دالة `delete()`

2. ✅ `.env.example`
   - إضافة `BASE_URL`

---

## 🎯 الخلاصة

تم تعديل النظام بنجاح ليحفظ **URL كامل** بدلاً من المسار النسبي، مما يوفر:
- ✅ مرونة في التخزين (Local/CDN/Cloud)
- ✅ سهولة الاستخدام في Frontend
- ✅ توافق مع معايير REST API
- ✅ دعم HTTP و HTTPS
- ✅ سهولة الانتقال بين البيئات

---

**تاريخ التحديث:** 7 ديسمبر 2024  
**الإصدار:** 2.0

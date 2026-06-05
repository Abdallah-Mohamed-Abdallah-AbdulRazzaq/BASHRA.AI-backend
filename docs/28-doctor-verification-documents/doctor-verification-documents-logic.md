# شرح لوجيك مستندات التحقق للأطباء
# Doctor Verification Documents Logic Documentation

## نظرة عامة | Overview

هذا النظام مخصص لإدارة مستندات التحقق الخاصة بالأطباء، حيث يمكن للطبيب رفع المستندات المطلوبة للتحقق من هويته ومؤهلاته المهنية، ويتم مراجعتها من قبل الإدارة.

This system is dedicated to managing doctors' verification documents, where doctors can upload required documents to verify their identity and professional qualifications, which are then reviewed by administration.

---

## الجدول المستخدم | Database Table

### جدول doctor_verification_documents

**الحقول الأساسية:**
- `id`: المعرف الفريد للمستند
- `doctor_id`: معرف الطبيب (Foreign Key)
- `document_type`: نوع المستند
- `file_url`: رابط الملف المرفوع
- `status`: حالة المستند (pending, approved, rejected)

**أنواع المستندات المدعومة:**
1. `national_id` - الهوية الوطنية
2. `passport` - جواز السفر
3. `medical_license` - رخصة مزاولة المهنة
4. `board_certificate` - شهادة البورد
5. `university_degree` - الشهادة الجامعية
6. `other` - مستندات أخرى

**حقول المراجعة:**
- `rejection_reason`: سبب الرفض (إذا تم رفض المستند)
- `uploaded_at`: تاريخ الرفع
- `verified_at`: تاريخ التحقق
- `verified_by`: معرف المسؤول الذي قام بالتحقق

---

## الـ APIs المتاحة | Available APIs

### 1. رفع مستند جديد | Upload Document

**Endpoint:** `POST /api/profile-doctor/verification-documents`

**Authentication:** Required (Doctor only)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `document_type`: نوع المستند (required)
- `file`: ملف المستند (required)

**Supported File Types:**
- Images: JPEG, PNG, WebP
- Documents: PDF

**Max File Size:** 10MB

**Example Request (cURL):**
```bash
curl -X POST http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=medical_license" \
  -F "file=@/path/to/license.pdf"
```

**Response:**
```json
{
  "success": true,
  "message": "تم رفع المستند بنجاح",
  "data": {
    "id": 1,
    "document_type": "medical_license",
    "file_url": "/uploads/verification-documents/doc-1234567890-123456789.pdf",
    "status": "pending"
  }
}
```

---

### 2. جلب جميع المستندات | Get All Documents

**Endpoint:** `GET /api/profile-doctor/verification-documents`

**Authentication:** Required (Doctor only)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "document_type": "medical_license",
      "file_url": "/uploads/verification-documents/doc-1234567890-123456789.pdf",
      "status": "approved",
      "rejection_reason": null,
      "uploaded_at": "2024-01-15T10:30:00.000Z",
      "verified_at": "2024-01-16T14:20:00.000Z",
      "verified_by": 1
    },
    {
      "id": 2,
      "document_type": "national_id",
      "file_url": "/uploads/verification-documents/doc-1234567891-987654321.jpg",
      "status": "pending",
      "rejection_reason": null,
      "uploaded_at": "2024-01-15T11:00:00.000Z",
      "verified_at": null,
      "verified_by": null
    },
    {
      "id": 3,
      "document_type": "university_degree",
      "file_url": "/uploads/verification-documents/doc-1234567892-555555555.pdf",
      "status": "rejected",
      "rejection_reason": "الصورة غير واضحة، يرجى إعادة الرفع",
      "uploaded_at": "2024-01-14T09:15:00.000Z",
      "verified_at": "2024-01-15T16:45:00.000Z",
      "verified_by": 1
    }
  ]
}
```

---

### 3. جلب مستند محدد | Get Document by ID

**Endpoint:** `GET /api/profile-doctor/verification-documents/:id`

**Authentication:** Required (Doctor only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "document_type": "medical_license",
    "file_url": "/uploads/verification-documents/doc-1234567890-123456789.pdf",
    "status": "approved",
    "rejection_reason": null,
    "uploaded_at": "2024-01-15T10:30:00.000Z",
    "verified_at": "2024-01-16T14:20:00.000Z",
    "verified_by": 1
  }
}
```

---

### 4. تحديث مستند (إعادة رفع) | Update Document

**Endpoint:** `PUT /api/profile-doctor/verification-documents/:id`

**Authentication:** Required (Doctor only)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file`: ملف المستند الجديد (required)

**Use Case:** 
عندما يتم رفض مستند، يمكن للطبيب إعادة رفع نسخة جديدة محسّنة.

**Example Request (cURL):**
```bash
curl -X PUT http://localhost:3006/api/profile-doctor/verification-documents/3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/new-degree.pdf"
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث المستند بنجاح",
  "data": {
    "id": 3,
    "file_url": "/uploads/verification-documents/doc-1234567893-999999999.pdf",
    "status": "pending"
  }
}
```

**ملاحظة:** عند إعادة رفع المستند:
- يتم حذف الملف القديم تلقائياً
- يتم إعادة تعيين الحالة إلى `pending`
- يتم مسح `rejection_reason` و `verified_at` و `verified_by`

---

### 5. حذف مستند | Delete Document

**Endpoint:** `DELETE /api/profile-doctor/verification-documents/:id`

**Authentication:** Required (Doctor only)

**Response:**
```json
{
  "success": true,
  "message": "تم حذف المستند بنجاح"
}
```

**قيود الحذف:**
- لا يمكن حذف المستندات التي تم الموافقة عليها (`status = 'approved'`)
- يمكن حذف المستندات في حالة `pending` أو `rejected` فقط

---

### 6. جلب ملخص المستندات | Get Documents Summary

**Endpoint:** `GET /api/profile-doctor/verification-documents/summary`

**Authentication:** Required (Doctor only)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 2,
    "approved": 2,
    "rejected": 1
  }
}
```

---

## ميزات النظام | System Features

### 1. رفع الملفات
- دعم الصور (JPEG, PNG, WebP)
- دعم ملفات PDF
- حد أقصى للحجم: 10MB
- تخزين الملفات في مجلد `uploads/verification-documents/`
- أسماء ملفات فريدة تلقائياً

### 2. إدارة المستندات
- رفع مستندات جديدة
- عرض جميع المستندات
- عرض مستند محدد
- تحديث (إعادة رفع) مستند
- حذف مستند

### 3. حالات المستندات
- `pending`: في انتظار المراجعة
- `approved`: تمت الموافقة
- `rejected`: تم الرفض (مع سبب الرفض)

### 4. الأمان
- جميع الـ APIs تتطلب تسجيل دخول
- فقط الطبيب يمكنه الوصول لمستنداته
- لا يمكن حذف المستندات المعتمدة

---

## سير العمل | Workflow

### للطبيب (Doctor):

1. **رفع المستندات:**
   - يقوم الطبيب برفع المستندات المطلوبة
   - الحالة الافتراضية: `pending`

2. **متابعة الحالة:**
   - يمكن للطبيب مراجعة حالة كل مستند
   - إذا تم الرفض، يمكن الاطلاع على السبب

3. **إعادة الرفع:**
   - إذا تم رفض مستند، يمكن إعادة رفع نسخة محسّنة
   - يتم حذف الملف القديم تلقائياً

4. **الحذف:**
   - يمكن حذف المستندات في حالة `pending` أو `rejected`
   - لا يمكن حذف المستندات المعتمدة

### للإدارة (Admin):

1. **المراجعة:**
   - يتم مراجعة المستندات من قبل الإدارة
   - تحديث الحالة إلى `approved` أو `rejected`

2. **الرفض:**
   - عند الرفض، يجب كتابة سبب واضح
   - يظهر السبب للطبيب

3. **الموافقة:**
   - عند الموافقة، يتم تسجيل تاريخ التحقق
   - يتم تسجيل معرف المسؤول الذي قام بالموافقة

---

## معالجة الأخطاء | Error Handling

### الأخطاء المحتملة:

1. **400 - Invalid Document Type**
   ```json
   {
     "success": false,
     "message": "نوع المستند غير صالح",
     "valid_types": ["national_id", "passport", "medical_license", "board_certificate", "university_degree", "other"]
   }
   ```

2. **400 - No File Uploaded**
   ```json
   {
     "success": false,
     "message": "الرجاء رفع ملف المستند"
   }
   ```

3. **400 - File Size Too Large**
   ```json
   {
     "success": false,
     "message": "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت"
   }
   ```

4. **400 - Invalid File Type**
   ```json
   {
     "success": false,
     "message": "نوع الملف غير مدعوم. يجب أن يكون الملف صورة (JPEG, PNG, WebP) أو PDF"
   }
   ```

5. **400 - Cannot Delete Approved Document**
   ```json
   {
     "success": false,
     "message": "لا يمكن حذف مستند تم الموافقة عليه"
   }
   ```

6. **404 - Document Not Found**
   ```json
   {
     "success": false,
     "message": "المستند غير موجود"
   }
   ```

---

## ملاحظات مهمة | Important Notes

1. **أنواع الملفات المدعومة:**
   - الصور: JPEG, PNG, WebP
   - المستندات: PDF
   - الحد الأقصى: 10MB

2. **تخزين الملفات:**
   - المجلد: `uploads/verification-documents/`
   - أسماء الملفات: `doc-{timestamp}-{random}.{extension}`

3. **حذف الملفات:**
   - عند تحديث مستند، يتم حذف الملف القديم تلقائياً
   - عند حذف مستند، يتم حذف الملف من القرص

4. **الأمان:**
   - كل طبيب يمكنه الوصول فقط لمستنداته
   - لا يمكن الوصول لمستندات أطباء آخرين

5. **حالات المستندات:**
   - `pending`: يمكن التعديل والحذف
   - `rejected`: يمكن التعديل والحذف
   - `approved`: لا يمكن الحذف (للحفاظ على السجلات)

---

## أمثلة الاستخدام | Usage Examples

### مثال 1: رفع رخصة مزاولة المهنة
```bash
curl -X POST http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=medical_license" \
  -F "file=@/path/to/medical-license.pdf"
```

### مثال 2: رفع الهوية الوطنية
```bash
curl -X POST http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=national_id" \
  -F "file=@/path/to/national-id.jpg"
```

### مثال 3: جلب جميع المستندات
```bash
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### مثال 4: إعادة رفع مستند مرفوض
```bash
curl -X PUT http://localhost:3006/api/profile-doctor/verification-documents/3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/improved-document.pdf"
```

### مثال 5: حذف مستند
```bash
curl -X DELETE http://localhost:3006/api/profile-doctor/verification-documents/5 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### مثال 6: جلب ملخص المستندات
```bash
curl -X GET http://localhost:3006/api/profile-doctor/verification-documents/summary \
  -H "Authorization: Bearer YOUR_TOKEN"
```

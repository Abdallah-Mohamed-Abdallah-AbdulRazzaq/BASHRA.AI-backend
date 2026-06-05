# 📋 Doctor Subscriptions API Documentation
# توثيق APIs اشتراكات الأطباء

> **تاريخ الإنشاء:** 24 نوفمبر 2025  
> **Base URL:** `http://localhost:3006/api/doctor-subscriptions`

---

## 📋 نظرة عامة | Overview

نظام إدارة اشتراكات الأطباء يسمح للأطباء بالاشتراك في الباقات المتاحة ويمكّن الإدارة من الموافقة على الاشتراكات وإدارتها.

### آلية العمل:
1. **الطبيب** يختار باقة ويرسل طلب اشتراك
2. الطلب يُنشأ بحالة `pending` (قيد المراجعة)
3. **الأدمن** يراجع الطلب ويوافق عليه أو يرفضه
4. عند الموافقة، يتم تفعيل الاشتراك وتحديث `current_subscription_id` في جدول الأطباء
5. يتم احتساب تواريخ البداية والنهاية تلقائياً

---

## 🗄️ هيكل قاعدة البيانات | Database Structure

```sql
CREATE TABLE `doctor_subscriptions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doctor_id` INT NOT NULL,
  `package_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `subscription_status` ENUM('active', 'pending', 'expired', 'canceled') NOT NULL,
  `approved_by_admin_id` INT NULL,
  `last_modified_by_admin_id` INT NULL,
  `is_trial` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doctor_package_date` (`doctor_id`, `package_id`, `start_date`),
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`approved_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`last_modified_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
);
```

### حالات الاشتراك:
- **`pending`**: قيد المراجعة (افتراضي عند الإنشاء)
- **`active`**: نشط (بعد موافقة الأدمن)
- **`expired`**: منتهي
- **`canceled`**: ملغي

---

## 🔐 المصادقة | Authentication

### Doctor APIs:
```http
Authorization: Bearer DOCTOR_JWT_TOKEN
```

### Admin APIs:
```http
Authorization: Bearer ADMIN_JWT_TOKEN
```

---

## 📡 APIs المتوفرة | Available APIs

---

# 1️⃣ Doctor APIs (إدارة الاشتراكات الخاصة)

## 1.1 Create Subscription Request
**POST** `/api/doctor-subscriptions/subscribe`

إنشاء طلب اشتراك جديد.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "package_id": 102
}
```

**Body (form-data):**
```
package_id: 102
```

**Automatic Calculations:**
- ✅ `start_date`: يتم تعيينه للتاريخ الحالي
- ✅ `end_date`: يتم احتسابه من `duration_days` الموجود في الباقة
- ✅ `subscription_status`: يتم تعيينه إلى `pending` تلقائياً
- ✅ `is_trial`: يتم تعيينه إلى `0` (false) تلقائياً

**Validation:**
- ⚠️ الباقة يجب أن تكون موجودة ونشطة
- ⚠️ لا يمكن إنشاء اشتراك جديد إذا كان لديك اشتراك نشط أو قيد المراجعة

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "تم إرسال طلب الاشتراك بنجاح. في انتظار موافقة الإدارة",
  "data": {
    "id": 15,
    "doctor_id": 25,
    "package_id": 102,
    "start_date": "2025-11-24",
    "end_date": "2025-12-24",
    "subscription_status": "pending",
    "approved_by_admin_id": null,
    "last_modified_by_admin_id": null,
    "is_trial": 0,
    "created_at": "2025-11-24T10:00:00.000Z",
    "updated_at": "2025-11-24T10:00:00.000Z",
    "package_name_ar": "الباقة الأساسية",
    "package_name_en": "Basic Package",
    "price": 50.00,
    "duration_days": 30
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "لديك اشتراك نشط بالفعل",
  "current_subscription": {
    "id": 10,
    "subscription_status": "active",
    "end_date": "2025-12-15"
  }
}
```

```json
{
  "success": false,
  "message": "الباقة غير متاحة حالياً"
}
```

---

## 1.2 Get My Subscriptions
**GET** `/api/doctor-subscriptions/my-subscriptions`

جلب جميع اشتراكات الطبيب.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Query Parameters:**
- `status` (optional): filter by status (active, pending, expired, canceled)

**Example:**
```http
GET /api/doctor-subscriptions/my-subscriptions
GET /api/doctor-subscriptions/my-subscriptions?status=active
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 15,
      "doctor_id": 25,
      "package_id": 102,
      "start_date": "2025-11-24",
      "end_date": "2025-12-24",
      "subscription_status": "pending",
      "approved_by_admin_id": null,
      "last_modified_by_admin_id": null,
      "is_trial": 0,
      "created_at": "2025-11-24T10:00:00.000Z",
      "updated_at": "2025-11-24T10:00:00.000Z",
      "package_name_ar": "الباقة الأساسية",
      "package_name_en": "Basic Package",
      "price": 50.00,
      "duration_days": 30,
      "approved_by_name": null,
      "last_modified_by_name": null
    },
    {
      "id": 10,
      "doctor_id": 25,
      "package_id": 101,
      "start_date": "2025-10-24",
      "end_date": "2025-11-24",
      "subscription_status": "expired",
      "approved_by_admin_id": 5,
      "is_trial": 1,
      "package_name_ar": "الباقة التجريبية",
      "price": 0.00,
      "duration_days": 30,
      "approved_by_name": "أحمد محمد"
    }
  ]
}
```

---

## 1.3 Get Current Active Subscription
**GET** `/api/doctor-subscriptions/current`

جلب الاشتراك النشط الحالي مع ميزات الباقة.

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "doctor_id": 25,
    "package_id": 102,
    "start_date": "2025-11-01",
    "end_date": "2025-12-01",
    "subscription_status": "active",
    "is_trial": 0,
    "package_name_ar": "الباقة الأساسية",
    "package_name_en": "Basic Package",
    "price": 50.00,
    "duration_days": 30,
    "features": [
      {
        "feature_value": "1",
        "is_included": 1,
        "feature_name_ar": "عدد المستخدمين",
        "feature_name_en": "Max Users",
        "unit_ar": "مستخدم",
        "unit_en": "User"
      },
      {
        "feature_value": "10",
        "is_included": 1,
        "feature_name_ar": "سعة التخزين السحابي",
        "unit_ar": "جيجابايت"
      }
    ]
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "message": "لا يوجد اشتراك نشط حالياً"
}
```

---

## 1.4 Cancel Subscription Request
**DELETE** `/api/doctor-subscriptions/:id/cancel`

إلغاء طلب اشتراك (فقط الاشتراكات بحالة `pending`).

**Headers:**
```
Authorization: Bearer DOCTOR_TOKEN
```

**Example:**
```http
DELETE /api/doctor-subscriptions/15/cancel
```

**Response (Success):**
```json
{
  "success": true,
  "message": "تم إلغاء طلب الاشتراك بنجاح"
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "يمكن إلغاء الاشتراكات قيد المراجعة فقط"
}
```

---

# 2️⃣ Admin APIs (إدارة جميع الاشتراكات)

## 2.1 Get All Subscriptions
**GET** `/api/doctor-subscriptions/admin/all`

جلب جميع اشتراكات الأطباء.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Query Parameters:**
- `status` (optional): filter by status
- `doctor_id` (optional): filter by doctor
- `package_id` (optional): filter by package

**Example:**
```http
GET /api/doctor-subscriptions/admin/all
GET /api/doctor-subscriptions/admin/all?status=pending
GET /api/doctor-subscriptions/admin/all?doctor_id=25
```

**Response:**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 15,
      "doctor_id": 25,
      "package_id": 102,
      "start_date": "2025-11-24",
      "end_date": "2025-12-24",
      "subscription_status": "pending",
      "approved_by_admin_id": null,
      "last_modified_by_admin_id": null,
      "is_trial": 0,
      "created_at": "2025-11-24T10:00:00.000Z",
      "doctor_name": "د. أحمد محمد",
      "doctor_email": "doctor@example.com",
      "doctor_phone": "+966501234567",
      "specialization": "طب الأسنان",
      "package_name_ar": "الباقة الأساسية",
      "package_name_en": "Basic Package",
      "price": 50.00,
      "duration_days": 30,
      "approved_by_name": null,
      "last_modified_by_name": null
    }
  ]
}
```

---

## 2.2 Get Subscription by ID
**GET** `/api/doctor-subscriptions/admin/:id`

جلب اشتراك محدد مع تفاصيل الباقة والميزات.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Example:**
```http
GET /api/doctor-subscriptions/admin/15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "doctor_id": 25,
    "package_id": 102,
    "subscription_status": "pending",
    "doctor_name": "د. أحمد محمد",
    "doctor_email": "doctor@example.com",
    "specialization": "طب الأسنان",
    "package_name_ar": "الباقة الأساسية",
    "price": 50.00,
    "features": [
      {
        "feature_value": "1",
        "is_included": 1,
        "feature_name_ar": "عدد المستخدمين"
      }
    ]
  }
}
```

---

## 2.3 Approve Subscription
**PATCH** `/api/doctor-subscriptions/admin/:id/approve`

الموافقة على اشتراك وتفعيله.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Example:**
```http
PATCH /api/doctor-subscriptions/admin/15/approve
```

**What Happens:**
1. ✅ تغيير حالة الاشتراك إلى `active`
2. ✅ تسجيل معرف الأدمن في `approved_by_admin_id`
3. ✅ إنهاء أي اشتراك نشط سابق للطبيب
4. ✅ تحديث `current_subscription_id` في جدول `doctors`

**Response:**
```json
{
  "success": true,
  "message": "تم تفعيل الاشتراك بنجاح",
  "data": {
    "id": 15,
    "doctor_id": 25,
    "subscription_status": "active",
    "approved_by_admin_id": 5,
    "doctor_name": "د. أحمد محمد",
    "package_name_ar": "الباقة الأساسية"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "لا يمكن تفعيل اشتراك بحالة expired"
}
```

---

## 2.4 Update Subscription
**PUT** `/api/doctor-subscriptions/admin/:id`

تحديث بيانات الاشتراك.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "subscription_status": "active",
  "is_trial": true,
  "start_date": "2025-11-24",
  "end_date": "2025-12-24"
}
```

**Body (form-data):**
```
subscription_status: active
is_trial: true
start_date: 2025-11-24
end_date: 2025-12-24
```

**Note:**
- ✅ جميع الحقول اختيارية
- ✅ يتم تسجيل معرف الأدمن في `last_modified_by_admin_id`
- ✅ إذا تم تغيير الحالة إلى `active`، يتم تحديث `current_subscription_id`

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث الاشتراك بنجاح",
  "data": {
    "id": 15,
    "subscription_status": "active",
    "is_trial": 1,
    "last_modified_by_admin_id": 5
  }
}
```

---

## 2.5 Expire/Cancel Subscription
**PATCH** `/api/doctor-subscriptions/admin/:id/expire`

إنهاء أو إلغاء اشتراك.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

**Body (Optional):**
```json
{
  "reason": "انتهاء المدة"
}
```

**What Happens:**
1. ✅ تغيير حالة الاشتراك إلى `expired`
2. ✅ مسح `current_subscription_id` من جدول `doctors`
3. ✅ تسجيل معرف الأدمن في `last_modified_by_admin_id`

**Response:**
```json
{
  "success": true,
  "message": "تم إنهاء الاشتراك بنجاح"
}
```

---

## 2.6 Delete Subscription
**DELETE** `/api/doctor-subscriptions/admin/:id`

حذف اشتراك نهائياً.

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN
```

**Example:**
```http
DELETE /api/doctor-subscriptions/admin/15
```

**What Happens:**
1. ✅ مسح `current_subscription_id` من جدول `doctors` إذا كان هذا الاشتراك
2. ✅ حذف الاشتراك من قاعدة البيانات

**Response:**
```json
{
  "success": true,
  "message": "تم حذف الاشتراك بنجاح"
}
```

---

## 🎯 Use Cases | حالات الاستخدام

### Scenario 1: طبيب يشترك في باقة جديدة

```javascript
// 1. Doctor views available packages
GET /api/public/packages

// 2. Doctor subscribes to a package
POST /api/doctor-subscriptions/subscribe
Body: { "package_id": 102 }

// Response: Subscription created with status "pending"

// 3. Doctor checks subscription status
GET /api/doctor-subscriptions/my-subscriptions?status=pending
```

---

### Scenario 2: أدمن يوافق على اشتراك

```javascript
// 1. Admin views pending subscriptions
GET /api/doctor-subscriptions/admin/all?status=pending

// 2. Admin reviews subscription details
GET /api/doctor-subscriptions/admin/15

// 3. Admin approves subscription
PATCH /api/doctor-subscriptions/admin/15/approve

// Result: 
// - Subscription status → "active"
// - Doctor's current_subscription_id → 15
// - Any previous active subscription → "expired"
```

---

### Scenario 3: طبيب يلغي طلب اشتراك

```javascript
// 1. Doctor views pending subscriptions
GET /api/doctor-subscriptions/my-subscriptions?status=pending

// 2. Doctor cancels subscription request
DELETE /api/doctor-subscriptions/15/cancel

// Result: Subscription status → "canceled"
```

---

### Scenario 4: أدمن يحدد اشتراك كتجريبي

```javascript
// 1. Admin updates subscription
PUT /api/doctor-subscriptions/admin/15
Body: {
  "is_trial": true,
  "subscription_status": "active"
}

// Result: Subscription is now active and marked as trial
```

---

## 📊 Subscription Status Flow | دورة حياة الاشتراك

```
┌─────────────────────────────────────────────────┐
│         Doctor creates subscription             │
│              (status: pending)                  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────┐         ┌──────────┐
   │ Approve │         │  Cancel  │
   │ (Admin) │         │ (Doctor) │
   └────┬────┘         └────┬─────┘
        │                   │
        ▼                   ▼
   ┌─────────┐         ┌──────────┐
   │ active  │         │ canceled │
   └────┬────┘         └──────────┘
        │
        │ (End date reached or Admin action)
        ▼
   ┌─────────┐
   │ expired │
   └─────────┘
```

---

## 💡 ملاحظات مهمة | Important Notes

### ✅ القواعد:

1. **Automatic Calculations:**
   - `start_date` = تاريخ الإنشاء
   - `end_date` = `start_date` + `duration_days` من الباقة
   - `subscription_status` = `pending` (افتراضي)
   - `is_trial` = `0` (افتراضي)

2. **Unique Constraint:**
   - لا يمكن إنشاء اشتراكين لنفس الطبيب بنفس الباقة ونفس تاريخ البداية

3. **Active Subscription:**
   - طبيب واحد = اشتراك نشط واحد فقط
   - عند تفعيل اشتراك جديد، يتم إنهاء الاشتراك النشط السابق

4. **Current Subscription ID:**
   - يتم تحديث `current_subscription_id` في جدول `doctors` عند:
     - الموافقة على اشتراك
     - تغيير حالة اشتراك إلى `active`
   - يتم مسحه عند:
     - إنهاء الاشتراك
     - حذف الاشتراك

5. **Admin Tracking:**
   - `approved_by_admin_id`: الأدمن الذي وافق على الاشتراك
   - `last_modified_by_admin_id`: آخر أدمن قام بتعديل الاشتراك

6. **Permissions:**
   - Doctor: إنشاء، عرض، إلغاء (pending فقط)
   - Admin: عرض الكل، موافقة، تحديث، إنهاء، حذف

---

## ⚠️ Error Responses

### 400 Bad Request:
```json
{
  "success": false,
  "message": "لديك اشتراك نشط بالفعل"
}
```

```json
{
  "success": false,
  "message": "الباقة غير متاحة حالياً"
}
```

```json
{
  "success": false,
  "message": "يمكن إلغاء الاشتراكات قيد المراجعة فقط"
}
```

### 404 Not Found:
```json
{
  "success": false,
  "message": "الاشتراك غير موجود"
}
```

```json
{
  "success": false,
  "message": "لا يوجد اشتراك نشط حالياً"
}
```

---

## 🚀 Quick Start

### 1. Doctor: الاشتراك في باقة
```bash
POST http://localhost:3006/api/doctor-subscriptions/subscribe
Authorization: Bearer DOCTOR_TOKEN
Content-Type: application/json

{
  "package_id": 102
}
```

### 2. Doctor: عرض اشتراكاتي
```bash
GET http://localhost:3006/api/doctor-subscriptions/my-subscriptions
Authorization: Bearer DOCTOR_TOKEN
```

### 3. Doctor: عرض الاشتراك النشط
```bash
GET http://localhost:3006/api/doctor-subscriptions/current
Authorization: Bearer DOCTOR_TOKEN
```

### 4. Admin: عرض الاشتراكات قيد المراجعة
```bash
GET http://localhost:3006/api/doctor-subscriptions/admin/all?status=pending
Authorization: Bearer ADMIN_TOKEN
```

### 5. Admin: الموافقة على اشتراك
```bash
PATCH http://localhost:3006/api/doctor-subscriptions/admin/15/approve
Authorization: Bearer ADMIN_TOKEN
```

---

## 📁 الملفات ذات الصلة | Related Files

### Controller:
- `controllers/doctorSubscriptionsController.js`

### Routes:
- `routes/doctorSubscriptionsRoutes.js`

### Main Routes:
- `routes/index.js`

### Database:
- جدول `doctor_subscriptions`
- جدول `doctors` (عمود `current_subscription_id`)
- جدول `packages`
- جدول `admins`

---

## 🔗 Related APIs

### Packages:
- `GET /api/public/packages` - عرض الباقات المتاحة
- `GET /api/packages` - إدارة الباقات (Admin)

### Doctor Profile:
- `GET /api/profile-doctor` - معلومات الطبيب

---

<div align="center">

**📋 Doctor Subscriptions API - Complete! 📋**

**تم الإنشاء بواسطة:** Cascade AI  
**التاريخ:** 24 نوفمبر 2025

</div>

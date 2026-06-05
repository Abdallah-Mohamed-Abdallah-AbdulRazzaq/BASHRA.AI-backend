# كيفية استيراد ملف الاختبار في Postman
# How to Import Test File in Postman

## الخطوات | Steps

### 1. فتح Postman
افتح تطبيق Postman على جهازك

Open Postman application on your computer

---

### 2. استيراد الملف | Import File

#### الطريقة الأولى: السحب والإفلات | Method 1: Drag & Drop
- اسحب ملف `CHANGE_PASSWORD_IN_APP_TESTING.json` وأفلته في نافذة Postman
- Drag and drop `CHANGE_PASSWORD_IN_APP_TESTING.json` file into Postman window

#### الطريقة الثانية: زر الاستيراد | Method 2: Import Button
1. اضغط على زر "Import" في أعلى يسار Postman
2. اختر "Upload Files"
3. حدد ملف `CHANGE_PASSWORD_IN_APP_TESTING.json`
4. اضغط "Import"

1. Click "Import" button in top left of Postman
2. Choose "Upload Files"
3. Select `CHANGE_PASSWORD_IN_APP_TESTING.json` file
4. Click "Import"

---

### 3. تعديل المتغيرات | Configure Variables

بعد الاستيراد، قم بتعديل المتغيرات:

After importing, configure the variables:

1. اضغط على اسم المجموعة "Change Password In-App API Testing"
2. اذهب إلى تبويب "Variables"
3. عدّل قيمة `baseUrl` إذا كان السيرفر يعمل على عنوان مختلف
   - القيمة الافتراضية: `http://localhost:3000/api`
   - Default value: `http://localhost:3000/api`

---

### 4. تشغيل الاختبارات | Run Tests

#### خطوة 1: تسجيل الدخول أولاً | Step 1: Login First
قبل اختبار تغيير كلمة المرور، يجب تسجيل الدخول:

Before testing password change, you must login:

1. افتح مجلد "Setup - Login First"
2. قم بتعديل بيانات تسجيل الدخول في كل طلب:
   - البريد الإلكتروني
   - كلمة المرور
3. شغّل طلبات تسجيل الدخول للحصول على Tokens

1. Open "Setup - Login First" folder
2. Edit login credentials in each request:
   - Email
   - Password
3. Run login requests to get tokens

#### خطوة 2: اختبار تغيير كلمة المرور | Step 2: Test Password Change
بعد تسجيل الدخول، يمكنك اختبار:

After login, you can test:

1. افتح مجلد "User - Change Password Tests"
2. شغّل الاختبارات واحداً تلو الآخر
3. راجع النتائج في تبويب "Test Results"

1. Open "User - Change Password Tests" folder
2. Run tests one by one
3. Review results in "Test Results" tab

---

### 5. فهم الاختبارات | Understanding Tests

#### ✅ اختبارات النجاح | Success Tests
- تحتوي على علامة ✅
- تتوقع استجابة ناجحة (200 OK)
- Contains ✅ mark
- Expects successful response (200 OK)

#### ❌ اختبارات الأخطاء | Error Tests
- تحتوي على علامة ❌
- تتوقع استجابة خطأ (400, 401, etc.)
- Contains ❌ mark
- Expects error response (400, 401, etc.)

---

### 6. تشغيل جميع الاختبارات | Run All Tests

لتشغيل جميع الاختبارات دفعة واحدة:

To run all tests at once:

1. اضغط على اسم المجموعة
2. اضغط على زر "Run" في الأعلى
3. اختر الاختبارات التي تريد تشغيلها
4. اضغط "Run Change Password In-App API Testing"

1. Click on collection name
2. Click "Run" button at top
3. Select tests you want to run
4. Click "Run Change Password In-App API Testing"

---

## ملاحظات مهمة | Important Notes

### 1. ترتيب التشغيل | Execution Order
يجب تشغيل الاختبارات بالترتيب التالي:

Tests must be run in this order:

```
1. Setup - Login First
   ↓
2. User/Doctor/Assistant - Change Password Tests
   ↓
3. Verify Sessions Revoked
```

### 2. المتغيرات التلقائية | Automatic Variables
عند تسجيل الدخول بنجاح، يتم حفظ:
- Access Token تلقائياً
- User ID تلقائياً

When login is successful, automatically saves:
- Access Token
- User ID

### 3. إعادة تعيين كلمة المرور | Reset Password
بعد تشغيل اختبار تغيير كلمة المرور الناجح:
- يجب إعادة كلمة المرور إلى القيمة الأصلية
- أو تحديث بيانات تسجيل الدخول

After running successful password change test:
- Reset password to original value
- Or update login credentials

---

## استكشاف الأخطاء | Troubleshooting

### المشكلة: "Connection refused"
**الحل:**
- تأكد من تشغيل السيرفر
- تحقق من عنوان `baseUrl`

**Solution:**
- Make sure server is running
- Check `baseUrl` address

### المشكلة: "401 Unauthorized"
**الحل:**
- شغّل طلبات تسجيل الدخول أولاً
- تأكد من صحة بيانات الدخول

**Solution:**
- Run login requests first
- Verify login credentials

### المشكلة: "Token expired"
**الحل:**
- سجّل دخول جديد للحصول على Token جديد

**Solution:**
- Login again to get new token

---

## معلومات إضافية | Additional Information

### البيئات | Environments
يمكنك إنشاء بيئات مختلفة:
- Development: `http://localhost:3000/api`
- Staging: `https://staging.example.com/api`
- Production: `https://api.example.com/api`

You can create different environments:
- Development: `http://localhost:3000/api`
- Staging: `https://staging.example.com/api`
- Production: `https://api.example.com/api`

### التقارير | Reports
بعد تشغيل الاختبارات، يمكنك:
- عرض التقرير الكامل
- تصدير النتائج
- مشاركة التقرير مع الفريق

After running tests, you can:
- View complete report
- Export results
- Share report with team

---

## الدعم | Support

للمزيد من المعلومات:
- راجع ملف التوثيق: `CHANGE_PASSWORD_IN_APP.md`
- راجع الكود: `controllers/AuthController.js`

For more information:
- Review documentation: `CHANGE_PASSWORD_IN_APP.md`
- Review code: `controllers/AuthController.js`

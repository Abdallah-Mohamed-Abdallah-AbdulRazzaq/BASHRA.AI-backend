# Scripts Directory
## مجلد السكريبتات

هذا المجلد يحتوي على سكريبتات مساعدة لإعداد وصيانة النظام.

---

## 📁 السكريبتات المتاحة

### 1. `initializeDirectories.js`
**الوصف:** إنشاء بنية المجلدات الأساسية لرفع الملفات

**الاستخدام:**
```bash
# الطريقة 1: باستخدام npm
npm run init-dirs

# الطريقة 2: مباشرة
node scripts/initializeDirectories.js
```

**الوظيفة:**
- ✅ إنشاء `upload/files/profile-picture/user/`
- ✅ إنشاء `upload/files/profile-picture/doctor/`
- ✅ إنشاء `upload/files/profile-picture/admin/`
- ✅ إنشاء `upload/files/profile-picture/assistant/`

**متى تستخدمه:**
- عند تشغيل التطبيق لأول مرة
- بعد حذف مجلد `upload`
- عند إضافة سيرفر جديد

---

### 2. `migrate.js`
**الوصف:** تشغيل ملفات الترحيل (migrations) لقاعدة البيانات

**الاستخدام:**
```bash
npm run db-migrate
```

---

## 🚀 سكريبتات npm الكاملة

```json
{
  "scripts": {
    "start": "node app.js",                    // تشغيل التطبيق
    "dev": "nodemon app.js",                   // تشغيل وضع التطوير
    "test": "jest",                            // تشغيل الاختبارات
    "lint": "eslint .",                        // فحص الكود
    "security-cleanup": "...",                 // تنظيف الأمان
    "db-migrate": "node scripts/migrate.js",   // ترحيل قاعدة البيانات
    "init-dirs": "node scripts/initializeDirectories.js"  // تهيئة المجلدات
  }
}
```

---

## 📝 إضافة سكريبت جديد

1. أنشئ ملف JavaScript في مجلد `scripts/`
2. أضف الكود الخاص بك
3. أضف السكريبت في `package.json`:
   ```json
   "your-script": "node scripts/yourScript.js"
   ```
4. شغله باستخدام: `npm run your-script`

---

**تم التوثيق:** نوفمبر 2024

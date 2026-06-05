-- ============================================
-- SQL Queries for Testing Doctor Verification Status
-- استعلامات SQL لاختبار حالة التحقق من الأطباء
-- ============================================

-- ============================================
-- 1. عرض حالة التحقق لجميع الأطباء
-- Display verification status for all doctors
-- ============================================

SELECT 
    d.id AS doctor_id,
    d.uuid,
    d.email,
    d.status AS doctor_status,
    dp.is_verified,
    dp.verification_date,
    dp.verified_by,
    dp.approval_status,
    dpt.full_name,
    dpt.specialty,
    a.email AS verified_by_email,
    a.full_name AS verified_by_name
FROM doctors d
LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
LEFT JOIN admins a ON dp.verified_by = a.id
ORDER BY d.created_at DESC;

-- ============================================
-- 2. عرض الأطباء المعتمدين فقط
-- Display only verified and approved doctors
-- ============================================

SELECT 
    d.id,
    d.email,
    d.status,
    dp.is_verified,
    dp.approval_status,
    dp.verification_date,
    dpt.full_name
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE dp.is_verified = 1 
  AND dp.approval_status = 'approved'
  AND d.status = 'active';

-- ============================================
-- 3. عرض الأطباء قيد المراجعة
-- Display doctors pending review
-- ============================================

SELECT 
    d.id,
    d.email,
    d.status,
    dp.is_verified,
    dp.approval_status,
    dpt.full_name,
    d.created_at
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE dp.approval_status = 'pending'
ORDER BY d.created_at ASC;

-- ============================================
-- 4. عرض الأطباء المرفوضين
-- Display rejected doctors
-- ============================================

SELECT 
    d.id,
    d.email,
    d.status,
    dp.approval_status,
    dpt.full_name,
    d.created_at
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE dp.approval_status = 'rejected';

-- ============================================
-- 5. عرض الأطباء المعلقين
-- Display suspended doctors
-- ============================================

SELECT 
    d.id,
    d.email,
    d.status,
    dp.approval_status,
    dpt.full_name,
    d.created_at
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE dp.approval_status = 'suspended';

-- ============================================
-- 6. عرض سجل تحديثات حالة التحقق
-- Display verification status update logs
-- ============================================

SELECT 
    aal.id,
    aal.admin_id,
    a.email AS admin_email,
    a.full_name AS admin_name,
    aal.action_type,
    aal.target_type,
    aal.target_id,
    aal.old_values,
    aal.new_values,
    aal.ip_address,
    aal.created_at
FROM admin_action_logs aal
JOIN admins a ON aal.admin_id = a.id
WHERE aal.action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
ORDER BY aal.created_at DESC
LIMIT 20;

-- ============================================
-- 7. إحصائيات حالة التحقق
-- Verification status statistics
-- ============================================

SELECT 
    dp.approval_status,
    dp.is_verified,
    COUNT(*) AS count,
    COUNT(CASE WHEN d.status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN d.status = 'inactive' THEN 1 END) AS inactive_count,
    COUNT(CASE WHEN d.status = 'suspended' THEN 1 END) AS suspended_count,
    COUNT(CASE WHEN d.status = 'pending_verification' THEN 1 END) AS pending_count
FROM doctor_profiles dp
JOIN doctors d ON dp.doctor_id = d.id
GROUP BY dp.approval_status, dp.is_verified;

-- ============================================
-- 8. الأطباء الذين تم التحقق منهم مؤخراً
-- Recently verified doctors
-- ============================================

SELECT 
    d.id,
    d.email,
    dp.verification_date,
    dp.verified_by,
    a.email AS verified_by_email,
    dpt.full_name,
    dp.approval_status
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
LEFT JOIN admins a ON dp.verified_by = a.id
WHERE dp.is_verified = 1
  AND dp.verification_date IS NOT NULL
ORDER BY dp.verification_date DESC
LIMIT 10;

-- ============================================
-- 9. الأطباء الذين لم يتم التحقق منهم
-- Unverified doctors
-- ============================================

SELECT 
    d.id,
    d.email,
    d.status,
    dp.is_verified,
    dp.approval_status,
    dpt.full_name,
    d.created_at,
    DATEDIFF(NOW(), d.created_at) AS days_since_registration
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE dp.is_verified = 0
ORDER BY d.created_at ASC;

-- ============================================
-- 10. عدد التحديثات لكل أدمن
-- Number of updates per admin
-- ============================================

SELECT 
    a.id AS admin_id,
    a.email,
    a.full_name,
    COUNT(*) AS total_verifications,
    COUNT(CASE WHEN JSON_EXTRACT(aal.new_values, '$.approval_status') = '"approved"' THEN 1 END) AS approved_count,
    COUNT(CASE WHEN JSON_EXTRACT(aal.new_values, '$.approval_status') = '"rejected"' THEN 1 END) AS rejected_count,
    COUNT(CASE WHEN JSON_EXTRACT(aal.new_values, '$.approval_status') = '"suspended"' THEN 1 END) AS suspended_count
FROM admins a
JOIN admin_action_logs aal ON a.id = aal.admin_id
WHERE aal.action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
GROUP BY a.id, a.email, a.full_name
ORDER BY total_verifications DESC;

-- ============================================
-- 11. تفاصيل طبيب معين (للاختبار)
-- Specific doctor details (for testing)
-- ============================================

SELECT 
    d.id AS doctor_id,
    d.uuid,
    d.email,
    d.phone,
    d.status AS doctor_status,
    d.is_active,
    d.email_verified_at,
    d.created_at AS doctor_created_at,
    dp.id AS profile_id,
    dp.license_number,
    dp.is_verified,
    dp.verification_date,
    dp.verified_by,
    dp.approval_status,
    dp.years_of_experience,
    dp.rating_average,
    dp.total_consultations,
    dpt.full_name,
    dpt.specialty,
    dpt.sub_specialty,
    dpt.biography,
    a.email AS verified_by_email,
    a.full_name AS verified_by_name
FROM doctors d
LEFT JOIN doctor_profiles dp ON d.id = dp.doctor_id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
LEFT JOIN admins a ON dp.verified_by = a.id
WHERE d.id = 1; -- غير الرقم حسب الطبيب المراد اختباره

-- ============================================
-- 12. التحقق من تطابق الحالات
-- Verify status consistency
-- ============================================

-- يجب أن تكون النتيجة فارغة (لا توجد تناقضات)
SELECT 
    d.id,
    d.email,
    d.status AS doctor_status,
    dp.is_verified,
    dp.approval_status,
    'Inconsistency Found' AS issue
FROM doctors d
JOIN doctor_profiles dp ON d.id = dp.doctor_id
WHERE 
    -- حالات غير متسقة
    (dp.is_verified = 1 AND dp.approval_status = 'approved' AND d.status != 'active')
    OR (dp.approval_status = 'rejected' AND d.status != 'inactive')
    OR (dp.approval_status = 'suspended' AND d.status != 'suspended')
    OR (dp.is_verified = 0 AND dp.approval_status = 'pending' AND d.status != 'pending_verification');

-- ============================================
-- 13. آخر 10 عمليات تحديث
-- Last 10 update operations
-- ============================================

SELECT 
    aal.id,
    aal.created_at,
    a.email AS admin_email,
    d.email AS doctor_email,
    dpt.full_name AS doctor_name,
    JSON_EXTRACT(aal.old_values, '$.is_verified') AS old_is_verified,
    JSON_EXTRACT(aal.new_values, '$.is_verified') AS new_is_verified,
    JSON_EXTRACT(aal.old_values, '$.approval_status') AS old_approval_status,
    JSON_EXTRACT(aal.new_values, '$.approval_status') AS new_approval_status,
    JSON_EXTRACT(aal.new_values, '$.reason') AS reason
FROM admin_action_logs aal
JOIN admins a ON aal.admin_id = a.id
JOIN doctor_profiles dp ON aal.target_id = dp.id
JOIN doctors d ON dp.doctor_id = d.id
LEFT JOIN doctor_profile_translations dpt ON dp.id = dpt.doctor_profile_id AND dpt.language_code = 'ar'
WHERE aal.action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
ORDER BY aal.created_at DESC
LIMIT 10;

-- ============================================
-- 14. تحديث يدوي للاختبار (استخدم بحذر!)
-- Manual update for testing (use with caution!)
-- ============================================

-- مثال: إعادة تعيين طبيب إلى حالة pending
/*
UPDATE doctor_profiles 
SET 
    is_verified = 0,
    verification_date = NULL,
    verified_by = NULL,
    approval_status = 'pending'
WHERE doctor_id = 1;

UPDATE doctors 
SET status = 'pending_verification'
WHERE id = 1;
*/

-- ============================================
-- 15. حذف سجلات الاختبار (استخدم بحذر!)
-- Delete test logs (use with caution!)
-- ============================================

/*
DELETE FROM admin_action_logs 
WHERE action_type = 'UPDATE_DOCTOR_VERIFICATION_STATUS'
  AND created_at > '2024-01-01';
*/

-- ============================================
-- ملاحظات مهمة / Important Notes
-- ============================================

/*
1. استخدم هذه الاستعلامات للتحقق من صحة عمل API
2. لا تقم بتشغيل استعلامات UPDATE/DELETE في بيئة الإنتاج
3. تأكد من وجود backup قبل أي تعديل يدوي
4. استخدم transactions عند التعديل اليدوي
5. راجع السجلات في admin_action_logs بعد كل عملية
*/

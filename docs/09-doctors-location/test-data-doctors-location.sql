-- ============================================
-- Test Data for Doctors By Location System
-- بيانات اختبار لنظام البحث عن الأطباء حسب الموقع
-- ============================================

-- ============================================
-- 1. إضافة مواقع جغرافية (Countries & Cities)
-- ============================================

-- إضافة السعودية (دولة)
INSERT INTO countries_cities (countries_cities_id, name_ar, name_en, parent_id, level_type) 
VALUES (1, 'المملكة العربية السعودية', 'Saudi Arabia', NULL, 'country');

-- إضافة مدن رئيسية
INSERT INTO countries_cities (countries_cities_id, name_ar, name_en, parent_id, level_type) VALUES
(2, 'الرياض', 'Riyadh', 1, 'city'),
(3, 'جدة', 'Jeddah', 1, 'city'),
(4, 'الدمام', 'Dammam', 1, 'city'),
(5, 'مكة المكرمة', 'Makkah', 1, 'city');

-- إضافة مناطق في الرياض
INSERT INTO countries_cities (countries_cities_id, name_ar, name_en, parent_id, level_type) VALUES
(6, 'العليا', 'Al Olaya', 2, 'region'),
(7, 'الملز', 'Al Malaz', 2, 'region'),
(8, 'النخيل', 'Al Nakheel', 2, 'region');

-- إضافة أحياء في العليا
INSERT INTO countries_cities (countries_cities_id, name_ar, name_en, parent_id, level_type) VALUES
(9, 'حي السفارات', 'Diplomatic Quarter', 6, 'district');

-- ============================================
-- 2. إضافة أطباء للاختبار
-- ============================================

-- طبيب 1: د. أحمد محمد (طب القلب - الرياض)
INSERT INTO doctors (id, uuid, email, phone, password_hash, status, is_active, email_verified_at) VALUES
(100, UUID(), 'ahmed.mohammed@test.com', '+966501111111', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'active', 1, NOW());

INSERT INTO doctor_profiles (doctor_id, license_number, years_of_experience, is_verified, approval_status, rating_average, is_available, gender) VALUES
(100, 'DOC-2024-100', 10, 1, 'approved', 4.50, 1, 'male');

INSERT INTO doctor_profile_translations (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography) VALUES
((SELECT id FROM doctor_profiles WHERE doctor_id = 100), 'ar', 'د. أحمد محمد', 'طب القلب', 'قلب الأطفال', 'استشاري طب القلب مع خبرة 10 سنوات'),
((SELECT id FROM doctor_profiles WHERE doctor_id = 100), 'en', 'Dr. Ahmed Mohammed', 'Cardiology', 'Pediatric Cardiology', 'Cardiology consultant with 10 years experience');

-- إضافة عنوان للطبيب 1 في الرياض
INSERT INTO addresses (id, address_line1, address_line2, postal_code, countries_cities_id, latitude, longitude, type, is_primary) VALUES
(100, '123 شارع الملك فهد', 'مبنى رقم 5، الطابق الثالث', '12345', 2, 24.7136, 46.6753, 'work', 1);

INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type) VALUES
(100, 'Doctor', 100, 100, 'Doctor');

-- ============================================

-- طبيب 2: د. فاطمة علي (طب الأطفال - الرياض - العليا)
INSERT INTO doctors (id, uuid, email, phone, password_hash, status, is_active, email_verified_at) VALUES
(101, UUID(), 'fatima.ali@test.com', '+966502222222', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'active', 1, NOW());

INSERT INTO doctor_profiles (doctor_id, license_number, years_of_experience, is_verified, approval_status, rating_average, is_available, gender) VALUES
(101, 'DOC-2024-101', 8, 1, 'approved', 4.80, 1, 'female');

INSERT INTO doctor_profile_translations (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography) VALUES
((SELECT id FROM doctor_profiles WHERE doctor_id = 101), 'ar', 'د. فاطمة علي', 'طب الأطفال', 'حديثي الولادة', 'استشارية طب الأطفال مع خبرة 8 سنوات'),
((SELECT id FROM doctor_profiles WHERE doctor_id = 101), 'en', 'Dr. Fatima Ali', 'Pediatrics', 'Neonatology', 'Pediatrics consultant with 8 years experience');

-- إضافة عنوان للطبيب 2 في العليا
INSERT INTO addresses (id, address_line1, address_line2, postal_code, countries_cities_id, latitude, longitude, type, is_primary) VALUES
(101, '456 شارع العليا', 'برج العليا، الطابق الخامس', '11564', 6, 24.7500, 46.7000, 'work', 1);

INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type) VALUES
(101, 'Doctor', 101, 101, 'Doctor');

-- ============================================

-- طبيب 3: د. محمد خالد (طب العيون - جدة)
INSERT INTO doctors (id, uuid, email, phone, password_hash, status, is_active, email_verified_at) VALUES
(102, UUID(), 'mohammed.khaled@test.com', '+966503333333', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'active', 1, NOW());

INSERT INTO doctor_profiles (doctor_id, license_number, years_of_experience, is_verified, approval_status, rating_average, is_available, gender) VALUES
(102, 'DOC-2024-102', 15, 1, 'approved', 4.90, 1, 'male');

INSERT INTO doctor_profile_translations (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography) VALUES
((SELECT id FROM doctor_profiles WHERE doctor_id = 102), 'ar', 'د. محمد خالد', 'طب العيون', 'جراحة العيون', 'استشاري طب العيون مع خبرة 15 سنة'),
((SELECT id FROM doctor_profiles WHERE doctor_id = 102), 'en', 'Dr. Mohammed Khaled', 'Ophthalmology', 'Eye Surgery', 'Ophthalmology consultant with 15 years experience');

-- إضافة عنوان للطبيب 3 في جدة
INSERT INTO addresses (id, address_line1, address_line2, postal_code, countries_cities_id, latitude, longitude, type, is_primary) VALUES
(102, '789 شارع الأمير محمد', 'مركز جدة الطبي', '23456', 3, 21.5433, 39.1728, 'work', 1);

INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type) VALUES
(102, 'Doctor', 102, 102, 'Doctor');

-- ============================================

-- طبيب 4: د. سارة أحمد (طب النساء - الرياض) - بدون تحقق
INSERT INTO doctors (id, uuid, email, phone, password_hash, status, is_active) VALUES
(103, UUID(), 'sara.ahmed@test.com', '+966504444444', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'active', 1);

INSERT INTO doctor_profiles (doctor_id, license_number, years_of_experience, is_verified, approval_status, rating_average, is_available, gender) VALUES
(103, 'DOC-2024-103', 5, 0, 'pending', 0.00, 1, 'female');

INSERT INTO doctor_profile_translations (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography) VALUES
((SELECT id FROM doctor_profiles WHERE doctor_id = 103), 'ar', 'د. سارة أحمد', 'طب النساء والولادة', 'الحمل عالي الخطورة', 'طبيبة نساء وولادة مع خبرة 5 سنوات'),
((SELECT id FROM doctor_profiles WHERE doctor_id = 103), 'en', 'Dr. Sara Ahmed', 'Obstetrics & Gynecology', 'High-Risk Pregnancy', 'OB/GYN with 5 years experience');

-- إضافة عنوان للطبيب 4 في الرياض
INSERT INTO addresses (id, address_line1, address_line2, postal_code, countries_cities_id, latitude, longitude, type, is_primary) VALUES
(103, '321 شارع الملز', 'عيادة الملز الطبية', '11632', 7, 24.6800, 46.7200, 'work', 1);

INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type) VALUES
(103, 'Doctor', 103, 103, 'Doctor');

-- ============================================

-- طبيب 5: د. عبدالله حسن (طب الأسنان - الدمام)
INSERT INTO doctors (id, uuid, email, phone, password_hash, status, is_active, email_verified_at) VALUES
(104, UUID(), 'abdullah.hassan@test.com', '+966505555555', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'active', 1, NOW());

INSERT INTO doctor_profiles (doctor_id, license_number, years_of_experience, is_verified, approval_status, rating_average, is_available, gender) VALUES
(104, 'DOC-2024-104', 12, 1, 'approved', 4.70, 1, 'male');

INSERT INTO doctor_profile_translations (doctor_profile_id, language_code, full_name, specialty, sub_specialty, biography) VALUES
((SELECT id FROM doctor_profiles WHERE doctor_id = 104), 'ar', 'د. عبدالله حسن', 'طب الأسنان', 'تقويم الأسنان', 'استشاري طب الأسنان مع خبرة 12 سنة'),
((SELECT id FROM doctor_profiles WHERE doctor_id = 104), 'en', 'Dr. Abdullah Hassan', 'Dentistry', 'Orthodontics', 'Dentistry consultant with 12 years experience');

-- إضافة عنوان للطبيب 5 في الدمام
INSERT INTO addresses (id, address_line1, address_line2, postal_code, countries_cities_id, latitude, longitude, type, is_primary) VALUES
(104, '555 شارع الملك عبدالعزيز', 'مجمع الدمام الطبي', '31952', 4, 26.4207, 50.0888, 'work', 1);

INSERT INTO addressable (address_id, addressable_type, addressable_id, creator_id, creator_type) VALUES
(104, 'Doctor', 104, 104, 'Doctor');

-- ============================================
-- 3. استعلامات اختبار
-- ============================================

-- اختبار 1: عرض جميع الأطباء في الرياض
SELECT 
  d.id, d.email, 
  dpt.full_name, dpt.specialty,
  a.address_line1,
  cc.name_ar as location
FROM doctors d
INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = 'ar'
INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
INNER JOIN addresses a ON a.id = ad.address_id
LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
WHERE a.countries_cities_id = 2
AND d.is_active = 1
AND d.status = 'active';

-- اختبار 2: عرض الأطباء في الرياض والمناطق التابعة لها
SELECT 
  d.id, d.email, 
  dpt.full_name, dpt.specialty,
  cc.name_ar as location,
  cc.level_type
FROM doctors d
INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = 'ar'
INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
INNER JOIN addresses a ON a.id = ad.address_id
LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
WHERE a.countries_cities_id IN (2, 6, 7, 8, 9)  -- الرياض ومناطقها
AND d.is_active = 1
AND d.status = 'active';

-- اختبار 3: عدد الأطباء في كل مدينة
SELECT 
  cc.name_ar as city,
  COUNT(DISTINCT d.id) as doctors_count
FROM countries_cities cc
INNER JOIN addresses a ON a.countries_cities_id = cc.countries_cities_id
INNER JOIN addressable ad ON ad.address_id = a.id AND ad.addressable_type = 'Doctor'
INNER JOIN doctors d ON d.id = ad.addressable_id
WHERE cc.level_type = 'city'
AND d.is_active = 1
AND d.status = 'active'
GROUP BY cc.countries_cities_id, cc.name_ar
ORDER BY doctors_count DESC;

-- اختبار 4: البحث عن أطباء القلب
SELECT 
  d.id, d.email, 
  dpt.full_name, dpt.specialty,
  dp.years_of_experience,
  cc.name_ar as location
FROM doctors d
INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = 'ar'
INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
INNER JOIN addresses a ON a.id = ad.address_id
LEFT JOIN countries_cities cc ON a.countries_cities_id = cc.countries_cities_id
WHERE dpt.specialty LIKE '%قلب%'
AND d.is_active = 1
AND d.status = 'active';

-- اختبار 5: الأطباء القريبين من نقطة معينة (الرياض)
-- استخدام معادلة Haversine
SELECT 
  d.id, d.email, 
  dpt.full_name, dpt.specialty,
  a.address_line1,
  a.latitude, a.longitude,
  (6371 * acos(
    LEAST(1.0, 
      GREATEST(-1.0,
        cos(radians(24.7136)) * 
        cos(radians(a.latitude)) * 
        cos(radians(a.longitude) - radians(46.6753)) + 
        sin(radians(24.7136)) * 
        sin(radians(a.latitude))
      )
    )
  )) as distance_km
FROM doctors d
INNER JOIN doctor_profiles dp ON dp.doctor_id = d.id
LEFT JOIN doctor_profile_translations dpt ON dpt.doctor_profile_id = dp.id AND dpt.language_code = 'ar'
INNER JOIN addressable ad ON ad.addressable_id = d.id AND ad.addressable_type = 'Doctor'
INNER JOIN addresses a ON a.id = ad.address_id
WHERE a.latitude IS NOT NULL 
AND a.longitude IS NOT NULL
AND d.is_active = 1
AND d.status = 'active'
HAVING distance_km <= 10
ORDER BY distance_km ASC;

-- ============================================
-- 4. تنظيف البيانات (إذا لزم الأمر)
-- ============================================

-- حذف بيانات الاختبار
/*
DELETE FROM addressable WHERE addressable_id IN (100, 101, 102, 103, 104) AND addressable_type = 'Doctor';
DELETE FROM addresses WHERE id IN (100, 101, 102, 103, 104);
DELETE FROM doctor_profile_translations WHERE doctor_profile_id IN (SELECT id FROM doctor_profiles WHERE doctor_id IN (100, 101, 102, 103, 104));
DELETE FROM doctor_profiles WHERE doctor_id IN (100, 101, 102, 103, 104);
DELETE FROM doctors WHERE id IN (100, 101, 102, 103, 104);
DELETE FROM countries_cities WHERE countries_cities_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9);
*/

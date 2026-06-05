/**
 * Test Script for Doctors By Location APIs
 * سكريبت اختبار لـ APIs البحث عن الأطباء حسب الموقع
 * 
 * Usage:
 * node docs/test-doctors-location.js
 */

const BASE_URL = 'http://localhost:3006/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function makeRequest(method, endpoint, body = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    log(`${method} ${endpoint}`, 'blue');
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log('✓ Success', 'green');
      return { success: true, data, status: response.status };
    } else {
      log(`✗ Failed (${response.status})`, 'red');
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testCompleteFlow() {
  logSection('🧪 اختبار التدفق الكامل - Complete Flow Test');

  // Test data
  const testDoctor = {
    email: `test.doctor.${Date.now()}@example.com`,
    phone: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: 'Test@123456',
    license_number: `DOC-TEST-${Date.now()}`,
    years_of_experience: 10,
    full_name_ar: 'د. اختبار النظام',
    full_name_en: 'Dr. Test System',
    specialty_ar: 'طب القلب',
    specialty_en: 'Cardiology'
  };

  let doctorToken = null;
  let addressId = null;

  // Step 1: Register Doctor
  logSection('الخطوة 1: تسجيل طبيب جديد');
  const registerResult = await makeRequest('POST', '/auth-doctor/register', testDoctor);
  
  if (!registerResult.success) {
    log('فشل تسجيل الطبيب. توقف الاختبار.', 'red');
    return;
  }
  
  log(`تم تسجيل الطبيب: ${testDoctor.email}`, 'green');

  // Step 2: Login
  logSection('الخطوة 2: تسجيل الدخول');
  const loginResult = await makeRequest('POST', '/auth-doctor/login', {
    email: testDoctor.email,
    password: testDoctor.password
  });

  if (!loginResult.success || !loginResult.data.token) {
    log('فشل تسجيل الدخول. توقف الاختبار.', 'red');
    return;
  }

  doctorToken = loginResult.data.token;
  log('تم تسجيل الدخول بنجاح', 'green');
  log(`Token: ${doctorToken.substring(0, 20)}...`, 'yellow');

  // Step 3: Add Address
  logSection('الخطوة 3: إضافة عنوان');
  const addressData = {
    address_line1: '123 شارع الملك فهد - اختبار',
    address_line2: 'مبنى الاختبار',
    postal_code: '12345',
    countries_cities_id: 2, // الرياض
    latitude: 24.7136,
    longitude: 46.6753,
    type: 'work',
    is_primary: true
  };

  const addressResult = await makeRequest('POST', '/addresses', addressData, doctorToken);

  if (!addressResult.success) {
    log('فشل إضافة العنوان. توقف الاختبار.', 'red');
    return;
  }

  addressId = addressResult.data.id;
  log(`تم إضافة العنوان بنجاح - ID: ${addressId}`, 'green');

  // Step 4: Get All Addresses
  logSection('الخطوة 4: جلب جميع العناوين');
  const addressesResult = await makeRequest('GET', '/addresses', null, doctorToken);
  
  if (addressesResult.success) {
    log(`عدد العناوين: ${addressesResult.data.count}`, 'green');
  }

  // Step 5: Search for Doctor by Location
  logSection('الخطوة 5: البحث عن الطبيب حسب الموقع');
  
  // Wait a bit to ensure data is committed
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const searchResult = await makeRequest('GET', '/doctors-by-location?countries_cities_id=2&lang=ar');

  if (searchResult.success) {
    const doctors = searchResult.data.data.doctors;
    const foundDoctor = doctors.find(d => d.email === testDoctor.email);
    
    if (foundDoctor) {
      log('✓ تم العثور على الطبيب في نتائج البحث!', 'green');
      log(`الاسم: ${foundDoctor.full_name || 'غير متوفر'}`, 'yellow');
      log(`التخصص: ${foundDoctor.specialty || 'غير متوفر'}`, 'yellow');
      log(`العنوان: ${foundDoctor.address_line1}`, 'yellow');
    } else {
      log('✗ لم يتم العثور على الطبيب في نتائج البحث', 'red');
      log(`إجمالي الأطباء في النتائج: ${doctors.length}`, 'yellow');
    }
  }

  // Step 6: Test Other Search APIs
  logSection('الخطوة 6: اختبار APIs البحث الأخرى');

  // Count
  log('\n📊 عدد الأطباء في الرياض:', 'cyan');
  const countResult = await makeRequest('GET', '/doctors-by-location/count?countries_cities_id=2');
  if (countResult.success) {
    log(`العدد: ${countResult.data.data.total_doctors}`, 'green');
  }

  // Grouped
  log('\n📊 الأطباء مجمعين حسب المدن:', 'cyan');
  const groupedResult = await makeRequest('GET', '/doctors-by-location/grouped?level_type=city&lang=ar');
  if (groupedResult.success) {
    const locations = groupedResult.data.data.locations;
    log(`عدد المواقع: ${locations.length}`, 'green');
    locations.slice(0, 3).forEach(loc => {
      log(`  - ${loc.location_name}: ${loc.doctors_count} طبيب`, 'yellow');
    });
  }

  // Nearby (GPS)
  log('\n📍 البحث باستخدام GPS (10 كم من الرياض):', 'cyan');
  const nearbyResult = await makeRequest('GET', '/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=10&lang=ar');
  if (nearbyResult.success) {
    log(`عدد الأطباء القريبين: ${nearbyResult.data.data.pagination.total_doctors}`, 'green');
  }

  // Advanced Search
  log('\n🔍 البحث المتقدم (أطباء القلب):', 'cyan');
  const advancedResult = await makeRequest('GET', '/doctors-by-location/search?countries_cities_id=2&specialization=قلب&sort_by=rating&lang=ar');
  if (advancedResult.success) {
    log(`عدد النتائج: ${advancedResult.data.data.pagination.total_doctors}`, 'green');
  }

  // Cleanup
  logSection('🧹 التنظيف - Cleanup');
  log('يمكنك حذف بيانات الاختبار يدوياً من قاعدة البيانات', 'yellow');
  log(`Email: ${testDoctor.email}`, 'yellow');
  log(`Address ID: ${addressId}`, 'yellow');

  logSection('✅ اكتمل الاختبار - Test Completed');
}

async function testPublicAPIs() {
  logSection('🌐 اختبار APIs العامة - Public APIs Test');

  // Test 1: Get doctors by location
  log('\n1️⃣ البحث عن أطباء في الرياض:', 'cyan');
  const result1 = await makeRequest('GET', '/doctors-by-location?countries_cities_id=2&page=1&limit=5&lang=ar');
  if (result1.success) {
    const total = result1.data.data.pagination.total_doctors;
    log(`✓ تم العثور على ${total} طبيب`, 'green');
  }

  // Test 2: Count doctors
  log('\n2️⃣ عدد الأطباء:', 'cyan');
  const result2 = await makeRequest('GET', '/doctors-by-location/count?countries_cities_id=2');
  if (result2.success) {
    log(`✓ العدد: ${result2.data.data.total_doctors}`, 'green');
  }

  // Test 3: Grouped by location
  log('\n3️⃣ الأطباء مجمعين:', 'cyan');
  const result3 = await makeRequest('GET', '/doctors-by-location/grouped?level_type=city&lang=ar');
  if (result3.success) {
    log(`✓ عدد المواقع: ${result3.data.data.locations.length}`, 'green');
  }

  // Test 4: Search with filters
  log('\n4️⃣ البحث المتقدم:', 'cyan');
  const result4 = await makeRequest('GET', '/doctors-by-location/search?countries_cities_id=2&sort_by=rating&order=desc&lang=ar');
  if (result4.success) {
    log(`✓ عدد النتائج: ${result4.data.data.pagination.total_doctors}`, 'green');
  }

  // Test 5: Nearby doctors
  log('\n5️⃣ البحث باستخدام GPS:', 'cyan');
  const result5 = await makeRequest('GET', '/doctors-by-location/nearby?latitude=24.7136&longitude=46.6753&radius=10&lang=ar');
  if (result5.success) {
    log(`✓ عدد الأطباء القريبين: ${result5.data.data.pagination.total_doctors}`, 'green');
  }

  logSection('✅ اكتمل اختبار APIs العامة');
}

// Main execution
async function main() {
  console.clear();
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     اختبار نظام البحث عن الأطباء حسب الموقع              ║', 'cyan');
  log('║     Doctors By Location System Test                       ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  const args = process.argv.slice(2);
  const testType = args[0] || 'full';

  if (testType === 'public') {
    await testPublicAPIs();
  } else if (testType === 'full') {
    await testCompleteFlow();
  } else {
    log('Usage:', 'yellow');
    log('  node docs/test-doctors-location.js [full|public]', 'yellow');
    log('  full   - اختبار كامل (تسجيل + عنوان + بحث)', 'yellow');
    log('  public - اختبار APIs العامة فقط', 'yellow');
  }
}

// Run tests
main().catch(error => {
  log(`\n✗ خطأ غير متوقع: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

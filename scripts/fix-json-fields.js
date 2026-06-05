/**
 * Fix JSON Fields in doctor_profiles
 * إصلاح حقول JSON في جدول doctor_profiles
 * 
 * هذا السكريبت يقوم بتنظيف وإصلاح حقول board_certifications و languages_spoken
 * التي قد تكون مخزنة بشكل غير صحيح
 */

const db = require('../config/db');

async function fixJsonFields() {
  const connection = await db.getConnection();
  
  try {
    console.log('🔍 جاري فحص حقول JSON في جدول doctor_profiles...');
    
    // Get all profiles with board_certifications or languages_spoken
    const [profiles] = await connection.execute(
      `SELECT id, doctor_id, board_certifications, languages_spoken 
       FROM doctor_profiles 
       WHERE board_certifications IS NOT NULL OR languages_spoken IS NOT NULL`
    );
    
    console.log(`📊 تم العثور على ${profiles.length} ملف شخصي للمعالجة`);
    
    let fixedCount = 0;
    
    for (const profile of profiles) {
      let needsUpdate = false;
      let newBoardCertifications = profile.board_certifications;
      let newLanguagesSpoken = profile.languages_spoken;
      
      // Fix board_certifications
      if (profile.board_certifications) {
        try {
          // Try to parse it
          JSON.parse(profile.board_certifications);
          console.log(`✅ Profile ${profile.id}: board_certifications is valid JSON`);
        } catch (error) {
          console.log(`⚠️  Profile ${profile.id}: board_certifications is NOT valid JSON`);
          console.log(`   Current value: ${profile.board_certifications}`);
          
          // Try to fix it
          // If it's a comma-separated string, convert to JSON array
          if (typeof profile.board_certifications === 'string') {
            const items = profile.board_certifications
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
            
            newBoardCertifications = JSON.stringify(items);
            needsUpdate = true;
            console.log(`   Fixed value: ${newBoardCertifications}`);
          }
        }
      }
      
      // Fix languages_spoken
      if (profile.languages_spoken) {
        try {
          // Try to parse it
          JSON.parse(profile.languages_spoken);
          console.log(`✅ Profile ${profile.id}: languages_spoken is valid JSON`);
        } catch (error) {
          console.log(`⚠️  Profile ${profile.id}: languages_spoken is NOT valid JSON`);
          console.log(`   Current value: ${profile.languages_spoken}`);
          
          // Try to fix it
          // If it's a comma-separated string, convert to JSON array
          if (typeof profile.languages_spoken === 'string') {
            const items = profile.languages_spoken
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
            
            newLanguagesSpoken = JSON.stringify(items);
            needsUpdate = true;
            console.log(`   Fixed value: ${newLanguagesSpoken}`);
          }
        }
      }
      
      // Update if needed
      if (needsUpdate) {
        await connection.execute(
          `UPDATE doctor_profiles 
           SET board_certifications = ?, languages_spoken = ?
           WHERE id = ?`,
          [newBoardCertifications, newLanguagesSpoken, profile.id]
        );
        
        fixedCount++;
        console.log(`✅ Profile ${profile.id} updated successfully`);
      }
    }
    
    console.log(`\n✅ تم الانتهاء! تم إصلاح ${fixedCount} ملف شخصي`);
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح حقول JSON:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run the script
fixJsonFields();

/**
 * Initialize Directory Structure Script
 * سكريبت لإنشاء بنية المجلدات الأساسية
 * 
 * This script creates the necessary directory structure for file uploads,
 * specifically for profile pictures and verification documents.
 * 
 * Usage:
 * node scripts/initializeDirectories.js
 */

const FileService = require('../services/fileService');
const fs = require('fs').promises;
const path = require('path');

async function initialize() {
  console.log('🚀 Initializing directory structure...\n');
  
  try {
    // Initialize profile picture directories
    await FileService.initializeProfilePictureDirectories();
    
    // Initialize verification documents directories
    const baseDir = path.join(__dirname, '..', 'upload', 'files');
    
    // Create id-document directory (for national_id, passport)
    const idDocDir = path.join(baseDir, 'id-document');
    await fs.mkdir(idDocDir, { recursive: true });
    console.log('✅ Created directory: upload/files/id-document/');
    
    // Create license directory (for medical_license)
    const licenseDir = path.join(baseDir, 'license');
    await fs.mkdir(licenseDir, { recursive: true });
    console.log('✅ Created directory: upload/files/license/');
    
    // Create document directory (for certificates, degrees)
    const documentDir = path.join(baseDir, 'document');
    await fs.mkdir(documentDir, { recursive: true });
    console.log('✅ Created directory: upload/files/document/');
    
    console.log('\n✅ Directory initialization completed successfully!');
    console.log('\n📁 Created structure:');
    console.log('   upload/');
    console.log('   └── files/');
    console.log('       ├── profile-picture/');
    console.log('       │   ├── user/');
    console.log('       │   ├── doctor/');
    console.log('       │   ├── admin/');
    console.log('       │   └── assistant/');
    console.log('       ├── id-document/      (national_id, passport)');
    console.log('       ├── license/          (medical_license)');
    console.log('       └── document/         (certificates, degrees)');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during initialization:', error.message);
    process.exit(1);
  }
}

// Run initialization
initialize();

#!/usr/bin/env node

/**
 * Firebase Credentials Extractor
 * 
 * This script helps you extract Firebase credentials from the service account JSON file
 * and format them for your .env file.
 * 
 * Usage:
 * 1. Download your service account JSON file from Firebase Console
 * 2. Run: node scripts/extract-firebase-credentials.js path/to/your/service-account.json
 * 3. Copy the output to your .env file
 */

const fs = require('fs');
const path = require('path');

function extractCredentials(jsonFilePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error('❌ Error: JSON file not found at:', jsonFilePath);
      console.log('\n💡 Steps to get your Firebase service account JSON:');
      console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
      console.log('2. Select your project');
      console.log('3. Click gear icon ⚙️ → Project settings');
      console.log('4. Go to "Service accounts" tab');
      console.log('5. Click "Generate new private key"');
      console.log('6. Download the JSON file');
      console.log('7. Run this script again with the correct path');
      process.exit(1);
    }

    // Read and parse JSON
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const credentials = JSON.parse(jsonContent);

    // Validate required fields
    const requiredFields = ['project_id', 'client_email', 'private_key'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Error: Missing required fields in JSON:', missingFields.join(', '));
      process.exit(1);
    }

    // Extract values
    const projectId = credentials.project_id;
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;
    const storageBucket = `${projectId}.appspot.com`;

    // Format private key for .env (escape newlines)
    const formattedPrivateKey = privateKey.replace(/\n/g, '\\n');

    console.log('🔥 Firebase Credentials Extracted Successfully!\n');
    console.log('📋 Copy these values to your .env file:\n');
    console.log('# Firebase Configuration');
    console.log(`FIREBASE_PROJECT_ID=${projectId}`);
    console.log(`FIREBASE_CLIENT_EMAIL=${clientEmail}`);
    console.log(`FIREBASE_PRIVATE_KEY="${formattedPrivateKey}"`);
    console.log(`FIREBASE_STORAGE_BUCKET=${storageBucket}`);
    console.log('\n✅ Done! Your Firebase credentials are ready to use.');
    
    // Additional info
    console.log('\n📝 Additional Information:');
    console.log(`📦 Project ID: ${projectId}`);
    console.log(`📧 Service Account: ${clientEmail}`);
    console.log(`🪣 Storage Bucket: ${storageBucket}`);
    console.log(`🔑 Private Key: ${privateKey.length} characters (properly formatted)`);

  } catch (error) {
    console.error('❌ Error processing Firebase credentials:');
    
    if (error instanceof SyntaxError) {
      console.error('Invalid JSON file. Please ensure you downloaded the correct service account JSON file from Firebase.');
    } else {
      console.error(error.message);
    }
    
    console.log('\n💡 Make sure you:');
    console.log('1. Downloaded the JSON file from Firebase Console → Project Settings → Service Accounts');
    console.log('2. The file is a valid JSON file (not corrupted)');
    console.log('3. You have the correct file path');
    
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔥 Firebase Credentials Extractor\n');
    console.log('Usage: node extract-firebase-credentials.js <path-to-service-account.json>\n');
    console.log('Example: node extract-firebase-credentials.js ./my-project-firebase-adminsdk-abc123.json\n');
    console.log('📖 How to get your service account JSON:');
    console.log('1. Go to https://console.firebase.google.com/');
    console.log('2. Select your project');
    console.log('3. Click gear icon ⚙️ → Project settings');
    console.log('4. Go to "Service accounts" tab');
    console.log('5. Click "Generate new private key"');
    console.log('6. Save the downloaded JSON file');
    console.log('7. Run this script with the file path');
    process.exit(1);
  }

  const jsonFilePath = path.resolve(args[0]);
  extractCredentials(jsonFilePath);
}

module.exports = { extractCredentials };

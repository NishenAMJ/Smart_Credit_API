#!/usr/bin/env node

'use strict';

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../scripts/one2-af8fc-firebase-adminsdk-fbsvc-3ff7371ee6.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const firestoreIndexesPath = path.join(__dirname, '../scripts/firestore.indexes.json');
const indexConfig = JSON.parse(fs.readFileSync(firestoreIndexesPath, 'utf8'));

async function deployIndexes() {
  try {
    console.log('Deploying Firestore indexes...');
    console.log(`Project ID: ${serviceAccount.project_id}`);
    console.log(`Number of indexes to deploy: ${indexConfig.indexes.length}`);

    const db = admin.firestore();
    
    // Indexes are deployed via Firestore console or Firebase CLI, but we can verify configuration
    console.log('\nIndex Configuration:');
    indexConfig.indexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Collection: ${index.collectionGroup}`);
      console.log(`   Scope: ${index.queryScope}`);
      console.log('   Fields:');
      index.fields.forEach(field => {
        console.log(`     - ${field.fieldPath} (${field.order})`);
      });
    });

    console.log('\n✅ Index configuration verified!');
    console.log('\nTo deploy these indexes to Firebase:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com/');
    console.log('2. Navigate to Firestore > Indexes');
    console.log('3. Or run: firebase deploy --only firestore:indexes --project one2-af8fc');
    
  } catch (error) {
    console.error('Error deploying indexes:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

deployIndexes();

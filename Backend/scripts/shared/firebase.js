'use strict';

const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');
const admin = require('firebase-admin');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

dotenv.config({ path: path.resolve(BACKEND_ROOT, '.env') });

function resolveServiceAccountPath() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidateNames = [
    explicitPath,
    'firebase-service-account.json',
    'your-service-account-key.json',
    'service-account.json',
    'serviceAccountKey.json',
  ].filter(Boolean);

  const candidateDirs = [
    process.cwd(),
    BACKEND_ROOT,
    PROJECT_ROOT,
  ];

  for (const dir of candidateDirs) {
    for (const fileName of candidateNames) {
      const fullPath = path.isAbsolute(fileName)
        ? fileName
        : path.resolve(dir, fileName);

      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  throw new Error('Firebase service account file was not found.');
}

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectIdFromEnv = process.env.FIREBASE_PROJECT_ID;
  const clientEmailFromEnv = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyFromEnv = process.env.FIREBASE_PRIVATE_KEY;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId =
      projectIdFromEnv ||
      serviceAccount.project_id ||
      serviceAccount.projectId;

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
  }

  if (projectIdFromEnv && clientEmailFromEnv && privateKeyFromEnv) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectIdFromEnv,
        clientEmail: clientEmailFromEnv,
        privateKey: privateKeyFromEnv.replace(/\\n/g, '\n'),
      }),
      projectId: projectIdFromEnv,
    });
  }

  const serviceAccountPath = resolveServiceAccountPath();
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const projectId =
    projectIdFromEnv ||
    serviceAccount.project_id ||
    serviceAccount.projectId;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(projectId ? { projectId } : {}),
  });
}

function getDb() {
  initializeFirebase();
  return admin.firestore();
}

module.exports = {
  admin,
  getDb,
  initializeFirebase,
};

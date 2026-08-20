'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const dotenv = require('dotenv');
const admin = require('firebase-admin');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');

dotenv.config({ path: path.resolve(BACKEND_ROOT, '.env') });

function expandUserPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function parseServiceAccountJson(rawJson) {
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Verify the .env value and escaping.',
    );
  }

  if (!parsed?.client_email || !parsed?.private_key) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON must include client_email and private_key fields.',
    );
  }

  return parsed;
}

function readServiceAccountFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed?.client_email || !parsed?.private_key) {
      throw new Error('missing client_email/private_key fields');
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to read Firebase service account from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function resolveServiceAccountPath() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();

  if (explicitPath) {
    const expanded = expandUserPath(explicitPath);
    const absolutePath = path.isAbsolute(expanded)
      ? expanded
      : path.resolve(BACKEND_ROOT, expanded);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH is set but the file was not found at ${absolutePath}.`,
      );
    }

    return absolutePath;
  }

  const candidateNames = [
    'firebase-service-account.json',
    'your-service-account-key.json',
    'service-account.json',
    'serviceAccountKey.json',
  ];

  const candidateDirs = [
    process.cwd(),
    BACKEND_ROOT,
    PROJECT_ROOT,
  ];

  const attemptedPaths = [];

  for (const dir of candidateDirs) {
    for (const fileName of candidateNames) {
      const fullPath = path.resolve(dir, fileName);
      attemptedPaths.push(fullPath);

      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  throw new Error(
    [
      'Firebase credentials were not found.',
      'Set one of the following in Backend/.env:',
      '- FIREBASE_SERVICE_ACCOUNT_JSON',
      '- FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
      '- FIREBASE_SERVICE_ACCOUNT_PATH (absolute path recommended)',
      `Paths checked: ${attemptedPaths.join(', ')}`,
    ].join('\n'),
  );
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
    const serviceAccount = parseServiceAccountJson(serviceAccountJson);
    const projectId =
      projectIdFromEnv ||
      serviceAccount.project_id ||
      serviceAccount.projectId;

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
  }

  const hasInlineServiceAccountFields =
    Boolean(clientEmailFromEnv) || Boolean(privateKeyFromEnv);
  if (
    hasInlineServiceAccountFields &&
    !(projectIdFromEnv && clientEmailFromEnv && privateKeyFromEnv)
  ) {
    throw new Error(
      'Inline Firebase credentials are incomplete. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY together, or use FIREBASE_SERVICE_ACCOUNT_PATH/FIREBASE_SERVICE_ACCOUNT_JSON.',
    );
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
  const serviceAccount = readServiceAccountFile(serviceAccountPath);
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

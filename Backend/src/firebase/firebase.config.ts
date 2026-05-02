import { ServiceAccount } from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

function loadEnvFiles(): void {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'Backend', '.env'),
    path.resolve(__dirname, '../../.env'),
  ];

  candidates.forEach((candidate) => {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  });
}

loadEnvFiles();

function parseEnvServiceAccount(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function parseServiceAccountJson(): ServiceAccount | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    return null;
  }

  return JSON.parse(serviceAccountJson) as ServiceAccount;
}

function resolveServiceAccountPath(): string {
  const explicitPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const candidateNames = [
    explicitPath,
    'firebase-service-account.json',
    'your-service-account-key.json',
    'service-account.json',
    'serviceAccountKey.json',
  ].filter(Boolean) as string[];
  const candidateDirs = [process.cwd(), path.resolve(__dirname, '../../')];

  for (const dir of candidateDirs) {
    for (const fileName of candidateNames) {
      const fullPath = path.isAbsolute(fileName)
        ? fileName
        : path.resolve(dir, fileName);

      if (fs.existsSync(fullPath)) {
        console.log('Firebase service account found at: ' + fullPath);
        return fullPath;
      }
    }
  }

  throw new Error(
    'Firebase service account not found. Tried: ' + candidateNames.join(', '),
  );
}

function loadFirebaseConfig(): ServiceAccount {
  const serviceAccountFromEnv = parseEnvServiceAccount();

  if (serviceAccountFromEnv) {
    return serviceAccountFromEnv;
  }

  const serviceAccountFromJson = parseServiceAccountJson();

  if (serviceAccountFromJson) {
    return serviceAccountFromJson;
  }

  try {
    const serviceAccountPath = resolveServiceAccountPath();
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount;
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : 'Failed to load Firebase service account.',
    );

    return {
      projectId: process.env.FIREBASE_PROJECT_ID || 'undefined',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'undefined',
      privateKey:
        process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'undefined',
    };
  }
}

export const firebaseConfig = loadFirebaseConfig();

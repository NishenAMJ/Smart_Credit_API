import { ServiceAccount } from 'firebase-admin/app';
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

function resolveServiceAccountPath(): string | null {
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

  return null;
}

export function isFirebaseEmulatorEnabled(): boolean {
  return Boolean(
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.STORAGE_EMULATOR_HOST,
  );
}

export function getFirebaseProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    'smart-credit-test'
  );
}

export function loadFirebaseConfig(): ServiceAccount | null {
  const serviceAccountFromEnv = parseEnvServiceAccount();

  if (serviceAccountFromEnv) {
    return serviceAccountFromEnv;
  }

  const serviceAccountFromJson = parseServiceAccountJson();

  if (serviceAccountFromJson) {
    return serviceAccountFromJson;
  }

  const serviceAccountPath = resolveServiceAccountPath();
  if (serviceAccountPath) {
    return JSON.parse(
      fs.readFileSync(serviceAccountPath, 'utf8'),
    ) as ServiceAccount;
  }

  // Cloud Run should normally authenticate through its attached service
  // identity (Application Default Credentials), not a private-key file.
  return null;
}

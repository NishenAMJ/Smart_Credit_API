import { ServiceAccount } from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const configuredServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// Resolve the service account from environment first, then local defaults.
let absolutePath: string;

const candidateFiles = configuredServiceAccountPath
  ? [configuredServiceAccountPath]
  : ['./firebase-service-account.json', './firebase-service-account1.json'];

let candidates = candidateFiles.flatMap((serviceAccountPath) => [
  path.resolve(process.cwd(), serviceAccountPath),
  path.resolve(__dirname, '../../', serviceAccountPath),
  serviceAccountPath,
]);

absolutePath = candidates[0];
let fileFound = false;

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    absolutePath = candidate;
    fileFound = true;
    console.log(`Firebase service account found at: ${candidate}`);
    break;
  }
}

if (!fileFound) {
  console.warn(
    `Firebase service account not found. Tried: ${candidates.join(', ')}`,
  );
}

let firebaseConfig: ServiceAccount;

try {
  const serviceAccountJson = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(serviceAccountJson);
  console.log('Firebase JSON parsed successfully');
  console.log(`  - project_id: ${parsed.project_id}`);
  console.log(`  - client_email: ${parsed.client_email}`);
  console.log(`  - type: ${parsed.type}`);

  firebaseConfig = parsed as ServiceAccount;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `Failed to load Firebase service account from ${absolutePath}:`,
    message,
  );
  // Environment fallback keeps configuration explicit for deployed systems.
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'undefined',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'undefined',
    privateKey:
      process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'undefined',
  };
}

export { firebaseConfig };

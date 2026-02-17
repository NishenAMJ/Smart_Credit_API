import { ServiceAccount } from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './firebase-service-account.json';

// Try multiple path resolutions
let absolutePath: string;

// First try: relative to current working directory
let candidates = [
  path.resolve(process.cwd(), serviceAccountPath),
  // Second try: relative to this file's directory (dist folder after build)
  path.resolve(__dirname, '../../', serviceAccountPath),
  // Third try: absolute path if provided
  serviceAccountPath,
];

absolutePath = candidates[0]; // default
let fileFound = false;

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    absolutePath = candidate;
    fileFound = true;
    console.log(`✓ Firebase service account found at: ${candidate}`);
    break;
  }
}

if (!fileFound) {
  console.warn(
    `⚠ Firebase service account not found. Tried: ${candidates.join(', ')}`,
  );
}

let firebaseConfig: ServiceAccount;

try {
  const serviceAccountJson = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(serviceAccountJson);
  console.log(`✓ Firebase JSON parsed successfully`);
  console.log(`  - project_id: ${parsed.project_id}`);
  console.log(`  - client_email: ${parsed.client_email}`);
  console.log(`  - type: ${parsed.type}`);

  firebaseConfig = parsed as ServiceAccount;
} catch (error) {
  console.error(
    `✗ Failed to load Firebase service account from ${absolutePath}:`,
    error.message,
  );
  // Fallback configuration (will fail at runtime if not replaced)
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'undefined',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'undefined',
    privateKey:
      process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 'undefined',
  };
}

export { firebaseConfig };

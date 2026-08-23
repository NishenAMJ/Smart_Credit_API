process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'smart-credit-isolated-e2e-secret';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'smart-credit-test';
process.env.FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'smart-credit-test';
process.env.EXTERNAL_PROVIDER_MODE = 'mock';
process.env.LEGAL_AUDIT_HASH_SALT =
  process.env.LEGAL_AUDIT_HASH_SALT ||
  'smart-credit-isolated-e2e-agreement-audit-salt';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'E2E tests require the isolated Firestore emulator. Run npm run test:e2e:isolated.',
  );
}

'use strict';

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const USERS_COLLECTION = 'users';

function parseArgs(argv) {
  const options = {};

  argv.forEach((arg) => {
    if (arg.startsWith('--email=')) {
      options.email = arg.slice('--email='.length);
    } else if (arg.startsWith('--password=')) {
      options.password = arg.slice('--password='.length);
    } else if (arg.startsWith('--full-name=')) {
      options.fullName = arg.slice('--full-name='.length);
    } else if (arg.startsWith('--phone=')) {
      options.phone = arg.slice('--phone='.length);
    }
  });

  if (!options.email || !options.password || !options.fullName || !options.phone) {
    throw new Error(
      'Usage: npm run create:admin -- --email=admin@example.com --password=StrongPass123 --full-name="System Admin" --phone=+94770000000',
    );
  }

  if (options.password.length < 8) {
    throw new Error('Admin password must be at least 8 characters long.');
  }

  return options;
}

function normalizeEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Admin email must be a valid email address.');
  }

  return normalized;
}

function normalizePhone(phone) {
  const raw = String(phone ?? '').trim();

  if (!raw) {
    throw new Error('Phone number is missing.');
  }

  const digitsAndPlus = raw.replace(/[^\d+]/g, '');
  let normalized = digitsAndPlus;

  if (normalized.startsWith('+')) {
    normalized = `+${normalized.slice(1).replace(/\D/g, '')}`;
  } else {
    normalized = normalized.replace(/\D/g, '');

    if (normalized.startsWith('0')) {
      normalized = `+94${normalized.slice(1)}`;
    } else if (normalized.startsWith('94')) {
      normalized = `+${normalized}`;
    } else if (normalized.length === 9) {
      normalized = `+94${normalized}`;
    } else {
      normalized = `+${normalized}`;
    }
  }

  if (!/^\+\d{9,15}$/.test(normalized)) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  return normalized;
}

function resolveServiceAccountPath() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidateNames = [
    explicitPath,
    'firebase-service-account.json',
    'your-service-account-key.json',
    'service-account.json',
    'serviceAccountKey.json',
  ].filter(Boolean);

  const candidateDirs = [process.cwd(), path.resolve(__dirname, '..')];

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
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId =
      serviceAccount.project_id ||
      serviceAccount.projectId ||
      process.env.FIREBASE_PROJECT_ID;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
    return;
  }

  const serviceAccountPath = resolveServiceAccountPath();
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const projectId =
    serviceAccount.project_id ||
    serviceAccount.projectId ||
    process.env.FIREBASE_PROJECT_ID;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(projectId ? { projectId } : {}),
  });
}

async function findExistingAdmin(db, emailLower, phoneNormalized) {
  const [emailSnapshot, phoneSnapshot] = await Promise.all([
    db.collection(USERS_COLLECTION).where('emailLower', '==', emailLower).limit(1).get(),
    db.collection(USERS_COLLECTION).where('phoneNormalized', '==', phoneNormalized).limit(1).get(),
  ]);

  return !emailSnapshot.empty || !phoneSnapshot.empty;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const emailLower = normalizeEmail(options.email);
  const phoneNormalized = normalizePhone(options.phone);

  initializeFirebase();

  const db = admin.firestore();
  const exists = await findExistingAdmin(db, emailLower, phoneNormalized);

  if (exists) {
    throw new Error('An account with that admin email or phone already exists.');
  }

  const userRef = db.collection(USERS_COLLECTION).doc();
  const now = admin.firestore.Timestamp.now();
  const passwordHash = await bcrypt.hash(options.password, 10);

  await userRef.set({
    uid: userRef.id,
    role: ['admin'],
    fullName: String(options.fullName).trim(),
    photoURL: '',
    phone: String(options.phone).trim(),
    email: String(options.email).trim(),
    emailLower,
    phoneNormalized,
    passwordHash,
    creditScore: 0,
    rating: 0,
    totalLoansCompleted: 0,
    totalAmountLent: 0,
    totalAmountBorrowed: 0,
    kycStatus: 'approved',
    profileComplete: true,
    accountStatus: 'active',
    authProvider: 'local',
    createdAt: now,
    updatedAt: now,
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        uid: userRef.id,
        email: emailLower,
        role: 'admin',
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

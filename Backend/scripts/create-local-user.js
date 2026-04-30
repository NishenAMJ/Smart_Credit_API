'use strict';

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const USERS_COLLECTION = 'users';
const PUBLIC_ROLES = new Set(['borrower', 'lender']);

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
    } else if (arg.startsWith('--role=')) {
      options.role = arg.slice('--role='.length);
    }
  });

  if (
    !options.email ||
    !options.password ||
    !options.fullName ||
    !options.phone ||
    !options.role
  ) {
    throw new Error(
      'Usage: node scripts/create-local-user.js --email=user@example.com --password=StrongPass123 --full-name="User Name" --phone=+94770000000 --role=borrower',
    );
  }

  if (!PUBLIC_ROLES.has(options.role)) {
    throw new Error('Role must be borrower or lender.');
  }

  if (options.password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  return options;
}

function normalizeEmail(email) {
  const normalized = String(email ?? '').trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new Error('Email must be a valid email address.');
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
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      serviceAccount.project_id ||
      serviceAccount.projectId;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      ...(projectId ? { projectId } : {}),
    });
    return;
  }

  const serviceAccountPath = resolveServiceAccountPath();
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    serviceAccount.project_id ||
    serviceAccount.projectId;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ...(projectId ? { projectId } : {}),
  });
}

async function findExistingUser(db, emailLower, phoneNormalized) {
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
  const exists = await findExistingUser(db, emailLower, phoneNormalized);

  if (exists) {
    throw new Error('An account with that email or phone already exists.');
  }

  const userRef = db.collection(USERS_COLLECTION).doc();
  const now = admin.firestore.Timestamp.now();
  const passwordHash = await bcrypt.hash(options.password, 10);

  await userRef.set({
    uid: userRef.id,
    role: [options.role],
    fullName: String(options.fullName).trim(),
    photoURL: '',
    phone: String(options.phone).trim(),
    email: String(options.email).trim(),
    emailLower,
    phoneNormalized,
    passwordHash,
    creditScore: options.role === 'borrower' ? 620 : 0,
    rating: 0,
    totalLoansCompleted: 0,
    totalAmountLent: 0,
    totalAmountBorrowed: 0,
    kycStatus: 'not_submitted',
    profileComplete: false,
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
        phone: String(options.phone).trim(),
        role: options.role,
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

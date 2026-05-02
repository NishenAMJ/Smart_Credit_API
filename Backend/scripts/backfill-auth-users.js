'use strict';

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const USERS_COLLECTION = 'users';
const DEFAULT_PASSWORD = 'SmartCredit@123';
const MAX_BATCH_SIZE = 400;

function parseArgs(argv) {
  const options = {
    password: DEFAULT_PASSWORD,
    dryRun: false,
  };

  argv.forEach((arg) => {
    if (arg.startsWith('--password=')) {
      options.password = arg.slice('--password='.length);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
}

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
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

  const candidateDirs = [
    process.cwd(),
    path.resolve(__dirname, '..'),
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

async function commitBatch(db, writes) {
  let batch = db.batch();
  let count = 0;

  for (let index = 0; index < writes.length; index += 1) {
    const write = writes[index];
    batch.update(write.ref, write.data);
    count += 1;

    if (count === MAX_BATCH_SIZE || index === writes.length - 1) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  initializeFirebase();

  const db = admin.firestore();
  const snapshot = await db.collection(USERS_COLLECTION).get();
  const passwordHash = await bcrypt.hash(options.password, 10);
  const writes = [];
  const summary = {
    totalUsers: snapshot.size,
    usersNeedingUpdate: 0,
    passwordHashAdded: 0,
    emailLowerAdded: 0,
    phoneNormalizedAdded: 0,
    accountStatusAdded: 0,
    authProviderAdded: 0,
    uidFixed: 0,
    roleFixed: 0,
    skipped: 0,
  };

  snapshot.forEach((doc) => {
    const user = doc.data() || {};
    const update = {};

    try {
      if (!user.uid) {
        update.uid = doc.id;
        summary.uidFixed += 1;
      }

      if (!Array.isArray(user.role) && user.role) {
        update.role = [user.role];
        summary.roleFixed += 1;
      }

      if (!user.passwordHash) {
        update.passwordHash = passwordHash;
        summary.passwordHashAdded += 1;
      }

      if (!user.emailLower && user.email) {
        update.emailLower = normalizeEmail(user.email);
        summary.emailLowerAdded += 1;
      }

      if (!user.phoneNormalized && user.phone) {
        update.phoneNormalized = normalizePhone(user.phone);
        summary.phoneNormalizedAdded += 1;
      }

      if (!user.accountStatus) {
        update.accountStatus = 'active';
        summary.accountStatusAdded += 1;
      }

      if (!user.authProvider) {
        update.authProvider = 'local';
        summary.authProviderAdded += 1;
      }

      if (Object.keys(update).length === 0) {
        summary.skipped += 1;
        return;
      }

      update.updatedAt = admin.firestore.Timestamp.now();
      writes.push({
        ref: doc.ref,
        data: update,
      });
      summary.usersNeedingUpdate += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed for user ${doc.id}: ${message}`);
    }
  });

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          defaultPassword: options.password,
          summary,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (writes.length > 0) {
    await commitBatch(db, writes);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        defaultPassword: options.password,
        summary,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

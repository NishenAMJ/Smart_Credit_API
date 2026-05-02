const admin = require('firebase-admin');
const path = require('path');

function parseArgs(argv) {
  const opts = {
    key: path.resolve(__dirname, '..', 'firebase-service-account.json'),
    email: null,
  };
  argv.forEach((arg) => {
    if (arg.startsWith('--key='))
      opts.key = path.resolve(arg.slice('--key='.length));
    else if (arg.startsWith('--email='))
      opts.email = arg.slice('--email='.length);
  });
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.email) {
    console.error(
      'Usage: node activate-user.js --email=you@example.com [--key=./service-account.json]',
    );
    process.exit(1);
  }

  if (!require('fs').existsSync(opts.key)) {
    console.error('Service account file not found:', opts.key);
    process.exit(1);
  }

  const serviceAccount = require(opts.key);
  if (admin.apps.length === 0)
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const emailLower = String(opts.email).trim().toLowerCase();
  const q = await db
    .collection('users')
    .where('emailLower', '==', emailLower)
    .limit(1)
    .get();
  if (q.empty) {
    console.error('User not found with email:', opts.email);
    process.exit(1);
  }

  const doc = q.docs[0];
  const now = admin.firestore.Timestamp.now();
  const updates = {
    accountStatus: 'active',
    profileComplete: true,
    kycStatus: 'approved',
    updatedAt: now,
  };

  await doc.ref.set(updates, { merge: true });
  console.log('Updated user', doc.id, '->', opts.email);
  console.log('Fields set:', Object.keys(updates).join(', '));
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});

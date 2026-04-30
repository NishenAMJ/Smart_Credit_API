const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function checkUsers() {
  try {
    const snapshot = await db.collection('users').get();
    console.log(`Found ${snapshot.docs.length} users total`);

    snapshot.docs.forEach(doc => {
      const user = doc.data();
      if (user.email && user.email.includes('admin')) {
        console.log('Found admin-like user:');
        console.log('ID:', doc.id);
        console.log('Email:', user.email);
        console.log('EmailLower:', user.emailLower);
        console.log('Role:', user.role);
        console.log('PasswordHash exists:', !!user.passwordHash);
        console.log('---');
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const bcrypt = require('bcrypt');

async function checkAdmin() {
  try {
    const snapshot = await db.collection('users').where('emailLower', '==', 'admin@smartcredit.lk').get();

    if (!snapshot.empty) {
      const user = snapshot.docs[0].data();
      console.log('Stored password hash:', user.passwordHash);

      const match = await bcrypt.compare('Admin@123', user.passwordHash);
      console.log('Password match result:', match);
      console.log('User role:', user.role);
      console.log('User account status:', user.accountStatus);
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAdmin();
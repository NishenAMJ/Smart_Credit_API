const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTransactions() {
  const snapshot = await db.collection('transactions').limit(5).get();
  snapshot.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
    console.log('---');
  });
}

checkTransactions();

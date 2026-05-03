import * as admin from 'firebase-admin';
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  const snapshot = await admin.firestore().collection('users').get();
  console.log('Total users:', snapshot.size);
  let missingCreatedAt = 0;
  snapshot.docs.forEach(doc => {
    if (!doc.data().createdAt) missingCreatedAt++;
  });
  console.log('Missing createdAt:', missingCreatedAt);
}
run().catch(console.error);

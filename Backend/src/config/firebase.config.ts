import * as admin from 'firebase-admin';
import * as path from 'path';

export const initializeFirebase = () => {
  const serviceAccount = require(
    path.resolve(__dirname, '../../serviceAccountKey.json'),
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'your-project-id.appspot.com', // Find this in Storage tab
  });

  console.log('Firebase Admin Initialized');
};

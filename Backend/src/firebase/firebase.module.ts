import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from './firebase.config';
import { FirebaseService } from './firebase.service';

@Global() // Makes Firebase available everywhere without re-importing
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: () => {
        try {
          console.log('Initializing Firebase...');
          const projectId =
            (firebaseConfig as any).project_id ??
            (firebaseConfig as any).projectId;
          const storageBucket =
            process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
          const app = admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
            storageBucket,
          });
          console.log('✓ Firebase initialized successfully');
          console.log('Project ID:', projectId);
          console.log('Storage Bucket:', storageBucket);
          return app;
        } catch (error) {
          console.error('✗ Firebase initialization failed:', error.message);
          throw error;
        }
      },
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_APP', FirebaseService],
})
export class FirebaseModule {}

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
          const app = admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
          });
          console.log('✓ Firebase initialized successfully');
          // Access project_id from the raw config object
          const projectId = (firebaseConfig as any).project_id;
          console.log('Project ID:', projectId);
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

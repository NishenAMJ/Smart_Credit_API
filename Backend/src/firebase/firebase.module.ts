import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from './firebase.config';
import { FirebaseService } from './firebase.service';

@Global()
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

          console.log('Firebase initialized successfully');
          console.log('Project ID:', firebaseConfig.projectId);

          return app;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error('Firebase initialization failed:', message);
          throw error;
        }
      },
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_APP', FirebaseService],
})
export class FirebaseModule {}

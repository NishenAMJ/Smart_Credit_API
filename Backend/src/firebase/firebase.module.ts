import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from './firebase.config';
import { FirebaseService } from './firebase.service';

/**
 * FirebaseModule
 * ──────────────────────────────────────────────────────────────
 * @Global() means you only need to import this module ONCE in AppModule.
 * All other modules (ChatModule, UsersModule, etc.) receive FirebaseService
 * via dependency injection without re-importing FirebaseModule.
 *
 * Provides:
 *   'FIREBASE_APP'  — the raw Firebase Admin app instance
 *   FirebaseService — the injectable wrapper used across the codebase
 */
@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: () => {
        // Guard: if Firebase is already initialized (e.g. hot-reload), reuse it
        if (admin.apps.length > 0) {
          console.log('✓ Reusing existing Firebase app instance');
          return admin.apps[0];
        }

        try {
          console.log('Initializing Firebase...');
          const app = admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig),
          });
          console.log('✓ Firebase initialized successfully');
          const projectId = (firebaseConfig as any).project_id;
          console.log('  Project ID:', projectId);
          return app;
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error('✗ Firebase initialization failed:', error.message);
          } else {
            console.error('✗ Firebase initialization failed:', error);
          }
          throw error;
        }
      },
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_APP', FirebaseService],
})
export class FirebaseModule {}
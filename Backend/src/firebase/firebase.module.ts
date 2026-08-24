import { Module, Global } from '@nestjs/common';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import {
  getFirebaseProjectId,
  isFirebaseEmulatorEnabled,
  loadFirebaseConfig,
} from './firebase.config';
import { FirebaseService } from './firebase.service';

@Global() // Makes Firebase available everywhere without re-importing
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: () => {
        try {
          const existingApp = getApps()[0];
          if (existingApp) {
            return existingApp;
          }

          console.log('Initializing Firebase...');
          const useEmulator = isFirebaseEmulatorEnabled();
          const firebaseConfig = useEmulator ? null : loadFirebaseConfig();
          const projectId = useEmulator
            ? getFirebaseProjectId()
            : ((firebaseConfig as any)?.project_id ??
              (firebaseConfig as any)?.projectId ??
              getFirebaseProjectId());
          const storageBucket =
            process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
          const app = initializeApp(
            useEmulator
              ? { projectId, storageBucket }
              : {
                  credential: firebaseConfig
                    ? cert(firebaseConfig)
                    : applicationDefault(),
                  projectId,
                  storageBucket,
                },
          );
          console.log('✓ Firebase initialized successfully');
          console.log('Project ID:', projectId);
          console.log('Storage Bucket:', storageBucket);
          console.log('Firebase mode:', useEmulator ? 'emulator' : 'remote');
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

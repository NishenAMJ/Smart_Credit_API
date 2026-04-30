import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { firebaseConfig } from './firebase.config';
import { FirebaseService } from './firebase.service';

function hasFirebaseCredentials(config: admin.ServiceAccount): boolean {
  return Boolean(
    config.projectId &&
      config.clientEmail &&
      config.privateKey &&
      config.projectId !== 'undefined' &&
      config.clientEmail !== 'undefined' &&
      config.privateKey !== 'undefined',
  );
}

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_APP',
      useFactory: () => {
        if (!admin.apps.length) {
          const appOptions: admin.AppOptions = hasFirebaseCredentials(
            firebaseConfig,
          )
            ? {
                credential: admin.credential.cert(firebaseConfig),
              }
            : {
                projectId:
                  process.env.FIREBASE_PROJECT_ID || 'smart-credit-local',
              };

          if (!hasFirebaseCredentials(firebaseConfig)) {
            console.warn(
              'Firebase credentials were not found. Starting backend with local Firebase config only.',
            );
          }

          admin.initializeApp(appOptions);
        }
        return admin.app();
      },
    },
    FirebaseService,
  ],
  exports: ['FIREBASE_APP', FirebaseService],
})
export class FirebaseModule {}

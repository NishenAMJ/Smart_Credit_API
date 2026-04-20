import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App;

  constructor(private config: ConfigService) {}

  onApplicationBootstrap() {
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),
        // .env stores \n as literal \\n — replace back
        privateKey: this.config
          .get<string>('FIREBASE_PRIVATE_KEY')!
          .replace(/\\n/g, '\n'),
      }),
      storageBucket: this.config.get<string>('FIREBASE_STORAGE_BUCKET'),
    });

    this.logger.log('Firebase Admin initialised');
  }

  get firestore(): admin.firestore.Firestore {
    return admin.firestore();
  }

  get messaging(): admin.messaging.Messaging {
    return admin.messaging();
  }

  get storage(): admin.storage.Storage {
    return admin.storage();
  }

  // ── Firestore helpers ────────────────────────────────────────────────────────

  collection(path: string): admin.firestore.CollectionReference {
    return this.firestore.collection(path);
  }

  serverTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  // ── FCM helper ───────────────────────────────────────────────────────────────

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data,
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
        android: {
          notification: { sound: 'default' },
          priority: 'high',
        },
      });
    } catch (err) {
      this.logger.warn(`FCM send failed for token ${fcmToken}: ${err}`);
    }
  }
}
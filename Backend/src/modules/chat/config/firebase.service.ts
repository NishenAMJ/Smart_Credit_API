import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()   
export class FirebaseService implements OnApplicationBootstrap {
  // Logger for debugging and error messages
  private readonly logger = new Logger(FirebaseService.name);

  // Firebase app instance
  private app!: admin.app.App;

  constructor(private config: ConfigService) {}

  // This runs automatically when the app starts
  onApplicationBootstrap() {
    // If Firebase is already initialized, reuse it
    if (admin.apps.length > 0) {
      this.app = admin.apps[0]!;
      return;
    }

    // Initialize Firebase Admin SDK using environment variables
    this.app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: this.config.get<string>('FIREBASE_PROJECT_ID'),
        clientEmail: this.config.get<string>('FIREBASE_CLIENT_EMAIL'),

        // Fix newline issue in private key (from .env)
        privateKey: this.config
          .get<string>('FIREBASE_PRIVATE_KEY')!
          .replace(/\\n/g, '\n'),
      }),

      // Optional: Firebase storage bucket
      storageBucket: this.config.get<string>('FIREBASE_STORAGE_BUCKET'),
    });

    // Log success message
    this.logger.log('Firebase Admin initialised');
  }

  // Getter for Firestore database
  get firestore(): admin.firestore.Firestore {
    return admin.firestore();
  }

  // Getter for Firebase Cloud Messaging (FCM)
  get messaging(): admin.messaging.Messaging {
    return admin.messaging();
  }

  // Getter for Firebase Storage
  get storage(): admin.storage.Storage {
    return admin.storage();
  }

  //  Firestore helpers 

  // Get a collection reference easily
  collection(path: string): admin.firestore.CollectionReference {
    return this.firestore.collection(path);
  }

  // Get server-side timestamp (recommended for consistency)
  serverTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  //  FCM (Push Notification) helper 

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      // Send notification to a specific device
      await this.messaging.send({
        token: fcmToken,
        notification: { title, body },
        data,

        // iOS settings
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },

        // Android settings
        android: {
          notification: { sound: 'default' },
          priority: 'high',
        },
      });
    } catch (err) {
      // Log warning if notification fails (won’t crash app)
      this.logger.warn(`FCM send failed for token ${fcmToken}: ${err}`);
    }
  }
}

//injectable- Allows this service to be injected into other classes.
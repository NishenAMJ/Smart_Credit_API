import { Injectable, Inject } from '@nestjs/common';
import { app } from 'firebase-admin';
import * as admin from 'firebase-admin';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

/**
 * FirebaseService
 * ──────────────────────────────────────────────────────────────
 * Central wrapper around Firebase Admin SDK.
 * Injected via FirebaseModule (@Global) so every feature module
 * (chat, users, etc.) can use it without re-importing FirebaseModule.
 *
 * Key properties / helpers:
 *   this.db              → Firestore instance
 *   this.collection()    → shortcut to this.db.collection()
 *   this.serverTimestamp()→ Firestore server timestamp FieldValue
 *   this.sendPushNotification() → FCM push via token
 */
@Injectable()
export class FirebaseService {
  /** Firestore database instance */
  public db: Firestore;

  constructor(@Inject('FIREBASE_APP') private firebaseApp: app.App) {
    // Bind Firestore to the injected Firebase app
    this.db = getFirestore(this.firebaseApp);
  }

  // ── Firestore helpers ──────────────────────────────────────────────────────

  /**
   * Shortcut for this.db.collection(path).
   * Used throughout the chat services instead of accessing db directly.
   */
  collection(path: string): FirebaseFirestore.CollectionReference {
    return this.db.collection(path);
  }

  /**
   * Returns a Firestore server-side timestamp FieldValue.
   * Always use this instead of new Date() so timestamps are consistent
   * across server regions.
   */
  serverTimestamp(): FirebaseFirestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  // ── FCM (Push Notifications) ───────────────────────────────────────────────

  /**
   * Sends a push notification to a single device via its FCM token.
   * Errors are caught and logged — a failing push should never crash a request.
   *
   * @param fcmToken  Device FCM token stored on the user document
   * @param title     Notification title shown on device
   * @param body      Notification body text (truncated to 100 chars recommended)
   * @param data      Optional key-value pairs for in-app deep-linking
   */
  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      await getMessaging(this.firebaseApp).send({
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
      console.warn(`FCM send failed for token ${fcmToken}:`, err);
    }
  }

  // ── Cloud Storage ──────────────────────────────────────────────────────────

  /**
   * Returns the Firebase Storage instance.
   * Used by MessagesService when media upload (sendMedia) is implemented.
   */
  get storage() {
    return getStorage(this.firebaseApp);
  }

  // ── Legacy helper (kept for backward compatibility) ────────────────────────

  /**
   * Generic Firestore add helper. Prefer using this.collection() directly
   * for type safety. Kept for any existing code that calls saveData().
   */
  async saveData(collection: string, data: any) {
    return await this.db.collection(collection).add(data);
  }
}
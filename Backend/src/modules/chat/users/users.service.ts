/**
 * users.service.ts
 * Handles user lookup, search, FCM token updates, and online presence.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, UserDoc } from '../common/types';

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  /** Fetch a single user document by ID. Throws 404 if not found. */
  async findById(userId: string): Promise<UserDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    if (!snap.exists) throw new NotFoundException('User not found');
    return { id: snap.id, ...snap.data() } as UserDoc;
  }

  /**
   * Search users by username prefix.
   * Firestore doesn't support full-text search — this is a prefix match.
   * For production, integrate Algolia or Typesense.
   * Results exclude the requesting user.
   */
  async search(
    query: string,
    requesterId: string,
  ): Promise<Omit<UserDoc, 'fcmToken'>[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .orderBy('username')
      .startAt(q)
      .endAt(q + '\uf8ff')
      .limit(20)
      .get();

    return snap.docs
      .map((d) => {
        const data = d.data() as UserDoc;
        const { fcmToken, ...safe } = data;
        return { ...safe, id: d.id };
      })
      .filter((u) => u.id !== requesterId);
  }

  /**
   * updateFcmToken
   * Called by the mobile app whenever the FCM registration token refreshes.
   * The gateway uses this token to send push notifications when offline.
   */
  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken });
  }

  /**
   * setOnlineStatus
   * Called by ChatGateway on connect/disconnect.
   * Sets isOnline and records lastSeen timestamp.
   */
  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isOnline,
        lastSeen: isOnline ? null : this.firebase.serverTimestamp(),
      });
  }

  /**
   * getFcmToken
   * Used by the gateway to look up a user's device push token before
   * sending an offline push notification.
   */
  async getFcmToken(userId: string): Promise<string | null> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    return (snap.data() as UserDoc)?.fcmToken ?? null;
  }
}
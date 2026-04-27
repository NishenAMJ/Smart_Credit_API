import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../config/firebase.service';
import { COLLECTIONS, UserDoc } from '../common/types';

@Injectable()
export class UsersService {
  constructor(private firebase: FirebaseService) {}

  // ── Get single user ──────────────────────────────────────────────────────────

  async findById(userId: string): Promise<UserDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();

    if (!snap.exists) throw new NotFoundException('User not found');
    return { id: snap.id, ...snap.data() } as UserDoc;
  }

  // ── Search by username or displayName ────────────────────────────────────────
  // Firestore doesn't support full-text search natively.
  // This does a prefix match on username. For production, integrate Algolia
  // or use Firebase Extensions "Search with Algolia".

  async search(query: string, requesterId: string): Promise<Omit<UserDoc, 'fcmToken'>[]> {
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
      .filter((u) => u.id !== requesterId); // exclude self
  }

  // ── Update FCM token ─────────────────────────────────────────────────────────
  // Call this from the mobile app whenever the FCM token refreshes.

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken });
  }

  // ── Online presence ──────────────────────────────────────────────────────────

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isOnline,
        lastSeen: isOnline ? null : this.firebase.serverTimestamp(),
      });
  }

  // ── Get FCM token (internal use only) ────────────────────────────────────────

  async getFcmToken(userId: string): Promise<string | null> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    return (snap.data() as UserDoc)?.fcmToken ?? null;
  }
}
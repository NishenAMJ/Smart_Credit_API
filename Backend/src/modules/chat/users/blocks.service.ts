import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, UserDoc } from '../common/types';

/**
 * All users (lenders + borrowers) are confirmed to live in the "users"
 * Firestore collection. The search does a client-side partial match across
 * every possible name field so it works regardless of the field names used
 * when the user document was created (fullName, displayName, name, etc.).
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private firebase: FirebaseService) {}

  async findById(userId: string): Promise<UserDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    if (!snap.exists) throw new NotFoundException('User not found');
    return { id: snap.id, ...snap.data() } as UserDoc;
  }

  /**
   * search
   * Case-insensitive partial match across fullName, displayName, name,
   * username, and email — covers both lender and borrower document schemas.
   * Excludes the requesting user from results.
   */
  async search(
    query: string,
    requesterId: string,
  ): Promise<Omit<UserDoc, 'fcmToken'>[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .limit(200)
      .get();

    this.logger.log(`[search] total docs: ${snap.size} query="${q}"`);

    const results = snap.docs
      .map((d) => {
        const data = d.data() as any;
        const { fcmToken, passwordHash, ...safe } = data;
        return { ...safe, id: d.id };
      })
      .filter((u) => {
        if (u.id === requesterId) return false;

        // Check every field name the document might use for the person's name
        const candidates = [
          u.fullName,       // AuthService stores fullName
          u.displayName,    // chat UserDoc field
          u.name,
          u.username,
          u.email,
          u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null,
        ]
          .filter(Boolean)
          .map((v: any) => String(v).toLowerCase());

        return candidates.some((c) => c.includes(q));
      })
      .map((u: any) => ({
        ...u,
        // Normalize to the shape the frontend expects
        displayName: u.fullName ?? u.displayName ?? u.name ?? u.id,
        username: u.username ?? u.email ?? u.id,
      }));

    this.logger.log(`[search] returning ${results.length} results`);
    return results;
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({ fcmToken });
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .update({
        isOnline,
        lastSeen: isOnline ? null : this.firebase.serverTimestamp(),
      });
  }

  async getFcmToken(userId: string): Promise<string | null> {
    const snap = await this.firebase
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .get();
    return (snap.data() as UserDoc)?.fcmToken ?? null;
  }
}
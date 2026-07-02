/**
 * blocks.service.ts
 *
 * FIX: getBlockedUsers() now enriches each block with the blocked user's
 * profile (fullName, email, photoURL) fetched from the users collection.
 * Previously it only returned { blockerId, blockedId } with no name info.
 */
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, BlockDoc } from '../common/types';

@Injectable()
export class BlocksService {
  constructor(private firebase: FirebaseService) {}

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const existing = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedId)
      .limit(1)
      .get();

    if (!existing.empty) throw new ConflictException('User already blocked');

    await this.firebase.collection(COLLECTIONS.BLOCKS).add({
      blockerId,
      blockedId,
      createdAt: this.firebase.serverTimestamp(),
    });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedId)
      .limit(1)
      .get();

    if (snap.empty) throw new NotFoundException('Block not found');
    await snap.docs[0].ref.delete();
  }

  /**
   * getBlockedUsers
   * Enriches each block with the blocked user's profile so the
   * frontend can display their name and avatar.
   * No orderBy — avoids Firestore composite index requirement.
   */
  async getBlockedUsers(blockerId: string): Promise<any[]> {
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .get();

    if (snap.empty) return [];

    const blocks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlockDoc));

    // Sort newest first client-side
    blocks.sort((a, b) => {
      const aMs = (a.createdAt as any)?.toMillis?.() ?? 0;
      const bMs = (b.createdAt as any)?.toMillis?.() ?? 0;
      return bMs - aMs;
    });

    // Enrich with user profile
    const enriched = await Promise.all(
      blocks.map(async (block) => {
        try {
          const userSnap = await this.firebase
            .collection(COLLECTIONS.USERS)
            .doc(block.blockedId)
            .get();

          const u = userSnap.exists ? (userSnap.data() as any) : null;

          const displayName = u?.displayName ?? u?.fullName ?? u?.name ?? block.blockedId;
          const username    = u?.username ?? u?.email ?? block.blockedId;
          const avatarUrl   = u?.avatarUrl ?? u?.photoURL ?? null;

          const createdAtMs = (block.createdAt as any)?.toMillis?.();
          const blockedAt   = createdAtMs
            ? new Date(createdAtMs).toISOString()
            : new Date().toISOString();

          return {
            id: block.blockedId,   // user ID — used by unblockUser()
            displayName,
            username,
            avatarUrl,
            blockedAt,             // matches BlockedUser.blockedAt in frontend types
          };
        } catch {
          return {
            id: block.blockedId,
            displayName: block.blockedId,
            username: block.blockedId,
            avatarUrl: null,
            blockedAt: new Date().toISOString(),
          };
        }
      }),
    );

    return enriched;
  }

  async isBlocked(senderId: string, recipientId: string): Promise<boolean> {
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', recipientId)
      .where('blockedId', '==', senderId)
      .limit(1)
      .get();

    return !snap.empty;
  }
}
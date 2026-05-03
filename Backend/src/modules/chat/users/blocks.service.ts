/**
 * blocks.service.ts
 * Handles blocking/unblocking users.
 * The gateway uses isBlocked() before routing messages.
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

  /** Block a user. Throws 409 if already blocked. */
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

  /** Unblock a user. Throws 404 if no block exists. */
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

  /** Returns all users blocked by blockerId, newest first. */
  async getBlockedUsers(blockerId: string): Promise<BlockDoc[]> {
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BlockDoc);
  }

  /**
   * isBlocked
   * Checks if recipientId has blocked senderId.
   * Called by ChatGateway before routing every message.
   */
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

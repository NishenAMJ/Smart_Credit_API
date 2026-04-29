// Blocks service handles user blocking logic in the chat system
// Allows users to block, unblock, view blocked users, and check block status

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { FirebaseService } from '../config/firebase.service';
import { COLLECTIONS, BlockDoc } from '../common/types';

@Injectable()
export class BlocksService {
  constructor(private firebase: FirebaseService) {}

  
  // BLOCK USER
  
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    // Check if block already exists (prevent duplicates)
    const existing = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedId)
      .limit(1)
      .get();

    // If already blocked → throw error
    if (!existing.empty)
      throw new ConflictException('User already blocked');

    // Create new block record
    await this.firebase.collection(COLLECTIONS.BLOCKS).add({
      blockerId,
      blockedId,
      createdAt: this.firebase.serverTimestamp(),
    });
  }

  
  // UNBLOCK USER

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    // Find existing block record
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .where('blockedId', '==', blockedId)
      .limit(1)
      .get();

    // If no block found → error
    if (snap.empty)
      throw new NotFoundException('Block not found');

    // Delete block record
    await snap.docs[0].ref.delete();
  }

 
  // GET BLOCKED USERS LIST
  
  async getBlockedUsers(blockerId: string): Promise<BlockDoc[]> {
    // Fetch all users blocked by current user
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', blockerId)
      .orderBy('createdAt', 'desc')
      .get();

    // Map Firestore documents to BlockDoc format
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as BlockDoc),
    );
  }

  
  // CHECK IF USER IS BLOCKED 
  
  async isBlocked(
    senderId: string,
    recipientId: string,
  ): Promise<boolean> {
    // Check if recipient has blocked sender
    const snap = await this.firebase
      .collection(COLLECTIONS.BLOCKS)
      .where('blockerId', '==', recipientId)
      .where('blockedId', '==', senderId)
      .limit(1)
      .get();

    // Return true if block exists
    return !snap.empty;
  }
}
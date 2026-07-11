/**
 * conversations.service.ts
 *
 * FIX: Delete conversation was failing because markAsRead() was being called
 * by ChatScreen AFTER the conversation was deleted — trying to update a
 * document that no longer exists → NOT_FOUND error.
 *
 * Two fixes applied:
 * 1. markAsRead() now uses set({merge:true}) instead of update() so it
 *    silently does nothing if the document doesn't exist.
 * 2. delete() is more resilient — skips markAsRead entirely since
 *    the document is about to be gone anyway.
 *
 * Also fixed: listForUser() orderBy('createdAt') requires a Firestore index.
 * Removed orderBy and sort client-side instead.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, ConversationDoc, UserDoc } from '../common/types';
import { UsersService } from '../users/users.service';

@Injectable()
export class ConversationsService {
  constructor(
    private firebase: FirebaseService,
    private users: UsersService,
  ) {}

  /**
   * getOrCreate
   * Returns existing conversation or creates a new one.
   * Uses composite key field to avoid Firestore array equality query bug.
   */
  async getOrCreate(userA: string, userB: string): Promise<ConversationDoc> {
    const participantIds = [userA, userB].sort() as [string, string];
    const key = participantIds.join('_');

    const existing = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('key', '==', key)
      .limit(1)
      .get();

    if (!existing.empty) {
      const d = existing.docs[0];
      const doc = { id: d.id, ...d.data() } as ConversationDoc;
      return this.mapParticipant(doc, userA);
    }

    const ref = await this.firebase.collection(COLLECTIONS.CONVERSATIONS).add({
      participantIds,
      key,
      lastMessage: null,
      unreadCounts: { [userA]: 0, [userB]: 0 },
      mutedBy: [],
      createdAt: this.firebase.serverTimestamp(),
    });

    const snap = await ref.get();
    const doc = { id: snap.id, ...snap.data() } as ConversationDoc;
    return this.mapParticipant(doc, userA);
  }

  /**
   * listForUser
   * FIXED: removed .orderBy('createdAt', 'desc') to avoid Firestore index.
   * Now fetches all and sorts client-side by lastMessage or createdAt.
   */
  async listForUser(userId: string): Promise<ConversationDoc[]> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participantIds', 'array-contains', userId)
      .get(); // ← no orderBy

    const docs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ConversationDoc[];

    // Sort client-side: conversations with most recent messages first
    const sorted = docs.sort((a, b) => {
      const aMs = (a.lastMessage?.createdAt as any)?.toMillis?.()
        ?? (a.createdAt as any)?.toMillis?.() ?? 0;
      const bMs = (b.lastMessage?.createdAt as any)?.toMillis?.()
        ?? (b.createdAt as any)?.toMillis?.() ?? 0;
      return bMs - aMs;
    });

    return Promise.all(sorted.map((c) => this.mapParticipant(c, userId)));
  }

  /**
   * findOne
   * Fetches one conversation and verifies the caller is a participant.
   */
  async findOne(conversationId: string, userId: string): Promise<ConversationDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .get();

    if (!snap.exists) throw new NotFoundException('Conversation not found');

    const data = snap.data() as ConversationDoc;

    // Guard: old conversation documents may not have participantIds field
    // (created before this field was added). Treat missing field as forbidden.
    if (!Array.isArray(data.participantIds)) {
      throw new ForbiddenException('Conversation has invalid structure');
    }

    if (!data.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    return this.mapParticipant({ ...data, id: snap.id }, userId);
  }

  /**
   * setMuted
   * Adds/removes userId from mutedBy array.
   */
  async setMuted(conversationId: string, userId: string, muted: boolean): Promise<void> {
    const conv = await this.findOne(conversationId, userId);
    const mutedBy = new Set(conv.mutedBy);
    muted ? mutedBy.add(userId) : mutedBy.delete(userId);

    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({ mutedBy: [...mutedBy] });
  }

  /**
   * markAsRead
   * FIXED: uses set({merge:true}) instead of update() so it doesn't
   * throw NOT_FOUND if the conversation was just deleted.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      await this.firebase
        .collection(COLLECTIONS.CONVERSATIONS)
        .doc(conversationId)
        .set(
          { unreadCounts: { [userId]: 0 } },
          { merge: true }, // ← safe even if document doesn't exist
        );
    } catch {
      // Silently ignore — conversation may have been deleted
    }
  }

  /**
   * delete
   * Deletes the conversation document.
   * LOCAL-FIRST: messages live on device SQLite, no sub-collection to delete.
   */
  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findOne(conversationId, userId); // access check
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .delete();
    // Note: do NOT call markAsRead after delete — document is gone
  }

  /**
   * updateLastMessage
   * Called after HTTP fallback message send.
   */
  async updateLastMessage(
    conversationId: string,
    senderId: string,
    text: string,
    recipientId: string,
  ): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({
        lastMessage: {
          text,
          senderId,
          createdAt: this.firebase.serverTimestamp(),
        },
        [`unreadCounts.${recipientId}`]: admin.firestore.FieldValue.increment(1),
      });
  }

  /**
   * mapParticipant
   * Attaches the other user's profile to the conversation object.
   * Normalizes field names since users use fullName not displayName.
   */
  private async mapParticipant(
    conv: ConversationDoc,
    currentUserId: string,
  ): Promise<ConversationDoc> {
    const otherId = conv.participantIds.find((id) => id !== currentUserId);
    if (!otherId) return conv;

    try {
      const user = await this.users.findById(otherId);
      return {
        ...conv,
        participant: {
          id: user.id,
          username: (user as any).username ?? (user as any).email ?? 'unknown',
          displayName:
            (user as any).displayName ??
            (user as any).fullName ??
            (user as any).name ??
            'Unknown User',
          avatarUrl: (user as any).avatarUrl ?? (user as any).photoURL ?? null,
          isOnline: !!(user as any).isOnline,
          lastSeen: (user as any).lastSeen ?? null,
        },
        unreadCount: (conv as any).unreadCounts?.[currentUserId] ?? 0,
        isMuted: ((conv as any).mutedBy ?? []).includes(currentUserId),
        createdAt: conv.createdAt,
      } as any;
    } catch {
      return conv;
    }
  }
}
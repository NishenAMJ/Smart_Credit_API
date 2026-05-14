/**
 * conversations.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles conversation metadata stored in Firestore.
 *
 * LOCAL-FIRST NOTE:
 * Conversations are lightweight metadata documents (participants, unread counts,
 * last message preview). They live in Firestore so both users always agree on
 * the conversation list even after re-installing the app.
 *
 * Messages themselves are NOT fetched from here at runtime — they live in
 * the phone's local SQLite DB. Firestore only holds the lastMessage preview.
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../../firebase/firebase.service';
import { COLLECTIONS, ConversationDoc } from '../common/types';

@Injectable()
export class ConversationsService {
  constructor(private firebase: FirebaseService) {}

  /**
   * getOrCreate
   * ─────────────────────────────────────────────────────────────────────────
   * Idempotent: returns existing conversation or creates a new one.
   * Uses a composite 'key' field (sorted IDs joined with '_') to avoid
   * Firestore's unsupported array equality query.
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
      return { id: d.id, ...d.data() } as ConversationDoc;
    }

    const ref = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .add({
        participantIds,
        key,
        lastMessage: null,
        unreadCounts: { [userA]: 0, [userB]: 0 },
        mutedBy: [],
        createdAt: this.firebase.serverTimestamp(),
      });

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as ConversationDoc;
  }

  /**
   * listForUser
   * Returns all conversations a user participates in, newest first.
   * The frontend uses this on app start to sync the conversation list.
   */
  async listForUser(userId: string): Promise<ConversationDoc[]> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participantIds', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ConversationDoc[];
  }

  /**
   * findOne
   * Fetches one conversation and verifies the caller is a participant.
   * Used as an access-control gate in controllers.
   */
  async findOne(conversationId: string, userId: string): Promise<ConversationDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .get();

    if (!snap.exists) throw new NotFoundException('Conversation not found');

    const data = snap.data() as ConversationDoc;
    if (!data.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant in this conversation');
    }

    return { ...data, id: snap.id };
  }

  /**
   * setMuted
   * Adds/removes userId from mutedBy array.
   * When muted, the gateway skips push notifications for that user.
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
   * Resets the caller's unread count to 0.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({ [`unreadCounts.${userId}`]: 0 });
  }

  /**
   * delete
   * Deletes the conversation document.
   * LOCAL-FIRST NOTE: Messages are stored on each device's SQLite — there are
   * no message documents in Firestore to delete.
   */
  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findOne(conversationId, userId);
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .delete();
  }

  /**
   * updateLastMessage
   * Called when a message is sent (via the HTTP fallback endpoint).
   * Updates the preview shown in the conversation list.
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
}
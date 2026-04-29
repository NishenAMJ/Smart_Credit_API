import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../../../firebase/firebase.service'; // ← src/firebase
import { COLLECTIONS, ConversationDoc } from '../common/types';

/**
 * ConversationsService
 * ──────────────────────────────────────────────────────────────
 * All business logic for 1-on-1 conversations:
 *   getOrCreate   — idempotent conversation creation
 *   listForUser   — fetch all conversations for a user
 *   findOne       — fetch single conversation with access check
 *   setMuted      — toggle push-notification muting
 *   markAsRead    — reset unread counter for a user
 *   delete        — delete conversation + all its messages
 *   updateLastMessage — called by MessagesService after each send
 */
@Injectable()
export class ConversationsService {
  constructor(private firebase: FirebaseService) {}

  /**
   * getOrCreate
   * ──────────────────────────────────────────────────────────────
   * Returns an existing 1-on-1 conversation between userA and userB,
   * or creates a new one if none exists. Safe to call multiple times —
   * it will never create duplicates because we query by a composite key.
   *
   * FIX: previously used .where('participantIds', '==', [...]) which
   * Firestore does NOT support for array equality — always returned empty.
   * Now we store and query a 'key' field: sorted IDs joined with '_'.
   */
  async getOrCreate(userA: string, userB: string): Promise<ConversationDoc> {
    // Sort IDs alphabetically so the key is identical regardless of argument order
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

    // No conversation found — create a fresh one
    const ref = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .add({
        participantIds,
        key,                             // stored for future lookups
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
   * Returns all conversations the user participates in, newest first.
   */
  async listForUser(userId: string): Promise<ConversationDoc[]> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participantIds', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ConversationDoc[];
  }

  /**
   * findOne
   * Fetches a single conversation by ID and verifies the caller is a participant.
   * Throws NotFoundException or ForbiddenException on failure.
   * Used as an access-control gate throughout the service layer.
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
   * Adds or removes the userId from the conversation's mutedBy array.
   * When muted, the ChatGateway skips FCM push for that user.
   */
  async setMuted(
    conversationId: string,
    userId: string,
    muted: boolean,
  ): Promise<void> {
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
   * Resets the unread counter for a specific user to 0.
   * Called when a user opens a conversation or sends a markRead socket event.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({ [`unreadCounts.${userId}`]: 0 });
  }

  /**
   * delete
   * Permanently deletes a conversation and every message inside it.
   * Uses a Firestore batch to delete messages atomically before removing
   * the conversation document itself.
   */
  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findOne(conversationId, userId); // access check first

    // Batch-delete all messages in the sub-collection
    const messagesRef = this.firebase.db.collection(
      COLLECTIONS.MESSAGES(conversationId),
    );
    const batch = this.firebase.db.batch();
    const msgs = await messagesRef.get();
    msgs.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // Delete the conversation document
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .delete();
  }

  /**
   * updateLastMessage
   * Called by MessagesService after every successful message send.
   * Updates the lastMessage preview and atomically increments the
   * recipient's unread count using Firestore FieldValue.increment.
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
        // Atomic increment — safe for concurrent messages
        [`unreadCounts.${recipientId}`]:
          admin.firestore.FieldValue.increment(1),
      });
  }
}
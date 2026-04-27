import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FirebaseService } from '../config/firebase.service';
import { COLLECTIONS, ConversationDoc } from '../common/types';

@Injectable()
export class ConversationsService {
  constructor(private firebase: FirebaseService) {}

  // ── Get or create a 1-on-1 conversation ─────────────────────────────────────
  // Idempotent: calling this twice returns the same conversation.

  async getOrCreate(
    userA: string,
    userB: string,
  ): Promise<ConversationDoc> {
    // Canonical participant order so we can query deterministically
    const participantIds = [userA, userB].sort() as [string, string];

    const existing = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participantIds', '==', participantIds)
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
        lastMessage: null,
        unreadCounts: { [userA]: 0, [userB]: 0 },
        mutedBy: [],
        createdAt: this.firebase.serverTimestamp(),
      });

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as ConversationDoc;
  }

  // ── List all conversations for a user ────────────────────────────────────────

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

  // ── Get single conversation (with access check) ──────────────────────────────

  async findOne(conversationId: string, userId: string): Promise<ConversationDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .get();

    if (!snap.exists) throw new NotFoundException('Conversation not found');

    const data = snap.data() as ConversationDoc;
    if (!data.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant');
    }

    return { ...data, id: snap.id };
  }

  // ── Mute / unmute ────────────────────────────────────────────────────────────

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

  // ── Mark all messages as read (reset unread count) ───────────────────────────

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({ [`unreadCounts.${userId}`]: 0 });
  }

  // ── Delete conversation ──────────────────────────────────────────────────────

  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findOne(conversationId, userId); // access check

    // Delete subcollection messages in batches
    const messagesRef = this.firebase.firestore.collection(
      COLLECTIONS.MESSAGES(conversationId),
    );
    const batch = this.firebase.firestore.batch();
    const msgs = await messagesRef.get();
    msgs.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .delete();
  }

  // ── Internal: update last message snapshot ───────────────────────────────────

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
        [`unreadCounts.${recipientId}`]:
          // Firestore increment
          require('firebase-admin').firestore.FieldValue.increment(1),
      });
  }
}
// Conversations service handles all conversation logic
// Creates, retrieves, mutes, marks as read, and deletes conversations

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

  // Get or create a 1-on-1 conversation between two users
  // If it already exists, return existing. Otherwise create new one.
  // Safe to call multiple times
  async getOrCreate(
    userA: string,
    userB: string,
  ): Promise<ConversationDoc> {
    // Sort IDs so we always search in the same order
    const participantIds = [userA, userB].sort() as [string, string];

    // Check if conversation already exists
    const existing = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .where('participantIds', '==', participantIds)
      .limit(1)
      .get();

    if (!existing.empty) {
      const d = existing.docs[0];
      return { id: d.id, ...d.data() } as ConversationDoc;
    }

    // Create new conversation if not found
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

  // Get all conversations for a user sorted by newest first
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

  // Get a single conversation and check user has access
  async findOne(conversationId: string, userId: string): Promise<ConversationDoc> {
    const snap = await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .get();

    if (!snap.exists) throw new NotFoundException('Conversation not found');

    const data = snap.data() as ConversationDoc;
    // Make sure user is actually a participant in this conversation
    if (!data.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant');
    }

    return { ...data, id: snap.id };
  }

  // Mute or unmute conversation notifications
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

  // Clear unread message count for user
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .update({ [`unreadCounts.${userId}`]: 0 });
  }

  // Delete entire conversation and all its messages
  async delete(conversationId: string, userId: string): Promise<void> {
    await this.findOne(conversationId, userId); // check user has access

    // Delete all messages in this conversation
    const messagesRef = this.firebase.firestore.collection(
      COLLECTIONS.MESSAGES(conversationId),
    );
    const batch = this.firebase.firestore.batch();
    const msgs = await messagesRef.get();
    msgs.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // Delete the conversation itself
    await this.firebase
      .collection(COLLECTIONS.CONVERSATIONS)
      .doc(conversationId)
      .delete();
  }

  // Update last message preview and increment unread count for recipient
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
        // Increment recipient's unread count
        [`unreadCounts.${recipientId}`]:
          require('firebase-admin').firestore.FieldValue.increment(1),
      });
  }
}
// Messages service handles sending and retrieving messages in conversations
// Supports text messages and media uploads

import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ConversationsService } from '../conversations/conversations.service';
import { COLLECTIONS, MessageDoc } from '../common/types';

import * as admin from 'firebase-admin';

@Injectable()
export class MessagesService {
  constructor(
    private firebase: FirebaseService,
    private conversations: ConversationsService,
  ) {}

  // Send a text message to a conversation
  async sendText(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<MessageDoc> {
    // Verify conversation exists and user is a participant
    const conv = await this.conversations.findOne(conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    // ✅ FIXED: was this.firebase.db.collection(...) — db property does not exist
    const ref = await this.firebase
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .add({
        conversationId,
        senderId,
        text,
        mediaUrl: null,
        mediaType: null,
        fileName: null,
        readAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Update conversation with last message preview
    await this.conversations.updateLastMessage(
      conversationId,
      senderId,
      text,
      recipientId,
    );

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as MessageDoc;
  }

  // Get paginated messages from a conversation (newest first)
  async getMessages(
    conversationId: string,
    userId: string,
    page: string | number,
    limit: string | number,
  ): Promise<MessageDoc[]> {
    // Check user has access to this conversation
    await this.conversations.findOne(conversationId, userId);

    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // ✅ FIXED: was this.firebase.db.collection(...)
    const query = this.firebase
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset(pageNum * limitNum);

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageDoc));
  }

  // Mark a message as read
  async markMessageRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    // Verify user is in this conversation
    await this.conversations.findOne(conversationId, userId);

    // 
    await this.firebase
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ readAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}
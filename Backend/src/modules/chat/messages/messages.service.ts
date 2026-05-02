/**
 * messages.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-FIRST NOTE:
 * In normal operation, messages travel via WebSocket (ChatGateway) and are
 * stored only on each device's local SQLite database — NOT in Firestore.
 *
 * This service exists for two fallback scenarios:
 *   1. First install / re-install: fetch recent messages from Firestore
 *      so the user's history is not completely empty.
 *   2. HTTP fallback: if WebSocket is unavailable, the app can POST a
 *      message via REST and this service stores it temporarily in Firestore.
 *
 * In the happy path (WebSocket works), this service is rarely called.
 */
import { Injectable } from '@nestjs/common';
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

  /**
   * sendText (HTTP fallback)
   * Stores a message in Firestore and updates the conversation preview.
   * Used only when WebSocket is not available.
   */
  async sendText(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<MessageDoc> {
    const conv = await this.conversations.findOne(conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

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
        status: 'sent',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await this.conversations.updateLastMessage(
      conversationId,
      senderId,
      text,
      recipientId,
    );

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as MessageDoc;
  }

  /**
   * getMessages
   * Fetches paginated message history from Firestore.
   * Used on first install or after a re-install to seed the local DB.
   * After seeding, the app reads from SQLite directly.
   *
   * Page is 0-indexed: page=0 → first 30, page=1 → next 30, etc.
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: string | number,
    limit: string | number,
  ): Promise<MessageDoc[]> {
    await this.conversations.findOne(conversationId, userId);

    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    const snap = await this.firebase
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset(pageNum * limitNum)
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageDoc));
  }

  /**
   * markMessageRead
   * Updates the readAt timestamp on a Firestore message document.
   * Only relevant when the HTTP fallback was used to send the message.
   */
  async markMessageRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    await this.conversations.findOne(conversationId, userId);

    await this.firebase
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ readAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}
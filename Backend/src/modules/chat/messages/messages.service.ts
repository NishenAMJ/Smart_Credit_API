import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ConversationsService } from '../conversations/conversations.service';
import { COLLECTIONS, MessageDoc, ConversationDoc } from '../common/types';
import { readFileSync, unlinkSync } from 'fs';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.mov'];

@Injectable()
export class MessagesService {
  constructor(
    private firebase: FirebaseService,
    private conversations: ConversationsService,
  ) {}

  // ── Send a text message ──────────────────────────────────────────────────────

  async sendText(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<MessageDoc> {
    const conv = await this.conversations.findOne(conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    const ref = await this.firebase.db
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

    await this.conversations.updateLastMessage(
      conversationId,
      senderId,
      text,
      recipientId,
    );

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as MessageDoc;
  }

  // ── Paginated message list ───────────────────────────────────────────────────

  async getMessages(
    conversationId: string,
    userId: string,
    page: string | number,
    limit: string | number,
  ): Promise<MessageDoc[]> {
    await this.conversations.findOne(conversationId, userId); // access check

    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;

    let query = this.firebase.db
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset(pageNum * limitNum);

    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageDoc));
  }

  // ── Mark a message as read ───────────────────────────────────────────────────

  async markMessageRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    await this.conversations.findOne(conversationId, userId); // access check

    await this.firebase.db
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ readAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}
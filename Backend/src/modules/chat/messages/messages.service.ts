// Messages service handles sending and retrieving messages in conversations
// Supports text messages and media uploads

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

  // Send a text message to a conversation
  async sendText(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<MessageDoc> {
    // Verify conversation exists and user is a participant
    const conv = await this.conversations.findOne(conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    // Create message document
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

    // Load messages paginated (skip older ones, take latest)
    let query = this.firebase.db
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

    // Update message with read timestamp
    await this.firebase.db
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ readAt: admin.firestore.FieldValue.serverTimestamp() });
  }
}
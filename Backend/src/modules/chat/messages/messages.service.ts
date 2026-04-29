// Messages service handles all message-related logic in the chat system
// Supports sending text messages, retrieving messages, and marking messages as read

import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ConversationsService } from '../conversations/conversations.service';
import { COLLECTIONS, MessageDoc, ConversationDoc } from '../common/types';

import * as admin from 'firebase-admin';

// Supported file types (currently defined but not used in this file yet)
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTS = ['.mp4', '.mov'];

@Injectable()
export class MessagesService {
  constructor(
    private firebase: FirebaseService,
    private conversations: ConversationsService,
  ) {}

  
  // SEND TEXT MESSAGE
  
  async sendText(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<MessageDoc> {
    // Check if conversation exists and user is part of it
    const conv = await this.conversations.findOne(conversationId, senderId);

    // Find recipient (other user in conversation)
    const recipientId = conv.participantIds.find(
      (id) => id !== senderId,
    )!;

    // Create new message in Firestore messages subcollection
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

    // Update conversation preview (last message + unread count)
    await this.conversations.updateLastMessage(
      conversationId,
      senderId,
      text,
      recipientId,
    );

    // Return saved message with generated ID
    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as MessageDoc;
  }

  
  // GET PAGINATED MESSAGES
  
  async getMessages(
    conversationId: string,
    userId: string,
    page: string | number,
    limit: string | number,
  ): Promise<MessageDoc[]> {
    // Ensure user has access to this conversation
    await this.conversations.findOne(conversationId, userId);

    // Convert query params to numbers
    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : page;

    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : limit;

    // Fetch messages in descending order (newest first)
    // Pagination is handled using offset
    const query = this.firebase.db
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .orderBy('createdAt', 'desc')
      .limit(limitNum)
      .offset(pageNum * limitNum);

    const snap = await query.get();

    // Map Firestore docs to MessageDoc format
    return snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as MessageDoc),
    );
  }

  
  // MARK MESSAGE AS READ
  
  async markMessageRead(
    conversationId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    // Verify user belongs to conversation
    await this.conversations.findOne(conversationId, userId);

    // Update message with read timestamp
    await this.firebase.db
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({
        readAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }
}
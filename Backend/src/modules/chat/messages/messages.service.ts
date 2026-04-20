import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../config/firebase.service';
import { ConversationsService } from '../conversations/conversations.service';
import { COLLECTIONS, MessageDoc, ConversationDoc } from '../../common/types';
import { readFileSync, unlinkSync } from 'fs';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

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

    const ref = await this.firebase.firestore
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .add({
        conversationId,
        senderId,
        text,
        mediaUrl: null,
        mediaType: null,
        fileName: null,
        readAt: null,
        createdAt: this.firebase.serverTimestamp(),
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

  // ── Upload media and send message ────────────────────────────────────────────

  async sendMedia(
    conversationId: string,
    senderId: string,
    file: Express.Multer.File,
  ): Promise<MessageDoc> {
    const conv = await this.conversations.findOne(conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    // Upload to Firebase Storage
    const ext = extname(file.originalname).toLowerCase();
    const storagePath = `chat-media/${conversationId}/${uuidv4()}${ext}`;
    const bucket = this.firebase.storage.bucket();

    await bucket.upload(file.path, {
      destination: storagePath,
      metadata: { contentType: file.mimetype },
    });

    const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
      action: 'read',
      expires: '2099-01-01', // long-lived public URL; use short-lived + token for private
    });

    // Clean up temp file from disk
    try { unlinkSync(file.path); } catch {}

    const mediaType = IMAGE_EXTS.includes(ext)
      ? 'image'
      : VIDEO_EXTS.includes(ext)
      ? 'video'
      : 'file';

    const ref = await this.firebase.firestore
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .add({
        conversationId,
        senderId,
        text: null,
        mediaUrl: signedUrl,
        mediaType,
        fileName: file.originalname,
        readAt: null,
        createdAt: this.firebase.serverTimestamp(),
      });

    await this.conversations.updateLastMessage(
      conversationId,
      senderId,
      mediaType === 'image' ? '📷 Photo' : mediaType === 'video' ? '🎥 Video' : `📎 ${file.originalname}`,
      recipientId,
    );

    const snap = await ref.get();
    return { id: snap.id, ...snap.data() } as MessageDoc;
  }

  // ── Paginated message list ───────────────────────────────────────────────────

  async getMessages(
    conversationId: string,
    userId: string,
    limit = 30,
    before?: string, // messageId cursor for pagination
  ): Promise<MessageDoc[]> {
    await this.conversations.findOne(conversationId, userId); // access check

    let query = this.firebase.firestore
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      const cursorSnap = await this.firebase.firestore
        .collection(COLLECTIONS.MESSAGES(conversationId))
        .doc(before)
        .get();
      if (cursorSnap.exists) query = query.startAfter(cursorSnap);
    }

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

    await this.firebase.firestore
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ readAt: this.firebase.serverTimestamp() });
  }
}
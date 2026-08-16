import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ConfigService } from '@nestjs/config';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';
import { FirebaseService } from '../../firebase/firebase.service';
import type {
  AiAssistantRole,
  AiConversation,
  AiStoredMessage,
} from './ai-assistant.types';
import { toIso } from './roles/ai-data.utils';

@Injectable()
export class AiConversationRepository {
  private readonly collectionName = 'aiConversations';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {}

  private get collection() {
    return this.firebaseService.getDb().collection(this.collectionName);
  }

  async create(
    user: AuthenticatedUser,
    role: AiAssistantRole,
    title: string,
  ): Promise<AiConversation> {
    const ref = this.collection.doc();
    const now = Timestamp.now();
    await ref.set({
      conversationId: ref.id,
      userId: user.sub,
      userRole: role,
      title,
      status: 'active',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.buildExpiry(now),
    });
    return {
      conversationId: ref.id,
      userId: user.sub,
      userRole: role,
      title,
      status: 'active',
      messageCount: 0,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };
  }

  async list(
    user: AuthenticatedUser,
    role: AiAssistantRole,
  ): Promise<AiConversation[]> {
    const snapshot = await this.collection
      .where('userId', '==', user.sub)
      .where('userRole', '==', role)
      .orderBy('updatedAt', 'desc')
      .limit(30)
      .get();
    return snapshot.docs
      .map((doc) => this.mapConversation(doc.id, doc.data()))
      .filter((conversation) => conversation.status === 'active');
  }

  async assertOwned(
    conversationId: string,
    user: AuthenticatedUser,
    role: AiAssistantRole,
  ) {
    const snapshot = await this.collection.doc(conversationId).get();
    if (!snapshot.exists) {
      throw new NotFoundException('AI conversation was not found.');
    }
    if (
      snapshot.get('userId') !== user.sub ||
      snapshot.get('userRole') !== role
    ) {
      throw new ForbiddenException(
        'This AI conversation belongs to another account or role.',
      );
    }
    if (snapshot.get('status') !== 'active') {
      throw new NotFoundException('AI conversation was not found.');
    }
    return snapshot;
  }

  async listMessages(
    conversationId: string,
    user: AuthenticatedUser,
    role: AiAssistantRole,
    limit = 50,
  ): Promise<AiStoredMessage[]> {
    const conversation = await this.assertOwned(conversationId, user, role);
    const snapshot = await conversation.ref
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(Math.min(Math.max(limit, 1), 100))
      .get();
    return snapshot.docs.map((doc) => this.mapMessage(doc.id, doc.data()));
  }

  async addMessage(
    conversationId: string,
    data: {
      role: 'user' | 'assistant';
      content: string;
      status: 'completed' | 'failed';
      toolNames?: string[];
      model?: string | null;
    },
  ): Promise<AiStoredMessage> {
    const conversationRef = this.collection.doc(conversationId);
    const messageRef = conversationRef.collection('messages').doc();
    const now = Timestamp.now();
    const document = {
      messageId: messageRef.id,
      conversationId,
      role: data.role,
      content: data.content,
      status: data.status,
      toolNames: data.toolNames ?? [],
      model: data.model ?? null,
      createdAt: now,
    };
    const batch = this.firebaseService.getDb().batch();
    batch.set(messageRef, document);
    batch.update(conversationRef, {
      updatedAt: now,
      messageCount: FieldValue.increment(1),
      expiresAt: this.buildExpiry(now),
    });
    await batch.commit();
    return this.mapMessage(messageRef.id, document);
  }

  async updateTitle(conversationId: string, title: string): Promise<void> {
    await this.collection.doc(conversationId).update({
      title,
      updatedAt: Timestamp.now(),
    });
  }

  async archive(
    conversationId: string,
    user: AuthenticatedUser,
    role: AiAssistantRole,
  ): Promise<void> {
    const snapshot = await this.assertOwned(conversationId, user, role);
    await snapshot.ref.update({
      status: 'archived',
      updatedAt: Timestamp.now(),
    });
  }

  private mapConversation(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): AiConversation {
    return {
      conversationId: String(data.conversationId ?? id),
      userId: String(data.userId ?? ''),
      userRole: data.userRole as AiAssistantRole,
      title: String(data.title ?? 'New conversation'),
      status: data.status === 'archived' ? 'archived' : 'active',
      messageCount:
        typeof data.messageCount === 'number' ? data.messageCount : 0,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };
  }

  private buildExpiry(now: Timestamp): Timestamp {
    const configuredDays = Number(
      this.configService.get<string>('AI_CONVERSATION_RETENTION_DAYS') ?? '30',
    );
    const retentionDays = Number.isFinite(configuredDays)
      ? Math.min(Math.max(configuredDays, 1), 365)
      : 30;
    return Timestamp.fromMillis(
      now.toMillis() + retentionDays * 24 * 60 * 60 * 1000,
    );
  }

  private mapMessage(
    id: string,
    data: FirebaseFirestore.DocumentData,
  ): AiStoredMessage {
    return {
      messageId: String(data.messageId ?? id),
      conversationId: String(data.conversationId ?? ''),
      role: data.role === 'assistant' ? 'assistant' : 'user',
      content: String(data.content ?? ''),
      status: data.status === 'failed' ? 'failed' : 'completed',
      toolNames: Array.isArray(data.toolNames)
        ? data.toolNames.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      model: typeof data.model === 'string' ? data.model : null,
      createdAt: toIso(data.createdAt),
    };
  }
}

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../../firebase/firebase.service';
import { SendMessageDto } from './dto/send-message.dto';

type ChatRecord = Record<string, unknown> & {
  createdAt?: { _seconds?: number };
  lastMessageAt?: { _seconds?: number };
};

@Injectable()
export class BorrowerChatService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async getAllConversations(borrowerId: string) {
    try {
      const snapshot = await this.firebaseService
        .getDb()
        .collection('conversations')
        .where('participants', 'array-contains', borrowerId)
        .get();

      const conversations = snapshot.docs
        .map((doc) => ({
          conversationId: doc.id,
          ...doc.data(),
        }))
        .sort((first: ChatRecord, second: ChatRecord) => {
          const firstTime = first.lastMessageAt?._seconds || 0;
          const secondTime = second.lastMessageAt?._seconds || 0;

          return secondTime - firstTime;
        });

      return {
        statusCode: 200,
        message: 'Conversations retrieved successfully',
        total: conversations.length,
        data: conversations,
      };
    } catch (error) {
      console.error('Get all conversations error:', error);
      throw new InternalServerErrorException('Failed to get conversations');
    }
  }

  async getConversationMessages(conversationId: string) {
    try {
      const snapshot = await this.firebaseService
        .getDb()
        .collection('messages')
        .where('conversationId', '==', conversationId)
        .get();

      const messages = snapshot.docs
        .map((doc) => ({
          messageId: doc.id,
          ...doc.data(),
        }))
        .sort((first: ChatRecord, second: ChatRecord) => {
          const firstTime = first.createdAt?._seconds || 0;
          const secondTime = second.createdAt?._seconds || 0;

          return firstTime - secondTime;
        });

      return {
        statusCode: 200,
        message: 'Messages retrieved successfully',
        conversationId,
        total: messages.length,
        data: messages,
      };
    } catch (error) {
      console.error('Get conversation messages error:', error);
      throw new InternalServerErrorException('Failed to get messages');
    }
  }

  async sendMessage(sendMessageDto: SendMessageDto) {
    try {
      const docRef = await this.firebaseService
        .getDb()
        .collection('messages')
        .add({
          ...sendMessageDto,
          createdAt: FieldValue.serverTimestamp(),
          read: false,
        });

      try {
        await this.firebaseService
          .getDb()
          .collection('conversations')
          .doc(sendMessageDto.conversationId)
          .update({
            lastMessage: sendMessageDto.message,
            lastMessageAt: FieldValue.serverTimestamp(),
          });
      } catch (error) {
        console.warn('Could not update conversation:', error);
      }

      return {
        statusCode: 201,
        message: 'Message sent successfully',
        data: { messageId: docRef.id },
      };
    } catch (error) {
      console.error('Send message error:', error);
      throw new InternalServerErrorException('Failed to send message');
    }
  }
}

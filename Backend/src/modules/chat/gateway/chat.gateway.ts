// Chat Gateway handles real-time WebSocket communication
// It manages: connections, rooms, messaging, typing, read receipts, presence, and notifications

/**This file handles real-time chat in the app. It lets users connect,
 join chats, send and receive messages instantly, see typing status, and
  read updates. It also checks if users are allowed to chat, tracks who 
  is online or offline, and sends notifications when someone is not active.**/

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters } from '@nestjs/common';
import { IsString, IsBoolean } from 'class-validator';

import { FirebaseService } from '../../../firebase/firebase.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { BlocksService } from '../users/blocks.service';
import { UsersService } from '../users/users.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';



// Join a conversation room
class JoinRoomDto {
  @IsString()
  conversationId!: string;
}

// Send a text message
class SendMessageDto {
  @IsString()
  conversationId!: string;

  @IsString()
  text!: string;
}

// Typing indicator payload
class TypingDto {
  @IsString()
  conversationId!: string;

  @IsBoolean()
  isTyping!: boolean;
}

// Read receipt payload
class ReadReceiptDto {
  @IsString()
  conversationId!: string;

  @IsString()
  messageId!: string;
}



@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Tracks all socket connections per user (multi-device support)
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private firebase: FirebaseService,
    private messages: MessagesService,
    private conversations: ConversationsService,
    private blocks: BlocksService,
    private users: UsersService,
  ) {}



  // When a user connects to WebSocket
  async handleConnection(client: Socket) {
    const userId =
      client.handshake.auth?.userId ??
      (client.handshake.headers['x-user-id'] as string);

    // Reject connection if no userId
    if (!userId) {
      this.logger.warn(`[${client.id}] connection rejected - no userId`);
      client.disconnect();
      return;
    }

    // Attach userId to socket
    client.data.userId = userId;

    // Track socket for this user (multi-device support)
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Mark user online in DB
    await this.users.setOnlineStatus(userId, true);

    // Notify others that user is online
    this.broadcastPresence(userId, true);

    this.logger.log(`[${client.id}] connected - userId: ${userId}`);
  }

  // When a user disconnects
  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    sockets?.delete(client.id);

    // If no more active sockets - mark offline
    if (!sockets || sockets.size === 0) {
      this.userSockets.delete(userId);
      await this.users.setOnlineStatus(userId, false);
      this.broadcastPresence(userId, false);
    }

    this.logger.log(`[${client.id}] disconnected — userId: ${userId}`);
  }

  

  // Join a conversation room
  @SubscribeMessage('joinConversation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const userId = client.data.userId;

    // Ensure user is part of conversation
    try {
      await this.conversations.findOne(dto.conversationId, userId);
    } catch {
      throw new WsException('Not authorised to join this conversation');
    }

    await client.join(dto.conversationId);

    client.emit('joinedConversation', {
      conversationId: dto.conversationId,
    });

    this.logger.log(`[${userId}] joined room ${dto.conversationId}`);
  }

  // Leave a conversation room
  @SubscribeMessage('leaveConversation')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    client.leave(dto.conversationId);
  }

  

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const senderId = client.data.userId;

    // Get conversation + determine recipient
    const conv = await this.conversations.findOne(dto.conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    // Block check (do not send if blocked)
    const blocked = await this.blocks.isBlocked(senderId, recipientId);
    if (blocked) {
      client.emit('messageFailed', {
        reason: 'blocked',
        conversationId: dto.conversationId,
      });
      return;
    }

    // Save message in Firestore
    const message = await this.messages.sendText(
      dto.conversationId,
      senderId,
      dto.text,
    );

    // Broadcast message to all users in room
    this.server.to(dto.conversationId).emit('receiveMessage', message);

    // Check if recipient is actively in room
    const recipientInRoom = await this.isUserInRoom(
      recipientId,
      dto.conversationId,
    );

    // If not active → send push notification
    if (!recipientInRoom) {
      await this.sendPushToUser(recipientId, {
        title: 'New message',
        body:
          dto.text.length > 100 ? dto.text.slice(0, 97) + '…' : dto.text,
        data: {
          type: 'new_message',
          conversationId: dto.conversationId,
          senderId,
        },
      });
    }
  }

 

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: TypingDto,
  ) {
    const userId = client.data.userId;

    // Notify others in room except sender
    client.to(dto.conversationId).emit('userTyping', {
      conversationId: dto.conversationId,
      userId,
      isTyping: dto.isTyping,
    });
  }



  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReadReceiptDto,
  ) {
    const userId = client.data.userId;

    // Mark message as read
    await this.messages.markMessageRead(
      dto.conversationId,
      dto.messageId,
      userId,
    );

    // Reset unread count
    await this.conversations.markAsRead(dto.conversationId, userId);

    // Notify others message was read
    client.to(dto.conversationId).emit('messageRead', {
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  

  // Broadcast online/offline status globally
  private broadcastPresence(userId: string, isOnline: boolean) {
    this.server.emit('userOnline', { userId, isOnline });
  }

  // Check if user is actively inside a chat room
  private async isUserInRoom(
    userId: string,
    room: string,
  ): Promise<boolean> {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds) return false;

    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket?.rooms.has(room)) return true;
    }
    return false;
  }

  

  private async sendPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      data: Record<string, string>;
    },
  ): Promise<void> {
    const fcmToken = await this.users.getFcmToken(userId);
    if (!fcmToken) return;

    await this.firebase.sendPushNotification(
      fcmToken,
      payload.title,
      payload.body,
      payload.data,
    );
  }
}

/*

When a user connects, the gateway verifies their identity 
and marks them as online, then tracks their socket connection.
 When they join a conversation, it checks if they are allowed 
 and then adds them to a chat room. When a message is sent,
  it verifies permissions (including block checks), saves the message to
   the database, and instantly broadcasts it to everyone in the room. 
   If the recipient is not actively in the chat, it sends a 
   push notification. It also handles typing indicators, read receipts,
    and updates online/offline status when users disconnect.
*/
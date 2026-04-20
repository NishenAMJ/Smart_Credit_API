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
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { FirebaseService } from '../../config/firebase.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { BlocksService } from '../users/blocks.service';
import { UsersService } from '../users/users.service';
import { WsExceptionFilter } from '../../common/filters/ws-exception.filter';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class JoinRoomDto {
  @IsString() conversationId: string;
}

class SendMessageDto {
  @IsString() conversationId: string;
  @IsString() text: string;
}

class TypingDto {
  @IsString() conversationId: string;
  @IsBoolean() isTyping: boolean;
}

class ReadReceiptDto {
  @IsString() conversationId: string;
  @IsString() messageId: string;
}

// ── Gateway ───────────────────────────────────────────────────────────────────

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // userId → Set of socketIds (one user can have multiple tabs/devices)
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private firebase: FirebaseService,
    private messages: MessagesService,
    private conversations: ConversationsService,
    private blocks: BlocksService,
    private users: UsersService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    // The parent project's auth middleware must set userId on the handshake.
    // Adjust the key to match your auth system:
    //   client.handshake.auth.userId  (if using socket.io auth option)
    //   client.handshake.headers['x-user-id']  (if using headers)
    const userId =
      client.handshake.auth?.userId ??
      client.handshake.headers['x-user-id'] as string;

    if (!userId) {
      this.logger.warn(`[${client.id}] connection rejected — no userId`);
      client.disconnect();
      return;
    }

    // Attach to socket for later retrieval
    client.data.userId = userId;

    // Track socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Set user online in Firestore
    await this.users.setOnlineStatus(userId, true);

    // Notify contacts that this user is online
    this.broadcastPresence(userId, true);

    this.logger.log(`[${client.id}] connected — userId: ${userId}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    sockets?.delete(client.id);

    // Only mark offline if no other sockets remain for this user
    if (!sockets || sockets.size === 0) {
      this.userSockets.delete(userId);
      await this.users.setOnlineStatus(userId, false);
      this.broadcastPresence(userId, false);
    }

    this.logger.log(`[${client.id}] disconnected — userId: ${userId}`);
  }

  // ── Join a conversation room ──────────────────────────────────────────────────
  // Client calls this when opening ChatScreen.

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    const userId = client.data.userId;

    // Verify user is a participant before letting them join the room
    try {
      await this.conversations.findOne(dto.conversationId, userId);
    } catch {
      throw new WsException('Not authorised to join this conversation');
    }

    await client.join(dto.conversationId);
    client.emit('joinedConversation', { conversationId: dto.conversationId });
    this.logger.log(`[${userId}] joined room ${dto.conversationId}`);
  }

  // ── Leave a conversation room ─────────────────────────────────────────────────

  @SubscribeMessage('leaveConversation')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    client.leave(dto.conversationId);
  }

  // ── Send a message via WebSocket ──────────────────────────────────────────────
  // Saves to Firestore, emits to room, sends FCM push.

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const senderId = client.data.userId;

    // Get the conversation to find the recipient
    const conv = await this.conversations.findOne(dto.conversationId, senderId);
    const recipientId = conv.participantIds.find((id) => id !== senderId)!;

    // Block check — don't deliver if recipient has blocked sender
    const blocked = await this.blocks.isBlocked(senderId, recipientId);
    if (blocked) {
      client.emit('messageFailed', {
        reason: 'blocked',
        conversationId: dto.conversationId,
      });
      return;
    }

    // Persist to Firestore
    const message = await this.messages.sendText(
      dto.conversationId,
      senderId,
      dto.text,
    );

    // Broadcast to everyone in the room (sender included for multi-device)
    this.server.to(dto.conversationId).emit('receiveMessage', message);

    // Send FCM push if recipient is NOT currently in the room
    const recipientInRoom = await this.isUserInRoom(
      recipientId,
      dto.conversationId,
    );

    if (!recipientInRoom) {
      await this.sendPushToUser(recipientId, {
        title: 'New message',
        body: dto.text.length > 100 ? dto.text.slice(0, 97) + '…' : dto.text,
        data: {
          type: 'new_message',
          conversationId: dto.conversationId,
          senderId,
        },
      });
    }
  }

  // ── Typing indicator ──────────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: TypingDto,
  ) {
    const userId = client.data.userId;

    // Broadcast to the room but exclude the sender
    client.to(dto.conversationId).emit('userTyping', {
      conversationId: dto.conversationId,
      userId,
      isTyping: dto.isTyping,
    });
  }

  // ── Read receipt ──────────────────────────────────────────────────────────────

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReadReceiptDto,
  ) {
    const userId = client.data.userId;

    // Update Firestore
    await this.messages.markMessageRead(
      dto.conversationId,
      dto.messageId,
      userId,
    );

    // Reset unread count
    await this.conversations.markAsRead(dto.conversationId, userId);

    // Notify the sender their message was read
    client.to(dto.conversationId).emit('messageRead', {
      conversationId: dto.conversationId,
      messageId: dto.messageId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private broadcastPresence(userId: string, isOnline: boolean) {
    // Emit to all connected clients — the frontend filters by relevant userId
    this.server.emit('userOnline', { userId, isOnline });
  }

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

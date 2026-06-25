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
import { UseFilters, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { UsersService } from '../users/users.service';
import { BlocksService } from '../users/blocks.service';

interface SendMessagePayload {
  conversationId: string;
  recipientId: string;
  message: {
    id: string;
    senderId: string;
    text: string;
    createdAt: string;
  };
}

interface TypingPayload {
  conversationId: string;
  recipientId: string;
  isTyping: boolean;
}

interface MarkReadPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
}

interface DeliveredPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
}

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  transports: ['websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // userId → Set of socketIds (one user, multiple devices)
  private userSockets = new Map<string, Set<string>>();

  // Offline message queue: userId → pending payloads
  private offlineQueue = new Map<string, SendMessagePayload[]>();

  constructor(
    private jwtService: JwtService,
    private users: UsersService,
    private blocks: BlocksService,
  ) {}

  // ── Connection ────────────────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    /**
     * REAL AUTH: The mobile app sends the JWT token in the socket handshake.
     * We verify it here using JwtService — the same secret used to sign it.
     * If verification fails the socket is immediately disconnected.
     *
     * Frontend must connect like this:
     *   const socket = io(WS_URL, {
     *     auth: { token: 'Bearer eyJhbGc...' }  ← the JWT from login
     *   });
     */
    const raw =
      client.handshake.auth?.token ??
      client.handshake.headers['authorization'];

    if (!raw) {
      this.logger.warn(`[${client.id}] Rejected — no token in handshake`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    // Strip 'Bearer ' prefix if present
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;

    let payload: { sub: string; email: string; role: string };

    try {
      payload = this.jwtService.verify(token);
    } catch {
      this.logger.warn(`[${client.id}] Rejected — invalid or expired token`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
      return;
    }

    // userId comes from JWT sub — cannot be spoofed
    const userId = payload.sub;

    client.data.userId = userId;
    client.data.role = payload.role;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    await this.users.setOnlineStatus(userId, true);
    this.server.emit('userOnline', { userId, isOnline: true });

    this.logger.log(`[${client.id}] Connected — userId: ${userId} role: ${payload.role}`);

    await this.flushOfflineQueue(userId, client);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    sockets?.delete(client.id);

    if (!sockets || sockets.size === 0) {
      this.userSockets.delete(userId);
      await this.users.setOnlineStatus(userId, false);
      this.server.emit('userOnline', { userId, isOnline: false });
    }

    this.logger.log(`[${client.id}] Disconnected — userId: ${userId}`);
  }

  // ── sendMessage ───────────────────────────────────────────────────────────

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    // Always use the verified userId from the JWT — never trust client payload
    const senderId = client.data.userId as string;

    if (!payload?.recipientId || !payload?.message?.id) {
      throw new WsException('Invalid sendMessage payload');
    }

    const isBlocked = await this.blocks.isBlocked(senderId, payload.recipientId);
    if (isBlocked) {
      client.emit('messageFailed', {
        messageId: payload.message.id,
        reason: 'blocked',
      });
      return;
    }

    const delivered = this.deliverToUser(payload.recipientId, 'receiveMessage', {
      ...payload.message,
      conversationId: payload.conversationId,
      status: 'delivered',
    });

    if (delivered) {
      client.emit('messageDelivered', {
        messageId: payload.message.id,
        conversationId: payload.conversationId,
        status: 'delivered',
      });
      this.logger.log(`Message ${payload.message.id} delivered to ${payload.recipientId}`);
    } else {
      if (!this.offlineQueue.has(payload.recipientId)) {
        this.offlineQueue.set(payload.recipientId, []);
      }
      this.offlineQueue.get(payload.recipientId)!.push(payload);

      client.emit('messageDelivered', {
        messageId: payload.message.id,
        conversationId: payload.conversationId,
        status: 'sent',
      });
      this.logger.log(`Message ${payload.message.id} queued for offline user ${payload.recipientId}`);
    }
  }

  // ── messageDelivered ──────────────────────────────────────────────────────

  @SubscribeMessage('messageDelivered')
  handleMessageDelivered(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: DeliveredPayload,
  ) {
    this.deliverToUser(payload.senderId, 'messageDelivered', {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      status: 'delivered',
    });
  }

  // ── typing ────────────────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const userId = client.data.userId as string;
    this.deliverToUser(payload.recipientId, 'userTyping', {
      conversationId: payload.conversationId,
      userId,
      isTyping: payload.isTyping,
    });
  }

  // ── markRead ──────────────────────────────────────────────────────────────

  @SubscribeMessage('markRead')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkReadPayload,
  ) {
    const userId = client.data.userId as string;
    this.deliverToUser(payload.senderId, 'messageRead', {
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private deliverToUser(userId: string, event: string, data: any): boolean {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return false;
    for (const socketId of socketIds) {
      this.server.sockets.sockets.get(socketId)?.emit(event, data);
    }
    return true;
  }

  private async flushOfflineQueue(userId: string, client: Socket) {
    const queued = this.offlineQueue.get(userId);
    if (!queued || queued.length === 0) return;

    this.logger.log(`Flushing ${queued.length} offline messages to ${userId}`);
    for (const payload of queued) {
      client.emit('receiveMessage', {
        ...payload.message,
        conversationId: payload.conversationId,
        status: 'delivered',
      });
    }
    this.offlineQueue.delete(userId);
  }
}
/**
 * chat.gateway.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-FIRST ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * The backend is a pure ROUTER — it does NOT store messages in any database.
 * Messages are stored permanently on each user's phone via expo-sqlite.
 *
 * Flow for sending a message:
 *   1. Sender's app saves message locally with status:'sending'
 *   2. Sender emits 'sendMessage' to this gateway
 *   3. Gateway routes the message to the recipient's socket
 *   4. If recipient is online  → delivers instantly, emits 'messageDelivered' back
 *   5. If recipient is offline → stores in offlineQueue (in-memory)
 *                                 when they reconnect, flushes the queue
 *
 * Socket events this gateway handles (client → server):
 *   connect          — authenticate via handshake.auth.userId
 *   sendMessage      — route a message to the target user
 *   messageDelivered — recipient acknowledges delivery
 *   typing           — forward typing indicator
 *   markRead         — forward read receipt
 *
 * Socket events this gateway emits (server → client):
 *   receiveMessage   — incoming message for recipient
 *   messageDelivered — delivery ack back to sender
 *   userTyping       — typing indicator forwarded to conversation partner
 *   messageRead      — read receipt forwarded to sender
 *   userOnline       — presence change broadcast
 *   error            — any WS-level error
 */

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
import { UseFilters } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { UsersService } from '../users/users.service';
import { BlocksService } from '../users/blocks.service';

// ── DTO shapes ────────────────────────────────────────────────────────────────

interface SendMessagePayload {
  conversationId: string; // which conversation this belongs to
  recipientId: string; // who should receive it
  message: {
    id: string; // client-generated UUID (used for dedup + ack)
    senderId: string;
    text: string;
    createdAt: string; // ISO string — client sets this for local-first
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
  senderId: string; // original sender of the message being read
}

interface DeliveredPayload {
  messageId: string;
  conversationId: string;
  senderId: string; // original sender
}

// ── Gateway ───────────────────────────────────────────────────────────────────

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  cors: {
    // In dev: allow the local network IP your phone connects to.
    // In prod: set this to your actual domain.
    origin: '*',
    credentials: true,
  },
  transports: ['websocket'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  /**
   * userId → Set of socketIds
   * One user can be connected from multiple devices simultaneously.
   */
  private userSockets = new Map<string, Set<string>>();

  /**
   * Offline message queue.
   * userId → array of message payloads waiting to be delivered.
   * Flushed when the user reconnects.
   *
   * NOTE: This is in-memory only. If the server restarts, queued messages
   * are lost. For production, replace with a Redis queue or Firebase RTDB.
   */
  private offlineQueue = new Map<string, SendMessagePayload[]>();

  constructor(
    private users: UsersService,
    private blocks: BlocksService,
  ) {}

  // ── Connection lifecycle ──────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    /**
     * Auth: the mobile app sends userId in socket handshake.
     * When real JWT auth is wired up, verify the token here.
     */
    const userId =
      client.handshake.auth?.userId ??
      (client.handshake.headers['x-user-id'] as string);

    if (!userId) {
      this.logger.warn(`[${client.id}] Rejected — no userId in handshake`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    // Store userId on the socket for all future event handlers
    client.data.userId = userId;

    // Track all sockets for this user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    // Mark user online in Firestore
    await this.users.setOnlineStatus(userId, true);

    // Broadcast presence to everyone (frontend filters by relevant userId)
    this.server.emit('userOnline', { userId, isOnline: true });

    this.logger.log(`[${client.id}] Connected — userId: ${userId}`);

    // Flush any messages that arrived while this user was offline
    await this.flushOfflineQueue(userId, client);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    sockets?.delete(client.id);

    // Only mark offline once ALL devices for this user disconnect
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
    const senderId = client.data.userId as string;

    // Validate payload shape
    if (!payload?.recipientId || !payload?.message?.id) {
      throw new WsException('Invalid sendMessage payload');
    }

    // Block check: if recipient has blocked sender, silently drop
    const isBlocked = await this.blocks.isBlocked(
      senderId,
      payload.recipientId,
    );
    if (isBlocked) {
      client.emit('messageFailed', {
        messageId: payload.message.id,
        reason: 'blocked',
      });
      return;
    }

    // Try to deliver to recipient's active sockets
    const delivered = this.deliverToUser(
      payload.recipientId,
      'receiveMessage',
      {
        ...payload.message,
        conversationId: payload.conversationId,
        status: 'delivered',
      },
    );

    if (delivered) {
      // Ack sender: recipient received it in real-time
      client.emit('messageDelivered', {
        messageId: payload.message.id,
        conversationId: payload.conversationId,
        status: 'delivered',
      });
      this.logger.log(
        `Message ${payload.message.id} delivered to ${payload.recipientId}`,
      );
    } else {
      // Recipient offline → queue the message
      if (!this.offlineQueue.has(payload.recipientId)) {
        this.offlineQueue.set(payload.recipientId, []);
      }
      this.offlineQueue.get(payload.recipientId)!.push(payload);

      // Ack sender: message is queued (will deliver when recipient reconnects)
      client.emit('messageDelivered', {
        messageId: payload.message.id,
        conversationId: payload.conversationId,
        status: 'sent', // 'sent' = reached server but not yet delivered to device
      });
      this.logger.log(
        `Message ${payload.message.id} queued for offline user ${payload.recipientId}`,
      );
    }
  }

  // ── messageDelivered (ack from recipient) ─────────────────────────────────

  @SubscribeMessage('messageDelivered')
  handleMessageDelivered(
    @ConnectedSocket() _client: Socket,
    @MessageBody() payload: DeliveredPayload,
  ) {
    // Forward the delivery ack to the original sender so they can update
    // their local DB status from 'sent' → 'delivered'
    this.deliverToUser(payload.senderId, 'messageDelivered', {
      messageId: payload.messageId,
      conversationId: payload.conversationId,
      status: 'delivered',
    });
  }

  // ── typing indicator ──────────────────────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: TypingPayload,
  ) {
    const userId = client.data.userId as string;
    // Forward typing event to the other participant only
    this.deliverToUser(payload.recipientId, 'userTyping', {
      conversationId: payload.conversationId,
      userId,
      isTyping: payload.isTyping,
    });
  }

  // ── read receipt ──────────────────────────────────────────────────────────

  @SubscribeMessage('markRead')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MarkReadPayload,
  ) {
    const userId = client.data.userId as string;
    // Notify the original sender their message was read
    this.deliverToUser(payload.senderId, 'messageRead', {
      conversationId: payload.conversationId,
      messageId: payload.messageId,
      readBy: userId,
      readAt: new Date().toISOString(),
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Deliver an event to ALL active sockets of a given user.
   * Returns true if the user had at least one connected socket.
   */
  private deliverToUser(userId: string, event: string, data: any): boolean {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds || socketIds.size === 0) return false;

    for (const socketId of socketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      socket?.emit(event, data);
    }
    return true;
  }

  /**
   * Flush all queued messages to a user who just came online.
   * Messages are sent in order and cleared from the queue.
   */
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

    // Clear the queue after delivery
    this.offlineQueue.delete(userId);
  }
}

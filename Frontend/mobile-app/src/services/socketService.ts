let io: any;
let Socket: any;

try {
  const socketIO = require('socket.io-client');
  io = socketIO.io;
  Socket = socketIO.Socket;
} catch (e) {
  console.warn('socket.io-client not available, chat features will be disabled');
}

import type { Message } from '../types/chat.types';

type SocketEvent =
  | { event: 'receiveMessage'; data: Message }
  | { event: 'userTyping'; data: { conversationId: string; userId: string; isTyping: boolean } }
  | { event: 'messageRead'; data: { conversationId: string; messageId: string } }
  | { event: 'userOnline'; data: { userId: string; isOnline: boolean } };

/**
 * ChatSocket Service
 * Handles real-time chat communication via Socket.io WebSocket connection
 * 
 * Expected Backend Events:
 * - receiveMessage: new message in conversation
 * - userTyping: user started/stopped typing
 * - messageRead: user read a message
 * - userOnline: user online/offline status changed
 */
class ChatSocket {
  private socket: any = null;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Connect to chat server with JWT token
   * @param jwtToken - JWT token from auth system
   */
  connect(jwtToken: string) {
    if (this.socket?.connected) {
      console.log('[ChatSocket] Already connected, skipping');
      return;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    
    this.socket = io(apiUrl, {
      auth: {
        token: jwtToken, // Backend expects token in auth
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('[ChatSocket] Connected to backend');
      this.emit('socketConnected', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[ChatSocket] Disconnected:', reason);
      this.emit('socketDisconnected', { reason });
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('[ChatSocket] Connection error:', err?.message ?? 'Unknown error');
      this.emit('socketError', { error: err?.message });
    });

    console.log('[ChatSocket] Attempting connection to', apiUrl);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('[ChatSocket] Disconnected');
    }
  }

  /**
   * Join a conversation room for real-time updates
   */
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[ChatSocket] Cannot join - socket not connected');
      return;
    }
    this.socket.emit('joinConversation', { conversationId });
    console.log('[ChatSocket] Joined conversation:', conversationId);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[ChatSocket] Cannot leave - socket not connected');
      return;
    }
    this.socket.emit('leaveConversation', { conversationId });
    console.log('[ChatSocket] Left conversation:', conversationId);
  }

  /**
   * Send typing indicator to conversation participants
   */
  sendTyping(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      console.warn('[ChatSocket] Cannot send typing - socket not connected');
      return;
    }
    this.socket.emit('typing', { conversationId, isTyping });
  }

  /**
   * Send read receipt for a message
   */
  markMessageRead(conversationId: string, messageId: string) {
    if (!this.socket?.connected) {
      console.warn('[ChatSocket] Cannot send read receipt - socket not connected');
      return;
    }
    this.socket.emit('readReceipt', { conversationId, messageId });
  }

  /**
   * Register event listener
   */
  on<T extends SocketEvent['event']>(
    event: T,
    handler: (data: Extract<SocketEvent, { event: T }>['data']) => void,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Register actual socket listener
    this.socket?.on(event, handler as any);
  }

  /**
   * Unregister event listener
   */
  off<T extends SocketEvent['event']>(event: T) {
    this.socket?.off(event);
    this.listeners.delete(String(event));
  }

  /**
   * Emit custom event (internal use)
   */
  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  /**
   * Check if socket is connected
   */
  get isConnected() {
    return this.socket?.connected ?? false;
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket ? 'Initialized' : 'Not initialized',
      id: this.socket?.id ?? 'N/A',
    };
  }
}

// Export singleton instance
export const chatSocket = new ChatSocket();
let io: any;
let Socket: any;

try {
  const socketIO = require('socket.io-client');
  io = socketIO.io;
  Socket = socketIO.Socket;
} catch (e) {
  // Fallback if socket.io-client is not installed
  console.warn('socket.io-client not available, chat features will be disabled');
}

import type { Message } from '../types/chat.types';
 
type SocketEvent =
  | { event: 'receiveMessage'; data: Message }
  | { event: 'userTyping'; data: { conversationId: string; userId: string; isTyping: boolean } }
  | { event: 'messageRead'; data: { conversationId: string; messageId: string } }
  | { event: 'userOnline'; data: { userId: string; isOnline: boolean } };
 
class ChatSocket {
  private socket: any = null;
 
  connect(token: string) {
    if (this.socket?.connected) return;
 
    this.socket = io(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
 
    this.socket.on('connect', () => console.log('[socket] connected'));
    this.socket.on('disconnect', (reason: string) => console.log('[socket] disconnected', reason));
    this.socket.on('connect_error', (err: any) => console.error('[socket] error', err?.message ?? 'Unknown error'));
  }
 
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
 
  joinConversation(conversationId: string) {
    this.socket?.emit('joinConversation', { conversationId });
  }
 
  leaveConversation(conversationId: string) {
    this.socket?.emit('leaveConversation', { conversationId });
  }
 
  sendTyping(conversationId: string, isTyping: boolean) {
    this.socket?.emit('typing', { conversationId, isTyping });
  }
 
  on<T extends SocketEvent['event']>(
    event: T,
    handler: (data: Extract<SocketEvent, { event: T }>['data']) => void,
  ) {
    this.socket?.on(event, handler as any);
  }
 
  off<T extends SocketEvent['event']>(event: T) {
    this.socket?.off(event);
  }
 
  get isConnected() {
    return this.socket?.connected ?? false;
  }
}
 
export const chatSocket = new ChatSocket();
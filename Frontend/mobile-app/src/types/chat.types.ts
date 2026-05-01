/**
 * chat.types.ts
 * Shared TypeScript types used across all chat screens and services.
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;              // ISO string
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
  isMuted: boolean;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  /**
   * blockedAt: when this user was blocked.
   * The backend stores this as 'createdAt' in the BlockDoc.
   * The backend's getBlockedUsers() should map createdAt → blockedAt,
   * OR keep using blockedAt here and the UI reads it consistently.
   */
  blockedAt: string;
}

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: {
    conversationId: string;
    participant: User;
    isMuted?: boolean;      // passed so ChatScreen knows initial mute state
  };
  NewChat: undefined;
  ChatInfo: {
    conversationId: string;
    participant: User;
    isMuted: boolean;
  };
  BlockedUsers: undefined;
};
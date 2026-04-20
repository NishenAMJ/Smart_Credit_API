export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
}
 
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
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
  avatarUrl?: string;
  blockedAt: string;
}
 
export type ChatStackParamList = {
  ChatList: undefined;
  Chat: { conversationId: string; participant: User };
  NewChat: undefined;
  ChatInfo: { conversationId: string; participant: User; isMuted: boolean };
  BlockedUsers: undefined;
};
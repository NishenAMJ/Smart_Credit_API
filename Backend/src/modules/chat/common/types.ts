import type { Timestamp } from 'firebase-admin/firestore';

//  Firestore document shapes

export interface UserDoc {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fcmToken: string | null;
  isOnline: boolean;
  lastSeen: Timestamp | null;
  createdAt: Timestamp;
  [key: string]: any;
}

export interface ConversationDoc {
  id: string;
  participantIds: [string, string]; // always sorted alphabetically
  key: string; // participantIds.join('_') — for fast lookup
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  } | null;
  unreadCounts: Record<string, number>;
  mutedBy: string[];
  createdAt: Timestamp;
}

export interface MessageDoc {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'file' | null;
  fileName: string | null;
  readAt: Timestamp | null;
  status: 'sent' | 'delivered' | 'read';
  createdAt: Timestamp;
}

export interface BlockDoc {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: Timestamp;
}

//  Firestore collection paths

export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: (conversationId: string) =>
    `conversations/${conversationId}/messages`,
  BLOCKS: 'blocks',
} as const;

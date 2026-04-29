import * as admin from 'firebase-admin';

// ── Firestore document shapes ─────────────────────────────────────────────────
// These mirror exactly what is stored in Firestore documents.
// All timestamps are Firestore Timestamps (never plain JS Date on the server).

export interface UserDoc {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fcmToken: string | null;       // Updated by the mobile app on login / FCM refresh
  isOnline: boolean;
  lastSeen: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
}

export interface ConversationDoc {
  id: string;
  participantIds: [string, string];   // Always exactly 2, sorted alphabetically
  key: string;                        // participantIds.join('_') — used for fast exact lookup
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: admin.firestore.Timestamp;
  } | null;
  unreadCounts: Record<string, number>; // { [userId]: unreadCount }
  mutedBy: string[];                    // userIds who have muted this conversation
  createdAt: admin.firestore.Timestamp;
}

export interface MessageDoc {
  id: string;
  conversationId: string;
  senderId: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'file' | null;
  fileName: string | null;
  readAt: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
}

export interface BlockDoc {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: admin.firestore.Timestamp;
}

// ── Firestore collection paths ────────────────────────────────────────────────
// Centralised here so changing a collection name is a one-line edit.
export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  /** Messages are stored as a sub-collection under each conversation */
  MESSAGES: (conversationId: string) =>
    `conversations/${conversationId}/messages`,
  BLOCKS: 'blocks',
} as const;
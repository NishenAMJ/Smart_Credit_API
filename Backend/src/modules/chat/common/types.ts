import * as admin from 'firebase-admin';

// ── Firestore document shapes ────────────────────────────────────────────────
// These mirror what is stored in Firestore.
// All timestamps are Firestore Timestamps or null.

export interface UserDoc {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fcmToken: string | null;       // updated by the app on login
  isOnline: boolean;
  lastSeen: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
}

export interface ConversationDoc {
  id: string;
  participantIds: [string, string];   // always exactly 2
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: admin.firestore.Timestamp;
  } | null;
  unreadCounts: Record<string, number>; // { [userId]: count }
  mutedBy: string[];                    // list of userIds who muted this conv
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
export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: (conversationId: string) => `conversations/${conversationId}/messages`,
  BLOCKS: 'blocks',
} as const;
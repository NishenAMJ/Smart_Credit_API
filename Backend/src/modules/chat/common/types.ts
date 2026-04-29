import * as admin from 'firebase-admin';

// blueprint for how your database documents should look.

//User Data
export interface UserDoc {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  fcmToken: string | null;       // used for push notifications
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
  unreadCounts: Record<string, number>; 
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

//block people
export interface BlockDoc {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: admin.firestore.Timestamp;
}

//Defines where data is stored in Firestore.
export const COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: (conversationId: string) => `conversations/${conversationId}/messages`,
  BLOCKS: 'blocks',
} as const;
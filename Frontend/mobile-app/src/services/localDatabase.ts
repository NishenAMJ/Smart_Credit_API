/**
 * localDatabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-FIRST storage layer using expo-sqlite.
 *
 * This is the SOURCE OF TRUTH for messages and conversations on the device.
 * The backend Firestore is only used for:
 *   - Syncing conversation metadata (participant info, unread counts)
 *   - Seeding messages on first install or after re-install
 *   - Routing real-time messages via WebSocket
 *
 * Tables:
 *   conversations — metadata for each chat (last message preview, unread count)
 *   messages      — every message the user has sent or received
 *   blocked_users — cached list of blocked users for offline display
 */

import * as SQLite from 'expo-sqlite';
import type { Message, Conversation, BlockedUser } from '../types/chat.types';

// Open (or create) the database file on the device
const db = SQLite.openDatabaseSync('smart_credit_chat.db');

export const localDatabase = {
  /**
   * init
   * Creates all tables and indexes if they don't exist.
   * Call this ONCE when the app starts (e.g. in App.tsx useEffect).
   */
  init: () => {
    try {
      db.execSync(`
        -- Messages table: stores every chat message permanently on-device
        CREATE TABLE IF NOT EXISTS messages (
          id              TEXT PRIMARY KEY NOT NULL,
          conversationId  TEXT NOT NULL,
          senderId        TEXT NOT NULL,
          text            TEXT NOT NULL,
          createdAt       TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'sending'
        );

        -- Index for fast lookup by conversation (used in ChatScreen)
        CREATE INDEX IF NOT EXISTS idx_messages_conv
          ON messages(conversationId, createdAt DESC);

        -- Conversations table: list shown in ChatListScreen
        CREATE TABLE IF NOT EXISTS conversations (
          id              TEXT PRIMARY KEY NOT NULL,
          participantId   TEXT NOT NULL,
          participantName TEXT NOT NULL,
          participantAvatar TEXT,
          isOnline        INTEGER NOT NULL DEFAULT 0,
          lastMessageText TEXT,
          lastMessageAt   TEXT,
          lastSenderId    TEXT,
          unreadCount     INTEGER NOT NULL DEFAULT 0,
          isMuted         INTEGER NOT NULL DEFAULT 0,
          createdAt       TEXT NOT NULL
        );

        -- Blocked users table: cached for offline display in BlockedUsersScreen
        CREATE TABLE IF NOT EXISTS blocked_users (
          id          TEXT PRIMARY KEY NOT NULL,
          username    TEXT NOT NULL,
          displayName TEXT NOT NULL,
          avatarUrl   TEXT,
          createdAt   TEXT NOT NULL
        );
      `);
      console.log('[LocalDB] Initialized successfully.');
    } catch (error) {
      console.error('[LocalDB] Init failed:', error);
    }
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  /**
   * insertMessage
   * Saves a message to local storage. Uses INSERT OR REPLACE so calling this
   * with an updated status (e.g. 'sent' → 'delivered') updates in place.
   */
  insertMessage: (message: Message) => {
    try {
      db.runSync(
        `INSERT OR REPLACE INTO messages
           (id, conversationId, senderId, text, createdAt, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.conversationId,
          message.senderId,
          message.text ?? '',
          message.createdAt,
          message.status,
        ],
      );
    } catch (error) {
      console.error('[LocalDB] insertMessage failed:', error);
    }
  },

  /**
   * getMessages
   * Returns paginated messages for a conversation, newest first.
   * page is 0-indexed: page=0 → first 30, page=1 → next 30.
   */
  getMessages: (
    conversationId: string,
    limit: number,
    offset: number,
  ): Message[] => {
    try {
      const stmt = db.prepareSync(
        `SELECT * FROM messages
         WHERE conversationId = $conversationId
         ORDER BY createdAt DESC
         LIMIT $limit OFFSET $offset`,
      );
      const rows = stmt
        .executeSync({
          $conversationId: conversationId,
          $limit: limit,
          $offset: offset,
        })
        .getAllSync();
      return rows as Message[];
    } catch (error) {
      console.error('[LocalDB] getMessages failed:', error);
      return [];
    }
  },

  /**
   * updateMessageStatus
   * Updates a message's delivery status (sending → sent → delivered → read).
   * Called when the backend emits 'messageDelivered' or 'messageRead'.
   */
  updateMessageStatus: (messageId: string, status: Message['status']) => {
    try {
      db.runSync(`UPDATE messages SET status = ? WHERE id = ?`, [
        status,
        messageId,
      ]);
    } catch (error) {
      console.error('[LocalDB] updateMessageStatus failed:', error);
    }
  },

  // ── Conversations ─────────────────────────────────────────────────────────

  /**
   * upsertConversation
   * Inserts or updates a conversation row.
   * Called when syncing from the backend or receiving a new message.
   */
  upsertConversation: (conv: Conversation) => {
    try {
      db.runSync(
        `INSERT OR REPLACE INTO conversations
           (id, participantId, participantName, participantAvatar,
            isOnline, lastMessageText, lastMessageAt, lastSenderId,
            unreadCount, isMuted, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conv.id,
          conv.participant.id,
          conv.participant.displayName,
          conv.participant.avatarUrl ?? null,
          conv.participant.isOnline ? 1 : 0,
          conv.lastMessage?.text ?? null,
          conv.lastMessage?.createdAt ?? null,
          conv.lastMessage?.senderId ?? null,
          conv.unreadCount,
          conv.isMuted ? 1 : 0,
          conv.createdAt,
        ],
      );
    } catch (error) {
      console.error('[LocalDB] upsertConversation failed:', error);
    }
  },

  /**
   * getConversations
   * Returns all conversations sorted by most recent message first.
   * Used in ChatListScreen when offline.
   */
  getConversations: (): Conversation[] => {
    try {
      const rows = db
        .prepareSync(
          `SELECT * FROM conversations ORDER BY lastMessageAt DESC NULLS LAST`,
        )
        .executeSync()
        .getAllSync() as any[];

      return rows.map((r) => ({
        id: r.id,
        participant: {
          id: r.participantId,
          username: r.participantName,
          displayName: r.participantName,
          avatarUrl: r.participantAvatar,
          isOnline: r.isOnline === 1,
        },
        lastMessage: r.lastMessageText
          ? {
              text: r.lastMessageText,
              createdAt: r.lastMessageAt,
              senderId: r.lastSenderId,
            }
          : undefined,
        unreadCount: r.unreadCount,
        isMuted: r.isMuted === 1,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      console.error('[LocalDB] getConversations failed:', error);
      return [];
    }
  },

  /**
   * updateConversationLastMessage
   * Called after inserting a new message to keep the preview up to date.
   */
  updateConversationLastMessage: (
    conversationId: string,
    text: string,
    senderId: string,
    createdAt: string,
    incrementUnread: boolean,
  ) => {
    try {
      db.runSync(
        `UPDATE conversations
         SET lastMessageText = ?,
             lastMessageAt   = ?,
             lastSenderId    = ?,
             unreadCount     = unreadCount + ?
         WHERE id = ?`,
        [text, createdAt, senderId, incrementUnread ? 1 : 0, conversationId],
      );
    } catch (error) {
      console.error('[LocalDB] updateConversationLastMessage failed:', error);
    }
  },

  /**
   * resetUnreadCount
   * Called when user opens a conversation (ChatScreen mount).
   */
  resetUnreadCount: (conversationId: string) => {
    try {
      db.runSync(
        `UPDATE conversations SET unreadCount = 0 WHERE id = ?`,
        [conversationId],
      );
    } catch (error) {
      console.error('[LocalDB] resetUnreadCount failed:', error);
    }
  },

  // ── Blocked users ─────────────────────────────────────────────────────────

  /**
   * upsertBlockedUser
   * Caches a blocked user for offline display in BlockedUsersScreen.
   */
  upsertBlockedUser: (user: BlockedUser) => {
    try {
      db.runSync(
        `INSERT OR REPLACE INTO blocked_users
           (id, username, displayName, avatarUrl, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.displayName,
          user.avatarUrl ?? null,
          user.blockedAt, // maps to BlockedUser.blockedAt from chat.types.ts
        ],
      );
    } catch (error) {
      console.error('[LocalDB] upsertBlockedUser failed:', error);
    }
  },

  /**
   * getBlockedUsers
   * Returns cached blocked users list, newest first.
   */
  getBlockedUsers: (): BlockedUser[] => {
    try {
      const rows = db
        .prepareSync(
          `SELECT * FROM blocked_users ORDER BY createdAt DESC`,
        )
        .executeSync()
        .getAllSync() as any[];

      return rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        blockedAt: r.createdAt,
      }));
    } catch (error) {
      console.error('[LocalDB] getBlockedUsers failed:', error);
      return [];
    }
  },

  removeBlockedUser: (userId: string) => {
    try {
      db.runSync(`DELETE FROM blocked_users WHERE id = ?`, [userId]);
    } catch (error) {
      console.error('[LocalDB] removeBlockedUser failed:', error);
    }
  },

  // ── Utility ───────────────────────────────────────────────────────────────

  /**
   * clearAll
   * Wipes all chat data from local storage.
   * Call this on user logout.
   */
  clearAll: () => {
    try {
      db.execSync(`
        DELETE FROM messages;
        DELETE FROM conversations;
        DELETE FROM blocked_users;
      `);
      console.log('[LocalDB] Cleared all data.');
    } catch (error) {
      console.error('[LocalDB] clearAll failed:', error);
    }
  },
};

// Auto-initialize when this module is first imported
localDatabase.init();
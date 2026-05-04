/**
 * localDatabase.ts
 * 

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

import type { Message, Conversation, BlockedUser } from "../types/chat.types";

// Lazy load SQLite to allow app to run without expo-sqlite installed (dev fallback)
let SQLite: any = null;
try {
  SQLite = require("expo-sqlite");
} catch {
  console.warn(
    "[LocalDB] expo-sqlite not installed. Using in-memory fallback.",
  );
}

// In-memory fallback for development when SQLite is unavailable
let _memoryMessages: any[] = [];
let _memoryConversations: any[] = [];
let _memoryBlockedUsers: any[] = [];

// Open (or create) the database file on the device, or null for in-memory fallback
const db = SQLite?.openDatabaseSync
  ? SQLite.openDatabaseSync("smart_credit_chat.db")
  : null;
const useMemory = !db;

// Helper to wrap db calls with memory fallback
const execSync = (sql: string) => {
  if (useMemory) return;
  db.execSync(sql);
};

const runSync = (sql: string, params?: any[]) => {
  if (useMemory) return;
  db.runSync(sql, params);
};

const prepareSync = (sql: string) => {
  if (useMemory) {
    return {
      executeSync: () => ({ getAllSync: () => [] }),
    };
  }
  return db.prepareSync(sql);
};

export const localDatabase = {
  /**
   * init
   * Creates all tables and indexes if they don't exist.
   * Call this ONCE when the app starts (e.g. in App.tsx useEffect).
   */
  init: () => {
    if (useMemory) {
      console.log(
        "[LocalDB] Using in-memory storage (expo-sqlite not available)",
      );
      return;
    }
    try {
      execSync(`
        CREATE TABLE IF NOT EXISTS messages (
          id              TEXT PRIMARY KEY NOT NULL,
          conversationId  TEXT NOT NULL,
          senderId        TEXT NOT NULL,
          text            TEXT NOT NULL,
          createdAt       TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'sending'
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversationId, createdAt DESC);
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
        CREATE TABLE IF NOT EXISTS blocked_users (
          id          TEXT PRIMARY KEY NOT NULL,
          username    TEXT NOT NULL,
          displayName TEXT NOT NULL,
          avatarUrl   TEXT,
          createdAt   TEXT NOT NULL
        );
      `);
      console.log("[LocalDB] Initialized successfully.");
    } catch (error) {
      console.error("[LocalDB] Init failed:", error);
    }
  },

  // Messages 


  insertMessage: (message: Message) => {
    if (useMemory) {
      _memoryMessages = _memoryMessages.filter((m) => m.id !== message.id);
      _memoryMessages.push(message);
      return;
    }
    try {
      runSync(
        `INSERT OR REPLACE INTO messages (id, conversationId, senderId, text, createdAt, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.conversationId,
          message.senderId,
          message.text ?? "",
          message.createdAt,
          message.status,
        ],
      );
    } catch (error) {
      console.error("[LocalDB] insertMessage failed:", error);
    }
  },

  getMessages: (
    conversationId: string,
    limit: number,
    offset: number,
  ): Message[] => {
    if (useMemory) {
      return _memoryMessages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(offset, offset + limit);
    }
    try {
      const stmt = prepareSync(
        `SELECT * FROM messages WHERE conversationId = $conversationId ORDER BY createdAt DESC LIMIT $limit OFFSET $offset`,
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
      console.error("[LocalDB] getMessages failed:", error);
      return [];
    }
  },

  updateMessageStatus: (messageId: string, status: Message["status"]) => {
    if (useMemory) {
      _memoryMessages = _memoryMessages.map((m) =>
        m.id === messageId ? { ...m, status } : m,
      );
      return;
    }
    try {
      runSync(`UPDATE messages SET status = ? WHERE id = ?`, [
        status,
        messageId,
      ]);
    } catch (error) {
      console.error("[LocalDB] updateMessageStatus failed:", error);
    }
  },

  // Conversations 


  upsertConversation: (conv: Conversation) => {
    if (useMemory) {
      _memoryConversations = _memoryConversations.filter(
        (c) => c.id !== conv.id,
      );
      _memoryConversations.push(conv);
      return;
    }
    try {
      if (!conv || !conv.participant) {
        console.warn("[LocalDB] Cannot upsert conversation: participant is undefined");
        return;
      }
      runSync(
        `INSERT OR REPLACE INTO conversations
         (id, participantId, participantName, participantAvatar, isOnline, lastMessageText,
          lastMessageAt, lastSenderId, unreadCount, isMuted, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conv.id,
          conv.participant.id,
          conv.participant.displayName ?? conv.participant.username ?? "Unknown",
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
      console.error("[LocalDB] upsertConversation failed:", error);
    }
  },

  getConversations: (): Conversation[] => {
    if (useMemory) {
      return _memoryConversations;
    }
    try {
      const rows = prepareSync(
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
      console.error("[LocalDB] getConversations failed:", error);
      return [];
    }
  },

  updateConversationLastMessage: (
    conversationId: string,
    text: string,
    senderId: string,
    createdAt: string,
    incrementUnread: boolean,
  ) => {
    if (useMemory) {
      _memoryConversations = _memoryConversations.map((c) =>
        c.id === conversationId
          ? {
            ...c,
            lastMessage: { text, createdAt, senderId },
            unreadCount: incrementUnread
              ? (c.unreadCount ?? 0) + 1
              : c.unreadCount,
          }
          : c,
      );
      return;
    }
    try {
      runSync(
        `UPDATE conversations SET lastMessageText = ?, lastMessageAt = ?, lastSenderId = ?, unreadCount = unreadCount + ? WHERE id = ?`,
        [text, createdAt, senderId, incrementUnread ? 1 : 0, conversationId],
      );
    } catch (error) {
      console.error("[LocalDB] updateConversationLastMessage failed:", error);
    }
  },

  resetUnreadCount: (conversationId: string) => {
    if (useMemory) {
      _memoryConversations = _memoryConversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      );
      return;
    }
    try {
      runSync(`UPDATE conversations SET unreadCount = 0 WHERE id = ?`, [
        conversationId,
      ]);
    } catch (error) {
      console.error("[LocalDB] resetUnreadCount failed:", error);
    }
  },

  // Blocked users 


  upsertBlockedUser: (user: BlockedUser) => {
    if (useMemory) {
      _memoryBlockedUsers = _memoryBlockedUsers.filter((u) => u.id !== user.id);
      _memoryBlockedUsers.push(user);
      return;
    }
    try {
      runSync(
        `INSERT OR REPLACE INTO blocked_users (id, username, displayName, avatarUrl, createdAt) VALUES (?, ?, ?, ?, ?)`,
        [
          user.id,
          user.username,
          user.displayName,
          user.avatarUrl ?? null,
          user.blockedAt,
        ],
      );
    } catch (error) {
      console.error("[LocalDB] upsertBlockedUser failed:", error);
    }
  },

  getBlockedUsers: (): BlockedUser[] => {
    if (useMemory) {
      return _memoryBlockedUsers;
    }
    try {
      const rows = prepareSync(
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
      console.error("[LocalDB] getBlockedUsers failed:", error);
      return [];
    }
  },

  removeBlockedUser: (userId: string) => {
    if (useMemory) {
      _memoryBlockedUsers = _memoryBlockedUsers.filter((u) => u.id !== userId);
      return;
    }
    try {
      runSync(`DELETE FROM blocked_users WHERE id = ?`, [userId]);
    } catch (error) {
      console.error("[LocalDB] removeBlockedUser failed:", error);
    }
  },

  clearAll: () => {
    if (useMemory) {
      _memoryMessages = [];
      _memoryConversations = [];
      _memoryBlockedUsers = [];
      return;
    }
    try {
      execSync(
        `DELETE FROM messages; DELETE FROM conversations; DELETE FROM blocked_users;`,
      );
      console.log("[LocalDB] Cleared all data.");
    } catch (error) {
      console.error("[LocalDB] clearAll failed:", error);
    }
  },
};

// Auto-initialize when this module is first imported
localDatabase.init();

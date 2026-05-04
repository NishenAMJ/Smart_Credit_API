/**
 * conversationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps to backend ConversationsController endpoints.
 * Used by: ChatListScreen, ChatScreen, ChatInfoScreen, NewChatScreen.
 */

import { api } from "./api";
import { localDatabase } from "./localDatabase";
import type { Conversation } from "../types/chat.types";

export const conversationService = {
  /**
   * getAll
   * Fetches conversation list from backend and caches each in local SQLite.
   * If offline, ChatListScreen falls back to localDatabase.getConversations().
   */
  getAll: async (): Promise<Conversation[]> => {
    const data: Conversation[] = await api.get("/conversations");
    // Sync to local DB so the list is available offline
    data.forEach((conv) => localDatabase.upsertConversation(conv));
    return data;
  },

  /**
   * start
   * Creates or retrieves the conversation with targetUserId.
   * Maps to POST /conversations — called from NewChatScreen.
   */
  start: async (targetUserId: string): Promise<Conversation> => {
    return api.post("/conversations", { targetUserId });
  },

  /**
   * getOne
   * Fetches a single conversation by ID.
   */
  getOne: async (conversationId: string): Promise<Conversation> => {
    return api.get(`/conversations/${conversationId}`);
  },

  /**
   * markAsRead
   * Resets unread count to 0 on the backend and in local DB.
   * Called when user opens a chat.
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    localDatabase.resetUnreadCount(conversationId); // immediate local update
    await api.patch(`/conversations/${conversationId}/read`).catch(() => {
      // Non-fatal: local DB is already updated
    });
  },

  /**
   * mute
   * Toggles mute state for a conversation.
   * Called from ChatInfoScreen.
   */
  mute: async (conversationId: string, muted: boolean): Promise<void> => {
    return api.patch(`/conversations/${conversationId}/mute`, { muted });
  },

  /**
   * delete
   * Permanently deletes the conversation.
   * Called from ChatInfoScreen.
   */
  delete: async (conversationId: string): Promise<void> => {
    return api.delete(`/conversations/${conversationId}`);
  },
};

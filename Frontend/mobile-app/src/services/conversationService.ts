/**
 * conversationService.ts
 *
 * FIXES:
 * 1. Added start() method — NewChatScreen calls conversationService.start(userId)
 *    but the old chatService.ts had this under userService.startConversation().
 *
 * 2. Removed ?userId=... query params from all URLs.
 *    The backend reads userId from the JWT via @CurrentUser() → req.user.sub.
 *    Sending userId in query params does nothing and was dead code.
 *
 * Auth: api.ts axios interceptor adds Authorization: Bearer <token> automatically.
 */

import { api } from "./api";
import { localDatabase } from "./localDatabase";
import type { Conversation } from "../types/chat.types";

export const conversationService = {
  /**
   * getAll
   * GET /conversations — returns only this user's conversations (scoped by JWT).
   */
  getAll: async (): Promise<Conversation[]> => {
    const data: Conversation[] = await api.get("/conversations");
    // Cache locally for offline access
    data.forEach((conv) => localDatabase.upsertConversation(conv));
    return data;
  },

  /**
   * start
   * POST /conversations — creates or returns existing conversation with targetUserId.
   * Called from NewChatScreen when user taps "Message" on a search result.
   */
  start: async (targetUserId: string): Promise<Conversation> => {
    return api.post("/conversations", { targetUserId });
  },

  /**
   * getOne
   * GET /conversations/:id — fetch a single conversation.
   */
  getOne: async (conversationId: string): Promise<Conversation> => {
    return api.get(`/conversations/${conversationId}`);
  },

  /**
   * markAsRead
   * PATCH /conversations/:id/read — resets this user's unread count to 0.
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    localDatabase.resetUnreadCount(conversationId); // instant local update
    await api.patch(`/conversations/${conversationId}/read`).catch(() => {});
  },

  /**
   * mute
   * PATCH /conversations/:id/mute — toggle mute for this user.
   */
  mute: async (conversationId: string, muted: boolean): Promise<void> => {
    return api.patch(`/conversations/${conversationId}/mute`, { muted });
  },

  /**
   * delete
   * DELETE /conversations/:id — permanently delete conversation.
   */
  delete: async (conversationId: string): Promise<void> => {
    return api.delete(`/conversations/${conversationId}`);
  },
};
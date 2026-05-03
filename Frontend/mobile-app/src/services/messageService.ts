/**
 * messageService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-FIRST message operations.
 *
 * Reading:  always from local SQLite (instant, no loading)
 * Sending:  save locally first → route via WebSocket → update status on ack
 * Seeding:  on first install, fetch from backend Firestore to populate SQLite
 */

import { api } from "./api";
import { localDatabase } from "./localDatabase";
import { chatSocket } from "./socketService";
import { getCurrentUserId } from "./api";
import type { Message } from "../types/chat.types";
import { v4 as uuidv4 } from "uuid";

export const messageService = {
  /**
   * list
   * Returns paginated messages from local SQLite (instant, offline-capable).
   * page is 0-indexed.
   */
  list: (
    conversationId: string,
    { page = 0, limit = 30 }: { page?: number; limit?: number } = {},
  ): Message[] => {
    return localDatabase.getMessages(conversationId, limit, page * limit);
  },

  /**
   * seedFromBackend
   * Fetches messages from Firestore and saves them to local SQLite.
   * Call this ONCE on first install or after re-install.
   * After seeding, list() reads from SQLite directly.
   */
  seedFromBackend: async (
    conversationId: string,
    page = 0,
    limit = 30,
  ): Promise<Message[]> => {
    const data: Message[] = await api.get(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    );
    // Persist each fetched message locally
    data.forEach((msg) => localDatabase.insertMessage(msg));
    return data;
  },

  /**
   * send
   * LOCAL-FIRST send flow:
   *   1. Generate a UUID for the message
   *   2. Save to local SQLite immediately with status:'sending'
   *   3. Emit to WebSocket gateway
   *   4. If socket not connected → fall back to HTTP POST
   *
   * Returns the optimistic message so the UI can render it instantly.
   */
  send: async (
    conversationId: string,
    recipientId: string,
    text: string,
  ): Promise<Message> => {
    const senderId = getCurrentUserId();
    const message: Message = {
      id: uuidv4(),
      conversationId,
      senderId,
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    // Step 1: Save locally immediately (instant UI feedback)
    localDatabase.insertMessage(message);

    // Step 2: Update conversation preview in local DB
    localDatabase.updateConversationLastMessage(
      conversationId,
      text,
      senderId,
      message.createdAt,
      false, // don't increment unread for own messages
    );

    // Step 3: Try WebSocket first (preferred path)
    const sent = chatSocket.sendMessage({
      conversationId,
      recipientId,
      message: {
        id: message.id,
        senderId,
        text,
        createdAt: message.createdAt,
      },
    });

    if (!sent) {
      // Step 4: WebSocket unavailable — HTTP fallback
      try {
        await api.post(`/conversations/${conversationId}/messages`, { text });
        localDatabase.updateMessageStatus(message.id, "sent");
      } catch {
        // Keep as 'sending' so the UI shows a retry option
        console.warn(
          "[messageService] HTTP fallback also failed for",
          message.id,
        );
      }
    }

    return message;
  },
};

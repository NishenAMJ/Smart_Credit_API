/**
 * messageService.ts
 *
 * FIX: Replaced `import { v4 as uuidv4 } from 'uuid'` with a custom
 * generateId() function. The uuid package calls crypto.getRandomValues()
 * which is not available in React Native's JS environment without a polyfill,
 * causing the error:
 *   "crypto.getRandomValues() not supported"
 *
 * generateId() uses Math.random() + Date.now() which is sufficient for
 * generating unique local message IDs before they reach the backend.
 */

import { api } from "./api";
import { localDatabase } from "./localDatabase";
import { chatSocket } from "./socketService";
import { getCurrentUserId } from "./api";
import type { Message } from "../types/chat.types";

/**
 * Generates a unique ID without needing crypto.getRandomValues().
 * Format: timestamp-randomhex (e.g. "1719556234123-a3f8c2d1e9b4")
 * Collision probability is negligible for local message IDs.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).slice(2, 9);
  const random2 = Math.random().toString(36).slice(2, 9);
  return `${timestamp}-${random1}-${random2}`;
}

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
    data.forEach((msg) => localDatabase.insertMessage(msg));
    return data;
  },

  /**
   * send
   * LOCAL-FIRST send flow:
   *   1. Generate a unique ID for the message (no crypto needed)
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

    if (!senderId) {
      throw new Error("User not authenticated — cannot send message");
    }

    const message: Message = {
      id: generateId(), // ✅ FIXED: no longer uses uuidv4()
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

    if (sent) {
      console.log("[messageService] Message sent via WebSocket:", message.id);
    } else {
      // Step 4: WebSocket unavailable — HTTP fallback
      console.warn("[messageService] Socket not connected, trying HTTP fallback...");
      try {
        await api.post(`/conversations/${conversationId}/messages`, { text });
        localDatabase.updateMessageStatus(message.id, "sent");
        console.log("[messageService] HTTP fallback succeeded:", message.id);
      } catch (err) {
        console.warn("[messageService] HTTP fallback also failed:", message.id, err);
        // Keep as 'sending' — UI shows pending state with retry option
      }
    }

    return message;
  },
};
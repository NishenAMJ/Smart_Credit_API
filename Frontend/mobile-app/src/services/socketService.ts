/**
 * chatSocket.ts
 * 

 * Real-time WebSocket client for the local-first chat system.
 *
 * Architecture:
 *   - Connect once on login, disconnect on logout
 *   - The gateway routes messages between users — it does NOT store them
 *   - Every incoming message is saved to localDatabase (SQLite) here
 *   - UI components subscribe via on() and unsubscribe via off()
 *
 * TEMP AUTH:
 * When real auth is ready, call chatSocket.connect(realUserId) after login.
 */

import { localDatabase } from "./localDatabase";
import { getCurrentUserId } from "./api";
import { getApiBaseUrl } from "../api/base-url";
import type { Message } from "../types/chat.types";

let io: any;
try {
  const socketIO = require("socket.io-client");
  io = socketIO.io;
} catch {
  console.warn("[ChatSocket] socket.io-client not installed. Chat disabled.");
}

// Event type map 


export type SocketEventMap = {
  receiveMessage: Message;
  messageDelivered: {
    messageId: string;
    conversationId: string;
    status: Message["status"];
  };
  userTyping: { conversationId: string; userId: string; isTyping: boolean };
  messageRead: {
    conversationId: string;
    messageId: string;
    readBy: string;
    readAt: string;
  };
  userOnline: { userId: string; isOnline: boolean };
  messageFailed: { messageId: string; reason: string };
  socketConnected: { status: string };
  socketDisconnected: { reason: string };
  socketError: { error: string };
};

// ChatSocket class 


class ChatSocket {
  private socket: any = null;

  /**
   * Stores named handler functions per event so off() can remove the exact
   * function reference (not all listeners for that event globally).
   * Map<eventName, Map<handlerFn, wrappedFn>>
   */
  private handlerMap = new Map<string, Map<Function, Function>>();

  // Lifecycle 


  /**
   * connect
   * Call this on login. Connects to the NestJS WebSocket gateway.
   * userId is sent in the handshake so the backend can identify this socket.
   *
   * @param userId  The logged-in user's ID.
   */
  connect(userId?: string) {
    if (this.socket?.connected) {
      console.log("[ChatSocket] Already connected.");
      return;
    }

    if (!io) {
      console.warn("[ChatSocket] socket.io-client not available.");
      return;
    }

    const resolvedUserId = userId ?? getCurrentUserId();

    // Backend WebSocket URL — same host as REST API, no /api prefix
    const WS_URL = getApiBaseUrl().replace(/\/api$/, "");

    this.socket = io(WS_URL, {
      auth: {
        userId: resolvedUserId, // read by ChatGateway handleConnection
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Core socket lifecycle events 


    this.socket.on("connect", () => {
      console.log("[ChatSocket] Connected. Socket ID:", this.socket.id);
      this._emit("socketConnected", { status: "connected" });
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("[ChatSocket] Disconnected:", reason);
      this._emit("socketDisconnected", { reason });
    });

    this.socket.on("connect_error", (err: any) => {
      console.error("[ChatSocket] Connection error:", err?.message);
      this._emit("socketError", { error: err?.message ?? "Unknown error" });
    });

    // Incoming message — save to SQLite immediately 

    this.socket.on("receiveMessage", (message: Message) => {
      // 1. Persist to local SQLite (source of truth)
      localDatabase.insertMessage({ ...message, status: "delivered" });

      // 2. Update conversation preview in local DB
      localDatabase.updateConversationLastMessage(
        message.conversationId,
        message.text,
        message.senderId,
        message.createdAt,
        true, // increment unread count
      );

      // 3. Notify UI subscribers (ChatScreen, ChatListScreen)
      this._emit("receiveMessage", { ...message, status: "delivered" });

      // 4. Send delivery ack back to backend so sender sees 'delivered' tick
      this.socket?.emit("messageDelivered", {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
      });
    });

    // Delivery acknowledgement — update local message status 

    this.socket.on(
      "messageDelivered",
      (data: {
        messageId: string;
        conversationId: string;
        status: Message["status"];
      }) => {
        // Update SQLite so the tick icon reflects 'sent' or 'delivered'
        localDatabase.updateMessageStatus(data.messageId, data.status);
        this._emit("messageDelivered", data);
      },
    );

    // Typing indicator 

    this.socket.on("userTyping", (data: SocketEventMap["userTyping"]) => {
      this._emit("userTyping", data);
    });

    // Read receipt — update local status to 'read' 

    this.socket.on("messageRead", (data: SocketEventMap["messageRead"]) => {
      localDatabase.updateMessageStatus(data.messageId, "read");
      this._emit("messageRead", data);
    });

    // Presence 

    this.socket.on("userOnline", (data: SocketEventMap["userOnline"]) => {
      this._emit("userOnline", data);
    });

    // Failed message 

    this.socket.on("messageFailed", (data: SocketEventMap["messageFailed"]) => {
      localDatabase.updateMessageStatus(data.messageId, "sending"); // keep as pending
      this._emit("messageFailed", data);
    });

    console.log("[ChatSocket] Connecting as", resolvedUserId, "to", WS_URL);
  }

  /** disconnect — call on logout */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.handlerMap.clear();
      console.log("[ChatSocket] Disconnected and cleaned up.");
    }
  }

  // Room management 


  /** joinConversation — tells the backend you're actively viewing this chat */
  joinConversation(conversationId: string) {
    this.socket?.emit("joinConversation", { conversationId });
  }

  /** leaveConversation — tells the backend you've left the chat screen */
  leaveConversation(conversationId: string) {
    this.socket?.emit("leaveConversation", { conversationId });
  }

  // Message sending 


  /**
   * sendMessage
   * Emits a message to the backend gateway for routing.
   * The caller must already have saved the message locally with status:'sending'.
   */
  sendMessage(payload: {
    conversationId: string;
    recipientId: string;
    message: {
      id: string;
      senderId: string;
      text: string;
      createdAt: string;
    };
  }) {
    if (!this.socket?.connected) {
      console.warn("[ChatSocket] Cannot send — not connected.");
      return false;
    }
    this.socket.emit("sendMessage", payload);
    return true;
  }

  // Typing indicator 


  sendTyping(conversationId: string, recipientId: string, isTyping: boolean) {
    this.socket?.emit("typing", { conversationId, recipientId, isTyping });
  }

  // Read receipt 


  markMessageRead(conversationId: string, messageId: string, senderId: string) {
    this.socket?.emit("markRead", { conversationId, messageId, senderId });
  }

  // Event subscription 


  /**
   * on — subscribe to a socket event.
   * Keeps a reference to the handler so off() can remove exactly this handler
   * without touching other subscribers to the same event.
   */
  on<K extends keyof SocketEventMap>(
    event: K,
    handler: (data: SocketEventMap[K]) => void,
  ) {
    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }
    // Store handler → handler mapping (identity for internal _emit use)
    this.handlerMap.get(event)!.set(handler, handler);
  }

  /**
   * off — unsubscribe a specific handler.
   * Always pass the exact same function reference used in on().
   */
  off<K extends keyof SocketEventMap>(
    event: K,
    handler: (data: SocketEventMap[K]) => void,
  ) {
    this.handlerMap.get(event)?.delete(handler);
  }

  // Internal emit 


  /** _emit — calls all registered handlers for an internal event */
  private _emit<K extends keyof SocketEventMap>(
    event: K,
    data: SocketEventMap[K],
  ) {
    const handlers = this.handlerMap.get(event);
    if (handlers) {
      handlers.forEach((handler) => (handler as Function)(data));
    }
  }

  // Status helpers 


  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      id: this.socket?.id ?? "N/A",
    };
  }
}

// Export a single shared instance used across the entire app
export const chatSocket = new ChatSocket();

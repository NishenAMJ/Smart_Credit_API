/**
 * socketService.ts
 *
 * KEY FIX: connect() now takes the JWT token and sends it as
 * auth: { token: 'Bearer ...' } in the handshake.
 *
 * ChatGateway.handleConnection() reads handshake.auth.token,
 * verifies it with JwtService.verify(), and extracts the real
 * userId from payload.sub — it never trusts a raw userId from the client.
 *
 * Call: chatSocket.connect(accessToken)  ← the JWT from login response
 */

import { localDatabase } from "./localDatabase";
import { getApiBaseUrl } from "../api/base-url";
import type { Message } from "../types/chat.types";

let io: any;
try {
  const socketIO = require("socket.io-client");
  io = socketIO.io;
} catch {
  console.warn("[ChatSocket] socket.io-client not installed. Chat disabled.");
}

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

class ChatSocket {
  private socket: any = null;
  private handlerMap = new Map<string, Map<Function, Function>>();

  /**
   * connect
   * Call immediately after login with the accessToken from the auth response.
   *
   * @param token — JWT accessToken from login (e.g. response.data.accessToken)
   */
  connect(token: string) {
    if (this.socket?.connected) {
      console.log("[ChatSocket] Already connected.");
      return;
    }

    if (!io) {
      console.warn("[ChatSocket] socket.io-client not available.");
      return;
    }

    if (!token) {
      console.warn("[ChatSocket] No token provided — cannot connect.");
      return;
    }

    // WebSocket URL = base URL without /api suffix
    const WS_URL = getApiBaseUrl().replace(/\/api$/, "");

    this.socket = io(WS_URL, {
      auth: {
        // ✅ FIXED: send the JWT token, not a raw userId.
        // ChatGateway reads this, strips 'Bearer ', verifies with JwtService,
        // and extracts userId from payload.sub.
        token: `Bearer ${token}`,
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

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

    // Incoming message — persist to SQLite immediately
    this.socket.on("receiveMessage", (message: Message) => {
      localDatabase.insertMessage({ ...message, status: "delivered" });
      localDatabase.updateConversationLastMessage(
        message.conversationId,
        message.text,
        message.senderId,
        message.createdAt,
        true,
      );
      this._emit("receiveMessage", { ...message, status: "delivered" });

      // Ack delivery back to backend so sender sees delivered tick
      this.socket?.emit("messageDelivered", {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
      });
    });

    this.socket.on(
      "messageDelivered",
      (data: {
        messageId: string;
        conversationId: string;
        status: Message["status"];
      }) => {
        localDatabase.updateMessageStatus(data.messageId, data.status);
        this._emit("messageDelivered", data);
      },
    );

    this.socket.on("userTyping", (data: SocketEventMap["userTyping"]) => {
      this._emit("userTyping", data);
    });

    this.socket.on("messageRead", (data: SocketEventMap["messageRead"]) => {
      localDatabase.updateMessageStatus(data.messageId, "read");
      this._emit("messageRead", data);
    });

    this.socket.on("userOnline", (data: SocketEventMap["userOnline"]) => {
      this._emit("userOnline", data);
    });

    this.socket.on("messageFailed", (data: SocketEventMap["messageFailed"]) => {
      this._emit("messageFailed", data);
    });

    console.log("[ChatSocket] Connecting to", WS_URL);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.handlerMap.clear();
      console.log("[ChatSocket] Disconnected and cleaned up.");
    }
  }

  joinConversation(conversationId: string) {
    this.socket?.emit("joinConversation", { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit("leaveConversation", { conversationId });
  }

  sendMessage(payload: {
    conversationId: string;
    recipientId: string;
    message: {
      id: string;
      senderId: string;
      text: string;
      createdAt: string;
    };
  }): boolean {
    if (!this.socket?.connected) {
      console.warn("[ChatSocket] Cannot send — not connected.");
      return false;
    }
    this.socket.emit("sendMessage", payload);
    return true;
  }

  sendTyping(conversationId: string, recipientId: string, isTyping: boolean) {
    this.socket?.emit("typing", { conversationId, recipientId, isTyping });
  }

  markMessageRead(
    conversationId: string,
    messageId: string,
    senderId: string,
  ) {
    this.socket?.emit("markRead", { conversationId, messageId, senderId });
  }

  on<K extends keyof SocketEventMap>(
    event: K,
    handler: (data: SocketEventMap[K]) => void,
  ) {
    if (!this.handlerMap.has(event)) {
      this.handlerMap.set(event, new Map());
    }
    this.handlerMap.get(event)!.set(handler, handler);
  }

  off<K extends keyof SocketEventMap>(
    event: K,
    handler: (data: SocketEventMap[K]) => void,
  ) {
    this.handlerMap.get(event)?.delete(handler);
  }

  private _emit<K extends keyof SocketEventMap>(
    event: K,
    data: SocketEventMap[K],
  ) {
    const handlers = this.handlerMap.get(event);
    if (handlers) {
      handlers.forEach((handler) => (handler as Function)(data));
    }
  }

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

export const chatSocket = new ChatSocket();
/**
 * CHAT INTEGRATION GUIDE

 *
 * This guide shows how the chat backend (NestJS) connects to the chat frontend (React Native)
 */

import { useEffect, useState } from "react";
import { chatSocket } from "../services/socketService";
import {
  conversationService,
  messageService,
  userService,
} from "../services/chatService";
import type { Conversation, Message, User } from "../types/chat.types";

export interface ChatAggregatedData {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // conversationId -> messages
  typingUsers: Record<string, Set<string>>; // conversationId -> set of userIds typing
  onlineUsers: Set<string>; // userId set
}



// Step 1: Initialize socket connection with JWT token
export function useChatSetup(jwtToken: string | null) {
  const [data, setData] = useState<ChatAggregatedData>({
    conversations: [],
    messages: {},
    typingUsers: {},
    onlineUsers: new Set(),
  });

  useEffect(() => {
    if (!jwtToken) return;

    // Connect socket with JWT token
    chatSocket.connect(jwtToken);

    // Listen to socket events
    chatSocket.on("receiveMessage", (message: Message) => {
      setData((prev) => ({
        ...prev,
        messages: {
          ...prev.messages,
          [message.conversationId]: [
            ...(prev.messages[message.conversationId] || []),
            message,
          ],
        },
      }));
    });

    chatSocket.on("userTyping", (data) => {
      const { conversationId, userId, isTyping } = data;
      setData((prev) => ({
        ...prev,
        typingUsers: {
          ...prev.typingUsers,
          [conversationId]: isTyping
            ? new Set([...(prev.typingUsers[conversationId] || []), userId])
            : new Set(
              [...(prev.typingUsers[conversationId] || [])].filter(
                (id) => id !== userId,
              ),
            ),
        },
      }));
    });

    chatSocket.on("userOnline", (presenceData) => {
      const { userId, isOnline } = presenceData;
      setData((prev) => ({
        ...prev,
        onlineUsers: isOnline
          ? new Set([...prev.onlineUsers, userId])
          : new Set([...prev.onlineUsers].filter((id) => id !== userId)),
      }));
    });

    return () => {
      chatSocket.disconnect();
    };
  }, [jwtToken]);

  return data;
}



// Get all conversations for current user
export async function loadConversations() {
  try {
    const conversations = await conversationService.getAll();
    return conversations;
  } catch (error) {
    console.error("Failed to load conversations:", error);
  }
}

// Start a new conversation with a user
export async function startChat(targetUserId: string) {
  try {
    const conversation = await userService.startConversation(targetUserId);
    return conversation;
  } catch (error) {
    console.error("Failed to start conversation:", error);
  }
}

// Send a message via REST API
export async function sendMessage(conversationId: string, text: string) {
  try {
    const message = await messageService.send(conversationId, text);
    // Optionally emit via socket for real-time delivery
    return message;
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}

// Load messages for a conversation
export async function loadMessages(
  conversationId: string,
  page = 0,
  limit = 30,
) {
  try {
    const messages = await conversationService.getMessages(conversationId, {
      page,
      limit,
    });
    return messages;
  } catch (error) {
    console.error("Failed to load messages:", error);
  }
}

// Mark conversation as read
export async function markConversationRead(conversationId: string) {
  try {
    await conversationService.markAsRead(conversationId);
  } catch (error) {
    console.error("Failed to mark as read:", error);
  }
}

// Mute/unmute conversation
export async function toggleMute(conversationId: string, muted: boolean) {
  try {
    await conversationService.mute(conversationId, muted);
  } catch (error) {
    console.error("Failed to toggle mute:", error);
  }
}



// Join a conversation room for real-time updates
export function joinConversation(conversationId: string) {
  chatSocket.joinConversation(conversationId);
}

// Leave a conversation room
export function leaveConversation(conversationId: string) {
  chatSocket.leaveConversation(conversationId);
}

// Send typing indicator
export function sendTyping(
  conversationId: string,
  recipientId: string,
  isTyping: boolean,
) {
  chatSocket.sendTyping(conversationId, recipientId, isTyping);
}

/**
 * CONNECTION STATUS
 * ====================
 */

export function isSocketConnected() {
  return chatSocket.isConnected;
}



export function ChatScreen({ conversationId, userId, token }: any) {
  const chatData = useChatSetup(token);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    // Join room when conversation loads
    joinConversation(conversationId);
    return () => {
      leaveConversation(conversationId);
    };
  }, [conversationId]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      // Send via REST API
      const message = await sendMessage(conversationId, messageText);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send:", error);
    }
  };

  const handleTyping = (recipientId: string, isTyping: boolean) => {
    sendTyping(conversationId, recipientId, isTyping);
  };

  const messages = chatData.messages[conversationId] || [];

  return {
    messages,
    typingUsers: chatData.typingUsers[conversationId] || new Set(),
    onlineUsers: chatData.onlineUsers,
    handlers: {
      sendMessage: handleSendMessage,
      setMessageText,
      handleTyping,
    },
  };
}


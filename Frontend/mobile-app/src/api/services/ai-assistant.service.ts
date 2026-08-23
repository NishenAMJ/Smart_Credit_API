/** @format */

import apiClient from "../axios.config";

export type AiConversation = {
  conversationId: string;
  title: string;
  userRole: "borrower" | "lender";
  messageCount: number;
  updatedAt: string | null;
};

export type AiMessage = {
  messageId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "failed";
  createdAt: string | null;
};

const basePath = "/api/ai-assistant";

export const aiAssistantService = {
  async createConversation(): Promise<AiConversation> {
    const response = await apiClient.post<{ conversation: AiConversation }>(
      `${basePath}/conversations`,
      {},
    );
    return response.data.conversation;
  },

  async listConversations(): Promise<AiConversation[]> {
    const response = await apiClient.get<{ conversations: AiConversation[] }>(
      `${basePath}/conversations`,
    );
    return response.data.conversations;
  },

  async listMessages(conversationId: string): Promise<AiMessage[]> {
    const response = await apiClient.get<{ messages: AiMessage[] }>(
      `${basePath}/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    return response.data.messages;
  },

  async sendMessage(conversationId: string, content: string) {
    const response = await apiClient.post<{
      userMessage: AiMessage;
      assistantMessage: AiMessage;
    }>(
      `${basePath}/conversations/${encodeURIComponent(conversationId)}/messages`,
      { content },
    );
    return response.data;
  },

  async archiveConversation(conversationId: string): Promise<void> {
    await apiClient.delete(
      `${basePath}/conversations/${encodeURIComponent(conversationId)}`,
    );
  },
};

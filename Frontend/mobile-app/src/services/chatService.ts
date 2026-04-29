import axios, { AxiosError } from 'axios';
import { Conversation, Message, User, BlockedUser } from '../types/chat.types';

/**
 * API client for chat REST endpoints
 * Configured to communicate with NestJS Backend
 * 
 * Backend Endpoints:
 * - GET /conversations - list conversations for user
 * - POST /conversations - start new 1-on-1 conversation
 * - GET /conversations/:id - get single conversation
 * - PATCH /conversations/:id/read - mark conversation as read
 * - PATCH /conversations/:id/mute - mute/unmute conversation
 * - DELETE /conversations/:id - delete conversation
 * - GET /conversations/:id/messages - list messages with pagination
 * - POST /conversations/:id/messages - send text message
 */

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
});

/**
 * Request interceptor: Add JWT token to Authorization header
 * Expects token to be available in your auth store
 */
api.interceptors.request.use((config) => {
  // Get token from your auth store (adjust based on your auth implementation)
  // Example: const token = useAuthStore.getState().token;
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Temporary: You can manually set token after getting it from auth
  const token = localStorage?.getItem?.('authToken') ?? sessionStorage?.getItem?.('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

/**
 * Response interceptor: Handle errors gracefully
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const message = error.response?.data?.message ?? error.message;
    console.error('[ChatAPI] Error:', message);
    return Promise.reject(error);
  },
);

/**
 * Conversation Service
 * Handle conversation list and management
 */
export const conversationService = {
  /**
   * Get all conversations for current user
   */
  getAll: async (): Promise<Conversation[]> => {
    try {
      const response = await api.get('/conversations');
      return response.data;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      throw error;
    }
  },

  /**
   * Get paginated messages from a conversation
   * @param conversationId - ID of conversation
   * @param params - Pagination params { page: 0-indexed, limit: 30 }
   */
  getMessages: async (
    conversationId: string,
    params: { page: number; limit: number },
  ): Promise<Message[]> => {
    try {
      const response = await api.get(
        `/conversations/${conversationId}/messages`,
        { params },
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to load messages for ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Mark conversation as read (reset unread count)
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      await api.patch(`/conversations/${conversationId}/read`);
    } catch (error) {
      console.error(`Failed to mark ${conversationId} as read:`, error);
      throw error;
    }
  },

  /**
   * Delete a conversation
   */
  delete: async (conversationId: string): Promise<void> => {
    try {
      await api.delete(`/conversations/${conversationId}`);
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  },

  /**
   * Mute or unmute a conversation
   * @param conversationId - ID of conversation
   * @param muted - true to mute, false to unmute
   */
  mute: async (conversationId: string, muted: boolean): Promise<void> => {
    try {
      await api.patch(`/conversations/${conversationId}/mute`, { muted });
    } catch (error) {
      console.error(
        `Failed to ${muted ? 'mute' : 'unmute'} conversation:`,
        error,
      );
      throw error;
    }
  },
};

/**
 * Message Service
 * Handle message sending
 */
export const messageService = {
  /**
   * Send text message to a conversation
   * Use this for REST-based message sending (alternative to WebSocket)
   */
  send: async (
    conversationId: string,
    text: string,
  ): Promise<Message> => {
    try {
      const response = await api.post(
        `/conversations/${conversationId}/messages`,
        { text },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  /**
   * Upload media (image/video) to a conversation
   * @param conversationId - ID of conversation
   * @param file - File object (image or video)
   */
  uploadMedia: async (
    conversationId: string,
    file: File,
  ): Promise<Message> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post(
        `/conversations/${conversationId}/messages/upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  },
};

/**
 * User Service
 * Handle user search and blocking
 */
export const userService = {
  /**
   * Search for users by name or email
   * @param query - Search query
   */
  search: async (query: string): Promise<User[]> => {
    try {
      const response = await api.get('/users/search', { params: { q: query } });
      return response.data;
    } catch (error) {
      console.error('Failed to search users:', error);
      throw error;
    }
  },

  /**
   * Start a 1-on-1 conversation with a user
   * Creates new conversation if doesn't exist, otherwise returns existing
   * @param targetUserId - User ID to chat with
   */
  startConversation: async (targetUserId: string): Promise<Conversation> => {
    try {
      const response = await api.post('/conversations', { targetUserId });
      return response.data;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  },

  /**
   * Get list of users blocked by current user
   */
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    try {
      const response = await api.get('/users/blocked');
      return response.data;
    } catch (error) {
      console.error('Failed to get blocked users:', error);
      throw error;
    }
  },

  /**
   * Block a user
   * @param userId - User ID to block
   */
  blockUser: async (userId: string): Promise<void> => {
    try {
      await api.post(`/users/block/${userId}`);
    } catch (error) {
      console.error(`Failed to block user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Unblock a user
   * @param userId - User ID to unblock
   */
  unblockUser: async (userId: string): Promise<void> => {
    try {
      await api.delete(`/users/block/${userId}`);
    } catch (error) {
      console.error(`Failed to unblock user ${userId}:`, error);
      throw error;
    }
  },
};

/**
 * Export API instance for advanced usage
 */
export { api };
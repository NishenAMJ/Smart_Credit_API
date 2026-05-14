import { api } from './api';
import { Conversation, Message, User, BlockedUser } from '../types/chat.types';

// TODO: Replace with real auth id
const getUserId = () => 'lender_004';

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
      const userId = getUserId();
      return await api.get(`/conversations?userId=${userId}`);
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
      const userId = getUserId();
      return await api.get(
        `/conversations/${conversationId}/messages?userId=${userId}&page=${params.page}&limit=${params.limit}`
      );
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
      const userId = getUserId();
      await api.patch(`/conversations/${conversationId}/read`, { userId });
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
      const userId = getUserId();
      await api.delete(`/conversations/${conversationId}?userId=${userId}`);
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
      const userId = getUserId();
      await api.patch(`/conversations/${conversationId}/mute`, { muted, userId });
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
      const userId = getUserId();
      return await api.post(
        `/conversations/${conversationId}/messages`,
        { text, senderId: userId },
      );
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
    throw new Error('Upload media not supported yet');
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
      return await api.get(`/users/search?q=${query}&userId=${getUserId()}`);
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
      const userId = getUserId();
      return await api.post('/conversations', { targetUserId, userId });
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
      const userId = getUserId();
      return await api.get(`/users/blocked?userId=${userId}`);
    } catch (error) {
      console.error('Failed to get blocked users:', error);
      throw error;
    }
  },

  /**
   * Block a user
   * @param userId - User ID to block
   */
  blockUser: async (targetId: string): Promise<void> => {
    try {
      const userId = getUserId();
      await api.post(`/users/block/${targetId}`, { userId });
    } catch (error) {
      console.error(`Failed to block user ${userId}:`, error);
      throw error;
    }
  },

  /**
   * Unblock a user
   * @param userId - User ID to unblock
   */
  unblockUser: async (targetId: string): Promise<void> => {
    try {
      const userId = getUserId();
      await api.delete(`/users/block/${targetId}?userId=${userId}`);
    } catch (error) {
      console.error(`Failed to unblock user ${userId}:`, error);
      throw error;
    }
  },
};

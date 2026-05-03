/**
 * userService.ts
 * Maps to backend UsersController and BlocksController endpoints.
 * Used by: NewChatScreen, BlockedUsersScreen, ChatInfoScreen.
 */

import { api } from "./api";
import { localDatabase } from "./localDatabase";
import type { User, BlockedUser } from "../types/chat.types";

export const userService = {
  /**
   * search
   * Searches users by username prefix.
   * Maps to GET /users/search?q=...
   */
  search: async (query: string): Promise<User[]> => {
    return api.get(`/users/search?q=${encodeURIComponent(query)}`);
  },

  /**
   * getById
   * Fetches a single user's public profile.
   * Maps to GET /users/:id
   */
  getById: async (userId: string): Promise<User> => {
    return api.get(`/users/${userId}`);
  },

  /**
   * updateFcmToken
   * Sends the device's FCM push token to the backend.
   * Call this on login and whenever the token refreshes.
   * Maps to PATCH /users/fcm-token
   */
  updateFcmToken: async (fcmToken: string): Promise<void> => {
    return api.patch("/users/fcm-token", { fcmToken });
  },

  /**
   * getBlockedUsers
   * Fetches the blocked user list from backend and caches in local DB.
   * Maps to GET /users/blocked
   */
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const data: BlockedUser[] = await api.get("/users/blocked");
    // Cache for offline display
    data.forEach((u) => localDatabase.upsertBlockedUser(u));
    return data;
  },

  /**
   * blockUser
   * Blocks a user. Maps to POST /users/block/:targetId
   */
  blockUser: async (targetId: string): Promise<void> => {
    return api.post(`/users/block/${targetId}`);
  },

  /**
   * unblockUser
   * Unblocks a user and removes them from local cache.
   * Maps to DELETE /users/block/:targetId
   */
  unblockUser: async (targetId: string): Promise<void> => {
    await api.delete(`/users/block/${targetId}`);
    localDatabase.removeBlockedUser(targetId);
  },
};

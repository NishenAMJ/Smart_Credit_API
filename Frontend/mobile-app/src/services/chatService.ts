import axios from 'axios';
import { Conversation, Message, User, BlockedUser } from '../types/chat.types';
 
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 10000,
});
 
// Attach JWT from your auth store — wire this up once auth is built
api.interceptors.request.use((config) => {
  // const token = useAuthStore.getState().token;
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
// ── Conversations ──────────────────────────────────────────────────────────────
 
export const conversationService = {
  getAll: (): Promise<Conversation[]> =>
    api.get('/conversations').then((r) => r.data),
 
  getMessages: (
    conversationId: string,
    params: { page: number; limit: number },
  ): Promise<Message[]> =>
    api
      .get(`/conversations/${conversationId}/messages`, { params })
      .then((r) => r.data),
 
  markAsRead: (conversationId: string): Promise<void> =>
    api.patch(`/conversations/${conversationId}/read`).then(() => undefined),
 
  delete: (conversationId: string): Promise<void> =>
    api.delete(`/conversations/${conversationId}`).then(() => undefined),
 
  mute: (conversationId: string, muted: boolean): Promise<void> =>
    api
      .patch(`/conversations/${conversationId}/mute`, { muted })
      .then(() => undefined),
};
 
// ── Messages ──────────────────────────────────────────────────────────────────
 
export const messageService = {
  send: (conversationId: string, text: string): Promise<Message> =>
    api
      .post(`/conversations/${conversationId}/messages`, { text })
      .then((r) => r.data),
};
 
// ── Users ─────────────────────────────────────────────────────────────────────
 
export const userService = {
  search: (query: string): Promise<User[]> =>
    api.get('/users/search', { params: { q: query } }).then((r) => r.data),
 
  startConversation: (targetUserId: string): Promise<Conversation> =>
    api.post('/conversations', { targetUserId }).then((r) => r.data),
 
  getBlockedUsers: (): Promise<BlockedUser[]> =>
    api.get('/users/blocked').then((r) => r.data),
 
  blockUser: (userId: string): Promise<void> =>
    api.post(`/users/block/${userId}`).then(() => undefined),
 
  unblockUser: (userId: string): Promise<void> =>
    api.delete(`/users/block/${userId}`).then(() => undefined),
};
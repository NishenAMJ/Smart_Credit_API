/** @format */

import apiClient from "../axios.config";
import { getUserId } from "../../utils/auth.storage";

export type BorrowerNotification = {
  id: string;
  borrowerId: string;
  category: "application" | "payment" | "profile" | "system";
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  message: string;
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionTarget: string | null;
  createdAt: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
};

type NotificationsResponse = {
  success?: boolean;
  data?: {
    notifications: BorrowerNotification[];
    unreadCount: number;
    pageInfo: {
      pageSize: number;
      hasMore: boolean;
      nextCursor: string | null;
    };
  };
};

export const notificationService = {
  getMyNotifications: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId) {
      throw new Error("User session expired. Please log in again.");
    }

    const response = await apiClient.get<NotificationsResponse>(
      "/borrower/notifications",
      {
        params: { borrowerId, limit: 50 },
      },
    );

    return {
      notifications: response.data?.data?.notifications ?? [],
      unreadCount: response.data?.data?.unreadCount ?? 0,
    };
  },

  markAsRead: async (notificationId: string) => {
    const borrowerId = await getUserId();
    if (!borrowerId) {
      throw new Error("User session expired. Please log in again.");
    }

    const response = await apiClient.put<{
      success?: boolean;
      data?: BorrowerNotification;
    }>(`/borrower/notifications/${notificationId}/read`, undefined, {
      params: { borrowerId },
    });
    return response.data?.data;
  },

  markAllAsRead: async () => {
    const borrowerId = await getUserId();
    if (!borrowerId) {
      throw new Error("User session expired. Please log in again.");
    }

    const response = await apiClient.put<{
      success?: boolean;
      data?: { updatedCount: number; unreadCount: number };
    }>("/borrower/notifications/mark-all-read", undefined, {
      params: { borrowerId },
    });
    return response.data?.data;
  },
};

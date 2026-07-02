/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import EmptyState from "../../components/common/EmptyState";
import { getApiErrorMessage } from "../../api/api-error";
import {
  BorrowerNotification,
  notificationService,
} from "../../api/services/notification.service";
import type { BorrowerNavigation } from "../../types/navigation";

type NotificationsScreenProps = {
  navigation: BorrowerNavigation;
};

function formatRelativeTime(value: string) {
  const createdAt = new Date(value).getTime();
  if (Number.isNaN(createdAt)) {
    return "";
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Date(value).toLocaleDateString();
}

/**
 * Displays borrower notifications and quick actions.
 */
export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<BorrowerNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await notificationService.getMyNotifications();
      setNotifications(response.notifications);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load notifications.",
      );
      setErrorMessage(message);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const markAllAsRead = async () => {
    const previous = notifications;
    setNotifications((current) =>
      current.map((item) => ({ ...item, isRead: true })),
    );

    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      setNotifications(previous);
      setErrorMessage(
        getApiErrorMessage(error, "Failed to mark notifications as read."),
      );
    }
  };

  const markOneAsRead = async (item: BorrowerNotification) => {
    if (item.isRead) {
      return;
    }

    const previous = notifications;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id
          ? { ...notification, isRead: true }
          : notification,
      ),
    );

    try {
      await notificationService.markAsRead(item.id);
    } catch (error) {
      setNotifications(previous);
      setErrorMessage(
        getApiErrorMessage(error, "Failed to mark notification as read."),
      );
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchNotifications();
  }, [fetchNotifications]);

  const renderNotificationItem = ({ item }: { item: BorrowerNotification }) => (
    <TouchableOpacity
      style={styles.notificationCard}
      onPress={() => void markOneAsRead(item)}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: !item.isRead ? "#007AFF" : "#D1D5DB",
          },
        ]}
      />
      <View style={styles.notificationContent}>
        <View style={styles.rowBetween}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.headerIconButton}></TouchableOpacity>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          {loading ? "Loading..." : `${unreadCount} unread`}
        </Text>
        <TouchableOpacity onPress={() => void markAllAsRead()}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          ListHeaderComponent={
            errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState title="No notifications yet." description="" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerIconButton: {
    padding: 4,
  },
  subHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  markReadText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: 10,
  },
  notificationContent: {
    flex: 1,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  notificationTime: {
    fontSize: 11,
    color: "#6B7280",
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },
});

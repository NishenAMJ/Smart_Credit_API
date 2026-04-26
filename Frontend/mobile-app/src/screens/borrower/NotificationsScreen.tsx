/** @format */

import React, { useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import EmptyState from "../../components/common/EmptyState";
import type { BorrowerNavigation } from "../../types/navigation";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
};

type NotificationsScreenProps = {
  navigation: BorrowerNavigation;
};

const initialNotifications: NotificationItem[] = [
  {
    id: "ntf-1",
    title: "Application Approved",
    message: "Your personal loan application was approved by City Finance.",
    time: "2 min ago",
    unread: true,
  },
  {
    id: "ntf-2",
    title: "Payment Due Reminder",
    message: "LKR 12,500 is due tomorrow. Avoid late fees by paying today.",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: "ntf-3",
    title: "New Featured Loan",
    message: "A new featured loan with 6.2% interest is now available.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "ntf-4",
    title: "Profile Update",
    message: "Your profile information was updated successfully.",
    time: "2 days ago",
    unread: false,
  },
];

/**
 * Displays borrower notifications and quick actions.
 */
export default function NotificationsScreen({
  navigation,
}: NotificationsScreenProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const markAllAsRead = () => {
    setNotifications((previous) =>
      previous.map((item) => ({ ...item, unread: false })),
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity style={styles.notificationCard}>
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: item.unread ? "#007AFF" : "#D1D5DB",
          },
        ]}
      />
      <View style={styles.notificationContent}>
        <View style={styles.rowBetween}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
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
        <Text style={styles.subHeaderText}>{unreadCount} unread</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markReadText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No notifications yet." description="" />
        }
      />
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

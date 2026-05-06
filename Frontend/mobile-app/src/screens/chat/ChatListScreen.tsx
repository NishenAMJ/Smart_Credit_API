/**
 * ChatListScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows all conversations for the current user.
 *
 * LOCAL-FIRST:
 *   - First renders from local SQLite (instant, works offline)
 *   - Then syncs from backend in background
 *   - Socket 'receiveMessage' event updates the list in real-time
 *
 * @format
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from "../../constants";
import {
  Conversation,
  ChatStackParamList,
  Message,
} from "../../types/chat.types";
import { conversationService } from "../../services/conversationService";
import { localDatabase } from "../../services/localDatabase";
import { chatSocket } from "../../services/socketService";
import Avatar from "../../components/common/Avatar";

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, "ChatList">;
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatListScreen({ navigation }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filtered, setFiltered] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Load conversations ────────────────────────────────────────────────────

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    // 1. Load from local SQLite instantly (works offline)
    const localData = localDatabase.getConversations();
    if (localData.length > 0) {
      setConversations(localData);
      setFiltered(localData);
      setLoading(false); // show local data immediately
    }

    // 2. Sync from backend in background
    try {
      const serverData = await conversationService.getAll();
      // Cache server data locally
      serverData.forEach((conv) => localDatabase.upsertConversation(conv));
      setConversations(serverData);
      setFiltered(serverData);
    } catch {
      // Backend unreachable — local data is already shown above
      if (localData.length === 0) {
        setError("Could not load conversations.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  // ── Real-time updates ─────────────────────────────────────────────────────

  useEffect(() => {
    const onMessage = (msg: Message) => {
      // Update the conversation preview when a new message arrives
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessage: {
              text: msg.text,
              createdAt: msg.createdAt,
              senderId: msg.senderId,
            },
            unreadCount: c.unreadCount + 1,
          };
        }),
      );
    };

    chatSocket.on("receiveMessage", onMessage);
    return () => chatSocket.off("receiveMessage", onMessage);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFiltered(conversations);
      return;
    }
    const q = text.toLowerCase();
    setFiltered(
      conversations.filter(
        (c) =>
          c.participant?.displayName?.toLowerCase().includes(q) ||
          c.participant?.username?.toLowerCase().includes(q),
      ),
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.convRow}
      onPress={() =>
        navigation.navigate("Chat", {
          conversationId: item.id,
          participant: item.participant,
          isMuted: item.isMuted,
        })
      }
      activeOpacity={0.7}
    >
      <Avatar
        name={item.participant?.displayName ?? "Unknown"}
        avatarUrl={item.participant?.avatarUrl || undefined}
        size={50}
        showOnline
        isOnline={item.participant?.isOnline}
      />
      <View style={styles.convMeta}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>
            {item.participant?.displayName ?? "Unknown User"}
          </Text>
          <Text style={styles.convTime}>
            {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ""}
          </Text>
        </View>
        <View style={styles.convBottomRow}>
          <Text
            style={[
              styles.convPreview,
              item.unreadCount > 0 && styles.convPreviewUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage?.text ?? "No messages yet"}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
          {item.isMuted && <Text style={styles.mutedText}>🔇</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {searchQuery ? "No results found" : "No conversations yet"}
      </Text>
      <Text style={styles.emptySub}>
        {searchQuery
          ? "Try a different name or username"
          : "Tap + to start a new conversation"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={() => navigation.navigate("NewChat")}
          activeOpacity={0.7}
        >
          <Text style={styles.newChatIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              marginRight: SPACING.sm,
            }}
          >
            🔍
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages"
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Error banner (only shown when we have no local data either) */}
      {error && conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadConversations()}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            filtered.length === 0 ? styles.flatListEmpty : undefined
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { ...TYPOGRAPHY.heading, color: COLORS.textPrimary },
  newChatBtn: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatIcon: {
    color: COLORS.surface,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "300",
  },
  searchContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    padding: 0,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  convMeta: { flex: 1, minWidth: 0 },
  convTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  convName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  convTime: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  convBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  convPreview: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    flex: 1,
    fontWeight: "400",
  },
  convPreviewUnread: { color: COLORS.textPrimary, fontWeight: "500" },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: COLORS.surface, fontSize: 11, fontWeight: "600" },
  mutedText: { fontSize: 12, opacity: 0.5 },
  flatListEmpty: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptySub: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "400",
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  retryText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary },
});

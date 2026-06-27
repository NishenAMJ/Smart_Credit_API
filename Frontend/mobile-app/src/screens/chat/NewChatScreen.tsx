import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from "../../constants";
import { User, ChatStackParamList } from "../../types/chat.types";
import { conversationService } from "../../services/conversationService";
import { userService } from "../../services/userService";
import Avatar from "../../components/common/Avatar";

/**
 * KEY FIX: Removed the inline fetch() with x-user-id header.
 * The backend now uses JwtAuthGuard — it requires Authorization: Bearer <token>.
 * api.get() (via axios) automatically adds this header via the request interceptor.
 * Using userService.search() which calls api.get() is the correct approach.
 */

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, "NewChat">;
};

type SearchState = "idle" | "loading" | "results" | "empty" | "error";

export default function NewChatScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [startingFor, setStartingFor] = useState<string | null>(null);

  // Prevents stale responses from earlier keystrokes overwriting latest results
  const searchIdRef = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setResults([]);
      setSearchState("idle");
      return;
    }

    setSearchState("loading");
    const thisSearchId = ++searchIdRef.current;

    debounceTimer.current = setTimeout(async () => {
      try {
        // ✅ FIXED: use userService.search() which calls api.get() with Bearer token
        // The old inline fetch() sent x-user-id header which the new JwtAuthGuard ignores
        const data = await userService.search(text.trim());

        // Discard stale responses from earlier keystrokes
        if (thisSearchId !== searchIdRef.current) return;

        setResults(data);
        setSearchState(data.length === 0 ? "empty" : "results");
      } catch (err: any) {
        if (thisSearchId !== searchIdRef.current) return;
        console.error("[NewChatScreen] search error:", err?.message ?? err);
        setErrorMessage(
          err?.response?.data?.message ??
          err?.message ??
          "Search failed. Check your connection.",
        );
        setSearchState("error");
      }
    }, 500);
  }, []);

  const handleStartConversation = async (user: User) => {
    if (startingFor) return;
    try {
      setStartingFor(user.id);
      const conversation = await conversationService.start(user.id);
      navigation.replace("Chat", {
        conversationId: conversation.id,
        participant: user,
        isMuted: false,
      });
    } catch (err: any) {
      console.error("[NewChatScreen] startConversation error:", err?.message ?? err);
      setStartingFor(null);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => handleStartConversation(item)}
      activeOpacity={0.7}
      disabled={!!startingFor}
    >
      <Avatar
        name={item.displayName}
        avatarUrl={item.avatarUrl || undefined}
        size={46}
        showOnline
        isOnline={item.isOnline}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userHandle}>@{item.username}</Text>
      </View>
      {startingFor === item.id ? (
        <ActivityIndicator size="small" color={COLORS.primary} />
      ) : (
        <View style={styles.startBtn}>
          <Text style={styles.startBtnText}>Message</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New message</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username…"
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={handleSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {searchState === "idle" && (
        <View style={styles.centered}>
          <View style={styles.idleIcon}>
            <Text style={{ fontSize: 28 }}>💬</Text>
          </View>
          <Text style={styles.idleTitle}>Find people</Text>
          <Text style={styles.idleSub}>
            Search by name or @username to start a conversation
          </Text>
        </View>
      )}

      {searchState === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {searchState === "empty" && (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>No users found</Text>
          <Text style={styles.stateSub}>Try a different name or @username</Text>
        </View>
      )}

      {searchState === "error" && (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>Search failed</Text>
          <Text style={styles.errorDetail}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => handleSearch(query)}
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {searchState === "results" && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 32, height: 32, borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center",
  },
  backIcon: { fontSize: 22, color: COLORS.primary, lineHeight: 26 },
  headerTitle: { ...TYPOGRAPHY.subtitle, color: COLORS.textPrimary },
  searchWrapper: {
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium, paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderWidth: 0.5, borderColor: COLORS.border, gap: SPACING.sm,
  },
  searchIconText: { fontSize: 14 },
  searchInput: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.textPrimary, padding: 0 },
  idleIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.border,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  idleTitle: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, textAlign: "center" },
  idleSub: { fontSize: 13, fontWeight: "400", color: COLORS.textSecondary, textAlign: "center", lineHeight: 19 },
  stateTitle: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary },
  stateSub: { fontSize: 13, color: COLORS.textSecondary },
  errorDetail: { fontSize: 12, color: COLORS.textSecondary, textAlign: "center", paddingHorizontal: 24, lineHeight: 18 },
  retryBtn: {
    marginTop: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  retryText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary },
  listContent: { paddingTop: SPACING.sm },
  separator: { height: 0.5, backgroundColor: COLORS.border, marginLeft: 74 },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, backgroundColor: COLORS.surface,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary },
  userHandle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  startBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium, backgroundColor: COLORS.primary,
  },
  startBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.surface },
});
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from "../../constants";
import { BlockedUser, ChatStackParamList } from "../../types/chat.types";
import { userService } from "../../services/userService";
import Avatar from "../../components/common/Avatar";

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, "BlockedUsers">;
};

function formatBlockedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function BlockedUsersScreen({ navigation }: Props) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchBlockedUsers();
    }, []),
  );

  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getBlockedUsers();
      setBlockedUsers(data);
    } catch (err: any) {
      console.error("[BlockedUsers] load error:", err?.message);
      setError("Could not load blocked users.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUnblock = async () => {
    if (!selectedUser) return;
    const target = selectedUser;
    setSelectedUser(null);

    try {
      setUnblocking(target.id);
      await userService.unblockUser(target.id);
      // Remove from list optimistically
      setBlockedUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? "";
      if (message.toLowerCase().includes("not found")) {
        // Block document already gone — remove from list anyway
        setBlockedUsers((prev) => prev.filter((u) => u.id !== target.id));
      } else {
        Alert.alert("Could not unblock", message || "Please try again.");
        fetchBlockedUsers(); // re-sync
      }
    } finally {
      setUnblocking(null);
    }
  };

  const renderItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userCard}>
      <Avatar
        name={item.displayName ?? item.id}
        avatarUrl={item.avatarUrl || undefined}
        size={46}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.displayName ?? item.id}
        </Text>
        <Text style={styles.userSub}>
          {item.username ? `@${item.username}` : ""}
          {item.blockedAt ? `  ·  Blocked ${formatBlockedDate(item.blockedAt)}` : ""}
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.unblockBtn,
          unblocking === item.id && styles.unblockBtnDisabled,
        ]}
        onPress={() => setSelectedUser(item)}
        disabled={!!unblocking}
        activeOpacity={0.7}
      >
        {unblocking === item.id ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <Text style={styles.unblockBtnText}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={{ fontSize: 26, color: COLORS.textSecondary }}>⊘</Text>
      </View>
      <Text style={styles.emptyTitle}>No blocked users</Text>
      <Text style={styles.emptySub}>
        People you block won't be able to send you messages
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked users</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBlockedUsers}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {blockedUsers.length > 0 && (
            <Text style={styles.countLabel}>
              {blockedUsers.length} blocked{" "}
              {blockedUsers.length === 1 ? "user" : "users"}
            </Text>
          )}
          <FlatList
            data={blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={
              blockedUsers.length === 0 ? styles.flatListEmpty : undefined
            }
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      )}

      {/* Unblock confirmation sheet */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedUser(null)}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {selectedUser?.displayName ?? "This user"}
            </Text>
            <Text style={styles.sheetBody}>
              Unblocking will allow them to message you again.
            </Text>
            <TouchableOpacity style={styles.sheetConfirm} onPress={handleConfirmUnblock}>
              <Text style={styles.sheetConfirmText}>Unblock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
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
  countLabel: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    fontSize: 12, fontWeight: "500", color: COLORS.textSecondary,
  },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  separator: { height: 0.5, backgroundColor: COLORS.border },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary },
  userSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  unblockBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.small, borderWidth: 1.5,
    borderColor: COLORS.primary, minWidth: 74, alignItems: "center",
  },
  unblockBtnDisabled: { opacity: 0.5 },
  unblockBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  flatListEmpty: { flex: 1 },
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 40, gap: 10,
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.border,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm,
  },
  emptyTitle: { ...TYPOGRAPHY.bodyMedium, color: COLORS.textPrimary, textAlign: "center" },
  emptySub: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 19, fontWeight: "400",
  },
  errorText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium, borderWidth: 1.5, borderColor: COLORS.primary,
  },
  retryText: { ...TYPOGRAPHY.bodyMedium, color: COLORS.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: SPACING.xl, paddingBottom: 40, paddingTop: SPACING.md,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: "center", marginBottom: SPACING.lg,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: "600", color: COLORS.textPrimary,
    textAlign: "center", marginBottom: SPACING.sm,
  },
  sheetBody: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 19, marginBottom: SPACING.xl,
  },
  sheetConfirm: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 13, alignItems: "center", marginBottom: SPACING.sm,
  },
  sheetConfirmText: { fontSize: 15, fontWeight: "600", color: COLORS.surface },
  sheetCancel: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 13, alignItems: "center",
  },
  sheetCancelText: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
});
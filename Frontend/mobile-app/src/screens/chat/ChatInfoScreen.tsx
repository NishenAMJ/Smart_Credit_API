import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from "../../constants";
import { ChatStackParamList } from "../../types";
import { conversationService, userService } from "../../services";
import Avatar from "../../components/common/Avatar";

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, "ChatInfo">;
  route: RouteProp<ChatStackParamList, "ChatInfo">;
};

export default function ChatInfoScreen({ navigation, route }: Props) {
  const { conversationId, participant, isMuted: initialMuted } = (route.params as any) || {};

  const [isMuted, setIsMuted] = useState(initialMuted);
  const [togglingMute, setTogglingMute] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  //  Mute 
  const handleToggleMute = async () => {
    try {
      setTogglingMute(true);
      const next = !isMuted;
      await conversationService.mute(conversationId, next);
      setIsMuted(next);
    } catch {
      // revert
    } finally {
      setTogglingMute(false);
    }
  };

  // Block 
  const handleConfirmBlock = async () => {
    try {
      setBlocking(true);
      await userService.blockUser(participant.id);
      setShowBlockModal(false);
      // Navigate back to chat list after blocking
      navigation.navigate("ChatList");
    } catch {
      setBlocking(false);
      setShowBlockModal(false);
    }
  };

  //  Delete conversation 
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await conversationService.delete(conversationId);
      setShowDeleteModal(false);
      navigation.navigate("ChatList");
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat info</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View style={styles.profileSection}>
          <Avatar
            name={participant?.displayName ?? "Unknown"}
            avatarUrl={participant?.avatarUrl}
            size={80}
            showOnline
            isOnline={participant?.isOnline}
          />
          <Text style={styles.profileName}>{participant?.displayName ?? "Unknown User"}</Text>
          <Text style={styles.profileHandle}>
            {participant?.username ? `@${participant.username}` : ""}
          </Text>
          <View style={styles.onlineRow}>
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: participant.isOnline
                    ? COLORS.success
                    : COLORS.textSecondary,
                },
              ]}
            />
            <Text style={styles.onlineText}>
              {participant.isOnline
                ? "Online"
                : participant.lastSeen
                  ? `Last seen ${new Date(
                    participant.lastSeen,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                  : "Offline"}
            </Text>
          </View>
        </View>

        {/* Settings section */}
        <View style={styles.section}>
          <InfoRow
            label="Notifications"
            right={
              togglingMute ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Switch
                  value={!isMuted}
                  onValueChange={handleToggleMute}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.surface}
                  ios_backgroundColor={COLORS.border}
                />
              )
            }
          />
          <InfoRow
            label="Media & files"
            showChevron
            onPress={() => {
              /* navigate to media screen when built */
            }}
          />
        </View>

        {/* Blocked users shortcut */}
        <View style={styles.section}>
          <InfoRow
            label="Blocked users"
            showChevron
            onPress={() => navigation.navigate("BlockedUsers")}
          />
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <InfoRow
            label="Block user"
            showChevron
            onPress={() => setShowBlockModal(true)}
          />
          <InfoRow
            label="Delete conversation"
            danger
            onPress={() => setShowDeleteModal(true)}
          />
        </View>
      </ScrollView>

      {/* Block confirmation modal */}
      <ConfirmModal
        visible={showBlockModal}
        title={`Block ${participant?.displayName ?? "this user"}?`}
        body="They won't be able to send you messages. You can unblock them anytime."
        confirmLabel="Block"
        confirmDanger
        loading={blocking}
        onConfirm={handleConfirmBlock}
        onCancel={() => setShowBlockModal(false)}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete conversation?"
        body="This will permanently delete all messages. This can't be undone."
        confirmLabel="Delete"
        confirmDanger
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </SafeAreaView>
  );
}

// Sub-components

function InfoRow({
  label,
  right,
  showChevron,
  danger,
  onPress,
}: {
  label: string;
  right?: React.ReactNode;
  showChevron?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.infoLabel, danger && styles.infoLabelDanger]}>
        {label}
      </Text>
      {right ?? (showChevron && <Text style={styles.chevron}>›</Text>)}
    </TouchableOpacity>
  );
}

function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  confirmDanger,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <Text style={styles.sheetBody}>{body}</Text>
          <TouchableOpacity
            style={[
              styles.sheetConfirm,
              confirmDanger && styles.sheetConfirmDanger,
            ]}
            onPress={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.sheetConfirmText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetCancel}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
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
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, color: COLORS.primary, lineHeight: 26 },
  headerTitle: { ...TYPOGRAPHY.subtitle, color: COLORS.textPrimary },

  // Profile
  profileSection: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  profileName: {
    ...TYPOGRAPHY.heading,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  profileHandle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: 2,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineText: { fontSize: 13, color: COLORS.textSecondary },

  // Sections
  section: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },
  infoLabelDanger: { color: "#EF4444" },
  chevron: { fontSize: 20, color: COLORS.textSecondary, lineHeight: 22 },

  // Modal / sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
    paddingTop: SPACING.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  sheetBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: SPACING.xl,
  },
  sheetConfirm: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sheetConfirmDanger: { backgroundColor: "#EF4444" },
  sheetConfirmText: { fontSize: 15, fontWeight: "600", color: COLORS.surface },
  sheetCancel: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 13,
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});

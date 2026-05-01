/**
 * ChatScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL-FIRST chat screen.
 *
 * On mount:
 *   1. Reads messages instantly from local SQLite (no loading spinner)
 *   2. Resets unread count locally and on backend
 *   3. Subscribes to real-time socket events for new messages / typing / read
 *
 * Sending a message:
 *   1. Optimistically renders it immediately with status:'sending'
 *   2. messageService.send() saves to SQLite + emits via WebSocket
 *   3. On 'messageDelivered' ack → status updates to 'sent'/'delivered'
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, SPACING } from '../../constants';
import { commonChatStyles } from '../../styles/chat.styles';
import { Message, ChatStackParamList } from '../../types/chat.types';
import { conversationService } from '../../services/conversationService';
import { messageService } from '../../services/messageService';
import { chatSocket } from '../../services/socketService';
import { localDatabase } from '../../services/localDatabase';
import { getCurrentUserId } from '../../services/api';
import Avatar from '../../components/common/Avatar';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'Chat'>;
  route: RouteProp<ChatStackParamList, 'Chat'>;
};

const PAGE_SIZE = 30;

function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatScreen({ navigation, route }: Props) {
  const { conversationId, participant, isMuted } = route.params;

  // TEMP: use lender_004. Replace with real auth hook when ready.
  const currentUserId = getCurrentUserId();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false); // other user typing
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seeding, setSeeding] = useState(false); // initial backend seed

  const flatRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mount ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    // 1. Load from local SQLite immediately (no loading spinner needed)
    const local = messageService.list(conversationId, { page: 0, limit: PAGE_SIZE });
    setMessages(local);
    setHasMore(local.length === PAGE_SIZE);

    // 2. If no local messages — first install or re-install — seed from backend
    if (local.length === 0) {
      setSeeding(true);
      messageService
        .seedFromBackend(conversationId, 0, PAGE_SIZE)
        .then((seeded) => {
          setMessages(seeded);
          setHasMore(seeded.length === PAGE_SIZE);
        })
        .catch(() => {/* seed silently fails — user can still chat */})
        .finally(() => setSeeding(false));
    }

    // 3. Reset unread count
    conversationService.markAsRead(conversationId).catch(() => {});

    // 4. Socket subscriptions — defined as named functions for proper cleanup
    const onMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Avoid duplicates (socket may redeliver on reconnect)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });
      // Mark as read since user is actively in the screen
      conversationService.markAsRead(conversationId).catch(() => {});
      // Send read receipt to the sender
      chatSocket.markMessageRead(conversationId, msg.id, msg.senderId);
    };

    const onDelivered = (data: {
      messageId: string;
      conversationId: string;
      status: Message['status'];
    }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, status: data.status } : m,
        ),
      );
    };

    const onTyping = (data: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (data.conversationId !== conversationId) return;
      if (data.userId === currentUserId) return;
      setIsTyping(data.isTyping);
    };

    const onRead = (data: {
      conversationId: string;
      messageId: string;
    }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, status: 'read' } : m,
        ),
      );
    };

    chatSocket.on('receiveMessage', onMessage);
    chatSocket.on('messageDelivered', onDelivered);
    chatSocket.on('userTyping', onTyping);
    chatSocket.on('messageRead', onRead);

    return () => {
      // Clean up exact handlers — does NOT remove other screens' listeners
      chatSocket.off('receiveMessage', onMessage);
      chatSocket.off('messageDelivered', onDelivered);
      chatSocket.off('userTyping', onTyping);
      chatSocket.off('messageRead', onRead);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [conversationId, currentUserId]);

  // ── Load more (older messages) ────────────────────────────────────────────

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const older = messageService.list(conversationId, {
      page: nextPage,
      limit: PAGE_SIZE,
    });
    setMessages((prev) => [...prev, ...older]);
    setHasMore(older.length === PAGE_SIZE);
    setPage(nextPage);
    setLoadingMore(false);
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setText('');
    Keyboard.dismiss();

    // Stop typing indicator
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    chatSocket.sendTyping(conversationId, participant.id, false);

    try {
      const msg = await messageService.send(
        conversationId,
        participant.id,
        trimmed,
      );
      // Optimistically add to the list
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });
    } catch {
      // messageService handles fallback internally
    }
  };

  // ── Typing indicator ──────────────────────────────────────────────────────

  const handleTyping = (val: string) => {
    setText(val);
    chatSocket.sendTyping(conversationId, participant.id, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      chatSocket.sendTyping(conversationId, participant.id, false);
    }, 1500);
  };

  // ── Render bubble ─────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMe = item.senderId === currentUserId;
      const prevMsg = messages[index + 1];
      const showAvatar = !isMe && prevMsg?.senderId !== item.senderId;

      return (
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
          {!isMe && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Avatar
                  name={participant.displayName}
                  avatarUrl={participant.avatarUrl || undefined}
                  size={28}
                />
              )}
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text
              style={[
                styles.bubbleText,
                isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
              ]}
            >
              {item.text}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatBubbleTime(item.createdAt)}
              </Text>
              {isMe && (
                <Text
                  style={[
                    styles.statusTick,
                    item.status === 'failed' && styles.statusFailed,
                  ]}
                >
                  {item.status === 'sending'
                    ? '○'
                    : item.status === 'failed'
                    ? '✕'
                    : item.status === 'read'
                    ? '✓✓'
                    : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    },
    [messages, participant, currentUserId],
  );

  return (
    <SafeAreaView style={commonChatStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={commonChatStyles.header}>
        <TouchableOpacity
          style={commonChatStyles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={commonChatStyles.backIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() =>
            navigation.navigate('ChatInfo', {
              conversationId,
              participant,
              isMuted: isMuted ?? false,
            })
          }
          activeOpacity={0.8}
        >
          <Avatar
            name={participant.displayName}
            avatarUrl={participant.avatarUrl || undefined}
            size={36}
            showOnline
            isOnline={participant.isOnline}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{participant.displayName}</Text>
            <Text style={styles.headerStatus}>
              {participant.isOnline
                ? 'Online'
                : participant.lastSeen
                ? `Last seen ${formatBubbleTime(participant.lastSeen)}`
                : 'Offline'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={commonChatStyles.iconBtn}
          onPress={() =>
            navigation.navigate('ChatInfo', {
              conversationId,
              participant,
              isMuted: isMuted ?? false,
            })
          }
        >
          <Text style={commonChatStyles.iconText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={commonChatStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {seeding && messages.length === 0 ? (
          <View style={commonChatStyles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 8, fontSize: 13 }}>
              Loading messages…
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListHeaderComponent={
              isTyping ? (
                <View style={styles.typingRow}>
                  <Avatar name={participant.displayName} size={24} />
                  <View style={styles.typingBubble}>
                    <Text style={styles.typingText}>typing…</Text>
                  </View>
                </View>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                  style={{ marginVertical: SPACING.lg }}
                />
              ) : null
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={COLORS.textSecondary}
            value={text}
            onChangeText={handleTyping}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !text.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  headerStatus: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  msgList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    marginVertical: 2,
  },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  avatarSlot: { width: 28, alignItems: 'center' },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 18,
  },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: COLORS.surface },
  bubbleTextThem: { color: COLORS.textPrimary },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 3,
  },
  bubbleTime: { fontSize: 10, color: COLORS.textSecondary },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.65)' },
  statusTick: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  statusFailed: { color: '#FF6B6B' },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typingBubble: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  typingText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 120,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { fontSize: 17, color: COLORS.surface, fontWeight: '600' },
});
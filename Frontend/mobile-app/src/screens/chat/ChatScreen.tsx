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
import { Message, ChatStackParamList } from '../../types';
import { conversationService, messageService } from '../../services';
import { chatSocket } from '../../services';
import Avatar from '../../components/common/Avatar';

type Props = {
  navigation: NativeStackNavigationProp<ChatStackParamList, 'Chat'>;
  route: RouteProp<ChatStackParamList, 'Chat'>;
};

const PAGE_SIZE = 30;

function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Assume current user id comes from your auth store.
// Replace with: const currentUserId = useAuthStore(s => s.user.id)
const CURRENT_USER_ID = 'ME';

export default function ChatScreen({ navigation, route }: Props) {
  const { conversationId, participant } = route.params;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // other user typing
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMessages(1, true);
    conversationService.markAsRead(conversationId).catch(() => {});

    chatSocket.joinConversation(conversationId);

    chatSocket.on('receiveMessage', (msg: any) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => [msg, ...prev]);
      conversationService.markAsRead(conversationId).catch(() => {});
    });

    chatSocket.on('userTyping', ({ conversationId: cid, userId, isTyping: typing }: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (cid !== conversationId || userId === CURRENT_USER_ID) return;
      setIsTyping(typing);
    });

    return () => {
      chatSocket.leaveConversation(conversationId);
      chatSocket.off('receiveMessage');
      chatSocket.off('userTyping');
    };
  }, [conversationId]);

  const loadMessages = async (pageNum: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const data = await conversationService.getMessages(conversationId, {
        page: pageNum,
        limit: PAGE_SIZE,
      });

      if (reset) {
        setMessages(data);
      } else {
        setMessages((prev) => [...prev, ...data]);
      }

      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch {
      // silently fail for pagination; show nothing for first load
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    loadMessages(page + 1);
  };

  // ── Sending ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText('');
    Keyboard.dismiss();

    // Optimistic message
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId,
      senderId: CURRENT_USER_ID,
      text: trimmed,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };
    setMessages((prev) => [optimistic, ...prev]);

    try {
      setSending(true);
      const sent = await messageService.send(conversationId, trimmed);
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? sent : m)),
      );
    } catch {
      // Mark as failed — you can add a retry UI here
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, status: 'sending' } : m,
        ),
      );
    } finally {
      setSending(false);
    }
  };

  // ── Typing indicator emit ─────────────────────────────────────────────────────
  const handleTyping = (val: string) => {
    setText(val);
    chatSocket.sendTyping(conversationId, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      chatSocket.sendTyping(conversationId, false);
    }, 1500);
  };

  // ── Render bubble ─────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMe = item.senderId === CURRENT_USER_ID;
      const prevMsg = messages[index + 1];
      const showAvatar = !isMe && prevMsg?.senderId !== item.senderId;

      return (
        <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
          {!isMe && (
            <View style={styles.avatarSlot}>
              {showAvatar && (
                <Avatar name={participant.displayName} avatarUrl={participant.avatarUrl} size={28} />
              )}
            </View>
          )}

          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
              {item.text}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                {formatBubbleTime(item.createdAt)}
              </Text>
              {isMe && (
                <Text style={styles.statusTick}>
                  {item.status === 'sending'
                    ? '○'
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
    [messages, participant],
  );

  return (
    <SafeAreaView style={commonChatStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={commonChatStyles.header}>
        <TouchableOpacity style={commonChatStyles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={commonChatStyles.backIcon}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() =>
            navigation.navigate('ChatInfo', {
              conversationId,
              participant,
              isMuted: false,
            })
          }
          activeOpacity={0.8}
        >
          <Avatar
            name={participant.displayName}
            avatarUrl={participant.avatarUrl}
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
              isMuted: false,
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
        {loading ? (
          <View style={commonChatStyles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
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
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header - screen specific
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Messages
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
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
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

  // Typing
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

  // Input bar
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

/** @format */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  aiAssistantService,
  type AiMessage,
} from "../../api/services/ai-assistant.service";
import { getApiErrorMessage } from "../../api/api-error";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";

export default function AiAssistantScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<AiMessage>>(null);
  const role = session?.user.role === "lender" ? "lender" : "borrower";

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const conversations = await aiAssistantService.listConversations();
        const conversation =
          conversations[0] ?? (await aiAssistantService.createConversation());
        const storedMessages = await aiAssistantService.listMessages(
          conversation.conversationId,
        );
        if (active) {
          setConversationId(conversation.conversationId);
          setMessages(storedMessages);
        }
      } catch (nextError) {
        if (active) {
          setError(
            getApiErrorMessage(
              nextError,
              "The AI assistant is unavailable right now.",
            ),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, sending]);

  async function startNewChat() {
    try {
      setLoading(true);
      setError("");
      if (conversationId) {
        await aiAssistantService.archiveConversation(conversationId);
      }
      const conversation = await aiAssistantService.createConversation();
      setConversationId(conversation.conversationId);
      setMessages([]);
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "Could not start a new chat."));
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      setError("");
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversation = await aiAssistantService.createConversation();
        activeConversationId = conversation.conversationId;
        setConversationId(activeConversationId);
      }
      const optimistic: AiMessage = {
        messageId: `pending-${Date.now()}`,
        conversationId: activeConversationId,
        role: "user",
        content,
        status: "completed",
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimistic]);
      setDraft("");
      const response = await aiAssistantService.sendMessage(
        activeConversationId,
        content,
      );
      setMessages((current) => [
        ...current.filter((message) => message.messageId !== optimistic.messageId),
        response.userMessage,
        response.assistantMessage,
      ]);
    } catch (nextError) {
      setError(
        getApiErrorMessage(
          nextError,
          "The AI assistant could not send your message.",
        ),
      );
    } finally {
      setSending(false);
    }
  }

  const emptyMessage =
    role === "lender"
      ? "Ask about your loans, borrowers, payments, daily collection, advertisements, or pending requests."
      : "Ask about your applications, loans, monthly installments, repayments, KYC status, or available loan advertisements.";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
            >
              <Feather name="chevron-left" size={23} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.iconWrap}>
              <Feather name="message-circle" size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.eyebrow}>Smart Credit</Text>
              <Text style={styles.title}>AI Assistant</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => void startNewChat()}
            disabled={loading || sending}
          >
            <Feather name="plus" size={16} color={COLORS.primary} />
            <Text style={styles.newChatText}>New chat</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.centerStateText}>Loading your assistant…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.messageId}
            contentContainerStyle={
              messages.length === 0 ? styles.emptyList : styles.messageList
            }
            ListEmptyComponent={
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Feather name="star" size={25} color={COLORS.primary} />
                </View>
                <Text style={styles.welcomeTitle}>
                  How can I help with your {role} account?
                </Text>
                <Text style={styles.welcomeText}>{emptyMessage}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageRow,
                  item.role === "user" && styles.userMessageRow,
                ]}
              >
                <Text style={styles.messageLabel}>
                  {item.role === "assistant" ? "Assistant" : "You"}
                </Text>
                <View
                  style={[
                    styles.messageBubble,
                    item.role === "user" && styles.userMessageBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.role === "user" && styles.userMessageText,
                    ]}
                  >
                    {item.content}
                  </Text>
                </View>
              </View>
            )}
            ListFooterComponent={
              sending ? (
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.typingText}>Reviewing your records…</Text>
                </View>
              ) : null
            }
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask about your account"
              placeholderTextColor="#8A98AB"
              multiline
              maxLength={2000}
              style={styles.input}
              editable={!loading && !sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!draft.trim() || loading || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => void sendMessage()}
              disabled={!draft.trim() || loading || sending}
              accessibilityLabel="Send message"
            >
              <Feather name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.notice}>
            Read-only assistant. Verify important financial decisions.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  header: {
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "#E5EAF2",
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCopy: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F4F9",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FF",
  },
  eyebrow: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { marginTop: 2, color: COLORS.textPrimary, fontSize: 19, fontWeight: "700" },
  newChatButton: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  newChatText: { color: COLORS.primary, fontSize: 12, fontWeight: "700" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerStateText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  messageList: { padding: SPACING.lg, gap: 14 },
  emptyList: { flexGrow: 1, padding: SPACING.xl, justifyContent: "center" },
  welcomeCard: {
    padding: SPACING.xxl,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#E3EAF4",
    alignItems: "center",
  },
  welcomeIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  welcomeTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700", textAlign: "center" },
  welcomeText: { marginTop: 10, color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, textAlign: "center" },
  messageRow: { maxWidth: "88%", alignSelf: "flex-start" },
  userMessageRow: { alignSelf: "flex-end" },
  messageLabel: { marginBottom: 5, marginHorizontal: 4, color: "#708097", fontSize: 10, fontWeight: "700" },
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 15,
    borderBottomLeftRadius: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "#DCE4EF",
  },
  userMessageBubble: { backgroundColor: COLORS.primary, borderColor: COLORS.primary, borderBottomLeftRadius: 15, borderBottomRightRadius: 4 },
  messageText: { color: "#26344D", fontSize: 14, lineHeight: 21 },
  userMessageText: { color: "#FFFFFF" },
  typingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 6 },
  typingText: { color: COLORS.textSecondary, fontSize: 13 },
  errorText: { paddingHorizontal: SPACING.lg, paddingVertical: 8, backgroundColor: "#FFF2F3", color: "#B42335", fontSize: 12 },
  composerWrap: { padding: 12, paddingBottom: Platform.OS === "ios" ? 8 : 12, borderTopWidth: 1, borderTopColor: "#E2E8F1", backgroundColor: COLORS.surface },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: "#C9D4E2", borderRadius: 13, color: COLORS.textPrimary, fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.45 },
  notice: { marginTop: 7, color: "#7C899B", fontSize: 10, textAlign: "center" },
});

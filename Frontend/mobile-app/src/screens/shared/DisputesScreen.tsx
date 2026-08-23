/** @format */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import {
  disputesService,
  uploadDisputeEvidence,
  type Dispute,
  type DisputeEvent,
  type EligibleLoan,
} from "../../api/services/disputes.service";
import { chatSocket } from "../../services/socketService";
import { COLORS } from "../../constants/colors";

const categories = ["payment", "loan_terms", "fraud", "conduct", "other"];

const statusLabels: Record<string, string> = {
  open: "Submitted",
  under_review: "Under review",
  awaiting_response: "Your response is needed",
  escalated: "Escalated for review",
  resolved: "Resolved",
  closed: "Closed",
};

const eventLabels: Record<string, string> = {
  created: "Dispute submitted",
  review_started: "Review started",
  comment: "New message",
  information_requested: "Information requested",
  escalated: "Escalated for review",
  resolved: "Dispute resolved",
  reopened: "Dispute reopened",
  acknowledged: "Resolution acknowledged",
  closed: "Dispute closed",
};

function friendlyStatus(status: string) {
  return statusLabels[status] ?? status.replace(/_/g, " ");
}

function friendlyEvent(type: string) {
  return eventLabels[type] ?? type.replace(/_/g, " ");
}

function friendlyEventMessage(event: DisputeEvent) {
  if (event.type === "information_requested")
    return event.message.replace(/^(both|complainant|respondent):\s*/i, "");
  return event.message;
}

function friendlyActor(role: string) {
  if (role === "admin") return "Smart Credit support";
  if (role === "system") return "System update";
  if (role === "borrower") return "Borrower";
  if (role === "lender") return "Lender";
  return "Participant";
}

function friendlyError(error: unknown, fallback: string) {
  const message = (
    error as { response?: { data?: { message?: unknown } }; message?: string }
  )?.response?.data?.message;
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

export default function DisputesScreen({ navigation }: any) {
  const [items, setItems] = useState<Dispute[]>([]);
  const [loans, setLoans] = useState<EligibleLoan[]>([]);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [events, setEvents] = useState<DisputeEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [installmentId, setInstallmentId] = useState("");
  const [category, setCategory] = useState("payment");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [message, setMessage] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [messageEvidence, setMessageEvidence] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [evidence, setEvidence] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const [casesResult, loansResult] = await Promise.allSettled([
      disputesService.list(),
      disputesService.eligibleLoans(),
    ]);
    if (casesResult.status === "fulfilled") {
      const cases = casesResult.value;
      setItems(cases);
      setSelected((current) =>
        current
          ? (cases.find((item) => item.id === current.id) ?? current)
          : null,
      );
    }
    if (loansResult.status === "fulfilled") {
      const eligible = loansResult.value;
      setLoans(eligible);
      setLoanId((current) =>
        !current || eligible.some((loan) => loan.id === current) ? current : "",
      );
    }
    if (casesResult.status === "rejected") {
      Alert.alert(
        "Unable to load disputes",
        friendlyError(
          casesResult.reason,
          "Please check your connection and try again.",
        ),
      );
    }
  }, []);

  const openDispute = useCallback(async (item: Dispute) => {
    setSelected(item);
    try {
      const [current, timeline] = await Promise.all([
        disputesService.get(item.id),
        disputesService.events(item.id),
      ]);
      setSelected(current);
      setEvents(timeline);
    } catch (error) {
      Alert.alert(
        "Unable to open dispute",
        friendlyError(error, "Please check your connection and try again."),
      );
    }
  }, []);

  useEffect(() => {
    void load();
    const changed = (payload?: { disputeId?: string }) => {
      void load();
      if (
        selected &&
        (!payload?.disputeId || payload.disputeId === selected.id)
      )
        void openDispute(selected);
    };
    const connected = () => void load();
    chatSocket.on("disputeChanged", changed);
    chatSocket.on("socketConnected", connected);
    return () => {
      chatSocket.off("disputeChanged", changed);
      chatSocket.off("socketConnected", connected);
    };
  }, [load, openDispute, selected?.id]);

  useEffect(() => {
    setMessage("");
    setMessageEvidence([]);
    setReopenReason("");
    setEvents([]);
  }, [selected?.id]);

  async function submit() {
    const problems: string[] = [];
    if (subject.trim().length < 3)
      problems.push("Subject must contain at least 3 characters.");
    if (description.trim().length < 10)
      problems.push("Description must contain at least 10 characters.");
    if (desiredOutcome.trim().length < 3)
      problems.push("Desired outcome must contain at least 3 characters.");
    if (problems.length) {
      Alert.alert("Check dispute details", problems.join("\n"));
      return;
    }
    try {
      setSubmitting(true);
      const evidenceDocumentIds = await Promise.all(
        evidence
          .slice(0, 5)
          .map((asset) => uploadDisputeEvidence(asset, loanId)),
      );
      const dispute = await disputesService.create({
        ...(loanId ? { loanId } : {}),
        category,
        subject,
        description,
        desiredOutcome,
        ...(loanId && transactionId.trim()
          ? { transactionId: transactionId.trim() }
          : {}),
        ...(loanId && installmentId.trim()
          ? { installmentId: installmentId.trim() }
          : {}),
        evidenceDocumentIds,
      });
      setCreating(false);
      setSelected(dispute);
      setSubject("");
      setDescription("");
      setDesiredOutcome("");
      setTransactionId("");
      setInstallmentId("");
      setEvidence([]);
      await load();
    } catch (error: any) {
      Alert.alert(
        "Unable to submit",
        friendlyError(error, "Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function sendComment() {
    if (!selected || selected.status !== "awaiting_response" || !message.trim())
      return;
    try {
      setSubmitting(true);
      const documentIds = await Promise.all(
        messageEvidence
          .slice(0, 5)
          .map((asset) => uploadDisputeEvidence(asset, selected.loanId)),
      );
      await disputesService.comment(selected.id, message.trim(), documentIds);
      setMessage("");
      setMessageEvidence([]);
      await load();
      setEvents(await disputesService.events(selected.id));
    } catch (error: any) {
      Alert.alert(
        "Unable to send response",
        friendlyError(error, "Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function reopenCase() {
    if (!selected || reopenReason.trim().length < 5) return;
    try {
      setSubmitting(true);
      await disputesService.reopen(selected.id, reopenReason.trim());
      setReopenReason("");
      await load();
      setEvents(await disputesService.events(selected.id));
    } catch (error: any) {
      Alert.alert(
        "Unable to reopen",
        friendlyError(error, "Please try again."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disputes</Text>
        <TouchableOpacity onPress={() => setCreating(true)}>
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.length ? (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => void openDispute(item)}
            >
              <View style={styles.row}>
                <Text style={styles.title}>{item.subject}</Text>
                <Text style={styles.status}>{friendlyStatus(item.status)}</Text>
              </View>
              {item.loanId ? (
                <Text style={styles.muted}>
                  {item.disputeCode} · Loan {item.loanId}
                </Text>
              ) : (
                <Text style={styles.muted}>
                  {item.disputeCode} {" · General dispute"}
                </Text>
              )}
              <Text numberOfLines={2}>{item.description}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>
              No disputes yet. Tap + to raise one.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={creating} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setCreating(false)}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Raise Dispute</Text>
            <View />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Related loan (optional)</Text>
            <TouchableOpacity
              style={[styles.choice, !loanId && styles.choiceActive]}
              onPress={() => {
                setLoanId("");
                setTransactionId("");
                setInstallmentId("");
              }}
            >
              <Text>General platform issue</Text>
            </TouchableOpacity>
            {loans.length === 0 ? (
              <View style={styles.emptyLoanState}>
                <Text style={styles.title}>No linked loans found</Text>
                <Text style={styles.muted}>
                  You can still submit a general platform dispute.
                </Text>
              </View>
            ) : null}
            {loans.map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={[
                  styles.choice,
                  loanId === loan.id && styles.choiceActive,
                ]}
                onPress={() => setLoanId(loan.id)}
              >
                <Text>
                  {loan.loanId} ·{" "}
                  {loan.borrowerName ?? loan.lenderName ?? loan.status}
                </Text>
              </TouchableOpacity>
            ))}
            {loanId ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Optional transaction ID"
                  value={transactionId}
                  onChangeText={setTransactionId}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Optional installment ID"
                  value={installmentId}
                  onChangeText={setInstallmentId}
                  autoCapitalize="none"
                />
              </>
            ) : null}
            <Text style={styles.label}>Category</Text>
            <View style={styles.wrap}>
              {categories.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.choice,
                    category === value && styles.choiceActive,
                  ]}
                  onPress={() => setCategory(value)}
                >
                  <Text>{value.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              style={[styles.input, styles.area]}
              multiline
              placeholder="Describe what happened"
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={[styles.input, styles.area]}
              multiline
              placeholder="What outcome would you like?"
              value={desiredOutcome}
              onChangeText={setDesiredOutcome}
            />
            <TouchableOpacity
              style={styles.secondary}
              onPress={() =>
                void DocumentPicker.getDocumentAsync({
                  type: [
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "application/pdf",
                  ],
                  multiple: true,
                }).then((result) => {
                  if (!result.canceled) setEvidence(result.assets.slice(0, 5));
                })
              }
            >
              <Text>
                {evidence.length
                  ? `${evidence.length} evidence file(s) selected`
                  : "Attach images or PDFs"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primary, submitting && styles.disabled]}
              disabled={submitting}
              onPress={() => void submit()}
            >
              <Text style={styles.primaryText}>
                {submitting ? "Submitting..." : "Submit dispute"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={Boolean(selected)} animationType="slide">
        <View style={styles.container}>
          {selected ? (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{selected.disputeCode}</Text>
                <View />
              </View>
              <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                  <Text style={styles.title}>{selected.subject}</Text>
                  <Text style={styles.status}>
                    {friendlyStatus(selected.status)}
                  </Text>
                  <Text>{selected.description}</Text>
                  <Text style={styles.label}>Desired outcome</Text>
                  <Text>{selected.desiredOutcome}</Text>
                  {selected.evidenceDocumentIds.map((documentId) => (
                    <TouchableOpacity
                      key={documentId}
                      style={styles.secondary}
                      onPress={() =>
                        void disputesService
                          .evidenceAccess(documentId)
                          .then(Linking.openURL)
                      }
                    >
                      <Text>Open secure evidence</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selected.resolution ? (
                  <View style={styles.resolution}>
                    <Text style={styles.title}>Admin resolution</Text>
                    <Text>{selected.resolution.summary}</Text>
                    {selected.resolution.recommendedActions.map((action) => (
                      <Text key={action}>• {action}</Text>
                    ))}
                    {selected.status === "resolved" ? (
                      <>
                        <TextInput
                          style={styles.input}
                          placeholder="Explain why this case should be reopened"
                          value={reopenReason}
                          onChangeText={setReopenReason}
                        />
                        <View style={styles.row}>
                          <TouchableOpacity
                            style={styles.primary}
                            disabled={submitting}
                            onPress={() =>
                              void disputesService
                                .acknowledge(selected.id)
                                .then(load)
                            }
                          >
                            <Text style={styles.primaryText}>Acknowledge</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.secondary}
                            disabled={
                              submitting ||
                              selected.reopenCount >= 1 ||
                              reopenReason.trim().length < 5
                            }
                            onPress={() => void reopenCase()}
                          >
                            <Text>Reopen</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </View>
                ) : null}
                <Text style={styles.label}>Timeline</Text>
                {events.map((event) => (
                  <View key={event.id} style={styles.card}>
                    <Text style={styles.title}>
                      {friendlyEvent(event.type)}
                    </Text>
                    <Text>{friendlyEventMessage(event)}</Text>
                    <Text style={styles.muted}>
                      {friendlyActor(event.actorRole)}
                    </Text>
                    {event.documentIds.map((documentId) => (
                      <TouchableOpacity
                        key={documentId}
                        style={styles.secondary}
                        onPress={() =>
                          void disputesService
                            .evidenceAccess(documentId)
                            .then(Linking.openURL)
                        }
                      >
                        <Text>Open attached evidence</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
                {selected.status === "awaiting_response" ? (
                  <>
                    <View style={styles.responseNotice}>
                      <Feather
                        name="message-circle"
                        size={18}
                        color="#1D4ED8"
                      />
                      <Text style={styles.responseNoticeText}>
                        Smart Credit support needs more information from you.
                        Add your response below.
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.area]}
                      multiline
                      textAlignVertical="top"
                      placeholder="Reply to the admin's information request"
                      value={message}
                      onChangeText={setMessage}
                    />
                    <TouchableOpacity
                      style={styles.secondary}
                      onPress={() =>
                        void DocumentPicker.getDocumentAsync({
                          type: [
                            "image/jpeg",
                            "image/png",
                            "image/webp",
                            "application/pdf",
                          ],
                          multiple: true,
                        }).then((result) => {
                          if (!result.canceled)
                            setMessageEvidence(result.assets.slice(0, 5));
                        })
                      }
                    >
                      <Text>
                        {messageEvidence.length
                          ? `${messageEvidence.length} evidence file(s)`
                          : "Attach evidence"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.primary}
                      disabled={submitting || !message.trim()}
                      onPress={() => void sendComment()}
                    >
                      <Text style={styles.primaryText}>
                        {submitting ? "Sending..." : "Send response"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : selected.status !== "resolved" &&
                  selected.status !== "closed" ? (
                  <Text style={styles.helpText}>
                    No response is required from you right now. We will enable
                    replies if more information is needed.
                  </Text>
                ) : null}
              </ScrollView>
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 7 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  title: { fontWeight: "700", fontSize: 16 },
  muted: { color: "#6B7280" },
  status: {
    color: COLORS.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  label: { fontWeight: "700", marginTop: 8 },
  choice: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 11,
  },
  choiceActive: { borderColor: COLORS.primary, backgroundColor: "#EFF6FF" },
  emptyLoanState: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
  },
  area: { minHeight: 100, textAlignVertical: "top" },
  primary: {
    backgroundColor: COLORS.primary,
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  responseNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  responseNoticeText: { flex: 1, color: "#1E3A8A", lineHeight: 20 },
  helpText: {
    color: "#6B7280",
    lineHeight: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
  },
  secondary: {
    backgroundColor: "#E5E7EB",
    padding: 13,
    borderRadius: 10,
    alignItems: "center",
  },
  resolution: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 14,
    gap: 7,
  },
});

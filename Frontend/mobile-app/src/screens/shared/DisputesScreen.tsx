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
  const [messageEvidence, setMessageEvidence] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [evidence, setEvidence] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);

  const load = useCallback(async () => {
    try {
      const [cases, eligible] = await Promise.all([
        disputesService.list(),
        disputesService.eligibleLoans(),
      ]);
      setItems(cases);
      setLoans(eligible);
      setSelected((current) =>
        current
          ? (cases.find((item) => item.id === current.id) ?? current)
          : null,
      );
    } catch (error: any) {
      Alert.alert("Disputes", error?.message ?? "Failed to load disputes.");
    }
  }, []);

  useEffect(() => {
    void load();
    const changed = () => void load();
    const connected = () => void load();
    chatSocket.on("disputeChanged", changed);
    chatSocket.on("socketConnected", connected);
    return () => {
      chatSocket.off("disputeChanged", changed);
      chatSocket.off("socketConnected", connected);
    };
  }, [load]);

  useEffect(() => {
    if (selected) void disputesService.events(selected.id).then(setEvents);
  }, [selected?.id]);

  async function submit() {
    if (
      !loanId ||
      subject.trim().length < 3 ||
      description.trim().length < 10 ||
      desiredOutcome.trim().length < 3
    ) {
      Alert.alert(
        "Missing details",
        "Select a loan and complete all dispute fields.",
      );
      return;
    }
    try {
      const evidenceDocumentIds = await Promise.all(
        evidence
          .slice(0, 5)
          .map((asset) => uploadDisputeEvidence(asset, loanId)),
      );
      const dispute = await disputesService.create({
        loanId,
        category,
        subject,
        description,
        desiredOutcome,
        ...(transactionId.trim()
          ? { transactionId: transactionId.trim() }
          : {}),
        ...(installmentId.trim()
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
      Alert.alert("Unable to submit", error?.message ?? "Please try again.");
    }
  }

  async function sendComment() {
    if (!selected || !message.trim()) return;
    const documentIds = await Promise.all(
      messageEvidence
        .slice(0, 5)
        .map((asset) => uploadDisputeEvidence(asset, selected.loanId)),
    );
    await disputesService.comment(selected.id, message.trim(), documentIds);
    setMessage("");
    setMessageEvidence([]);
    setEvents(await disputesService.events(selected.id));
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
              onPress={() => setSelected(item)}
            >
              <View style={styles.row}>
                <Text style={styles.title}>{item.subject}</Text>
                <Text style={styles.status}>
                  {item.status.replace(/_/g, " ")}
                </Text>
              </View>
              <Text style={styles.muted}>
                {item.disputeCode} · Loan {item.loanId}
              </Text>
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
            <Text style={styles.label}>Loan</Text>
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
              style={styles.primary}
              onPress={() => void submit()}
            >
              <Text style={styles.primaryText}>Submit dispute</Text>
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
                    {selected.status.replace(/_/g, " ")}
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
                  </View>
                ) : null}
                <Text style={styles.label}>Timeline</Text>
                {events.map((event) => (
                  <View key={event.id} style={styles.card}>
                    <Text style={styles.title}>
                      {event.type.replace(/_/g, " ")}
                    </Text>
                    <Text>{event.message}</Text>
                    <Text style={styles.muted}>{event.actorRole}</Text>
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
                {selected.status !== "closed" ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Add a message or reopening reason"
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
                      onPress={() => void sendComment()}
                    >
                      <Text style={styles.primaryText}>Send message</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {selected.status === "resolved" ? (
                  <View style={styles.row}>
                    <TouchableOpacity
                      style={styles.primary}
                      onPress={() =>
                        void disputesService.acknowledge(selected.id).then(load)
                      }
                    >
                      <Text style={styles.primaryText}>Acknowledge</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondary}
                      onPress={() => {
                        if (!message.trim()) {
                          Alert.alert(
                            "Reason required",
                            "Enter the reopening reason in the message field first.",
                          );
                          return;
                        }
                        void disputesService
                          .reopen(selected.id, message.trim())
                          .then(() => {
                            setMessage("");
                            return load();
                          });
                      }}
                    >
                      <Text>Reopen</Text>
                    </TouchableOpacity>
                  </View>
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

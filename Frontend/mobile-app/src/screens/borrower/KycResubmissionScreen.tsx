/** @format */

import React, { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { resubmitKyc } from "../../api/services/auth.service";
import { getApiErrorMessage } from "../../api/api-error";
import { useAuth } from "../../context/AuthContext";
type Props = { navigation: { goBack: () => void } };
type FileField = "documentFrontUrl" | "documentBackUrl" | "selfieUrl";

async function pickAsDataUrl() {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not process this file."));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, name: asset.name ?? "Selected file" };
}

export default function KycResubmissionScreen({ navigation }: Props) {
  const { sessionStatus, kycSubmission, refreshWorkspace } = useAuth();
  const [files, setFiles] = useState<Partial<Record<FileField, string>>>({});
  const [names, setNames] = useState<Partial<Record<FileField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(field: FileField) {
    try {
      setError("");
      const selected = await pickAsDataUrl();
      if (!selected) return;
      setFiles((current) => ({ ...current, [field]: selected.dataUrl }));
      setNames((current) => ({ ...current, [field]: selected.name }));
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "Could not select the file."));
    }
  }

  async function submit() {
    if (!files.documentFrontUrl || !files.documentBackUrl) {
      setError("Upload both the front and back of your identity document.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await resubmitKyc({
        documentFrontUrl: files.documentFrontUrl,
        documentBackUrl: files.documentBackUrl,
        selfieUrl: files.selfieUrl,
      });
      await refreshWorkspace();
      Alert.alert("KYC resubmitted", "Your new documents are under review.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (nextError) {
      setError(getApiErrorMessage(nextError, "KYC resubmission failed."));
    } finally {
      setBusy(false);
    }
  }

  const documentLabel =
    kycSubmission?.documentType === "passport"
      ? "Passport"
      : kycSubmission?.documentType === "driving_license"
        ? "Driving licence"
        : "NIC";

  const options: Array<{
    field: FileField;
    label: string;
    required?: boolean;
  }> = [
    {
      field: "documentFrontUrl",
      label: `${documentLabel} front`,
      required: true,
    },
    {
      field: "documentBackUrl",
      label: `${documentLabel} back`,
      required: true,
    },
    { field: "selfieUrl", label: "New selfie with document" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Re-upload KYC</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Submit corrected documents</Text>
        <Text style={styles.subtitle}>
          {sessionStatus?.user?.kycStatus === "rejected"
            ? "Your previous submission was rejected. Upload clear replacement files below."
            : "Upload replacement identity documents for review."}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {options.map((option) => (
          <TouchableOpacity
            key={option.field}
            style={styles.fileCard}
            disabled={busy}
            onPress={() => void choose(option.field)}
          >
            <Feather
              name={names[option.field] ? "check-circle" : "upload"}
              size={22}
              color="#007AFF"
            />
            <View style={styles.fileText}>
              <Text style={styles.fileLabel}>
                {option.label}
                {option.required ? " *" : ""}
              </Text>
              <Text style={styles.fileName}>
                {names[option.field] ?? "Choose image or PDF"}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.submit, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void submit()}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitText}>Send for review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F6FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 15, lineHeight: 22, color: "#6B7280", marginBottom: 8 },
  error: { color: "#DC2626", fontSize: 14 },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  fileText: { marginLeft: 14, flex: 1 },
  fileLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  fileName: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  submit: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    minHeight: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.6 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

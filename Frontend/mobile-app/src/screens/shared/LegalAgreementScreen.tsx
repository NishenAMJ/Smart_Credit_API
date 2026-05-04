/** @format */

import React, { useState, useEffect } from "react";
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import {
  acceptLegalDocument,
  generateLegalDocument,
  getLatestLegalDocument,
} from "../../api/services/auth.service";
import type { LegalDocument, MobileRole } from "../../types/auth";

type LegalAgreementScreenProps = {
  role: MobileRole;
  initialLoanId?: string;
};

export default function LegalAgreementScreen({
  role,
  initialLoanId,
}: LegalAgreementScreenProps) {
  const { refreshing, refreshWorkspace, session } = useAuth();
  const [loanId, setLoanId] = useState(initialLoanId || "");
  const [signedName, setSignedName] = useState("");
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "Enter a loan ID to load the latest agreement. Lenders can also generate a new one.",
  );
  const [error, setError] = useState("");

  const isPartyAccepted =
    role === "borrower" ? document?.borrowerAccepted : document?.lenderAccepted;

  async function handleLoadLatest(idToLoad?: string) {
    const trimmedLoanId = (idToLoad || loanId).trim();

    if (!trimmedLoanId) {
      setError("Loan ID is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await getLatestLegalDocument(trimmedLoanId);

      if (!response.document) {
        setDocument(null);
        setMessage("No agreement exists for this loan yet.");
        return;
      }

      setDocument(response.document);
      setMessage("Latest agreement loaded successfully.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to load the legal agreement.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    const trimmedLoanId = loanId.trim();

    if (!trimmedLoanId) {
      setError("Loan ID is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await generateLegalDocument(trimmedLoanId);
      setDocument(response.document);
      setMessage(response.message ?? "Agreement generated successfully.");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to generate the legal agreement.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!document) {
      return;
    }

    if (!signedName.trim()) {
      setError("Enter your legal signing name before accepting the agreement.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await acceptLegalDocument(document.id, {
        signedName: signedName.trim(),
      });
      setDocument(response.document);
      if (response.document && response.document.status === "fully_accepted") {
        setMessage(
          "Loan is now ACTIVE! Both parties have accepted the agreement.",
        );
      } else {
        setMessage(response.message ?? "Agreement acceptance recorded.");
      }

      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to accept the legal agreement.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialLoanId) {
      void handleLoadLatest(initialLoanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoanId]);

  async function handleDownload() {
    if (!document || !session?.accessToken) {
      return;
    }

    const downloadPath =
      document.pdfDownloadPath ??
      `/api/legal/documents/${document.id}/download`;
    const downloadUrl = `${API_BASE_URL}${downloadPath}?token=${encodeURIComponent(
      session.accessToken,
    )}`;

    try {
      const supported = await Linking.canOpenURL(downloadUrl);

      if (!supported) {
        Alert.alert(
          "Download unavailable",
          "This device cannot open the PDF link.",
        );
        return;
      }

      await Linking.openURL(downloadUrl);
    } catch {
      Alert.alert(
        "Download failed",
        "We could not open the PDF download link.",
      );
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshWorkspace()}
          tintColor={COLORS.primary}
        />
      }
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Legal agreement</Text>
        <Text style={styles.subtitle}>
          {role === "borrower"
            ? "Borrowers can review the current agreement, accept it, and open the PDF after signing."
            : "Lenders can generate the agreement, accept it, and open the PDF after signing."}
        </Text>

        <View style={styles.stack}>
          <Text style={styles.label}>Loan ID</Text>
          <Input
            value={loanId}
            onChangeText={setLoanId}
            placeholder="Paste a loan document ID"
            autoCapitalize="none"
            editable={!initialLoanId}
          />
        </View>

        <View style={styles.actionRow}>
          <Button
            onPress={() => void handleLoadLatest()}
            disabled={loading}
            style={styles.actionButton}
          >
            {loading ? "Loading..." : "Load latest"}
          </Button>
          {role === "lender" ? (
            <Button
              onPress={() => void handleGenerate()}
              disabled={loading}
              style={styles.actionButton}
            >
              {loading ? "Generating..." : "Generate"}
            </Button>
          ) : null}
        </View>

        <Text style={styles.helper}>{message}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {document ? (
          <View style={styles.documentStack}>
            <DetailRow label="Document status" value={document.status} />
            <DetailRow
              label="Borrower accepted"
              value={document.borrowerAccepted ? "Yes" : "No"}
            />
            <DetailRow
              label="Lender accepted"
              value={document.lenderAccepted ? "Yes" : "No"}
            />
            <DetailRow
              label="Borrower signed name"
              value={
                document.borrowerSignatureAudit?.signedName ??
                "Pending signer name"
              }
            />
            <DetailRow
              label="Lender signed name"
              value={
                document.lenderSignatureAudit?.signedName ??
                "Pending signer name"
              }
            />
            <DetailRow
              label="Loan amount"
              value={new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
                maximumFractionDigits: 0,
              }).format(document.loanSnapshot.amount)}
            />
            <DetailRow
              label="Interest and tenure"
              value={`${document.loanSnapshot.interestRate}% for ${document.loanSnapshot.durationMonths} months`}
            />

            <View style={styles.htmlPreview}>
              <Text style={styles.previewTitle}>{document.title}</Text>
              <Text style={styles.previewSummary}>{document.summary}</Text>
            </View>

            <View style={styles.stack}>
              <Text style={styles.label}>Your legal signing name</Text>
              <Input
                value={signedName}
                onChangeText={setSignedName}
                placeholder="Enter your full legal name"
              />
            </View>

            <View style={styles.actionColumn}>
              <Button
                onPress={() => void handleAccept()}
                disabled={loading || Boolean(isPartyAccepted)}
              >
                {isPartyAccepted ? "Agreement accepted" : "Accept agreement"}
              </Button>
              <Button
                onPress={() => void handleDownload()}
                disabled={loading || !isPartyAccepted}
                style={styles.secondaryAction}
              >
                Download PDF
              </Button>
            </View>
          </View>
        ) : null}
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  card: {
    gap: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  stack: {
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },
  helper: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: "#D92D20",
    fontSize: 14,
    fontWeight: "500",
  },
  documentStack: {
    gap: SPACING.md,
  },
  detailRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  detailValue: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  htmlPreview: {
    borderRadius: 16,
    backgroundColor: "#F8FBFF",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  previewTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  previewSummary: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  actionColumn: {
    gap: SPACING.sm,
  },
  secondaryAction: {
    backgroundColor: "#0F172A",
  },
});

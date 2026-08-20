/** @format */

import React, { useState, useEffect } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Feather } from "@expo/vector-icons";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";
import {
  acceptLegalDocument,
  confirmAgreementDisbursement,
  generateLegalDocument,
  getLatestLegalDocument,
  retryLegalDocumentFinalization,
} from "../../api/services/auth.service";
import { chatSocket } from "../../services/socketService";
import type { LegalDocument, MobileRole } from "../../types/auth";

type LegalAgreementScreenProps = {
  role: MobileRole;
  initialLoanId?: string;
  route?: { params?: { initialLoanId?: string } };
};

export default function LegalAgreementScreen({
  role,
  initialLoanId,
  route,
}: LegalAgreementScreenProps) {
  const routedLoanId = initialLoanId ?? route?.params?.initialLoanId ?? "";
  const { refreshing, refreshWorkspace, session } = useAuth();
  const [loanId, setLoanId] = useState(routedLoanId);
  const [signedName, setSignedName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fundsReceivedConfirmed, setFundsReceivedConfirmed] = useState(false);
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [transferReference, setTransferReference] = useState("");
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    routedLoanId
      ? "Loading the agreement..."
      : "Enter a loan ID to load the latest agreement. Lenders can also generate a new one.",
  );
  const [error, setError] = useState("");

  const isPartyAccepted =
    role === "borrower"
      ? document?.borrowerAcceptance.accepted
      : document?.lenderAcceptance.accepted;
  const lenderHasSigned = document?.lenderAcceptance.accepted ?? false;
  const disbursementConfirmed =
    document?.disbursementConfirmation.confirmed ?? false;
  const canSignInSequence =
    role === "lender" || (lenderHasSigned && disbursementConfirmed);

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
    if (!consentAccepted) {
      setError("Confirm that you reviewed and agree to this agreement.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await acceptLegalDocument(document.id, {
        signedName: signedName.trim(),
        consentAccepted: true,
        agreementVersion: document.version,
        termsHash: document.termsHash,
        fundsReceivedConfirmed:
          role === "borrower" ? fundsReceivedConfirmed : undefined,
      });
      setDocument(response.document);

      if (response.document?.status === "fully_accepted") {
        setMessage(
          "Loan is now active after the lender-first and borrower-second signatures.",
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
    if (session?.user.fullName) setSignedName(session.user.fullName);
  }, [session?.user.fullName]);

  useEffect(() => {
    if (routedLoanId) {
      setLoanId(routedLoanId);
      void handleLoadLatest(routedLoanId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routedLoanId]);

  useEffect(() => {
    const refreshAgreement = (event: { loanId: string }) => {
      const currentLoanId = document?.loanId ?? loanId;
      if (currentLoanId && event.loanId === currentLoanId)
        void handleLoadLatest(currentLoanId);
    };
    const refreshAfterReconnect = () => {
      const currentLoanId = document?.loanId ?? loanId;
      if (currentLoanId) void handleLoadLatest(currentLoanId);
    };
    chatSocket.on("agreementChanged", refreshAgreement);
    chatSocket.on("socketConnected", refreshAfterReconnect);
    return () => {
      chatSocket.off("agreementChanged", refreshAgreement);
      chatSocket.off("socketConnected", refreshAfterReconnect);
    };
  }, [document?.loanId, loanId]);

  async function handleConfirmDisbursement() {
    if (!document || !transferConfirmed) return;
    try {
      setLoading(true);
      setError("");
      const response = await confirmAgreementDisbursement(document.id, {
        confirmationAccepted: true,
        externalReference: transferReference.trim() || undefined,
      });
      setDocument(response.document);
      setMessage(response.message ?? "External transfer confirmed.");
      setTransferConfirmed(false);
      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to confirm the external transfer.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryFinalization() {
    if (!document) return;
    try {
      setLoading(true);
      setError("");
      const response = await retryLegalDocumentFinalization(document.id);
      setDocument(response.document);
      setMessage(response.message ?? "Agreement finalization completed.");
      await refreshWorkspace();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Failed to finalize the signed agreement.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    if (!document || !session?.accessToken) {
      return;
    }

    const downloadPath = document.pdfDownloadPath.replace(/^\/api/, "");
    const downloadUrl = `${API_BASE_URL}${downloadPath}`;
    const fileName = `smart-credit-agreement-${document.loanId}-v${document.version}.pdf`;
    const destination = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      const result = await FileSystem.downloadAsync(downloadUrl, destination, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Download failed with status ${result.status}`);
      }
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Download unavailable",
          "File sharing is not available on this device.",
        );
        return;
      }
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Save or share loan agreement",
        UTI: "com.adobe.pdf",
      });
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
          onRefresh={() => {
            void refreshWorkspace();
            if (loanId) void handleLoadLatest(loanId);
          }}
          tintColor={COLORS.primary}
        />
      }
    >
      <Card style={styles.card}>
        <Text style={styles.title}>Legal agreement</Text>
        <Text style={styles.subtitle}>
          {role === "borrower"
            ? "Review the agreement now. You can sign only after the lender signs and after the external money-transfer step. Smart Credit does not verify that transfer."
            : "Review and sign the agreement first. The borrower signs afterward, and Smart Credit does not execute or verify the external transfer."}
        </Text>

        {routedLoanId ? (
          <DetailRow label="Loan ID" value={routedLoanId} />
        ) : (
          <>
            <View style={styles.stack}>
              <Text style={styles.label}>Loan ID</Text>
              <Input
                value={loanId}
                onChangeText={setLoanId}
                placeholder="Paste a loan document ID"
                autoCapitalize="none"
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
          </>
        )}

        <Text style={styles.helper}>{message}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {document ? (
          <View style={styles.documentStack}>
            <DetailRow label="Document status" value={document.status.replace(/_/g, " ")} />
            <DetailRow label="Agreement version" value={`Version ${document.version}`} />
            <DetailRow
              label="Borrower accepted"
              value={document.borrowerAcceptance.accepted ? "Yes" : "No"}
            />
            <DetailRow
              label="Lender accepted"
              value={document.lenderAcceptance.accepted ? "Yes" : "No"}
            />
            <DetailRow
              label="Borrower signed name"
              value={document.borrowerAcceptance.signedName ?? "Pending signer name"}
            />
            <DetailRow
              label="Lender signed name"
              value={document.lenderAcceptance.signedName ?? "Pending signer name"}
            />
            <DetailRow
              label="External transfer"
              value={
                disbursementConfirmed
                  ? `Confirmed${
                      document.disbursementConfirmation.externalReference
                        ? ` · ${document.disbursementConfirmation.externalReference}`
                        : ""
                    }`
                  : "Waiting for lender confirmation"
              }
            />
            <DetailRow
              label="Principal"
              value={new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 2,
              }).format(document.terms.principalMinor / 100)}
            />
            <DetailRow
              label="Interest and tenure"
              value={`${document.terms.annualInterestRate}% for ${document.terms.tenureMonths} months`}
            />
            <DetailRow
              label="Monthly installment"
              value={new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
                minimumFractionDigits: 2,
              }).format(document.terms.monthlyInstallmentMinor / 100)}
            />

            <View style={styles.htmlPreview}>
              <Text style={styles.previewTitle}>{document.title}</Text>
              <Text style={styles.previewSummary}>{document.summary}</Text>
            </View>

            <View style={styles.stack}>
              <Text style={styles.label}>Your legal signing name</Text>
              <Input
                value={signedName}
                editable={false}
                placeholder="Enter your full legal name"
              />
              <Text style={styles.helperText}>
                This is your verified profile name. Update your profile if it is incorrect.
              </Text>
            </View>

            {role === "borrower" && !canSignInSequence ? (
              <Text style={styles.sequenceNotice}>
                {!lenderHasSigned
                  ? "Waiting for the lender to sign this agreement first."
                  : "Waiting for the lender to confirm the external transfer."}
              </Text>
            ) : null}

            {role === "lender" && lenderHasSigned && !disbursementConfirmed ? (
              <View style={styles.stack}>
                <Text style={styles.label}>External transfer reference (optional)</Text>
                <Input
                  value={transferReference}
                  onChangeText={setTransferReference}
                  placeholder="Bank reference or receipt number"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: transferConfirmed }}
                  style={styles.consentRow}
                  onPress={() => setTransferConfirmed((current) => !current)}
                >
                  <Feather
                    name={transferConfirmed ? "check-square" : "square"}
                    size={22}
                    color={transferConfirmed ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.consentText}>
                    I confirm that I sent the agreement principal to the borrower outside Smart Credit.
                  </Text>
                </TouchableOpacity>
                <Button
                  onPress={() => void handleConfirmDisbursement()}
                  disabled={loading || !transferConfirmed}
                >
                  Confirm funds sent
                </Button>
              </View>
            ) : null}

            {!document.legacyReadOnly && !isPartyAccepted && canSignInSequence ? (
              <View style={styles.stack}>
                {role === "borrower" ? (
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: fundsReceivedConfirmed }}
                    style={styles.consentRow}
                    onPress={() =>
                      setFundsReceivedConfirmed((current) => !current)
                    }
                  >
                    <Feather
                      name={fundsReceivedConfirmed ? "check-square" : "square"}
                      size={22}
                      color={
                        fundsReceivedConfirmed
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                    <Text style={styles.consentText}>
                      I confirm that I received the principal from the lender.
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentAccepted }}
                  style={styles.consentRow}
                  onPress={() => setConsentAccepted((current) => !current)}
                >
                  <Feather
                    name={consentAccepted ? "check-square" : "square"}
                    size={22}
                    color={consentAccepted ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.consentText}>
                    {role === "borrower"
                      ? `I reviewed version ${document.version}, agree to these terms, and intend my verified typed name to be my electronic signature.`
                      : `I reviewed version ${document.version}, agree to these terms, and intend my verified typed name to be my lender signature.`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.actionColumn}>
              <Button
                onPress={() => void handleAccept()}
                disabled={
                  loading ||
                  Boolean(isPartyAccepted) ||
                  document.legacyReadOnly ||
                  !canSignInSequence ||
                  !consentAccepted ||
                  (role === "borrower" && !fundsReceivedConfirmed)
                }
              >
                {document.legacyReadOnly
                  ? "Legacy agreement"
                  : isPartyAccepted
                    ? "Agreement accepted"
                    : !canSignInSequence
                      ? "Waiting for lender transfer confirmation"
                    : "Sign agreement"}
              </Button>
              {document.status === "finalization_failed" ? (
                <Button
                  onPress={() => void handleRetryFinalization()}
                  disabled={loading}
                  style={styles.secondaryAction}
                >
                  Retry PDF finalization
                </Button>
              ) : null}
              <Button
                onPress={() => void handleDownload()}
                disabled={loading}
                style={styles.secondaryAction}
              >
                {document.pdfAvailable ? "Download signed PDF" : "Download draft PDF"}
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
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: "#F8FBFF",
  },
  consentText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sequenceNotice: {
    color: "#92400E",
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
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

/** @format */

import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import type {
  BorrowerApplication,
  ApplicationStatus,
} from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";
import { applicationService } from "../../api/services/application.service";
import { getApiErrorMessage } from "../../api/api-error";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";
import BorrowerRefreshControl from "../../components/borrower/BorrowerRefreshControl";

type ApplicationDetailsScreenProps = {
  route: {
    params?: {
      application?: BorrowerApplication;
    };
  };
  navigation: BorrowerNavigation;
};

const STATUS_STEPS: {
  key: ApplicationStatus | string;
  label: string;
  icon: string;
}[] = [
  { key: "draft", label: "Draft", icon: "edit-3" },
  { key: "submitted", label: "Submitted", icon: "send" },
  { key: "under_review", label: "Under Review", icon: "eye" },
  { key: "approved", label: "Approved", icon: "check-circle" },
  { key: "converted", label: "Agreement Created", icon: "file-text" },
];

const STATUS_COLOR: Record<string, string> = {
  draft: "#6B7280",
  submitted: "#F59E0B",
  under_review: "#3B82F6",
  approved: "#10B981",
  converted: "#059669",
  rejected: "#EF4444",
  withdrawn: "#6B7280",
};

function getStatusLabel(status?: string) {
  return status
    ? status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Unknown";
}

function getCurrentStepIndex(status?: string) {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

export default function ApplicationDetailsScreen({
  route,
  navigation,
}: ApplicationDetailsScreenProps) {
  const [application, setApplication] = useState(route.params?.application);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const applicationId = application?.requestId ?? application?.applicationId;

  const onRefresh = useCallback(async () => {
    if (!applicationId) return;
    setRefreshing(true);
    try {
      setErrorMessage("");
      const response =
        await applicationService.getApplicationById(applicationId);
      setApplication(response.data);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "Unable to update this application right now.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [applicationId]);
  const rawStatus = String(application?.status ?? "").toLowerCase();
  const status =
    rawStatus === "open" || rawStatus === "pending"
      ? "submitted"
      : rawStatus === "accepted"
        ? "approved"
        : rawStatus === "funded"
          ? "converted"
          : rawStatus === "cancelled"
            ? "withdrawn"
            : rawStatus || "submitted";
  const currentStep = getCurrentStepIndex(status);
  const isClosed = status === "rejected" || status === "withdrawn";
  const statusColor = STATUS_COLOR[status] ?? "#9CA3AF";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <BorrowerPageHeader
        title="Application Details"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <BorrowerRefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            enabled={Boolean(applicationId)}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
        {/* Status Badge */}
        <View
          style={[styles.statusBadgeCard, { borderLeftColor: statusColor }]}
        >
          <View>
            <Text style={styles.statusBadgeLabel}>Application Status</Text>
            <Text style={[styles.statusBadgeValue, { color: statusColor }]}>
              {getStatusLabel(status)}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>

        {/* Application Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Summary</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Loan Purpose</Text>
            <Text style={styles.infoValue}>
              {application?.loanPurpose ?? application?.purpose ?? "—"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Requested Amount</Text>
            <Text style={styles.infoValue}>
              {application?.amount
                ? `LKR ${application.amount.toLocaleString()}`
                : "—"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted On</Text>
            <Text style={styles.infoValue}>
              {formatDate(application?.createdAt)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>
              {formatDate(application?.updatedAt)}
            </Text>
          </View>

          {application?.purposeDescription ? (
            <>
              <View style={styles.divider} />
              <View style={styles.infoColumn}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { marginTop: 4, textAlign: "left" },
                  ]}
                >
                  {application.purposeDescription}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {status === "converted" && application?.convertedLoanId ? (
          <TouchableOpacity
            style={styles.agreementButton}
            onPress={() =>
              navigation.navigate("LoanAgreement", {
                initialLoanId: application.convertedLoanId ?? undefined,
              })
            }
          >
            <Feather name="file-text" size={18} color={COLORS.onPrimary} />
            <Text style={styles.agreementButtonText}>
              Review and sign agreement
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Timeline</Text>

          {isClosed ? (
            <View style={styles.rejectedBanner}>
              <Feather name="x-circle" size={20} color="#EF4444" />
              <Text style={styles.rejectedText}>
                This application was {getStatusLabel(status).toLowerCase()}.
              </Text>
            </View>
          ) : (
            STATUS_STEPS.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isActive = index === currentStep;
              const isLast = index === STATUS_STEPS.length - 1;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        isCompleted && styles.timelineDotDone,
                        isActive && styles.timelineDotActive,
                      ]}
                    >
                      <Feather
                        name={step.icon as any}
                        size={12}
                        color={isCompleted ? "#FFFFFF" : "#9CA3AF"}
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted &&
                            index < currentStep &&
                            styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        isActive && styles.timelineLabelActive,
                        !isCompleted && styles.timelineLabelInactive,
                      ]}
                    >
                      {step.label}
                    </Text>
                    {isActive && (
                      <Text style={styles.timelineSubLabel}>Current Stage</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { width: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.onPrimary },
  scrollContent: { padding: SPACING.lg, paddingBottom: 60 },
  errorBanner: {
    backgroundColor: COLORS.errorSoft,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    lineHeight: 18,
  },
  agreementButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 14,
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  agreementButtonText: { color: COLORS.onPrimary, fontWeight: "700" },
  statusBadgeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statusBadgeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statusBadgeValue: { fontSize: 18, fontWeight: "700" },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  infoColumn: { paddingVertical: SPACING.sm },
  infoLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  divider: { height: 1, backgroundColor: COLORS.border },
  rejectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  rejectedText: { fontSize: 14, color: "#EF4444", fontWeight: "500" },
  timelineRow: { flexDirection: "row" },
  timelineLeft: { alignItems: "center", marginRight: SPACING.md },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.borderStrong,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotDone: { backgroundColor: COLORS.primary },
  timelineDotActive: { backgroundColor: COLORS.primary, elevation: 4 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.borderStrong,
    marginVertical: 2,
    minHeight: 24,
  },
  timelineLineDone: { backgroundColor: COLORS.primary },
  timelineContent: { flex: 1, paddingVertical: 4, paddingBottom: SPACING.md },
  timelineLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  timelineLabelActive: { color: COLORS.primary },
  timelineLabelInactive: { color: COLORS.textMuted },
  timelineSubLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  editButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  editButtonText: { color: COLORS.onPrimary, fontWeight: "600", fontSize: 15 },
});

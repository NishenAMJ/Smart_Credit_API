/** @format */

import React from "react";
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
  { key: "pending", label: "Submitted", icon: "send" },
  { key: "under_review", label: "Under Review", icon: "eye" },
  { key: "approved", label: "Approved", icon: "check-circle" },
  { key: "funded", label: "Funded", icon: "dollar-sign" },
];

const STATUS_COLOR: Record<string, string> = {
  draft: "#9CA3AF",
  pending: "#F59E0B",
  under_review: "#3B82F6",
  approved: "#10B981",
  funded: "#059669",
  rejected: "#EF4444",
  cancelled: "#6B7280",
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
  const application = route.params?.application;
  const status = application?.status ?? "draft";
  const currentStep = getCurrentStepIndex(status);
  const isRejected = status === "rejected" || status === "cancelled";
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name='arrow-left' size={22} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Application Timeline</Text>

          {isRejected ? (
            <View style={styles.rejectedBanner}>
              <Feather name='x-circle' size={20} color='#EF4444' />
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

        {status === "draft" && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name='edit-2' size={16} color='#FFFFFF' />
            <Text style={styles.editButtonText}>Continue Editing</Text>
          </TouchableOpacity>
        )}
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  scrollContent: { padding: SPACING.lg, paddingBottom: 60 },
  statusBadgeCard: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
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
  divider: { height: 1, backgroundColor: "#F3F4F6" },
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
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineDotDone: { backgroundColor: COLORS.primary },
  timelineDotActive: { backgroundColor: COLORS.primary, elevation: 4 },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 2,
    minHeight: 24,
  },
  timelineLineDone: { backgroundColor: COLORS.primary },
  timelineContent: { flex: 1, paddingVertical: 4, paddingBottom: SPACING.md },
  timelineLabel: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  timelineLabelActive: { color: COLORS.primary },
  timelineLabelInactive: { color: "#9CA3AF" },
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
  editButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 15 },
});

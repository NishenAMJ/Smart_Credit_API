/** @format */

import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/common/Card";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";

export default function LenderKycScreen({ navigation }: any) {
  const { kycSubmission, refreshing, refreshWorkspace, sessionStatus } =
    useAuth();
  const status =
    kycSubmission?.status ?? sessionStatus?.kycStatus ?? "not_submitted";

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
        <Text style={styles.title}>KYC verification</Text>
        <Text style={styles.subtitle}>
          Mobile lenders complete KYC during sign up. This screen lets you
          review the live status.
        </Text>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>
            {status.replace(/_/g, " ").toUpperCase()}
          </Text>
        </View>

        <DetailRow
          label="Document type"
          value={kycSubmission?.documentType ?? "Not available"}
        />
        <DetailRow
          label="Document number"
          value={kycSubmission?.documentNumber ?? "Not available"}
        />
        <DetailRow
          label="Submitted"
          value={
            kycSubmission?.submittedAt
              ? new Date(kycSubmission.submittedAt).toLocaleDateString()
              : "Not submitted yet"
          }
        />
        <DetailRow
          label="Review notes"
          value={kycSubmission?.reviewNotes ?? "No notes yet"}
        />
        {status === "rejected" ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Re-upload rejected KYC documents"
            style={styles.resubmitButton}
            onPress={() => navigation.navigate("KycResubmission")}
          >
            <Text style={styles.resubmitButtonText}>Re-upload documents</Text>
          </TouchableOpacity>
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
    gap: SPACING.md,
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
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EAFBF3",
  },
  statusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
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
  resubmitButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
  },
  resubmitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

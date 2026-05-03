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
import { formatCurrency } from "../../utils/formatters";
import type { BorrowerTransaction } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";
import { formatPaymentMethod } from "../../utils/formatPaymentMethods";

type TransactionDetailsScreenProps = {
  route: {
    params?: {
      transaction?: BorrowerTransaction;
    };
  };
  navigation: BorrowerNavigation;
};

const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  completed: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  pending: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  failed: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TransactionDetailsScreen({
  route,
  navigation,
}: TransactionDetailsScreenProps) {
  const transaction = route.params?.transaction;
  const rawStatus = String(transaction?.status ?? "pending").toLowerCase();
  const statusCfg = STATUS_CONFIG[rawStatus] ?? STATUS_CONFIG.pending;
  const displayDate = formatDate(
    transaction?.paidAt ?? transaction?.timestamp ?? transaction?.createdAt,
  );
  const txType = transaction?.type
    ? transaction.type
        .replace("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Repayment";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Hero Card */}
        <View style={styles.amountCard}>
          <View style={[styles.amountIcon, { backgroundColor: statusCfg.bg }]}>
            <Feather
              name={statusCfg.icon as any}
              size={28}
              color={statusCfg.color}
            />
          </View>
          <Text style={styles.amountLabel}>Transaction Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(transaction?.amount)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)}
            </Text>
          </View>
        </View>

        {/* Transaction Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transaction Info</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Type</Text>
            <Text style={styles.rowValue}>{txType}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date & Time</Text>
            <Text style={styles.rowValue}>{displayDate}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payment Method</Text>
            <Text style={styles.rowValue}>
              {formatPaymentMethod(transaction?.paymentMethod)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {transaction?.type === "disbursement" ? "From" : "To"}
            </Text>
            <Text style={styles.rowValue}>
              {transaction?.lenderName ?? "—"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Transaction ID</Text>
            <Text style={[styles.rowValue, styles.monoText]}>
              {transaction?.transactionId ?? transaction?.repaymentId ?? "—"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Loan ID</Text>
            <Text style={[styles.rowValue, styles.monoText]}>
              {transaction?.loanId ?? "—"}
            </Text>
          </View>
        </View>

        {/* Status banners */}
        {rawStatus === "pending" && (
          <View style={styles.infoBanner}>
            <Feather name="info" size={16} color="#D97706" />
            <Text style={styles.infoBannerText}>
              This transaction is pending verification. It may take up to 24
              hours to complete.
            </Text>
          </View>
        )}
        {rawStatus === "failed" && (
          <View style={[styles.infoBanner, { backgroundColor: "#FEE2E2" }]}>
            <Feather name="alert-triangle" size={16} color="#DC2626" />
            <Text style={[styles.infoBannerText, { color: "#DC2626" }]}>
              This transaction failed. Please contact support if the issue
              persists.
            </Text>
          </View>
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
  amountCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  amountIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  amountLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 13, fontWeight: "600" },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  rowLabel: { fontSize: 13, color: COLORS.textSecondary },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: "60%",
    textAlign: "right",
  },
  monoText: { fontFamily: "monospace", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#F3F4F6" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    padding: SPACING.md,
    borderRadius: 10,
    gap: SPACING.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#D97706",
    lineHeight: 19,
  },
});

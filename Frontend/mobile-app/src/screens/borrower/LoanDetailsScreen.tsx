/** @format */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoanDetailsHeader from "../../components/borrower/LoanDetailsHeader";
import PaymentCard from "../../components/borrower/PaymentCard";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/common/Button";
import { getPayments } from "../../api/services/payment.service";
import { formatCurrency } from "../../utils/formatters";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { navigateToBorrowerTab } from "../../utils/borrowerNavigation";
import type { BorrowerLoan, BorrowerRepayment } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type LoanDetailsScreenProps = {
  route: {
    params?: {
      loan?: BorrowerLoan;
    };
  };
  navigation: BorrowerNavigation;
};

/**
 * Shows repayment schedule and payment history for a single active loan.
 */
export default function LoanDetailsScreen({
  route,
  navigation,
}: LoanDetailsScreenProps) {
  const loan = route.params?.loan;

  const [payments, setPayments] = useState<BorrowerRepayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loan?.loanId) {
      setLoading(true);
      getPayments()
        .then((data) => {
          setPayments(data.filter((p) => p.loanId === loan.loanId));
        })
        .finally(() => setLoading(false));
    }
  }, [loan?.loanId]);

  const upcomingPayments = payments.filter((p) => {
    const s = String(p.status || "").toLowerCase();
    return s !== "paid" && s !== "completed";
  });
  const pastPayments = payments.filter((p) => {
    const s = String(p.status || "").toLowerCase();
    return s === "paid" || s === "completed";
  });

  const totalPaid = pastPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const outstanding =
    loan?.outstandingBalance ??
    (loan?.principalAmount ?? loan?.amount ?? 0) - totalPaid;

  const renderActiveView = () => (
    <>
      <View style={{ marginBottom: SPACING.lg }}>
        <Button
          onPress={() =>
            navigation.navigate("Agreement", {
              initialLoanId: loan?.loanId,
            })
          }
        >
          View Agreement
        </Button>
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Outstanding</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(Math.max(0, outstanding))}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Paid</Text>
          <Text style={styles.metricValue}>{formatCurrency(totalPaid)}</Text>
        </View>
      </View>

      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>Repayment Schedule</Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={{ marginTop: 20 }}
          />
        ) : upcomingPayments.length > 0 ? (
          upcomingPayments.map((payment, index) => (
            <PaymentCard
              key={payment.paymentId ?? `up-${index}`}
              payment={payment}
              paymentMethod="Card"
              onPay={() => navigateToBorrowerTab(navigation, "Payments")}
            />
          ))
        ) : (
          <EmptyState title="No upcoming payment" />
        )}

        {pastPayments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
              Past Payments
            </Text>
            {pastPayments.map((payment, index) => (
              <PaymentCard
                key={payment.paymentId ?? `past-${index}`}
                payment={payment}
                onPay={() =>
                  navigateToBorrowerTab(navigation, "Payments", {
                    tab: "History",
                  })
                }
              />
            ))}
          </>
        )}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <LoanDetailsHeader
        title="Active Loan"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderActiveView()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },
  applyButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scheduleSection: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
});

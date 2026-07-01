import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader, AlertBanner } from "../../components/lender";
import { PaymentsService } from "../../services/lender.service";

/**
 
   loanStatus ('active'|'completed'|'overdue'), status (installment status),
 **/

type FilterType = "all" | "active" | "completed" | "overdue";

export default function ActiveLoansScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await PaymentsService.getTransactions({
          pageSize: 100,
        });
        setAllLoans(data?.transactions ?? []);
        setSummary(data?.summary ?? null);
      } catch {
        setAllLoans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter by loanStatus (not the installment payment status)
  const filtered = allLoans.filter(
    (l) =>
      filter === "all" || (l.loanStatus ?? "active").toLowerCase() === filter,
  );

  const getLoanStatusStyle = (loanStatus: string) => {
    switch ((loanStatus ?? "active").toLowerCase()) {
      case "completed":
        return { bg: "#ECFDF5", color: COLORS.success, label: "COMPLETED" };
      case "overdue":
        return { bg: "#FEF2F2", color: COLORS.danger, label: "OVERDUE" };
      default:
        return { bg: "#EBF4FF", color: COLORS.primary, label: "ACTIVE" };
    }
  };

  const daysUntilDue = (
    nextDueDate: string | null | undefined,
  ): number | null => {
    if (!nextDueDate) return null;
    try {
      const diff = new Date(nextDueDate).getTime() - Date.now();
      return Math.round(diff / 86400_000);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Active Loans"
          onBackPress={() => navigation.goBack()}
        />
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={COLORS.primary}
          size="large"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader
        title="Active Loans"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Summary bar */}
        {summary && (
          <View style={[commonStyles.card, { marginBottom: 4 }]}>
            <View style={commonStyles.rowSpaceBetween}>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.sumNum}>
                  {summary.loansWithActivity ?? allLoans.length}
                </Text>
                <Text style={commonStyles.textSecondary}>Total Loans</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={[styles.sumNum, { color: COLORS.success }]}>
                  LKR {((summary.totalCollected ?? 0) / 1000).toFixed(0)}K
                </Text>
                <Text style={commonStyles.textSecondary}>Collected</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={[
                    styles.sumNum,
                    {
                      color:
                        summary.overdueInstallments > 0
                          ? COLORS.danger
                          : COLORS.textSecondary,
                    },
                  ]}
                >
                  {summary.overdueInstallments ?? 0}
                </Text>
                <Text style={commonStyles.textSecondary}>Overdue</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter tabs */}
        <View style={styles.filters}>
          {(["all", "active", "completed", "overdue"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.btn, filter === f && styles.btnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[styles.btnText, filter === f && styles.btnTextActive]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <AlertBanner
            type="info"
            title="No Loans"
            message={`No ${filter === "all" ? "" : filter} loans found`}
          />
        ) : (
          filtered.map((loan: any, index: number) => {
            const ss = getLoanStatusStyle(loan.loanStatus);
            const paid = loan.installmentSummary?.paidInstallments ?? 0;
            const total = loan.installmentSummary?.totalInstallments ?? 0;
            const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
            const days = daysUntilDue(loan.installmentSummary?.nextDueDate);
            const principal = loan.amount ?? 0;
            const remaining = loan.remainingAmount ?? 0;

            return (
              <TouchableOpacity
                key={`${loan.loanId ?? loan.transactionId}-${index}`}
                style={commonStyles.card}
                onPress={() =>
                  navigation.push("LoanDetails", { loanId: loan.loanId })
                }
                activeOpacity={0.8}
              >
                {/* Header row */}
                <View style={commonStyles.rowSpaceBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={commonStyles.sectionTitle}>
                      {loan.borrowerName ?? "Unknown"}
                    </Text>
                    <Text style={commonStyles.textSecondary}>
                      Loan ...{(loan.loanId ?? "").slice(-6)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[styles.badgeText, { color: ss.color }]}>
                      {ss.label}
                    </Text>
                  </View>
                </View>

                {/* Amount row */}
                <View style={[commonStyles.rowSpaceBetween, { marginTop: 12 }]}>
                  <View>
                    <Text style={commonStyles.textSecondary}>Principal</Text>
                    <Text style={commonStyles.textPrimary}>
                      LKR {principal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={commonStyles.textSecondary}>Outstanding</Text>
                    <Text
                      style={[
                        commonStyles.textPrimary,
                        {
                          color:
                            remaining > 0 ? COLORS.warning : COLORS.success,
                        },
                      ]}
                    >
                      LKR {remaining.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                {total > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <View style={commonStyles.rowSpaceBetween}>
                      <Text style={commonStyles.textSecondary}>
                        {paid}/{total} installments
                      </Text>
                      <Text style={commonStyles.textSecondary}>{pct}%</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: ss.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                {/* Next due / days */}
                {days !== null &&
                  (loan.loanStatus ?? "active") !== "completed" && (
                    <View style={[commonStyles.row, { marginTop: 8 }]}>
                      <Feather
                        name="clock"
                        size={13}
                        color={
                          days < 0
                            ? COLORS.danger
                            : days <= 7
                              ? COLORS.warning
                              : COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          commonStyles.textSecondary,
                          {
                            marginLeft: 4,
                            color:
                              days < 0
                                ? COLORS.danger
                                : days <= 7
                                  ? COLORS.warning
                                  : COLORS.textSecondary,
                          },
                        ]}
                      >
                        {days < 0
                          ? `${Math.abs(days)} days overdue`
                          : days === 0
                            ? "Due today"
                            : `${days} days until next payment`}
                      </Text>
                    </View>
                  )}
              </TouchableOpacity>
            );
          })
        )}

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  sumNum: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  btnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  btnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "600" },
  btnTextActive: { color: "#fff" },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  progressBg: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});

import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader, StatCard } from "../../components/lender";
import { ActivityIndicator } from "react-native";
import { AnalyticsService } from "../../services/lender.service";



export default function AnalyticsScreen({ navigation }: any) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeMap: Record<string, "30d" | "90d" | "365d"> = {
    week: "30d",
    month: "30d",
    quarter: "90d",
    year: "365d",
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await AnalyticsService.getSummary(
          rangeMap[period] ?? "90d",
        );
        setData(res);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  // Safely pull values from nested response structure
  const sum = data?.summary ?? {};
  const port = data?.portfolio ?? {};
  const risk = data?.risk ?? {};
  const perf = data?.performance ?? {};

  const fmt = (val: number | undefined) =>
    val != null ? `LKR ${(val / 1000).toFixed(1)}K` : "--";

  const pct = (val: number | undefined) =>
    val != null ? `${Number(val).toFixed(1)}%` : "--";

  const num = (val: number | undefined) => (val != null ? String(val) : "--");

  const breakdown = [
    {
      type: "Active Loans",
      count: num(sum.activeLoans),
      color: COLORS.success,
    },
    {
      type: "Overdue Loans",
      count: num(risk.overdueLoans),
      color: COLORS.warning,
    },
    {
      type: "Defaulted Loans",
      count: num(risk.defaultedLoans),
      color: COLORS.danger,
    },
    { type: "Open Disputes", count: num(risk.openDisputes), color: "#8B5CF6" },
  ];

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Analytics"
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
      <LenderHeader title="Analytics" onBackPress={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "quarter", "year"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.periodTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Key Metrics Row 1 */}
        <View style={styles.metricsGrid}>
          <StatCard
            icon="trending-up"
            color={COLORS.success}
            value={fmt(sum.totalLent)}
            label="Total Lent"
          />
          <StatCard
            icon="check-circle"
            color={COLORS.primary}
            value={fmt(sum.totalCollected)}
            label="Collected"
          />
        </View>

        {/* Key Metrics Row 2 */}
        <View style={styles.metricsGrid}>
          <StatCard
            icon="activity"
            color={COLORS.warning}
            value={pct(sum.repaymentSuccessRate)}
            label="Repayment Rate"
          />
          <StatCard
            icon="dollar-sign"
            color="#8B5CF6"
            value={fmt(port.outstandingAmount)}
            label="Outstanding"
          />
        </View>

        {/* Portfolio Info */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Portfolio</Text>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Avg Loan Size</Text>
            <Text style={commonStyles.textPrimary}>
              {fmt(port.averageLoanSize)}
            </Text>
          </View>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Avg Interest Rate</Text>
            <Text style={commonStyles.textPrimary}>
              {pct(port.averageInterestRate)}
            </Text>
          </View>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Avg Tenure</Text>
            <Text style={commonStyles.textPrimary}>
              {port.averageTenureMonths != null
                ? `${Number(port.averageTenureMonths).toFixed(0)} months`
                : "--"}
            </Text>
          </View>
        </View>

        {/* Performance */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Performance</Text>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Active Ads</Text>
            <Text style={commonStyles.textPrimary}>{num(perf.activeAds)}</Text>
          </View>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Requests Received</Text>
            <Text style={commonStyles.textPrimary}>
              {num(perf.requestsReceived)}
            </Text>
          </View>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <Text style={commonStyles.textSecondary}>Conversion Rate</Text>
            <Text style={commonStyles.textPrimary}>
              {pct(perf.requestToLoanConversionRate)}
            </Text>
          </View>
        </View>

        {/* Loan Breakdown */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Breakdown</Text>
          {breakdown.map((item) => (
            <View
              key={item.type}
              style={[commonStyles.rowSpaceBetween, { marginTop: 10 }]}
            >
              <View style={commonStyles.row}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={commonStyles.textPrimary}>{item.type}</Text>
              </View>
              <Text
                style={[
                  commonStyles.textPrimary,
                  { fontWeight: "700", color: item.color },
                ]}
              >
                {item.count}
              </Text>
            </View>
          ))}
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: { fontSize: 12, fontWeight: "500", color: COLORS.textSecondary },
  periodTextActive: { color: "#fff" },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
});

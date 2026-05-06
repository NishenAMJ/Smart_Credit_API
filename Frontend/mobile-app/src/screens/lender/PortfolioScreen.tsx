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
import { LenderHeader, StatCard } from "../../components/lender";
import { AnalyticsService } from "../../services/lender.service";



export default function PortfolioScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await AnalyticsService.getSummary("90d");
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sum = data?.summary ?? {};
  const port = data?.portfolio ?? {};
  const risk = data?.risk ?? {};
  const perf = data?.performance ?? {};

  const fmt = (val: number | undefined) =>
    val != null ? `LKR ${(val / 1000).toFixed(1)}K` : "--";

  const pct = (val: number | undefined) =>
    val != null ? `${Number(val).toFixed(1)}%` : "--";

  const num = (val: number | undefined) => (val != null ? String(val) : "--");

  // Category rows — analytics doesn't break down by category,
  // so we build meaningful derived rows from what we have
  const categories = [
    {
      id: "1",
      type: "Active Loans",
      icon: "check-circle",
      color: COLORS.success,
      details: [
        { label: "Count", value: num(sum.activeLoans) },
        { label: "Outstanding", value: fmt(port.outstandingAmount) },
        { label: "Avg Loan Size", value: fmt(port.averageLoanSize) },
      ],
    },
    {
      id: "2",
      type: "Risk Overview",
      icon: "alert-triangle",
      color: COLORS.danger,
      details: [
        { label: "Overdue Loans", value: num(risk.overdueLoans) },
        { label: "Defaulted", value: num(risk.defaultedLoans) },
        { label: "Open Disputes", value: num(risk.openDisputes) },
      ],
    },
    {
      id: "3",
      type: "Performance",
      icon: "trending-up",
      color: COLORS.primary,
      details: [
        { label: "Requests Received", value: num(perf.requestsReceived) },
        {
          label: "Conversion Rate",
          value: pct(perf.requestToLoanConversionRate),
        },
        { label: "Repayment Rate", value: pct(sum.repaymentSuccessRate) },
      ],
    },
    {
      id: "4",
      type: "Loan Terms",
      icon: "sliders",
      color: COLORS.warning,
      details: [
        { label: "Avg Interest Rate", value: pct(port.averageInterestRate) },
        {
          label: "Avg Tenure",
          value:
            port.averageTenureMonths != null
              ? `${Number(port.averageTenureMonths).toFixed(0)} months`
              : "--",
        },
        {
          label: "Avg Credit Score",
          value:
            risk.averageBorrowerCreditScore != null
              ? String(risk.averageBorrowerCreditScore)
              : "--",
        },
      ],
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Portfolio"
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
      <LenderHeader title="Portfolio" onBackPress={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Top Stats */}
        <View style={styles.summaryGrid}>
          <StatCard
            icon="briefcase"
            color={COLORS.primary}
            value={num(sum.activeLoans)}
            label="Active Loans"
          />
          <StatCard
            icon="trending-up"
            color={COLORS.success}
            value={fmt(sum.totalLent)}
            label="Total Lent"
          />
        </View>
        <View style={[styles.summaryGrid, { marginBottom: 16 }]}>
          <StatCard
            icon="check-circle"
            color={COLORS.primary}
            value={fmt(sum.totalCollected)}
            label="Collected"
          />
          <StatCard
            icon="alert-circle"
            color={COLORS.danger}
            value={num(risk.overdueLoans)}
            label="Overdue Loans"
          />
        </View>

        {/* Category Accordion */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Portfolio Breakdown</Text>

          {categories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.categoryItem}
              onPress={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              activeOpacity={0.8}
            >
              <View style={commonStyles.rowSpaceBetween}>
                <View style={commonStyles.row}>
                  <View
                    style={[
                      styles.catIcon,
                      { backgroundColor: item.color + "1A" },
                    ]}
                  >
                    <Feather
                      name={item.icon as any}
                      size={16}
                      color={item.color}
                    />
                  </View>
                  <Text style={commonStyles.textPrimary}>{item.type}</Text>
                </View>
                <Feather
                  name={expandedId === item.id ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textSecondary}
                />
              </View>

              {expandedId === item.id && (
                <View style={styles.expandedContent}>
                  {item.details.map((d) => (
                    <View
                      key={d.label}
                      style={[
                        commonStyles.rowSpaceBetween,
                        { paddingVertical: 4 },
                      ]}
                    >
                      <Text style={commonStyles.textSecondary}>{d.label}</Text>
                      <Text style={commonStyles.textPrimary}>{d.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Outstanding Amount highlight */}
        {port.outstandingAmount != null && (
          <View style={commonStyles.card}>
            <Text style={commonStyles.sectionTitle}>Outstanding Balance</Text>
            <Text style={styles.outstandingText}>
              {fmt(port.outstandingAmount)}
            </Text>
            <Text style={commonStyles.textSecondary}>
              Total receivable across all active loans
            </Text>
          </View>
        )}

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  expandedContent: {
    marginTop: 10,
    paddingLeft: 42,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary + "40",
  },
  outstandingText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.warning,
    marginVertical: 8,
  },
});

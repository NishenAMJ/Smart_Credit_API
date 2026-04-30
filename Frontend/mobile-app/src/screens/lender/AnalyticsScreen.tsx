import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, StatCard } from '../../components/lender';
import { ActivityIndicator } from 'react-native';
import { AnalyticsService } from '../../services/lender.service';

// ── Main Component ──────────────────────────────────
export default function AnalyticsScreen({ navigation }: any) {
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map UI period labels to backend range keys
  const rangeMap: Record<string, '30d' | '90d' | '365d'> = {
    week: '30d',
    month: '30d',
    quarter: '90d',
    year: '365d',
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await AnalyticsService.getSummary(rangeMap[period] ?? '90d');
        setSummary(data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, [period]);

  const stats = {
    totalDisbursed: summary ? ((summary.totalDisbursed ?? 0) / 1000).toFixed(0) + 'K' : '--',
    totalCollected: summary ? ((summary.totalCollected ?? 0) / 1000).toFixed(0) + 'K' : '--',
    defaultRate:    summary ? String(summary.defaultRate ?? '0') : '--',
    avgInterestEarned: summary ? ((summary.interestEarned ?? 0) / 1000).toFixed(0) + 'K' : '--',
  };

  const breakdown = summary
    ? [
        { type: 'Active',    count: String(summary.activeLoans    ?? 0), color: COLORS.success },
        { type: 'Completed', count: String(summary.completedLoans ?? 0), color: COLORS.primary },
        { type: 'Defaulted', count: String(summary.defaultedLoans ?? 0), color: COLORS.danger  },
      ]
    : [
        { type: 'Active',    count: '--', color: COLORS.success },
        { type: 'Completed', count: '--', color: COLORS.primary },
        { type: 'Defaulted', count: '--', color: COLORS.danger  },
      ];

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Analytics" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Analytics" onBackPress={() => navigation.goBack()} />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {['week', 'month', 'quarter', 'year'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <StatCard icon="trending-up" color={COLORS.success} value={stats.totalDisbursed} label="Total Disbursed" />
          <StatCard icon="check-circle" color={COLORS.primary} value={stats.totalCollected} label="Total Collected" />
        </View>

        <View style={styles.metricsGrid}>
          <StatCard icon="alert-circle" color={COLORS.danger} value={`${stats.defaultRate}%`} label="Default Rate" />
          <StatCard icon="dollar-sign" color={COLORS.warning} value={stats.avgInterestEarned} label="Interest Earned" />
        </View>

        {/* Breakdown */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Breakdown</Text>
          
          {breakdown.map((item) => (
            <View key={item.type} style={commonStyles.rowSpaceBetween}>
              <View style={commonStyles.row}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={commonStyles.textPrimary}>{item.type}</Text>
              </View>
              <Text style={commonStyles.textPrimary}>{item.count}</Text>
            </View>
          ))}
        </View>

        {/* Chart Placeholder */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartPlaceholder}>
            <Feather name="bar-chart-2" size={48} color={COLORS.border} />
            <Text style={commonStyles.textSecondary}>Chart visualization</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  periodSelector: {
    flexDirection: 'row',
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
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
});

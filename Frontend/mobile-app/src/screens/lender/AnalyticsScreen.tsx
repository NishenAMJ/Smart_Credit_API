import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, StatCard } from '../../components/lender';

// ── Main Component ──────────────────────────────────
export default function AnalyticsScreen({ navigation }: any) {
  const [period, setPeriod] = useState('month');

  const stats = {
    totalDisbursed: '28,50,000',
    totalCollected: '18,75,000',
    defaultRate: '3.2',
    avgInterestEarned: '2,85,000',
  };

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
          
          {[
            { type: 'Active', count: '12', color: COLORS.success },
            { type: 'Completed', count: '28', color: COLORS.primary },
            { type: 'Defaulted', count: '2', color: COLORS.danger },
          ].map((item) => (
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

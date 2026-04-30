import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, StatCard } from '../../components/lender';
import { AnalyticsService } from '../../services/lender.service';

// ── Main Component ──────────────────────────────────
export default function PortfolioScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await AnalyticsService.getSummary('90d');
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build portfolio breakdown from API loan category breakdown if available
  const portfolioData = summary?.loanCategories ?? [
    { id: '1', type: 'Personal Loans',   count: summary?.personalLoans  ?? '--', amount: '--', rate: '--' },
    { id: '2', type: 'Business Loans',   count: summary?.businessLoans  ?? '--', amount: '--', rate: '--' },
    { id: '3', type: 'Education Loans',  count: summary?.educationLoans ?? '--', amount: '--', rate: '--' },
    { id: '4', type: 'Vehicle Loans',    count: summary?.vehicleLoans   ?? '--', amount: '--', rate: '--' },
  ];

  const totalLoans = summary?.totalLoans ?? '--';
  const portfolioSize = summary?.totalDisbursed != null
    ? `${((summary.totalDisbursed) / 100000).toFixed(2)}L`
    : '--';

  const performance = [
    { label: 'On-Time Collection', value: summary?.onTimeRate != null ? `${summary.onTimeRate}%` : '--', color: COLORS.success },
    { label: 'Default Rate',       value: summary?.defaultRate != null ? `${summary.defaultRate}%` : '--', color: COLORS.danger  },
    { label: 'Portfolio Yield',    value: summary?.portfolioYield != null ? `${summary.portfolioYield}%` : '--', color: COLORS.primary },
  ];

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Portfolio" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Portfolio" onBackPress={() => navigation.goBack()} />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryGrid}>
          <StatCard icon="briefcase" color={COLORS.primary} value={String(totalLoans)} label="Total Loans" />
          <StatCard icon="trending-up" color={COLORS.success} value={portfolioSize} label="Portfolio Size" />
        </View>

        {/* Portfolio Breakdown */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Categories</Text>
          
          {portfolioData.map((item: any) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.categoryItem}
              onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              <View style={commonStyles.rowSpaceBetween}>
                <Text style={commonStyles.textPrimary}>{item.type}</Text>
                <Feather name={expandedId === item.id ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
              </View>

              {expandedId === item.id && (
                <View style={styles.expandedContent}>
                  <View style={commonStyles.rowSpaceBetween}>
                    <Text style={commonStyles.textSecondary}>Number of Loans</Text>
                    <Text style={commonStyles.textPrimary}>{item.count}</Text>
                  </View>
                  <View style={commonStyles.rowSpaceBetween}>
                    <Text style={commonStyles.textSecondary}>Total Amount</Text>
                    <Text style={commonStyles.textPrimary}>LKR {item.amount}</Text>
                  </View>
                  <View style={commonStyles.rowSpaceBetween}>
                    <Text style={commonStyles.textSecondary}>Interest Rate</Text>
                    <Text style={commonStyles.textPrimary}>{item.rate}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Metrics */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Performance</Text>
          
          {performance.map((item, idx) => (
            <View key={idx} style={commonStyles.rowSpaceBetween}>
              <Text style={commonStyles.textSecondary}>{item.label}</Text>
              <Text style={[commonStyles.textPrimary, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  expandedContent: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
    gap: 8,
  },
});

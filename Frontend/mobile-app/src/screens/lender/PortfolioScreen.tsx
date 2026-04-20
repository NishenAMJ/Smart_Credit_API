import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, StatCard } from '../../components/lender';

// ── Main Component ──────────────────────────────────
export default function PortfolioScreen({ navigation }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const portfolioData = [
    { id: '1', type: 'Personal Loans', count: 18, amount: '25,50,000', rate: '12%' },
    { id: '2', type: 'Business Loans', count: 8, amount: '15,25,000', rate: '14%' },
    { id: '3', type: 'Education Loans', count: 12, amount: '8,75,000', rate: '9%' },
    { id: '4', type: 'Vehicle Loans', count: 5, amount: '6,50,000', rate: '13%' },
  ];

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Portfolio" onBackPress={() => navigation.goBack()} />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Summary */}
        <View style={styles.summaryGrid}>
          <StatCard icon="briefcase" color={COLORS.primary} value="43" label="Total Loans" />
          <StatCard icon="trending-up" color={COLORS.success} value="55.99L" label="Portfolio Size" />
        </View>

        {/* Portfolio Breakdown */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Categories</Text>
          
          {portfolioData.map((item) => (
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
          
          {[
            { label: 'On-Time Collection', value: '94.2%', color: COLORS.success },
            { label: 'Default Rate', value: '3.2%', color: COLORS.danger },
            { label: 'Portfolio Yield', value: '12.8%', color: COLORS.primary },
          ].map((item, idx) => (
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

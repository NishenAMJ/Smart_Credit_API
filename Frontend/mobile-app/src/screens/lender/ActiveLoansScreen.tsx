import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, StatCard, AlertBanner } from '../../components/lender';

export default function ActiveLoansScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');
  
  const loans = [
    { id: 'L-001', borrower: 'Kasun Silva', amount: 150000, disbursed: 150000, roi: 18, status: 'active', daysLeft: 45 },
    { id: 'L-002', borrower: 'Priya Perera', amount: 75000, disbursed: 75000, roi: 20, status: 'overdue', daysLeft: -5 },
    { id: 'L-003', borrower: 'Vijay Kumar', amount: 200000, disbursed: 180000, roi: 16, status: 'active', daysLeft: 120 },
  ];

  const filtered = loans.filter(l => filter === 'all' || l.status === filter);

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Active Loans" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {(['all', 'active', 'overdue'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.btn, filter === f && styles.btnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.btnText, filter === f && styles.btnTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map((loan) => (
          <TouchableOpacity
            key={loan.id}
            style={commonStyles.card}
            onPress={() => navigation.push('LoanDetails', { loanId: loan.id })}
          >
            <View style={commonStyles.rowSpaceBetween}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.sectionTitle}>{loan.id}</Text>
                <Text style={commonStyles.textSecondary}>{loan.borrower}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: loan.status === 'active' ? COLORS.success : COLORS.danger }]}>
                <Text style={styles.badgeText}>{loan.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={commonStyles.spacer32} />

            <View style={styles.row}>
              <View>
                <Text style={commonStyles.textSecondary}>Loan Amount</Text>
                <Text style={commonStyles.textPrimary}>LKR {(loan.amount / 1000).toFixed(0)}K</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={commonStyles.textSecondary}>Disbursed</Text>
                <Text style={commonStyles.textPrimary}>LKR {(loan.disbursed / 1000).toFixed(0)}K</Text>
              </View>
            </View>

            <View style={styles.progress}>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${(loan.disbursed / loan.amount) * 100}%` }]} />
              </View>
              <Text style={commonStyles.textSecondary}>{Math.round((loan.disbursed / loan.amount) * 100)}% Disbursed</Text>
            </View>

            <View style={[commonStyles.row, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.textSecondary}>ROI</Text>
                <Text style={commonStyles.textPrimary}>{loan.roi}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.textSecondary}>Days Left</Text>
                <Text style={[commonStyles.textPrimary, { color: loan.daysLeft < 0 ? COLORS.danger : COLORS.success }]}>
                  {Math.abs(loan.daysLeft)} days
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  btnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  btnTextActive: {
    color: '#fff',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  progress: {
    marginVertical: 12,
  },
  bar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
});

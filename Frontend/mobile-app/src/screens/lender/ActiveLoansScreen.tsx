import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';

import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { RecentTransactionsService } from '../../services/lender.service';

export default function ActiveLoansScreen({ navigation }: any) {

  {/*navigation is used to move between screens,  any is TypeScript type (means “any type”)*/}
  const [filter, setFilter] = useState<'all' | 'active' | 'overdue'>('all');
  {/*filter → current selected filter,setFilter → function to change it*/}
  const [allLoans, setAllLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await RecentTransactionsService.getTransactions({ pageSize: 50 });
        setAllLoans(data?.transactions ?? []);
      } catch {
        setAllLoans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loans = allLoans;
  const filtered = loans.filter(l => filter === 'all' || l.status === filter);
  {/*Filters loans based on selected filter*/}

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Active Loans" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Active Loans" onBackPress={() => navigation.goBack()} />
        {/*Header component,Back button → goes to previous screen*/}
      
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

        {filtered.map((loan: any) => (
          <TouchableOpacity
            key={loan.id}
            style={commonStyles.card}
            onPress={() => navigation.push('LoanDetails', { loanId: loan.id })}
          >
            <View style={commonStyles.rowSpaceBetween}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.sectionTitle}>{loan.id}</Text>
                <Text style={commonStyles.textSecondary}>{loan.borrowerName ?? loan.borrower}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: loan.status === 'active' ? COLORS.success : COLORS.danger }]}>
                <Text style={styles.badgeText}>{(loan.status ?? 'active').toUpperCase()}</Text>
              </View>
            </View>

            <View style={commonStyles.spacer32} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.textSecondary}>Loan Amount</Text>
                <Text style={commonStyles.textPrimary}>LKR {((loan.principalAmount ?? loan.amount ?? 0) / 1000).toFixed(0)}K</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={commonStyles.textSecondary}>Disbursed</Text>
                <Text style={commonStyles.textPrimary}>LKR {((loan.disbursedAmount ?? loan.disbursed ?? 0) / 1000).toFixed(0)}K</Text>
              </View>
            </View>

            <View style={styles.progress}>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.min(((loan.disbursedAmount ?? loan.disbursed ?? 0) / (loan.principalAmount ?? loan.amount ?? 1)) * 100, 100)}%` }]} />
              </View>
              <Text style={commonStyles.textSecondary}>{Math.round(((loan.disbursedAmount ?? loan.disbursed ?? 0) / (loan.principalAmount ?? loan.amount ?? 1)) * 100)}% Disbursed</Text>
            </View>

            <View style={[commonStyles.row, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.textSecondary}>ROI</Text>
                <Text style={commonStyles.textPrimary}>{loan.interestRate ?? loan.roi ?? '--'}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.textSecondary}>Days Left</Text>
                <Text style={[commonStyles.textPrimary, { color: (loan.daysLeft ?? 0) < 0 ? COLORS.danger : COLORS.success }]}>
                  {Math.abs(loan.daysLeft ?? 0)} days
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

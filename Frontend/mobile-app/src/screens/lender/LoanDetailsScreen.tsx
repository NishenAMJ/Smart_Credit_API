import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, TouchableOpacity, Text, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';
import { RecentTransactionsService } from '../../services/lender.service';

/**
 * getLoanLedger API returns: LoanLedgerDetailsResponse
 * {
 *   lenderId: string,
 *   loan: { id, borrowerId, status, amount, remainingAmount, interestRate, tenureMonths, createdAt }
 *   installments: [{ id, status, dueDate, amount, paidAmount, payments: [...] }]
 * }
 */

export default function LoanDetailsScreen({ navigation, route }: any) {
  const loanId = route?.params?.loanId;
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loanId) {
      setError('No loan ID provided');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await RecentTransactionsService.getLoanLedger(loanId);
        setLedger(data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Failed to load loan details');
      } finally {
        setLoading(false);
      }
    })();
  }, [loanId]);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Loan Details" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (error || !ledger) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Loan Details" onBackPress={() => navigation.goBack()} />
        <AlertBanner type="error" title="Error" message={error ?? 'Loan not found'} />
      </SafeAreaView>
    );
  }

  // Pull from the nested `loan` object returned by the API
  const loan        = ledger.loan ?? {};
  const installments: any[] = ledger.installments ?? [];

  const principalAmount  = loan.amount ?? 0;
  const remainingAmount  = loan.remainingAmount ?? 0;
  const paidAmount       = principalAmount - remainingAmount;
  const status           = loan.status ?? 'active';
  const interestRate     = loan.interestRate ?? '--';
  const tenureMonths     = loan.tenureMonths ?? '--';
  const createdAt        = loan.createdAt
    ? new Date(loan.createdAt).toLocaleDateString()
    : '--';

  // Find next pending installment
  const nextInstallment  = installments.find(i => i.status === 'pending' || i.status === 'partial');
  const nextDueDate      = nextInstallment?.dueDate
    ? new Date(nextInstallment.dueDate).toLocaleDateString()
    : '--';
  const nextDueAmount    = nextInstallment?.amount ?? 0;

  // Progress
  const progressPercent  = principalAmount > 0
    ? Math.min(Math.round((paidAmount / principalAmount) * 100), 100)
    : 0;

  // Installment stats
  const paidCount     = installments.filter(i => i.status === 'paid').length;
  const overdueCount  = installments.filter(i => i.status === 'overdue').length;

  const getStatusStyle = () => {
    if (status === 'completed') return { bg: '#ECFDF5', color: COLORS.success };
    if (status === 'overdue')   return { bg: '#FEF2F2', color: COLORS.danger  };
    return                             { bg: '#EBF4FF', color: COLORS.primary };
  };
  const ss = getStatusStyle();

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Loan Details" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {overdueCount > 0 && (
          <AlertBanner
            type="error"
            title={`${overdueCount} Overdue Installment${overdueCount > 1 ? 's' : ''}`}
            message="Please follow up with the borrower"
          />
        )}

        {/* Loan Summary Card */}
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textSecondary}>Principal Amount</Text>
              <Text style={styles.largeText}>LKR {principalAmount.toLocaleString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.statusText, { color: ss.color }]}>
                {status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textSecondary}>
              LKR {paidAmount.toLocaleString()} recovered
            </Text>
            <Text style={commonStyles.textSecondary}>
              LKR {remainingAmount.toLocaleString()} remaining
            </Text>
          </View>
          <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 6 }]}>
            {progressPercent}% recovered
          </Text>
        </View>

        {/* Installment Summary */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Installment Progress</Text>
          <View style={[commonStyles.rowSpaceBetween, { marginTop: 8 }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.statNum, { color: COLORS.success }]}>{paidCount}</Text>
              <Text style={commonStyles.textSecondary}>Paid</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.statNum}>{installments.length}</Text>
              <Text style={commonStyles.textSecondary}>Total</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.statNum, { color: overdueCount > 0 ? COLORS.danger : COLORS.textSecondary }]}>
                {overdueCount}
              </Text>
              <Text style={commonStyles.textSecondary}>Overdue</Text>
            </View>
          </View>
        </View>

        {/* Loan Terms */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Terms</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Loan ID</Text>
            <Text style={commonStyles.textPrimary}>...{(loan.id ?? loanId ?? '').slice(-8)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Interest Rate</Text>
            <Text style={commonStyles.textPrimary}>{interestRate}% p.a.</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Tenure</Text>
            <Text style={commonStyles.textPrimary}>{tenureMonths} months</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Disbursed Date</Text>
            <Text style={commonStyles.textPrimary}>{createdAt}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={commonStyles.textSecondary}>Borrower ID</Text>
            <Text style={commonStyles.textPrimary}>{loan.borrowerId ?? '--'}</Text>
          </View>
        </View>

        {/* Next Payment */}
        {nextInstallment && (
          <View style={commonStyles.card}>
            <Text style={commonStyles.sectionTitle}>Next Payment</Text>
            <View style={styles.dueBox}>
              <Text style={commonStyles.textSecondary}>Amount Due</Text>
              <Text style={styles.largeText}>LKR {nextDueAmount.toLocaleString()}</Text>
              <Text style={commonStyles.textSecondary}>Due: {nextDueDate}</Text>
            </View>
          </View>
        )}

        {/* Installment Timeline */}
        {installments.length > 0 && (
          <View style={commonStyles.card}>
            <Text style={commonStyles.sectionTitle}>Installments</Text>
            {installments.slice(0, 6).map((inst: any, idx: number) => {
              const instColor =
                inst.status === 'paid'    ? COLORS.success :
                inst.status === 'overdue' ? COLORS.danger  :
                inst.status === 'partial' ? COLORS.warning  : COLORS.textSecondary;
              return (
                <View key={`${inst.id ?? 'inst'}-${idx}`} style={[styles.detailRow, idx === 0 && { borderTopWidth: 1, borderTopColor: COLORS.border }]}>
                  <View style={commonStyles.row}>
                    <View style={[styles.instDot, { backgroundColor: instColor }]} />
                    <Text style={commonStyles.textSecondary}>
                      #{idx + 1} · {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString() : '--'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.textPrimary, { color: instColor }]}>
                      {(inst.status ?? 'pending').toUpperCase()}
                    </Text>
                    <Text style={commonStyles.textSecondary}>
                      LKR {(inst.paidAmount ?? 0).toLocaleString()}/{(inst.amount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
            {installments.length > 6 && (
              <Text style={[commonStyles.textSecondary, { textAlign: 'center', marginTop: 8 }]}>
                +{installments.length - 6} more installments
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[commonStyles.primaryButton, { backgroundColor: COLORS.success }]}
            onPress={() => navigation.navigate('VerifyPayment', { loanId })}
          >
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={commonStyles.buttonText}>Verify Payment</Text>
          </TouchableOpacity>
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  largeText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dueBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  instDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  buttonGroup: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
});

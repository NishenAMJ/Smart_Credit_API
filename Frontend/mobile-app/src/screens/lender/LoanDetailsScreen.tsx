import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
{/*Icon library (used for button icon*/}
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';
import { RecentTransactionsService } from '../../services/lender.service';



export default function LoanDetailsScreen({ navigation, route }: any) {

    //navigation -move between screens
    //route - get data passed from previous screen
  const loanId = route?.params?.loanId || 'L-2026-001';
  // Gets loanId from navigatio If not found - use default
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await RecentTransactionsService.getLoanLedger(loanId);
        setLoan(data);
      } catch {
        setLoan(null);
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

  // Resolved display values from API or fallback
  const displayLoan = {
    id:              loan?.loanId ?? loanId,
    borrowerName:    loan?.borrowerName ?? '--',
    amount:          loan?.principalAmount ?? loan?.amount ?? 0,
    paidAmount:      loan?.totalPaid ?? loan?.paidAmount ?? 0,
    remainingAmount: loan?.remainingBalance ?? loan?.remainingAmount ?? 0,
    status:          loan?.status ?? 'active',
    rate:            loan?.interestRate ?? loan?.rate ?? '--',
    tenure:          loan?.tenureMonths ?? loan?.tenure ?? '--',
    disbursedDate:   loan?.disbursedAt ?? loan?.disbursedDate ?? '--',
    maturityDate:    loan?.maturityDate ?? '--',
    nextPaymentDue:  loan?.nextInstallmentDue ?? loan?.nextPaymentDue ?? '--',
    amountDue:       loan?.nextInstallmentAmount ?? loan?.amountDue ?? 0,
  };

  const progressPercent = displayLoan.amount > 0
    ? (displayLoan.paidAmount / displayLoan.amount) * 100
    : 0;

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Loan Details" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Status Alert */}
        {displayLoan.status === 'active' && (
          <AlertBanner type="success" title="Loan Active" message="All payments on track" />
        )}

        {/* Loan Summary */}
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textSecondary}>Total Amount</Text>
              <Text style={styles.largeText}>LKR {Number(displayLoan.amount).toLocaleString()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{displayLoan.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textSecondary}>LKR {Number(displayLoan.paidAmount).toLocaleString()} paid</Text>
            <Text style={commonStyles.textSecondary}>LKR {Number(displayLoan.remainingAmount).toLocaleString()} remaining</Text>
          </View>
        </View>

        {/* Borrower Info */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Borrower</Text>
          <View style={commonStyles.row}>
            <View style={commonStyles.avatar}>
              <Text style={styles.avatarText}>{displayLoan.borrowerName[0]}</Text>
            </View>
            <View>
              <Text style={commonStyles.textPrimary}>{displayLoan.borrowerName}</Text>
              <Text style={commonStyles.textSecondary}>{loanId}</Text>
            </View>
          </View>
        </View>

        {/* Loan Terms */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Terms</Text>
          
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Interest Rate</Text>
            <Text style={commonStyles.textPrimary}>{displayLoan.rate}% p.a.</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Tenure</Text>
            <Text style={commonStyles.textPrimary}>{displayLoan.tenure} months</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Disbursed Date</Text>
            <Text style={commonStyles.textPrimary}>{displayLoan.disbursedDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Maturity Date</Text>
            <Text style={commonStyles.textPrimary}>{displayLoan.maturityDate}</Text>
          </View>
        </View>

        {/* Payment Due */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Next Payment</Text>
          
          <View style={styles.dueBox} >
            <Text style={commonStyles.textSecondary}>Amount Due</Text>
            <Text style={styles.largeText}>LKR {Number(displayLoan.amountDue).toLocaleString()}</Text>
            <Text style={commonStyles.textSecondary}>Due: {displayLoan.nextPaymentDue}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={[commonStyles.primaryButton, { backgroundColor: COLORS.success }]} onPress={() => navigation.navigate('VerifyPayment', { loanId })}>
            <Feather name="check-circle" size={18} color="#fff" />
            <Text style={commonStyles.buttonText}>Verify Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  largeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginVertical: 4,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  progressContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dueBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  buttonGroup: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});

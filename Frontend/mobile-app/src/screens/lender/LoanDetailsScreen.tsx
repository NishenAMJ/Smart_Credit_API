import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
{/*Icon library (used for button icon*/}
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';


const MOCK_LOAN = {
  id: 'L-2026-001',
  borrowerName: 'Kasun Silva',
  amount: '50,000',
  paidAmount: '15,000',
  remainingAmount: '35,000',
  status: 'active',
  rate: '12',
  tenure: '12', //months
  disbursedDate: '2026-03-15',
  maturityDate: '2027-03-15',
  nextPaymentDue: '2026-05-15',
  amountDue: '4,500',
};


export default function LoanDetailsScreen({ navigation, route }: any) {

    //navigation -move between screens
    //route - get data passed from previous screen
  const loanId = route?.params?.loanId || 'L-2026-001';
  // Gets loanId from navigatio If not found - use default
  const loan = MOCK_LOAN;

  const progressPercent = (parseInt(loan.paidAmount) / parseInt(loan.amount)) * 100;

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Loan Details" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Status Alert */}
        {loan.status === 'active' && (
          <AlertBanner type="success" title="Loan Active" message="All payments on track" />
        )}

        {/* Loan Summary */}
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View>
              <Text style={commonStyles.textSecondary}>Total Amount</Text>
              <Text style={styles.largeText}>LKR {loan.amount}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{loan.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>
          <View style={commonStyles.rowSpaceBetween}>
            <Text style={commonStyles.textSecondary}>LKR {loan.paidAmount} paid</Text>
            <Text style={commonStyles.textSecondary}>LKR {loan.remainingAmount} remaining</Text>
          </View>
        </View>

        {/* Borrower Info */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Borrower</Text>
          <View style={commonStyles.row}>
            <View style={commonStyles.avatar}>
              <Text style={styles.avatarText}>{loan.borrowerName[0]}</Text>
            </View>
            <View>
              <Text style={commonStyles.textPrimary}>{loan.borrowerName}</Text>
              <Text style={commonStyles.textSecondary}>{loanId}</Text>
            </View>
          </View>
        </View>

        {/* Loan Terms */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Terms</Text>
          
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Interest Rate</Text>
            <Text style={commonStyles.textPrimary}>{loan.rate}% p.a.</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Tenure</Text>
            <Text style={commonStyles.textPrimary}>{loan.tenure} months</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Disbursed Date</Text>
            <Text style={commonStyles.textPrimary}>{loan.disbursedDate}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Maturity Date</Text>
            <Text style={commonStyles.textPrimary}>{loan.maturityDate}</Text>
          </View>
        </View>

        {/* Payment Due */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Next Payment</Text>
          
          <View style={styles.dueBox} >
            <Text style={commonStyles.textSecondary}>Amount Due</Text>
            <Text style={styles.largeText}>LKR {loan.amountDue}</Text>
            <Text style={commonStyles.textSecondary}>Due: {loan.nextPaymentDue}</Text>
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

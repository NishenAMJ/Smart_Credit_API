import React, { useState } from 'react';
import { FlatList, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Mock Collection History ──────────────────────────
const MOCK_HISTORY = [
  { id: '1', loanId: 'L-001', borrower: 'Kasun Silva', amount: '4,500', date: '2026-04-20', status: 'success' },
  { id: '2', loanId: 'L-002', borrower: 'Divya Patel', amount: '6,200', date: '2026-04-18', status: 'success' },
  { id: '3', loanId: 'L-003', borrower: 'Arjun Sharma', amount: '3,800', date: '2026-04-15', status: 'success' },
  { id: '4', loanId: 'L-004', borrower: 'Priya Singh', amount: '5,000', date: '2026-04-12', status: 'failed' },
];

// ── Main Component ──────────────────────────────────
export default function CollectionHistoryScreen({ navigation }: any) {
  const [history] = useState(MOCK_HISTORY);

  const successAmount = history.filter((h) => h.status === 'success').reduce((sum, h) => sum + parseInt(h.amount), 0);

  const renderItem = ({ item }: any) => (
    <View style={commonStyles.card}>
      <View style={commonStyles.rowSpaceBetween}>
        <View style={commonStyles.row}>
          <View style={[styles.statusIcon, { backgroundColor: item.status === 'success' ? '#ECFDF5' : '#FEF2F2' }]}>
            <Feather name={item.status === 'success' ? 'check-circle' : 'x-circle'} size={20} color={item.status === 'success' ? COLORS.success : COLORS.danger} />
          </View>
          <View>
            <Text style={commonStyles.textPrimary}>{item.borrower}</Text>
            <Text style={commonStyles.textSecondary}>{item.loanId}</Text>
          </View>
        </View>
        <View>
          <Text style={[commonStyles.textPrimary, { textAlign: 'right' }]}>LKR {item.amount}</Text>
          <Text style={[commonStyles.textSecondary, { textAlign: 'right' }]}>{item.date}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Collection History" onBackPress={() => navigation.goBack()} />
      
      {/* Summary */}
      <View style={commonStyles.card}>
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSecondary}>Total Collections</Text>
            <Text style={styles.largeText}>LKR {successAmount}</Text>
          </View>
          <View style={styles.statsBox}>
            <Text style={styles.statsNumber}>{history.length}</Text>
            <Text style={commonStyles.textSecondary}>Transactions</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  largeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 4,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBox: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

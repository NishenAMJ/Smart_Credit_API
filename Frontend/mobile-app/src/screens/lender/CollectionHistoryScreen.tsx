import React, { useState, useEffect } from 'react';
import { FlatList, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { RecentTransactionsService } from '../../services/lender.service';

// ── Main Component ──────────────────────────────────
export default function CollectionHistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCollected, setTotalCollected] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await RecentTransactionsService.getTransactions({ pageSize: 50 });
        const txns = data?.transactions ?? [];
        setHistory(txns);
        const sum = txns
          .filter((t: any) => (t.status ?? 'success') === 'success')
          .reduce((acc: number, t: any) => acc + (t.amount ?? t.paidAmount ?? 0), 0);
        setTotalCollected(sum);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderItem = ({ item }: any) => (
    <View style={commonStyles.card}>
      <View style={commonStyles.rowSpaceBetween}>
        <View style={commonStyles.row}>
          <View style={[styles.statusIcon, { backgroundColor: (item.status ?? 'success') === 'success' ? '#ECFDF5' : '#FEF2F2' }]}>
            <Feather name={(item.status ?? 'success') === 'success' ? 'check-circle' : 'x-circle'} size={20} color={(item.status ?? 'success') === 'success' ? COLORS.success : COLORS.danger} />
          </View>
          <View>
            <Text style={commonStyles.textPrimary}>{item.borrowerName ?? item.borrower}</Text>
            <Text style={commonStyles.textSecondary}>{item.loanId ?? item.id}</Text>
          </View>
        </View>
        <View>
          <Text style={[commonStyles.textPrimary, { textAlign: 'right' }]}>LKR {typeof item.amount === 'number' ? item.amount.toLocaleString() : (item.amount ?? '--')}</Text>
          <Text style={[commonStyles.textSecondary, { textAlign: 'right' }]}>{item.paidAt ? new Date(item.paidAt).toLocaleDateString() : (item.date ?? '')}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Collection History" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Collection History" onBackPress={() => navigation.goBack()} />
      
      {/* Summary */}
      <View style={commonStyles.card}>
        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={commonStyles.textSecondary}>Total Collections</Text>
            <Text style={styles.largeText}>LKR {totalCollected.toLocaleString()}</Text>
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

import React, { useState } from 'react';
import { FlatList, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';

const MOCK_ACTIONS = [
  { id: '1', loanId: 'L-001', borrower: 'Kasun Silva', action: 'Warning Notice', date: '2026-04-15', status: 'pending' },
  { id: '2', loanId: 'L-002', borrower: 'Divya Patel', action: 'Legal Notice', date: '2026-04-10', status: 'served' },
  { id: '3', loanId: 'L-003', borrower: 'Arjun Sharma', action: 'Court Case', date: '2026-03-20', status: 'ongoing' },
];

export default function LegalActionsScreen({ navigation }: any) {
  const [actions] = useState(MOCK_ACTIONS);

  const getStatusColor = (status: string) => {
    if (status === 'pending') return COLORS.warning;
    if (status === 'served') return COLORS.primary;
    if (status === 'ongoing') return COLORS.danger;
    return COLORS.textSecondary;
  };

  const renderItem = ({ item }: any) => (
    <View style={commonStyles.card}>
      <View style={commonStyles.rowSpaceBetween}>
        <View style={{ flex: 1 }}>
          <Text style={commonStyles.textPrimary}>{item.borrower}</Text>
          <Text style={commonStyles.textSecondary}>{item.loanId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={commonStyles.divider} />

      <View style={commonStyles.rowSpaceBetween}>
        <View>
          <Text style={commonStyles.textSecondary}>Action</Text>
          <Text style={commonStyles.textPrimary}>{item.action}</Text>
        </View>
        <Text style={commonStyles.textSecondary}>{item.date}</Text>
      </View>

      <TouchableOpacity style={[commonStyles.primaryButton, { marginTop: 12, backgroundColor: COLORS.primary }]} onPress={() => alert('View details')}>
        <Text style={commonStyles.buttonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Legal Actions" onBackPress={() => navigation.goBack()} />
      
      {actions.length > 0 && (
        <AlertBanner type="warning" title="Active Legal Cases" message={`${actions.length} action(s) in progress`} />
      )}

      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

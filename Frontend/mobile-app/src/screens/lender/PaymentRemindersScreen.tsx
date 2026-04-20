import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

export default function PaymentRemindersScreen({ navigation }: any) {
  const [status, setStatus] = useState<'pending' | 'sent' | 'paid'>('pending');

  const reminders = [
    { id: 'REM-001', borrower: 'Kasun Silva', amount: 15000, dueDate: '5 Mar 2026', status: 'pending' },
    { id: 'REM-002', borrower: 'Priya Perera', amount: 10000, dueDate: '8 Mar 2026', status: 'sent' },
    { id: 'REM-003', borrower: 'Vijay Kumar', amount: 20000, dueDate: '10 Mar 2026', status: 'paid' },
  ];

  const filtered = reminders.filter(r => r.status === status);

  const getStatusIcon = (s: string) => {
    switch (s) {
      case 'pending': return 'clock';
      case 'sent': return 'send';
      case 'paid': return 'check-circle';
      default: return 'info';
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Payment Reminders" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.tabBar}>
          {(['pending', 'sent', 'paid'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, status === tab && styles.tabActive]}
              onPress={() => setStatus(tab)}
            >
              <Text style={[styles.tabText, status === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.map((reminder) => (
          <View key={reminder.id} style={commonStyles.card}>
            <View style={commonStyles.rowSpaceBetween}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.sectionTitle}>{reminder.borrower}</Text>
                <Text style={commonStyles.textSecondary}>{reminder.id}</Text>
              </View>
              <Feather name={getStatusIcon(reminder.status)} size={20} color={COLORS.primary} />
            </View>

            <View style={commonStyles.spacer32} />

            <View style={commonStyles.rowSpaceBetween}>
              <View>
                <Text style={commonStyles.textSecondary}>Amount Due</Text>
                <Text style={commonStyles.textPrimary}>LKR {reminder.amount.toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={commonStyles.textSecondary}>Due Date</Text>
                <Text style={commonStyles.textPrimary}>{reminder.dueDate}</Text>
              </View>
            </View>

            {reminder.status === 'pending' && (
              <TouchableOpacity style={[commonStyles.primaryButton, { marginTop: 12 }]}>
                <Feather name="send" size={16} color="#fff" />
                <Text style={commonStyles.buttonText}>Send Reminder</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
});

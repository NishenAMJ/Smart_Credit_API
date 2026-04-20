import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';

export default function ApplicationsReceivedScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const apps = [
    { id: 'APP-001', borrower: 'Kasun Silva', amount: 150000, roi: 18, status: 'pending', date: '2 Feb 2026' },
    { id: 'APP-002', borrower: 'Priya Perera', amount: 100000, roi: 20, status: 'approved', date: '1 Feb 2026' },
    { id: 'APP-003', borrower: 'Vijay Kumar', amount: 200000, roi: 16, status: 'rejected', date: '31 Jan 2026' },
  ];

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'approved': return COLORS.success;
      case 'rejected': return COLORS.danger;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Applications Received" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.btn, filter === f && styles.btnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.btnText, filter === f && styles.btnTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <AlertBanner type="info" title="No Applications" message={`No ${filter} applications found`} />
        ) : (
          filtered.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={commonStyles.card}
              onPress={() => navigation.push('ReviewApplication', { appId: app.id })}
            >
              <View style={commonStyles.rowSpaceBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.sectionTitle}>{app.borrower}</Text>
                  <Text style={commonStyles.textSecondary}>{app.id}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(app.status) }]}>
                  <Text style={styles.badgeText}>{app.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={commonStyles.spacer32} />

              <View style={commonStyles.rowSpaceBetween}>
                <View>
                  <Text style={commonStyles.textSecondary}>Amount Requested</Text>
                  <Text style={commonStyles.textPrimary}>LKR {(app.amount / 1000).toFixed(0)}K</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={commonStyles.textSecondary}>ROI</Text>
                  <Text style={commonStyles.textPrimary}>{app.roi}%</Text>
                </View>
              </View>

              <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>Applied: {app.date}</Text>
            </TouchableOpacity>
          ))
        )}
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
    paddingVertical: 8,
    paddingHorizontal: 10,
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
});

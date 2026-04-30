import React, { useState, useEffect } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, AlertBanner } from '../../components/lender';
import { LoanRequestsService } from '../../services/lender.service';

export default function ApplicationsReceivedScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [allApps, setAllApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await LoanRequestsService.getPendingRequests({ includeAllStatuses: true, pageSize: 50 });
        setAllApps(data?.requests ?? []);
      } catch {
        setAllApps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = allApps.filter(a => filter === 'all' || (a.status ?? '').toLowerCase() === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return COLORS.warning;
      case 'approved': return COLORS.success;
      case 'rejected': return COLORS.danger;
      default: return COLORS.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Applications Received" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

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
                  <Text style={commonStyles.sectionTitle}>{app.borrowerName ?? app.borrower}</Text>
                  <Text style={commonStyles.textSecondary}>{app.id}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(app.status ?? 'pending') }]}>
                  <Text style={styles.badgeText}>{(app.status ?? 'pending').toUpperCase()}</Text>
                </View>
              </View>

              <View style={commonStyles.spacer32} />

              <View style={commonStyles.rowSpaceBetween}>
                <View>
                  <Text style={commonStyles.textSecondary}>Amount Requested</Text>
                  <Text style={commonStyles.textPrimary}>LKR {((app.requestedAmount ?? app.amount ?? 0) / 1000).toFixed(0)}K</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={commonStyles.textSecondary}>ROI</Text>
                  <Text style={commonStyles.textPrimary}>{app.interestRate ?? app.roi ?? '--'}%</Text>
                </View>
              </View>

              <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : (app.date ?? '')}</Text>
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

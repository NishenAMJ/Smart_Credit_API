import React, { useState } from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

export default function MyOffersScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'all' | 'active' | 'withdrawn' | 'accepted'>('all');

  const offers = [
    { id: 'OFR-001', borrower: 'Kasun Silva', amount: 150000, roi: 18, status: 'active', duration: '12 months' },
    { id: 'OFR-002', borrower: 'Priya Perera', amount: 100000, roi: 20, status: 'accepted', duration: '6 months' },
    { id: 'OFR-003', borrower: 'Vijay Kumar', amount: 200000, roi: 16, status: 'withdrawn', duration: '24 months' },
  ];

  const filtered = offers.filter(o => filter === 'all' || o.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.success;
      case 'withdrawn': return COLORS.danger;
      case 'accepted': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="My Offers" onBackPress={() => navigation.goBack()} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.filters}>
          {(['all', 'active', 'withdrawn', 'accepted'] as const).map(f => (
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

        {filtered.map((offer) => (
          <TouchableOpacity
            key={offer.id}
            style={commonStyles.card}
            onPress={() => navigation.push('LoanDetails', { offerId: offer.id })}
          >
            <View style={commonStyles.rowSpaceBetween}>
              <View style={{ flex: 1 }}>
                <Text style={commonStyles.sectionTitle}>{offer.borrower}</Text>
                <Text style={commonStyles.textSecondary}>{offer.id}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(offer.status) }]}>
                <Text style={styles.badgeText}>{offer.status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={commonStyles.spacer32} />

            <View style={commonStyles.rowSpaceBetween}>
              <View>
                <Text style={commonStyles.textSecondary}>Offered Amount</Text>
                <Text style={commonStyles.textPrimary}>LKR {(offer.amount / 1000).toFixed(0)}K</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={commonStyles.textSecondary}>ROI</Text>
                <Text style={commonStyles.textPrimary}>{offer.roi}%</Text>
              </View>
            </View>

            <Text style={[commonStyles.textSecondary, { marginTop: 12 }]}>Duration: {offer.duration}</Text>

            {offer.status === 'active' && (
              <TouchableOpacity style={[commonStyles.primaryButton, { marginTop: 12 }]}>
                <Feather name="edit" size={16} color="#fff" />
                <Text style={commonStyles.buttonText}>Edit Offer</Text>
              </TouchableOpacity>
            )}
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

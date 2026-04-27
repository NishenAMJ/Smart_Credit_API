import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, FlatList, Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { StatCard, QuickAction, LenderActionItem, AlertBanner } from '../../components/lender';

const { width } = Dimensions.get('window');

// ── Data ─────────────────────────────────────────────────
const STATS = [
  { id: '1', icon: 'trending-up',   color: COLORS.success, value: 'LKR 2.4M', label: 'Total Lent'      },
  { id: '2', icon: 'dollar-sign',   color: COLORS.primary, value: 'LKR 1.8M', label: 'Total Collected'  },
  { id: '3', icon: 'file-text',     color: COLORS.warning, value: '5',         label: 'Pending Apps'    },
  { id: '4', icon: 'trending-down', color: COLORS.danger,  value: '2',         label: 'Overdue'         },
];

const RECENT_APPLICATIONS = [
  { id: '1', name: 'Kasun Silva',   offer: 'Quick Personal Loan', amount: '50,000 LKR', status: 'Pending'  },
  { id: '2', name: 'Nimal Perera',  offer: 'SME Business Boost',  amount: '25,000 LKR', status: 'Approved' },
  { id: '3', name: 'Priya Dias',    offer: 'Quick Personal Loan', amount: '80,000 LKR', status: 'Pending'  },
];

const OVERDUE = [
  { id: '1', name: 'Amal Bandara',   amount: 'LKR 8,500',  days: 5  },
  { id: '2', name: 'Sunil Fernando', amount: 'LKR 12,000', days: 12 },
];

// ── Main Component ────────────────────────────────────────
export default function LenderDashboardScreen({ navigation }: any) {
  const [activeSlide, setActiveSlide] = useState(0);

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return COLORS.success;
    if (status === 'Rejected') return COLORS.danger;
    return COLORS.warning;
  };

  const getStatusBg = (status: string) => {
    if (status === 'Approved') return '#ECFDF5';
    if (status === 'Rejected') return '#FEF2F2';
    return '#FFFBEB';
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ────────────────────────────────── */}
        <View style={styles.header}>
          <View style={commonStyles.rowSpaceBetween}>
            <TouchableOpacity>
              <Feather name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('LenderProfile')}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>R</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={commonStyles.headerGreeting}>Welcome back</Text>
          <Text style={commonStyles.headerName}>Ranil Perera</Text>
        </View>

        {/* ── STATS ─────────────────────────────────── */}
        <Text style={commonStyles.sectionTitle}>Your Statistics</Text>
        <FlatList
          data={STATS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StatCard
              icon={item.icon}
              color={item.color}
              value={item.value}
              label={item.label}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.44 + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.statsList}
          onScroll={(e) =>
            setActiveSlide(
              Math.round(e.nativeEvent.contentOffset.x / (width * 0.44 + 12))
            )
          }
          scrollEventThrottle={16}
        />
        <View style={styles.dotsRow}>
          {STATS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* ── PENDING BANNER ────────────────────────── */}
        <AlertBanner
          type="warning"
          title="5 Pending Loan Requests"
          message="Review and approve borrower requests"
          icon="inbox"
        />

        {/* ── QUICK ACTIONS ─────────────────────────── */}
        <Text style={commonStyles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <QuickAction
            icon="plus-circle"
            backgroundColor="#EBF4FF"
            iconColor={COLORS.primary}
            label="New Offer"
            onPress={() => navigation.navigate('CreateLoanOffer')}
          />
          <QuickAction
            icon="layers"
            backgroundColor="#ECFDF5"
            iconColor={COLORS.success}
            label="My Offers"
            onPress={() => navigation.navigate('MyOffers')}
          />
          <QuickAction
            icon="inbox"
            backgroundColor="#FFFBEB"
            iconColor={COLORS.warning}
            label="Applications"
            onPress={() => navigation.navigate('ApplicationsReceived')}
          />
          <QuickAction
            icon="trending-up"
            backgroundColor="#FEF2F2"
            iconColor={COLORS.danger}
            label="Active Loans"
            onPress={() => navigation.navigate('ActiveLoans')}
          />
        </View>

        {/* ── SECOND ROW QUICK ACTIONS ──────────────── */}
        {/* Advertisement actions */}
        <View style={styles.quickRow}>
          <QuickAction
            icon="radio"
            backgroundColor="#F5F3FF"
            iconColor="#8B5CF6"
            label="My Ads"
            onPress={() => navigation.navigate('MyAds')}
          />
          <QuickAction
            icon="plus-square"
            backgroundColor="#EBF4FF"
            iconColor={COLORS.primary}
            label="Create Ad"
            onPress={() => navigation.navigate('CreateAd')}
          />
          <QuickAction
            icon="bar-chart-2"
            backgroundColor="#ECFDF5"
            iconColor={COLORS.success}
            label="Ad Stats"
            onPress={() => navigation.navigate('AdSummaryAnalytics')}
          />
          <QuickAction
            icon="maximize"
            backgroundColor="#FEF2F2"
            iconColor={COLORS.danger}
            label="Scan QR"
            onPress={() => navigation.navigate('QRScanner')}
          />
        </View>

        {/* ── OVERDUE ALERT ─────────────────────────── */}
        {OVERDUE.length > 0 && (
          <AlertBanner
            type="error"
            title={`${OVERDUE.length} Overdue Payments`}
            message="Tap to send reminders"
            icon="alert-circle"
          />
        )}

        {/* ── RECENT APPLICATIONS ───────────────────── */}
        <Text style={commonStyles.sectionTitle}>Recent Applications</Text>
        {RECENT_APPLICATIONS.map((app) => (
          <TouchableOpacity
            key={app.id}
            style={commonStyles.card}
            onPress={() => navigation.navigate('ReviewApplication', { app })}
            activeOpacity={0.8}
          >
            <View style={commonStyles.rowSpaceBetween}>
              <View style={commonStyles.row}>
                <View style={styles.appAvatar}>
                  <Text style={styles.appAvatarText}>{app.name[0]}</Text>
                </View>
                <View>
                  <Text style={commonStyles.textPrimary}>{app.name}</Text>
                  <Text style={commonStyles.textSecondary}>{app.offer}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={commonStyles.textPrimary}>{app.amount}</Text>
                <View style={[
                  styles.badge,
                  { backgroundColor: getStatusBg(app.status) }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: getStatusColor(app.status) }
                  ]}>
                    {app.status}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── MORE ACTIONS ──────────────────────────── */}
        <Text style={commonStyles.sectionTitle}>More Actions</Text>
        <View style={styles.actionsList}>
          <LenderActionItem
            icon="layers"
            iconColor={COLORS.primary}
            label="My Offers"
            onPress={() => navigation.navigate('MyOffers')}
            isFirst
          />
          <LenderActionItem
            icon="trending-up"
            iconColor={COLORS.success}
            label="Active Loans"
            onPress={() => navigation.navigate('ActiveLoans')}
          />
          <LenderActionItem
            icon="users"
            iconColor={COLORS.warning}
            label="My Borrowers"
            onPress={() => navigation.navigate('MyBorrowers')}
          />
          <LenderActionItem
            icon="book"
            iconColor={COLORS.danger}
            label="Collection History"
            onPress={() => navigation.navigate('CollectionHistory')}
          />
          <LenderActionItem
            icon="radio"
            iconColor="#8B5CF6"
            label="My Advertisements"
            onPress={() => navigation.navigate('MyAds')}
          />
          <LenderActionItem
            icon="bar-chart-2"
            iconColor={COLORS.success}
            label="Ad Analytics"
            onPress={() => navigation.navigate('AdSummaryAnalytics')}
          />
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statsList: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: COLORS.textPrimary,
    width: 20,
  },
  dotInactive: {
    backgroundColor: COLORS.border,
  },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  appAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsList: {
    marginHorizontal: 16,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 16,
  },
});
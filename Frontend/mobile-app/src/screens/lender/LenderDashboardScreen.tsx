import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#007AFF',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// ── Data ─────────────────────────────────────────────
const STATS = [
  { id: '1', icon: 'trending-up',   color: COLORS.success, value: 'LKR 2.4M', label: 'Total Lent'      },
  { id: '2', icon: 'dollar-sign',   color: COLORS.primary, value: 'LKR 1.8M', label: 'Total Collected' },
  { id: '3', icon: 'file-text',     color: COLORS.warning, value: '5',         label: 'Pending Apps'   },
  { id: '4', icon: 'trending-down', color: COLORS.danger,  value: '2',         label: 'Overdue'        },
];

const RECENT_APPLICATIONS = [
  { id: '1', name: 'Kasun Silva',    offer: 'Quick Personal Loan', amount: '50,000 LKR', status: 'Pending'  },
  { id: '2', name: 'Nimal Perera',   offer: 'SME Business Boost',  amount: '25,000 LKR', status: 'Approved' },
  { id: '3', name: 'Priya Dias',     offer: 'Quick Personal Loan', amount: '80,000 LKR', status: 'Pending'  },
];

const OVERDUE = [
  { id: '1', name: 'Amal Bandara',   amount: 'LKR 8,500',  days: 5  },
  { id: '2', name: 'Sunil Fernando', amount: 'LKR 12,000', days: 12 },
];

// ── Main Component ────────────────────────────────────
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

  const renderStatCard = ({ item }: any) => (
    <View style={styles.statCard}>
      <Feather name={item.icon as any} size={26} color={item.color} />
      <Text style={[styles.statValue, { color: COLORS.textPrimary }]}>
        {item.value}
      </Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ──────────────────────────────────── */}
        <View style={styles.header}>

          {/* Top row — menu + avatar */}
          <View style={styles.headerTop}>
            <TouchableOpacity>
              <Feather name="menu" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Tap avatar to open profile */}
            <TouchableOpacity
              onPress={() => navigation.navigate('LenderProfile')}
              activeOpacity={0.8}
            >
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>R</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={styles.headerGreeting}>Welcome back</Text>
          <Text style={styles.headerName}>Ranil Perera</Text>
        </View>

        {/* ── STATS CARDS (swipeable) ──────────────────── */}
        <View style={styles.statsSection}>
          <FlatList
            data={STATS}
            keyExtractor={(item) => item.id}
            renderItem={renderStatCard}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.44 + 12}
            decelerationRate="fast"
            contentContainerStyle={styles.statsList}
            onScroll={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / (width * 0.44 + 12)
              );
              setActiveSlide(index);
            }}
            scrollEventThrottle={16}
          />

          {/* Dot indicators */}
          <View style={styles.dotsRow}>
            {STATS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeSlide ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </View>

        {/* ── PENDING REQUESTS BANNER ──────────────────── */}
        <TouchableOpacity
          style={styles.pendingBanner}
          onPress={() => navigation.navigate('ApplicationsReceived')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.pendingTitle}>
              5 Pending Loan Requests
            </Text>
            <Text style={styles.pendingSub}>
              Review and approve borrower requests
            </Text>
          </View>
          <Feather name="arrow-right" size={22} color="#fff" />
        </TouchableOpacity>

        {/* ── QUICK ACTIONS ────────────────────────────── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickRow}>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('CreateLoanOffer')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EBF4FF' }]}>
              <Feather name="plus-circle" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.quickLabel}>New Offer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('QRScanner')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="maximize" size={22} color={COLORS.success} />
            </View>
            <Text style={styles.quickLabel}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ApplicationsReceived')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="inbox" size={22} color={COLORS.warning} />
            </View>
            <Text style={styles.quickLabel}>Applications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('Portfolio')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="pie-chart" size={22} color={COLORS.danger} />
            </View>
            <Text style={styles.quickLabel}>Portfolio</Text>
          </TouchableOpacity>

        </View>

        {/* ── OVERDUE ALERT ────────────────────────────── 
            Only shows when there are overdue payments    */}
        {OVERDUE.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => navigation.navigate('PaymentReminders')}
            activeOpacity={0.85}
          >
            <View style={styles.alertLeft}>
              <View style={styles.alertIconWrap}>
                <Feather name="alert-circle" size={20} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.alertTitle}>
                  {OVERDUE.length} Overdue Payments
                </Text>
                <Text style={styles.alertSub}>
                  Tap to send reminders
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.warning} />
          </TouchableOpacity>
        )}

        {/* ── RECENT APPLICATIONS ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ApplicationsReceived')}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {RECENT_APPLICATIONS.map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.appCard}
            onPress={() => navigation.navigate('ReviewApplication', { app })}
            activeOpacity={0.8}
          >
            {/* Avatar + name + offer */}
            <View style={styles.appLeft}>
              <View style={styles.appAvatar}>
                <Text style={styles.appAvatarText}>{app.name[0]}</Text>
              </View>
              <View>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appOffer}>{app.offer}</Text>
              </View>
            </View>

            {/* Amount + status badge */}
            <View style={styles.appRight}>
              <Text style={styles.appAmount}>{app.amount}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusBg(app.status) },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(app.status) },
                ]}>
                  {app.status}
                </Text>
              </View>
            </View>

          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },

  // Stats
  statsSection: {
    marginTop: -16,
    marginBottom: 8,
  },
  statsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: width * 0.44,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
    
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

  // Pending banner
  pendingBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  pendingSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },

  // Quick actions
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  quickBtn: {
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Overdue alert
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  alertSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },

  // Section header row
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Application cards
  appCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  appOffer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  appRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  appAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
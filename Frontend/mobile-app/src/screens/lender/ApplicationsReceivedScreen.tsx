import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

// ── Design Tokens ────────────────────────────────────
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

// ── Sample Data ──────────────────────────────────────
const APPLICATIONS = [
  {
    id: '1',
    name: 'Kasun Silva',
    offer: 'Quick Personal Loan',
    amount: '50,000',
    date: '03 Apr 2026',
    status: 'pending',
    score: 820,
  },
  {
    id: '2',
    name: 'Nimal Perera',
    offer: 'SME Business Boost',
    amount: '25,000',
    date: '02 Apr 2026',
    status: 'approved',
    score: 750,
  },
  {
    id: '3',
    name: 'Priya Dias',
    offer: 'Quick Personal Loan',
    amount: '80,000',
    date: '01 Apr 2026',
    status: 'pending',
    score: 690,
  },
  {
    id: '4',
    name: 'Amal Bandara',
    offer: 'Education Finance',
    amount: '15,000',
    date: '31 Mar 2026',
    status: 'rejected',
    score: 580,
  },
  {
    id: '5',
    name: 'Sunil Fernando',
    offer: 'Vehicle Loan',
    amount: '120,000',
    date: '30 Mar 2026',
    status: 'approved',
    score: 780,
  },
  {
    id: '6',
    name: 'Ravi Kumar',
    offer: 'SME Business Boost',
    amount: '200,000',
    date: '29 Mar 2026',
    status: 'pending',
    score: 710,
  },
];

// ── Filter tabs ──────────────────────────────────────
const FILTERS = [
  { id: 'all',      label: 'All'      },
  { id: 'pending',  label: 'Pending'  },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

// ── Main Component ────────────────────────────────────
export default function ApplicationsReceivedScreen({ navigation }: any) {

  const [activeFilter, setActiveFilter] = useState('all');

  // ── Filter applications by status ───────────────
  const filtered = APPLICATIONS.filter((a) => {
    if (activeFilter === 'all') return true;
    return a.status === activeFilter;
  });

  // ── Count each status for summary ───────────────
  const pendingCount  = APPLICATIONS.filter((a) => a.status === 'pending').length;
  const approvedCount = APPLICATIONS.filter((a) => a.status === 'approved').length;
  const rejectedCount = APPLICATIONS.filter((a) => a.status === 'rejected').length;

  // ── Status color helpers ─────────────────────────
  const getStatusColor = (status: string) => {
    if (status === 'approved') return COLORS.success;
    if (status === 'rejected') return COLORS.danger;
    return COLORS.warning;
  };

  const getStatusBg = (status: string) => {
    if (status === 'approved') return '#ECFDF5';
    if (status === 'rejected') return '#FEF2F2';
    return '#FFFBEB';
  };

  // ── Credit score color ───────────────────────────
  // Green for high score, yellow for medium, red for low
  const getScoreColor = (score: number) => {
    if (score >= 750) return COLORS.success;
    if (score >= 650) return COLORS.warning;
    return COLORS.danger;
  };

  // ── Render each application card ─────────────────
  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ReviewApplication', { application: item })}
      activeOpacity={0.8}
    >

      {/* ── TOP ROW — avatar + name + status ──── */}
      <View style={styles.cardTop}>

        {/* Avatar with first letter */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>

        {/* Name and offer */}
        <View style={styles.nameBlock}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.offer}>{item.offer}</Text>
        </View>

        {/* Status badge */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusBg(item.status) }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(item.status) }
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>

      </View>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* ── BOTTOM ROW — amount + score + date ── */}
      <View style={styles.cardBottom}>

        {/* Amount requested */}
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>Amount</Text>
          <Text style={styles.bottomValue}>LKR {item.amount}</Text>
        </View>

        {/* Credit score */}
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>Credit Score</Text>
          <Text style={[
            styles.bottomValue,
            { color: getScoreColor(item.score) }
          ]}>
            {item.score}
          </Text>
        </View>

        {/* Date applied */}
        <View style={styles.bottomItem}>
          <Text style={styles.bottomLabel}>Applied</Text>
          <Text style={styles.bottomValue}>{item.date}</Text>
        </View>

        {/* Arrow to indicate tappable */}
        <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />

      </View>

    </TouchableOpacity>
  );

  // ── List header ──────────────────────────────────
  const ListHeader = () => (
    <View>

      {/* Summary cards row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
            {pendingCount}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>
            {approvedCount}
          </Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
            {rejectedCount}
          </Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
            {APPLICATIONS.length}
          </Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Pending alert — only shows if pending > 0 */}
      {pendingCount > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIconWrap}>
              <Feather name="clock" size={18} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.alertTitle}>
                {pendingCount} applications need review
              </Text>
              <Text style={styles.alertSub}>
                Tap any pending application to review
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.filterBtn,
              activeFilter === f.id && styles.filterBtnActive,
            ]}
            onPress={() => setActiveFilter(f.id)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.filterText,
              activeFilter === f.id && styles.filterTextActive,
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section label */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Applications</Text>
        <Text style={styles.sectionCount}>{filtered.length} records</Text>
      </View>

    </View>
  );

  // ── Empty state ──────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="inbox" size={48} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No applications</Text>
      <Text style={styles.emptySub}>
        No {activeFilter === 'all' ? '' : activeFilter} applications found
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ──────────────────────────────── */}
      <View style={styles.header}>

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Applications Received</Text>

        {/* Filter icon placeholder */}
        <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7}>
          <Feather name="sliders" size={20} color="#fff" />
        </TouchableOpacity>

      </View>

      {/* ── LIST ────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },

  // Alert card
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  alertSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },

  // Filter tabs
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Application card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  // Card bottom
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomItem: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  bottomValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // List content
  listContent: {
    paddingBottom: 32,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
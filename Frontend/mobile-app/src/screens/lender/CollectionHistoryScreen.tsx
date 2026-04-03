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
// Later replace this with real API data
const COLLECTIONS = [
  { id: '1', name: 'Kasun Silva',    amount: '25,000', date: '03 Apr 2026', method: 'QR Scan',  period: 'week'  },
  { id: '2', name: 'Nimal Perera',   amount: '10,000', date: '02 Apr 2026', method: 'Transfer', period: 'week'  },
  { id: '3', name: 'Priya Dias',     amount: '8,500',  date: '01 Apr 2026', method: 'QR Scan',  period: 'week'  },
  { id: '4', name: 'Amal Bandara',   amount: '15,000', date: '28 Mar 2026', method: 'Transfer', period: 'month' },
  { id: '5', name: 'Sunil Fernando', amount: '12,000', date: '25 Mar 2026', method: 'QR Scan',  period: 'month' },
  { id: '6', name: 'Kasun Silva',    amount: '25,000', date: '15 Mar 2026', method: 'QR Scan',  period: 'month' },
  { id: '7', name: 'Ravi Kumar',     amount: '5,000',  date: '10 Feb 2026', method: 'Transfer', period: 'all'   },
  { id: '8', name: 'Nimal Perera',   amount: '10,000', date: '05 Jan 2026', method: 'QR Scan',  period: 'all'   },
];

// ── Filter options ────────────────────────────────────
const FILTERS = [
  { id: 'week',  label: 'This Week'  },
  { id: 'month', label: 'This Month' },
  { id: 'all',   label: 'All Time'   },
];

// ── Main Component ────────────────────────────────────
export default function CollectionHistoryScreen({ navigation }: any) {

  // Track which filter is selected
  const [activeFilter, setActiveFilter] = useState('week');

  // Filter data based on selected period
  // 'all' shows everything, others filter by period field
  const filtered = COLLECTIONS.filter((c) =>
    activeFilter === 'all' ? true : c.period === activeFilter
  );

  // Calculate total for current filter
  const total = filtered.reduce((sum, c) =>
    sum + parseInt(c.amount.replace(',', '')), 0
  );

  // Format number with commas — e.g. 43500 → "43,500"
  const formatAmount = (num: number) =>
    num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ── Each collection row ──────────────────────────
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>

      {/* Left — avatar + name + date */}
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>

      {/* Right — amount + method badge */}
      <View style={styles.cardRight}>
        <Text style={styles.amount}>LKR {item.amount}</Text>

        {/* Method badge — green for QR, blue for Transfer */}
        <View style={[
          styles.methodBadge,
          { backgroundColor: item.method === 'QR Scan' ? '#ECFDF5' : '#EBF4FF' }
        ]}>
          <Feather
            name={item.method === 'QR Scan' ? 'maximize' : 'repeat'}
            size={10}
            color={item.method === 'QR Scan' ? COLORS.success : COLORS.primary}
          />
          <Text style={[
            styles.methodText,
            { color: item.method === 'QR Scan' ? COLORS.success : COLORS.primary }
          ]}>
            {item.method}
          </Text>
        </View>
      </View>

    </View>
  );

  // ── Header component for FlatList ────────────────
  // Putting non-list UI inside ListHeaderComponent
  // keeps everything in one scrollable view
  const ListHeader = () => (
    <View>

      {/* ── TOTAL COLLECTED CARD ──────────────────── */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>
          {activeFilter === 'week'
            ? 'Collected This Week'
            : activeFilter === 'month'
            ? 'Collected This Month'
            : 'All Time Collections'}
        </Text>
        <Text style={styles.totalAmount}>LKR {formatAmount(total)}</Text>
        <Text style={styles.totalCount}>
          {filtered.length} payments
        </Text>

        {/* Progress bar showing collection vs target */}
        <View style={styles.progressBg}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min((total / 100000) * 100, 100)}%` }
          ]} />
        </View>
        <Text style={styles.progressLabel}>
          {Math.min(Math.round((total / 100000) * 100), 100)}% of monthly target
        </Text>
      </View>

      {/* ── FILTER TABS ───────────────────────────── */}
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

      {/* ── SECTION LABEL ────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payments</Text>
        <Text style={styles.sectionCount}>{filtered.length} records</Text>
      </View>

    </View>
  );

  // ── Empty state when no records ──────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="inbox" size={48} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No payments found</Text>
      <Text style={styles.emptySub}>
        No collections recorded for this period
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── TOP HEADER BAR ──────────────────────── */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Collection History</Text>

        {/* Export button */}
        <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
          <Feather name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── MAIN LIST ───────────────────────────── */}
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

  // Header bar
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
  exportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Total collected card
  totalCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  totalCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  progressBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
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
    fontSize: 13,
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

  // Collection card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
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
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // List content padding
  listContent: {
    paddingBottom: 32,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
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

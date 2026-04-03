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
const ACTIVE_LOANS = [
  {
    id: '1',
    name: 'Kasun Silva',
    offer: 'Quick Personal Loan',
    totalAmount: 50000,
    paidAmount: 20000,
    remaining: 30000,
    nextDue: '15 Apr 2026',
    monthlyPayment: 5000,
    status: 'on-track',
    tenure: 12,
    paidMonths: 4,
  },
  {
    id: '2',
    name: 'Nimal Perera',
    offer: 'SME Business Boost',
    totalAmount: 200000,
    paidAmount: 40000,
    remaining: 160000,
    nextDue: '10 Apr 2026',
    monthlyPayment: 20000,
    status: 'overdue',
    tenure: 12,
    paidMonths: 2,
  },
  {
    id: '3',
    name: 'Priya Dias',
    offer: 'Education Finance',
    totalAmount: 80000,
    paidAmount: 80000,
    remaining: 0,
    nextDue: 'Completed',
    monthlyPayment: 8000,
    status: 'completed',
    tenure: 10,
    paidMonths: 10,
  },
  {
    id: '4',
    name: 'Sunil Fernando',
    offer: 'Vehicle Loan',
    totalAmount: 120000,
    paidAmount: 30000,
    remaining: 90000,
    nextDue: '20 Apr 2026',
    monthlyPayment: 12000,
    status: 'on-track',
    tenure: 12,
    paidMonths: 3,
  },
  {
    id: '5',
    name: 'Amal Bandara',
    offer: 'Quick Personal Loan',
    totalAmount: 30000,
    paidAmount: 5000,
    remaining: 25000,
    nextDue: '05 Apr 2026',
    monthlyPayment: 3000,
    status: 'overdue',
    tenure: 12,
    paidMonths: 1,
  },
];

// ── Filter tabs ──────────────────────────────────────
const FILTERS = [
  { id: 'all',       label: 'All'       },
  { id: 'on-track',  label: 'On Track'  },
  { id: 'overdue',   label: 'Overdue'   },
  { id: 'completed', label: 'Completed' },
];

// ── Format number with commas ────────────────────────
const fmt = (num: number) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── Main Component ────────────────────────────────────
export default function ActiveLoansScreen({ navigation }: any) {

  const [activeFilter, setActiveFilter] = useState('all');

  // ── Filter loans ─────────────────────────────────
  const filtered = ACTIVE_LOANS.filter((l) => {
    if (activeFilter === 'all') return true;
    return l.status === activeFilter;
  });

  // ── Summary calculations ─────────────────────────
  const totalOutstanding = ACTIVE_LOANS.reduce((s, l) => s + l.remaining, 0);
  const totalCollected   = ACTIVE_LOANS.reduce((s, l) => s + l.paidAmount, 0);
  const overdueCount     = ACTIVE_LOANS.filter((l) => l.status === 'overdue').length;

  // ── Status helpers ───────────────────────────────
  const getStatusColor = (status: string) => {
    if (status === 'on-track')  return COLORS.success;
    if (status === 'overdue')   return COLORS.danger;
    if (status === 'completed') return COLORS.primary;
    return COLORS.textSecondary;
  };

  const getStatusBg = (status: string) => {
    if (status === 'on-track')  return '#ECFDF5';
    if (status === 'overdue')   return '#FEF2F2';
    if (status === 'completed') return '#EBF4FF';
    return COLORS.border;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'on-track')  return 'On Track';
    if (status === 'overdue')   return 'Overdue';
    if (status === 'completed') return 'Completed';
    return status;
  };

  // ── Progress percentage ──────────────────────────
  // How much has been paid vs total
  const getProgress = (paid: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((paid / total) * 100);
  };

  // ── Render each loan card ────────────────────────
  const renderItem = ({ item }: any) => {
    const progress = getProgress(item.paidAmount, item.totalAmount);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('LoanDetails', { loan: item })}
        activeOpacity={0.8}
      >

        {/* ── TOP ROW — avatar + name + status ─── */}
        <View style={styles.cardTop}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.offer}>{item.offer}</Text>
          </View>

          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(item.status) }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(item.status) }
            ]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>

        </View>

        {/* ── PROGRESS BAR ────────────────────── */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Repayment Progress
            </Text>
            <Text style={[
              styles.progressPct,
              { color: getStatusColor(item.status) }
            ]}>
              {progress}%
            </Text>
          </View>

          {/* Gray background bar */}
          <View style={styles.progressBg}>
            {/* Colored fill bar — width depends on progress */}
            <View style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: getStatusColor(item.status),
              }
            ]} />
          </View>

          {/* Months paid out of total tenure */}
          <Text style={styles.progressMonths}>
            {item.paidMonths} of {item.tenure} months paid
          </Text>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* ── BOTTOM ROW — amounts + due date ─── */}
        <View style={styles.cardBottom}>

          <View style={styles.bottomItem}>
            <Text style={styles.bottomLabel}>Total Loan</Text>
            <Text style={styles.bottomValue}>
              LKR {fmt(item.totalAmount)}
            </Text>
          </View>

          <View style={styles.bottomItem}>
            <Text style={styles.bottomLabel}>Paid</Text>
            <Text style={[styles.bottomValue, { color: COLORS.success }]}>
              LKR {fmt(item.paidAmount)}
            </Text>
          </View>

          <View style={styles.bottomItem}>
            <Text style={styles.bottomLabel}>Remaining</Text>
            <Text style={[
              styles.bottomValue,
              { color: item.remaining === 0 ? COLORS.success : COLORS.warning }
            ]}>
              {item.remaining === 0 ? 'Paid off' : `LKR ${fmt(item.remaining)}`}
            </Text>
          </View>

        </View>

        {/* Next due date row */}
        {item.status !== 'completed' && (
          <View style={styles.dueRow}>
            <Feather
              name="calendar"
              size={13}
              color={item.status === 'overdue' ? COLORS.danger : COLORS.textSecondary}
            />
            <Text style={[
              styles.dueText,
              { color: item.status === 'overdue' ? COLORS.danger : COLORS.textSecondary }
            ]}>
              Next payment due: {item.nextDue}
            </Text>
          </View>
        )}

      </TouchableOpacity>
    );
  };

  // ── List header ──────────────────────────────────
  const ListHeader = () => (
    <View>

      {/* Summary banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            LKR {fmt(totalCollected)}
          </Text>
          <Text style={styles.summaryLabel}>Total Collected</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
            LKR {fmt(totalOutstanding)}
          </Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
            {overdueCount}
          </Text>
          <Text style={styles.summaryLabel}>Overdue</Text>
        </View>
      </View>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => navigation.navigate('PaymentReminders')}
          activeOpacity={0.85}
        >
          <View style={styles.alertLeft}>
            <View style={styles.alertIconWrap}>
              <Feather name="alert-circle" size={18} color={COLORS.danger} />
            </View>
            <View>
              <Text style={styles.alertTitle}>
                {overdueCount} loans are overdue
              </Text>
              <Text style={styles.alertSub}>
                Tap to send payment reminders
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={COLORS.danger} />
        </TouchableOpacity>
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
        <Text style={styles.sectionTitle}>Loans</Text>
        <Text style={styles.sectionCount}>{filtered.length} loans</Text>
      </View>

    </View>
  );

  // ── Empty state ──────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="credit-card" size={48} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No loans found</Text>
      <Text style={styles.emptySub}>
        No {activeFilter === 'all' ? '' : activeFilter} loans at the moment
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── HEADER ──────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Active Loans</Text>

        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => navigation.navigate('Analytics')}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color="#fff" />
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
  headerRightBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Summary banner
  summaryBanner: {
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  alertIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  alertSub: {
    fontSize: 12,
    color: '#B91C1C',
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
    fontSize: 11,
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

  // Loan card
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
    marginBottom: 14,
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
    fontSize: 11,
    fontWeight: '600',
  },

  // Progress bar
  progressSection: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
  },
  progressMonths: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 12,
  },

  // Card bottom
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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

  // Due date row
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
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
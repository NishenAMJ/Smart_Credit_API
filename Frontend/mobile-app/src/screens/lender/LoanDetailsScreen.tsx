import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
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

// ── Sample repayment schedule ────────────────────────
const SCHEDULE = [
  { id: '1',  month: 'Jan 2026', amount: '4,707', status: 'paid',    date: '15 Jan 2026' },
  { id: '2',  month: 'Feb 2026', amount: '4,707', status: 'paid',    date: '15 Feb 2026' },
  { id: '3',  month: 'Mar 2026', amount: '4,707', status: 'paid',    date: '15 Mar 2026' },
  { id: '4',  month: 'Apr 2026', amount: '4,707', status: 'due',     date: '15 Apr 2026' },
  { id: '5',  month: 'May 2026', amount: '4,707', status: 'upcoming', date: '15 May 2026' },
  { id: '6',  month: 'Jun 2026', amount: '4,707', status: 'upcoming', date: '15 Jun 2026' },
  { id: '7',  month: 'Jul 2026', amount: '4,707', status: 'upcoming', date: '15 Jul 2026' },
  { id: '8',  month: 'Aug 2026', amount: '4,707', status: 'upcoming', date: '15 Aug 2026' },
  { id: '9',  month: 'Sep 2026', amount: '4,707', status: 'upcoming', date: '15 Sep 2026' },
  { id: '10', month: 'Oct 2026', amount: '4,707', status: 'upcoming', date: '15 Oct 2026' },
  { id: '11', month: 'Nov 2026', amount: '4,707', status: 'upcoming', date: '15 Nov 2026' },
  { id: '12', month: 'Dec 2026', amount: '4,707', status: 'upcoming', date: '15 Dec 2026' },
];

// ── Payment history ──────────────────────────────────
const PAYMENT_HISTORY = [
  { id: '1', date: '15 Mar 2026', amount: '4,707', method: 'QR Scan',  ref: 'PAY-001' },
  { id: '2', date: '15 Feb 2026', amount: '4,707', method: 'Transfer', ref: 'PAY-002' },
  { id: '3', date: '15 Jan 2026', amount: '4,707', method: 'QR Scan',  ref: 'PAY-003' },
];

// ── Format number ────────────────────────────────────
const fmt = (num: number) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── Main Component ────────────────────────────────────
export default function LoanDetailsScreen({ route, navigation }: any) {

  // ── Get loan data from ActiveLoansScreen ─────────
  const loan = route?.params?.loan || {
    id: '1',
    name: 'Kasun Silva',
    offer: 'Quick Personal Loan',
    totalAmount: 50000,
    paidAmount: 15000,
    remaining: 35000,
    nextDue: '15 Apr 2026',
    monthlyPayment: 4707,
    status: 'on-track',
    tenure: 12,
    paidMonths: 3,
  };

  // ── Active tab ───────────────────────────────────
  const [activeTab, setActiveTab] = useState('summary');

  const tabs = [
    { id: 'summary',  label: 'Summary'  },
    { id: 'schedule', label: 'Schedule' },
    { id: 'history',  label: 'History'  },
  ];

  // ── Progress ─────────────────────────────────────
  const progress = Math.round((loan.paidAmount / loan.totalAmount) * 100);

  // ── Status helpers ───────────────────────────────
  const getStatusColor = (status: string) => {
    if (status === 'on-track')  return COLORS.success;
    if (status === 'overdue')   return COLORS.danger;
    if (status === 'completed') return COLORS.primary;
    return COLORS.textSecondary;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'on-track')  return 'On Track';
    if (status === 'overdue')   return 'Overdue';
    if (status === 'completed') return 'Completed';
    return status;
  };

  // ── Schedule item status helpers ─────────────────
  const getScheduleColor = (status: string) => {
    if (status === 'paid')     return COLORS.success;
    if (status === 'due')      return COLORS.warning;
    if (status === 'overdue')  return COLORS.danger;
    return COLORS.textSecondary;
  };

  const getScheduleBg = (status: string) => {
    if (status === 'paid')     return '#ECFDF5';
    if (status === 'due')      return '#FFFBEB';
    if (status === 'overdue')  return '#FEF2F2';
    return COLORS.border;
  };

  const getScheduleIcon = (status: string) => {
    if (status === 'paid')     return 'check-circle';
    if (status === 'due')      return 'clock';
    if (status === 'overdue')  return 'alert-circle';
    return 'circle';
  };

  const getScheduleLabel = (status: string) => {
    if (status === 'paid')     return 'Paid';
    if (status === 'due')      return 'Due Now';
    if (status === 'overdue')  return 'Overdue';
    return 'Upcoming';
  };

  // ── Summary tab ──────────────────────────────────
  const SummaryTab = () => (
    <View>

      {/* Loan summary card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loan Summary</Text>
        <Row label="Total Loan"        value={`LKR ${fmt(loan.totalAmount)}`}    />
        <Row label="Amount Paid"       value={`LKR ${fmt(loan.paidAmount)}`}     highlight={COLORS.success} />
        <Row label="Remaining"         value={`LKR ${fmt(loan.remaining)}`}      highlight={COLORS.warning} />
        <Row label="Monthly Payment"   value={`LKR ${fmt(loan.monthlyPayment)}`} />
        <Row label="Tenure"            value={`${loan.tenure} months`}           />
        <Row label="Months Paid"       value={`${loan.paidMonths} of ${loan.tenure}`} />
        <Row label="Next Due Date"     value={loan.nextDue}                      />
      </View>

      {/* Loan details card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loan Details</Text>
        <Row label="Loan Offer"     value={loan.offer}         />
        <Row label="Interest Rate"  value="12% p.a."           />
        <Row label="Repayment"      value="Monthly"            />
        <Row label="Disbursed On"   value="15 Jan 2026"        />
        <Row label="End Date"       value="15 Dec 2026"        />
        <Row label="Reference"      value={`SC-2026-00${loan.id}`} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => navigation.navigate('QRScanner')}
          activeOpacity={0.85}
        >
          <Feather name="maximize" size={18} color="#fff" />
          <Text style={styles.scanBtnText}>Scan Payment QR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reminderBtn}
          onPress={() => navigation.navigate('PaymentReminders')}
          activeOpacity={0.85}
        >
          <Feather name="bell" size={18} color={COLORS.primary} />
          <Text style={styles.reminderBtnText}>Send Reminder</Text>
        </TouchableOpacity>
      </View>

    </View>
  );

  // ── Schedule tab ─────────────────────────────────
  const ScheduleTab = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Repayment Schedule</Text>

      {/* Paid count summary */}
      <View style={styles.scheduleSummary}>
        <View style={styles.scheduleSummaryItem}>
          <Text style={[styles.scheduleSummaryVal, { color: COLORS.success }]}>
            {SCHEDULE.filter(s => s.status === 'paid').length}
          </Text>
          <Text style={styles.scheduleSummaryLabel}>Paid</Text>
        </View>
        <View style={styles.scheduleSummaryItem}>
          <Text style={[styles.scheduleSummaryVal, { color: COLORS.warning }]}>
            {SCHEDULE.filter(s => s.status === 'due').length}
          </Text>
          <Text style={styles.scheduleSummaryLabel}>Due</Text>
        </View>
        <View style={styles.scheduleSummaryItem}>
          <Text style={[styles.scheduleSummaryVal, { color: COLORS.textSecondary }]}>
            {SCHEDULE.filter(s => s.status === 'upcoming').length}
          </Text>
          <Text style={styles.scheduleSummaryLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Schedule list */}
      {SCHEDULE.map((item, index) => (
        <View key={item.id} style={styles.scheduleItem}>

          {/* Left — number + line */}
          <View style={styles.scheduleLeft}>
            <View style={[
              styles.scheduleNum,
              { backgroundColor: getScheduleBg(item.status) }
            ]}>
              <Feather
                name={getScheduleIcon(item.status) as any}
                size={14}
                color={getScheduleColor(item.status)}
              />
            </View>
            {/* Vertical line connecting items */}
            {index < SCHEDULE.length - 1 && (
              <View style={[
                styles.scheduleLine,
                { backgroundColor: item.status === 'paid' ? COLORS.success : COLORS.border }
              ]} />
            )}
          </View>

          {/* Right — month + amount + status */}
          <View style={styles.scheduleRight}>
            <View style={styles.scheduleRow}>
              <View>
                <Text style={styles.scheduleMonth}>{item.month}</Text>
                <Text style={styles.scheduleDate}>{item.date}</Text>
              </View>
              <View style={styles.scheduleRightSide}>
                <Text style={[
                  styles.scheduleAmount,
                  item.status === 'paid' && { color: COLORS.success }
                ]}>
                  LKR {item.amount}
                </Text>
                <View style={[
                  styles.scheduleBadge,
                  { backgroundColor: getScheduleBg(item.status) }
                ]}>
                  <Text style={[
                    styles.scheduleBadgeText,
                    { color: getScheduleColor(item.status) }
                  ]}>
                    {getScheduleLabel(item.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

        </View>
      ))}
    </View>
  );

  // ── History tab ──────────────────────────────────
  const HistoryTab = () => (
    <View>
      {/* Total collected */}
      <View style={styles.historyTotal}>
        <Text style={styles.historyTotalLabel}>Total Collected</Text>
        <Text style={styles.historyTotalValue}>
          LKR {fmt(loan.paidAmount)}
        </Text>
        <Text style={styles.historyTotalSub}>
          {PAYMENT_HISTORY.length} payments received
        </Text>
      </View>

      {/* Payment history list */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Payment History</Text>

        {PAYMENT_HISTORY.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Feather name="inbox" size={36} color={COLORS.border} />
            <Text style={styles.emptyText}>No payments yet</Text>
          </View>
        ) : (
          PAYMENT_HISTORY.map((payment) => (
            <View key={payment.id} style={styles.paymentItem}>

              {/* Icon */}
              <View style={[
                styles.paymentIcon,
                { backgroundColor: payment.method === 'QR Scan' ? '#ECFDF5' : '#EBF4FF' }
              ]}>
                <Feather
                  name={payment.method === 'QR Scan' ? 'maximize' : 'repeat'}
                  size={16}
                  color={payment.method === 'QR Scan' ? COLORS.success : COLORS.primary}
                />
              </View>

              {/* Info */}
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentRef}>{payment.ref}</Text>
                <Text style={styles.paymentDate}>{payment.date}</Text>
              </View>

              {/* Amount + method */}
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>
                  LKR {payment.amount}
                </Text>
                <Text style={[
                  styles.paymentMethod,
                  { color: payment.method === 'QR Scan' ? COLORS.success : COLORS.primary }
                ]}>
                  {payment.method}
                </Text>
              </View>

            </View>
          ))
        )}
      </View>
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

        <Text style={styles.headerTitle}>Loan Details</Text>

        <TouchableOpacity style={styles.headerRightBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── BORROWER PROFILE ────────────────── */}
        <View style={styles.profileCard}>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{loan.name[0]}</Text>
          </View>

          <Text style={styles.profileName}>{loan.name}</Text>
          <Text style={styles.profileOffer}>{loan.offer}</Text>

          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: loan.status === 'on-track' ? '#ECFDF5' : '#FEF2F2' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(loan.status) }
            ]}>
              {getStatusLabel(loan.status)}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Repayment Progress</Text>
              <Text style={[
                styles.progressPct,
                { color: getStatusColor(loan.status) }
              ]}>
                {progress}%
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: getStatusColor(loan.status),
                }
              ]} />
            </View>
            <Text style={styles.progressSub}>
              LKR {fmt(loan.paidAmount)} paid of LKR {fmt(loan.totalAmount)}
            </Text>
          </View>

          {/* Quick stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatValue, { color: COLORS.warning }]}>
                LKR {fmt(loan.remaining)}
              </Text>
              <Text style={styles.quickStatLabel}>Remaining</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {loan.paidMonths}/{loan.tenure}
              </Text>
              <Text style={styles.quickStatLabel}>Months</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{loan.nextDue}</Text>
              <Text style={styles.quickStatLabel}>Next Due</Text>
            </View>
          </View>

        </View>

        {/* ── TABS ────────────────────────────────── */}
        <View style={styles.tabRow}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tab,
                activeTab === t.id && styles.tabActive,
              ]}
              onPress={() => setActiveTab(t.id)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                activeTab === t.id && styles.tabTextActive,
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB CONTENT ─────────────────────── */}
        {activeTab === 'summary'  && <SummaryTab  />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'history'  && <HistoryTab  />}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Row component ─────────────────────────────────────
const Row = ({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) => (
  <View style={rowStyles.wrap}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[
      rowStyles.value,
      highlight ? { color: highlight, fontWeight: '700' } : {}
    ]}>
      {value}
    </Text>
  </View>
);

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

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

  scroll: {
    paddingBottom: 24,
  },

  // Profile card
  profileCard: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  profileOffer: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Progress
  progressSection: {
    width: '100%',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  progressBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  progressSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  scanBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  scanBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  reminderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EBF4FF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  reminderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Schedule
  scheduleSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  scheduleSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  scheduleSummaryVal: {
    fontSize: 20,
    fontWeight: '700',
  },
  scheduleSummaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  scheduleLeft: {
    alignItems: 'center',
    marginRight: 12,
    width: 32,
  },
  scheduleNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
  },
  scheduleRight: {
    flex: 1,
    paddingBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleMonth: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scheduleDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scheduleRightSide: {
    alignItems: 'flex-end',
    gap: 4,
  },
  scheduleAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scheduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Payment history
  historyTotal: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  historyTotalLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  historyTotalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  historyTotalSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentRef: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  paymentMethod: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

// ── Row styles ────────────────────────────────────────
const rowStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});
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

// ── Main Component ────────────────────────────────────
// Receives application data from ApplicationsReceivedScreen
// via route.params.application
export default function ReviewApplicationScreen({ route, navigation }: any) {

  // ── Get application data from previous screen ────
  const application = route?.params?.application || {
    id: '1',
    name: 'Kasun Silva',
    offer: 'Quick Personal Loan',
    amount: '50,000',
    date: '03 Apr 2026',
    status: 'pending',
    score: 820,
  };

  // ── Extra borrower details ───────────────────────
  // In real app this would come from API using application.id
  const borrowerDetails = {
    email:      'kasun@email.com',
    phone:      '+94 77 123 4567',
    address:    'No. 25, Galle Road, Colombo 03',
    occupation: 'Software Engineer',
    income:     'LKR 150,000 / month',
    employer:   'Tech Solutions Ltd',
    existing:   'LKR 0',
    purpose:    'Home renovation and furniture',
    tenure:     '12 months',
    repayment:  'Monthly',
  };

  // ── Active tab state ─────────────────────────────
  // Tabs to switch between different info sections
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'borrower',  label: 'Borrower'  },
    { id: 'financial', label: 'Financial' },
  ];

  // ── Status helpers ───────────────────────────────
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

  // ── Credit score color and label ─────────────────
  const getScoreColor = (score: number) => {
    if (score >= 750) return COLORS.success;
    if (score >= 650) return COLORS.warning;
    return COLORS.danger;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 750) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 650) return 'Fair';
    return 'Poor';
  };

  // ── Credit score bar width ───────────────────────
  // Score is out of 900, convert to percentage
  const scorePercent = Math.round((application.score / 900) * 100);

  // ── Render info row ──────────────────────────────
  const Row = ({
    label,
    value,
    highlight,
  }: {
    label: string;
    value: string;
    highlight?: boolean;
  }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[
        styles.rowValue,
        highlight && { color: COLORS.primary, fontWeight: '700' }
      ]}>
        {value}
      </Text>
    </View>
  );

  // ── Overview tab content ─────────────────────────
  const OverviewTab = () => (
    <View>

      {/* Loan request card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loan Request</Text>
        <Row label="Amount Requested" value={`LKR ${application.amount}`} highlight />
        <Row label="Loan Offer"        value={application.offer}                    />
        <Row label="Purpose"           value={borrowerDetails.purpose}              />
        <Row label="Tenure"            value={borrowerDetails.tenure}               />
        <Row label="Repayment"         value={borrowerDetails.repayment}            />
        <Row label="Date Applied"      value={application.date}                     />
      </View>

      {/* Credit score card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Credit Score</Text>

        {/* Score number and label */}
        <View style={styles.scoreRow}>
          <View>
            <Text style={[
              styles.scoreNumber,
              { color: getScoreColor(application.score) }
            ]}>
              {application.score}
            </Text>
            <Text style={styles.scoreOutOf}>out of 900</Text>
          </View>
          <View style={[
            styles.scoreLabelBadge,
            { backgroundColor: getStatusBg(
              application.score >= 750 ? 'approved'
              : application.score >= 650 ? 'pending'
              : 'rejected'
            )}
          ]}>
            <Text style={[
              styles.scoreLabelText,
              { color: getScoreColor(application.score) }
            ]}>
              {getScoreLabel(application.score)}
            </Text>
          </View>
        </View>

        {/* Score progress bar */}
        <View style={styles.scoreBg}>
          <View style={[
            styles.scoreFill,
            {
              width: `${scorePercent}%`,
              backgroundColor: getScoreColor(application.score),
            }
          ]} />
        </View>

        {/* Score breakdown */}
        <View style={styles.scoreBreakdown}>
          <ScoreItem label="Payment History" value={92} />
          <ScoreItem label="Credit Usage"    value={78} />
          <ScoreItem label="Credit Age"      value={65} />
          <ScoreItem label="New Credit"      value={85} />
        </View>

      </View>

    </View>
  );

  // ── Borrower tab content ─────────────────────────
  const BorrowerTab = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Personal Information</Text>
      <Row label="Full Name"   value={application.name}          />
      <Row label="Email"       value={borrowerDetails.email}     />
      <Row label="Phone"       value={borrowerDetails.phone}     />
      <Row label="Address"     value={borrowerDetails.address}   />
      <Row label="Occupation"  value={borrowerDetails.occupation}/>
      <Row label="Employer"    value={borrowerDetails.employer}  />
    </View>
  );

  // ── Financial tab content ────────────────────────
  const FinancialTab = () => (
    <View>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Financial Details</Text>
        <Row label="Monthly Income"     value={borrowerDetails.income}   highlight />
        <Row label="Existing Loans"     value={borrowerDetails.existing}           />
        <Row label="Requested Amount"   value={`LKR ${application.amount}`} highlight />
        <Row label="Monthly Repayment"  value="LKR 4,707"                          />
        <Row label="Debt-to-Income"     value="3.1%"                               />
      </View>

      {/* Risk assessment */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Risk Assessment</Text>
        <RiskItem label="Credit Score"      level="low"    value="820 — Excellent" />
        <RiskItem label="Income Stability"  level="low"    value="Stable employment" />
        <RiskItem label="Debt Ratio"        level="low"    value="3.1% — Very low" />
        <RiskItem label="Loan-to-Income"    level="medium" value="33% of income" />
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

        <Text style={styles.headerTitle}>Review Application</Text>

        {/* Share/export button */}
        <TouchableOpacity style={styles.headerRightBtn} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── BORROWER PROFILE CARD ────────────── */}
        <View style={styles.profileCard}>

          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{application.name[0]}</Text>
          </View>

          {/* Name and offer */}
          <Text style={styles.profileName}>{application.name}</Text>
          <Text style={styles.profileOffer}>{application.offer}</Text>

          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusBg(application.status) }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(application.status) }
            ]}>
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Text>
          </View>

          {/* Quick stats row */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                LKR {application.amount}
              </Text>
              <Text style={styles.quickStatLabel}>Requested</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={[
                styles.quickStatValue,
                { color: getScoreColor(application.score) }
              ]}>
                {application.score}
              </Text>
              <Text style={styles.quickStatLabel}>Credit Score</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>12 mo</Text>
              <Text style={styles.quickStatLabel}>Tenure</Text>
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

        {/* ── TAB CONTENT ─────────────────────────── */}
        {activeTab === 'overview'  && <OverviewTab  />}
        {activeTab === 'borrower'  && <BorrowerTab  />}
        {activeTab === 'financial' && <FinancialTab />}

        {/* ── ACTION BUTTONS ──────────────────────── 
            Only show if application is still pending  */}
        {application.status === 'pending' && (
          <View style={styles.actionRow}>

            {/* Reject button */}
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => navigation.navigate('ApproveReject', {
                application,
                action: 'reject',
              })}
              activeOpacity={0.85}
            >
              <Feather name="x" size={18} color={COLORS.danger} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>

            {/* Approve button */}
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => navigation.navigate('ApproveReject', {
                application,
                action: 'approve',
              })}
              activeOpacity={0.85}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>

          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── ScoreItem component ───────────────────────────────
// Shows a credit score category with a mini bar
const ScoreItem = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <View style={scoreStyles.wrap}>
    <Text style={scoreStyles.label}>{label}</Text>
    <View style={scoreStyles.barBg}>
      <View style={[
        scoreStyles.barFill,
        {
          width: `${value}%`,
          backgroundColor: value >= 80
            ? COLORS.success
            : value >= 60
            ? COLORS.warning
            : COLORS.danger,
        }
      ]} />
    </View>
    <Text style={scoreStyles.value}>{value}%</Text>
  </View>
);

// ── RiskItem component ────────────────────────────────
// Shows a risk factor with color-coded level
const RiskItem = ({
  label,
  level,
  value,
}: {
  label: string;
  level: 'low' | 'medium' | 'high';
  value: string;
}) => {
  const colors = {
    low:    { bg: '#ECFDF5', text: COLORS.success },
    medium: { bg: '#FFFBEB', text: COLORS.warning  },
    high:   { bg: '#FEF2F2', text: COLORS.danger   },
  };

  return (
    <View style={riskStyles.wrap}>
      <View style={riskStyles.left}>
        <Text style={riskStyles.label}>{label}</Text>
        <Text style={riskStyles.value}>{value}</Text>
      </View>
      <View style={[
        riskStyles.badge,
        { backgroundColor: colors[level].bg }
      ]}>
        <Text style={[
          riskStyles.badgeText,
          { color: colors[level].text }
        ]}>
          {level.charAt(0).toUpperCase() + level.slice(1)} Risk
        </Text>
      </View>
    </View>
  );
};

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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
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
    fontSize: 16,
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

  // Tab row
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

  // Info row
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },

  // Credit score
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreOutOf: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  scoreLabelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scoreBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  scoreFill: {
    height: 8,
    borderRadius: 4,
  },
  scoreBreakdown: {
    gap: 10,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.danger,
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.success,
  },
  approveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

// ── ScoreItem styles ──────────────────────────────────
const scoreStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 110,
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 35,
    textAlign: 'right',
  },
});

// ── RiskItem styles ───────────────────────────────────
const riskStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  left: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  value: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
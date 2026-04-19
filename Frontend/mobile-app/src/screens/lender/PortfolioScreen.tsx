import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

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
  purple: '#8B5CF6',
};

// ── Portfolio summary data ────────────────────────────
const SUMMARY = {
  totalValue:    2400000,
  totalLent:     2400000,
  totalCollected:1800000,
  outstanding:   600000,
  avgReturn:     13.2,
  onTrack:       14,
  overdue:       3,
  defaulted:     1,
  completed:     6,
};

// ── Loan type distribution ────────────────────────────
const DISTRIBUTION = [
  { type: 'Personal',  pct: 40, amount: 960000,  color: COLORS.primary, icon: 'user'      },
  { type: 'Business',  pct: 30, amount: 720000,  color: COLORS.success, icon: 'briefcase' },
  { type: 'Education', pct: 20, amount: 480000,  color: COLORS.warning, icon: 'book'      },
  { type: 'Vehicle',   pct: 10, amount: 240000,  color: COLORS.purple,  icon: 'truck'     },
];

// ── Top borrowers ─────────────────────────────────────
const TOP_BORROWERS = [
  { id: '1', name: 'Sunil Fernando', total: 200000, paid: 40000,  status: 'on-track',  loans: 2 },
  { id: '2', name: 'Kasun Silva',    total: 150000, paid: 90000,  status: 'on-track',  loans: 3 },
  { id: '3', name: 'Nimal Perera',   total: 120000, paid: 30000,  status: 'overdue',   loans: 2 },
  { id: '4', name: 'Priya Dias',     total: 80000,  paid: 80000,  status: 'completed', loans: 1 },
  { id: '5', name: 'Amal Bandara',   total: 50000,  paid: 10000,  status: 'overdue',   loans: 1 },
];

// ── Risk breakdown ────────────────────────────────────
const RISK_DATA = [
  { label: 'Low Risk',    count: 14, pct: 58, color: COLORS.success },
  { label: 'Medium Risk', count: 7,  pct: 29, color: COLORS.warning },
  { label: 'High Risk',   count: 3,  pct: 13, color: COLORS.danger  },
];

// ── Format number ─────────────────────────────────────
const fmt = (num: number) =>
  num >= 1000000
    ? `${(num / 1000000).toFixed(1)}M`
    : num >= 1000
    ? `${(num / 1000).toFixed(0)}K`
    : num.toString();

const fmtFull = (num: number) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── Main Component ────────────────────────────────────
export default function PortfolioScreen({ navigation }: any) {

  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'loans',     label: 'Loans'     },
    { id: 'risk',      label: 'Risk'      },
  ];

  // ── Collection rate ──────────────────────────────
  const collectionRate = Math.round(
    (SUMMARY.totalCollected / SUMMARY.totalLent) * 100
  );

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

  // ── Overview tab ─────────────────────────────────
  const OverviewTab = () => (
    <View>

      {/* Collection rate card */}
      <View style={styles.collectionCard}>
        <View style={styles.collectionLeft}>
          <Text style={styles.collectionTitle}>Collection Rate</Text>
          <Text style={styles.collectionRate}>{collectionRate}%</Text>
          <Text style={styles.collectionSub}>
            LKR {fmt(SUMMARY.totalCollected)} of LKR {fmt(SUMMARY.totalLent)}
          </Text>
        </View>

        {/* Circular progress indicator using Views */}
        <View style={styles.circleWrap}>
          <View style={styles.circleOuter}>
            <View style={styles.circleInner}>
              <Text style={styles.circleText}>{collectionRate}%</Text>
              <Text style={styles.circleLabel}>Collected</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Status breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loan Status Breakdown</Text>

        <View style={styles.statusGrid}>
          <StatusCard
            label="On Track"
            count={SUMMARY.onTrack}
            color={COLORS.success}
            bg="#ECFDF5"
            icon="check-circle"
          />
          <StatusCard
            label="Overdue"
            count={SUMMARY.overdue}
            color={COLORS.danger}
            bg="#FEF2F2"
            icon="alert-circle"
          />
          <StatusCard
            label="Completed"
            count={SUMMARY.completed}
            color={COLORS.primary}
            bg="#EBF4FF"
            icon="award"
          />
          <StatusCard
            label="Defaulted"
            count={SUMMARY.defaulted}
            color={COLORS.warning}
            bg="#FFFBEB"
            icon="x-circle"
          />
        </View>

        {/* Status bar */}
        <View style={styles.statusBar}>
          <View style={[
            styles.statusBarFill,
            {
              flex: SUMMARY.onTrack,
              backgroundColor: COLORS.success,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
            }
          ]} />
          <View style={[
            styles.statusBarFill,
            { flex: SUMMARY.overdue, backgroundColor: COLORS.danger }
          ]} />
          <View style={[
            styles.statusBarFill,
            { flex: SUMMARY.completed, backgroundColor: COLORS.primary }
          ]} />
          <View style={[
            styles.statusBarFill,
            {
              flex: SUMMARY.defaulted,
              backgroundColor: COLORS.warning,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
            }
          ]} />
        </View>

      </View>

      {/* Financial summary */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <FinRow label="Total Portfolio Value" value={`LKR ${fmtFull(SUMMARY.totalValue)}`}    highlight />
        <FinRow label="Total Lent"            value={`LKR ${fmtFull(SUMMARY.totalLent)}`}              />
        <FinRow label="Total Collected"       value={`LKR ${fmtFull(SUMMARY.totalCollected)}`} color={COLORS.success} />
        <FinRow label="Outstanding"           value={`LKR ${fmtFull(SUMMARY.outstanding)}`}    color={COLORS.warning} />
        <FinRow label="Average Return"        value={`${SUMMARY.avgReturn}% p.a.`}              color={COLORS.primary} />
        <FinRow label="Collection Rate"       value={`${collectionRate}%`}                      color={COLORS.success} />
      </View>

    </View>
  );

  // ── Loans tab ────────────────────────────────────
  const LoansTab = () => (
    <View>

      {/* Loan type distribution */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loan Distribution</Text>

        {DISTRIBUTION.map((item) => (
          <View key={item.type} style={styles.distRow}>

            {/* Icon + type */}
            <View style={[
              styles.distIcon,
              { backgroundColor: item.color + '20' }
            ]}>
              <Feather
                name={item.icon as any}
                size={16}
                color={item.color}
              />
            </View>

            <View style={styles.distInfo}>
              <View style={styles.distHeader}>
                <Text style={styles.distType}>{item.type}</Text>
                <Text style={[styles.distPct, { color: item.color }]}>
                  {item.pct}%
                </Text>
              </View>

              {/* Progress bar */}
              <View style={styles.distBarBg}>
                <View style={[
                  styles.distBarFill,
                  {
                    width: `${item.pct}%`,
                    backgroundColor: item.color,
                  }
                ]} />
              </View>

              <Text style={styles.distAmount}>
                LKR {fmtFull(item.amount)}
              </Text>
            </View>

          </View>
        ))}

      </View>

      {/* Top borrowers */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Borrowers</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('ActiveLoans')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {TOP_BORROWERS.map((borrower) => {
          const progress = Math.round(
            (borrower.paid / borrower.total) * 100
          );
          return (
            <View key={borrower.id} style={styles.borrowerRow}>

              {/* Avatar */}
              <View style={styles.borrowerAvatar}>
                <Text style={styles.borrowerAvatarText}>
                  {borrower.name[0]}
                </Text>
              </View>

              {/* Info */}
              <View style={styles.borrowerInfo}>
                <View style={styles.borrowerTop}>
                  <Text style={styles.borrowerName}>{borrower.name}</Text>
                  <View style={[
                    styles.borrowerStatus,
                    { backgroundColor: getStatusBg(borrower.status) }
                  ]}>
                    <Text style={[
                      styles.borrowerStatusText,
                      { color: getStatusColor(borrower.status) }
                    ]}>
                      {getStatusLabel(borrower.status)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.borrowerBarBg}>
                  <View style={[
                    styles.borrowerBarFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: getStatusColor(borrower.status),
                    }
                  ]} />
                </View>

                <View style={styles.borrowerBottom}>
                  <Text style={styles.borrowerAmount}>
                    LKR {fmtFull(borrower.total)}
                  </Text>
                  <Text style={styles.borrowerProgress}>
                    {progress}% paid
                  </Text>
                </View>
              </View>

            </View>
          );
        })}

      </View>

    </View>
  );

  // ── Risk tab ─────────────────────────────────────
  const RiskTab = () => (
    <View>

      {/* Risk overview */}
      <View style={styles.riskOverview}>
        <View style={styles.riskHeader}>
          <Feather name="shield" size={20} color={COLORS.success} />
          <Text style={styles.riskOverallLabel}>Overall Risk</Text>
          <View style={styles.riskOverallBadge}>
            <Text style={styles.riskOverallText}>Low — Moderate</Text>
          </View>
        </View>
        <Text style={styles.riskOverallSub}>
          Your portfolio maintains a healthy risk profile with 58% low-risk loans
        </Text>
      </View>

      {/* Risk breakdown */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Risk Breakdown</Text>

        {RISK_DATA.map((risk) => (
          <View key={risk.label} style={styles.riskRow}>

            <View style={styles.riskLeft}>
              <View style={[
                styles.riskDot,
                { backgroundColor: risk.color }
              ]} />
              <Text style={styles.riskLabel}>{risk.label}</Text>
            </View>

            <View style={styles.riskBarWrap}>
              <View style={styles.riskBarBg}>
                <View style={[
                  styles.riskBarFill,
                  {
                    width: `${risk.pct}%`,
                    backgroundColor: risk.color,
                  }
                ]} />
              </View>
            </View>

            <View style={styles.riskRight}>
              <Text style={[styles.riskPct, { color: risk.color }]}>
                {risk.pct}%
              </Text>
              <Text style={styles.riskCount}>{risk.count} loans</Text>
            </View>

          </View>
        ))}

      </View>

      {/* Risk factors */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Key Risk Factors</Text>

        <RiskFactor
          icon="trending-up"
          label="Concentration Risk"
          value="Moderate"
          desc="40% in personal loans"
          color={COLORS.warning}
        />
        <RiskFactor
          icon="users"
          label="Borrower Diversification"
          value="Good"
          desc="24 active borrowers"
          color={COLORS.success}
        />
        <RiskFactor
          icon="clock"
          label="Overdue Exposure"
          value="Low"
          desc="3.2% of portfolio"
          color={COLORS.success}
        />
        <RiskFactor
          icon="alert-triangle"
          label="Default Rate"
          value="Very Low"
          desc="1 default (4.2%)"
          color={COLORS.success}
        />

      </View>

      {/* Recommendations */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recommendations</Text>

        {[
          {
            icon: 'plus-circle',
            text: 'Diversify into more business loans to balance personal loan concentration',
            color: COLORS.primary,
          },
          {
            icon: 'bell',
            text: 'Send reminders to 3 overdue borrowers to prevent defaults',
            color: COLORS.warning,
          },
          {
            icon: 'shield',
            text: 'Consider requiring collateral for loans above LKR 100,000',
            color: COLORS.success,
          },
        ].map((rec, index) => (
          <View key={index} style={styles.recRow}>
            <View style={[
              styles.recIcon,
              { backgroundColor: rec.color + '20' }
            ]}>
              <Feather
                name={rec.icon as any}
                size={16}
                color={rec.color}
              />
            </View>
            <Text style={styles.recText}>{rec.text}</Text>
          </View>
        ))}

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

        <Text style={styles.headerTitle}>Portfolio</Text>

        <TouchableOpacity
          style={styles.headerRightBtn}
          onPress={() => navigation.navigate('Analytics')}
          activeOpacity={0.7}
        >
          <Feather name="bar-chart-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── PORTFOLIO VALUE BANNER ───────────── */}
        <View style={styles.valueBanner}>
          <Text style={styles.valueBannerLabel}>Total Portfolio Value</Text>
          <Text style={styles.valueBannerAmount}>
            LKR {fmtFull(SUMMARY.totalValue)}
          </Text>
          <View style={styles.valueBannerRow}>
            <View style={styles.valueBannerItem}>
              <Feather name="trending-up" size={14} color="#fff" />
              <Text style={styles.valueBannerSub}>
                {SUMMARY.avgReturn}% avg return
              </Text>
            </View>
            <View style={styles.valueBannerDivider} />
            <View style={styles.valueBannerItem}>
              <Feather name="users" size={14} color="#fff" />
              <Text style={styles.valueBannerSub}>
                {SUMMARY.onTrack + SUMMARY.overdue} active loans
              </Text>
            </View>
          </View>
        </View>

        {/* ── QUICK STATS ROW ──────────────────── */}
        <View style={styles.quickRow}>
          <QuickStat
            label="Collected"
            value={`LKR ${fmt(SUMMARY.totalCollected)}`}
            color={COLORS.success}
            icon="check-circle"
          />
          <QuickStat
            label="Outstanding"
            value={`LKR ${fmt(SUMMARY.outstanding)}`}
            color={COLORS.warning}
            icon="clock"
          />
          <QuickStat
            label="Overdue"
            value={String(SUMMARY.overdue)}
            color={COLORS.danger}
            icon="alert-circle"
          />
        </View>

        {/* ── TABS ────────────────────────────── */}
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
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'loans'    && <LoansTab    />}
        {activeTab === 'risk'     && <RiskTab     />}

        <View style={{ height: 32 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ── StatusCard component ──────────────────────────────
const StatusCard = ({
  label,
  count,
  color,
  bg,
  icon,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
  icon: string;
}) => (
  <View style={[statusStyles.card, { backgroundColor: bg }]}>
    <Feather name={icon as any} size={20} color={color} />
    <Text style={[statusStyles.count, { color }]}>{count}</Text>
    <Text style={statusStyles.label}>{label}</Text>
  </View>
);

// ── FinRow component ──────────────────────────────────
const FinRow = ({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) => (
  <View style={finStyles.wrap}>
    <Text style={finStyles.label}>{label}</Text>
    <Text style={[
      finStyles.value,
      highlight && { fontWeight: '700', fontSize: 15 },
      color ? { color } : {},
    ]}>
      {value}
    </Text>
  </View>
);

// ── QuickStat component ───────────────────────────────
const QuickStat = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) => (
  <View style={quickStyles.card}>
    <Feather name={icon as any} size={16} color={color} />
    <Text style={[quickStyles.value, { color }]}>{value}</Text>
    <Text style={quickStyles.label}>{label}</Text>
  </View>
);

// ── RiskFactor component ──────────────────────────────
const RiskFactor = ({
  icon,
  label,
  value,
  desc,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  desc: string;
  color: string;
}) => (
  <View style={riskFactorStyles.wrap}>
    <View style={[
      riskFactorStyles.icon,
      { backgroundColor: color + '20' }
    ]}>
      <Feather name={icon as any} size={16} color={color} />
    </View>
    <View style={riskFactorStyles.info}>
      <Text style={riskFactorStyles.label}>{label}</Text>
      <Text style={riskFactorStyles.desc}>{desc}</Text>
    </View>
    <View style={[
      riskFactorStyles.badge,
      { backgroundColor: color + '20' }
    ]}>
      <Text style={[riskFactorStyles.badgeText, { color }]}>
        {value}
      </Text>
    </View>
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

  // Value banner
  valueBanner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  valueBannerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  valueBannerAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  valueBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  valueBannerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  valueBannerSub: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  valueBannerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Quick stats
  quickRow: {
    flexDirection: 'row',
    marginTop: -16,
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
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

  // Collection card
  collectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  collectionLeft: {
    flex: 1,
  },
  collectionTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  collectionRate: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 4,
  },
  collectionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Circle indicator
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: COLORS.success,
  },
  circleInner: {
    alignItems: 'center',
  },
  circleText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.success,
  },
  circleLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },

  // Status grid
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: 8,
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
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Distribution
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  distIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distInfo: {
    flex: 1,
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  distType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  distPct: {
    fontSize: 14,
    fontWeight: '700',
  },
  distBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  distBarFill: {
    height: 6,
    borderRadius: 3,
  },
  distAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Borrower row
  borrowerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  borrowerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  borrowerInfo: {
    flex: 1,
  },
  borrowerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  borrowerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  borrowerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  borrowerStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  borrowerBarBg: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  borrowerBarFill: {
    height: 5,
    borderRadius: 3,
  },
  borrowerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  borrowerAmount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  borrowerProgress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Risk overview
  riskOverview: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  riskOverallLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  riskOverallBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  riskOverallText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  riskOverallSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Risk row
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  riskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 100,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  riskLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  riskBarWrap: {
    flex: 1,
  },
  riskBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: 8,
    borderRadius: 4,
  },
  riskRight: {
    alignItems: 'flex-end',
    width: 56,
  },
  riskPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  riskCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Recommendations
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

// ── StatusCard styles ─────────────────────────────────
const statusStyles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

// ── FinRow styles ─────────────────────────────────────
const finStyles = StyleSheet.create({
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
    textAlign: 'right',
  },
});

// ── QuickStat styles ──────────────────────────────────
const quickStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

// ── RiskFactor styles ─────────────────────────────────
const riskFactorStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  desc: {
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
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

// ── Monthly data ─────────────────────────────────────
const MONTHLY_DATA = {
  '3M': [
    { month: 'Feb', disbursed: 80, collected: 62 },
    { month: 'Mar', disbursed: 55, collected: 78 },
    { month: 'Apr', disbursed: 90, collected: 72 },
  ],
  '6M': [
    { month: 'Nov', disbursed: 60, collected: 45 },
    { month: 'Dec', disbursed: 75, collected: 58 },
    { month: 'Jan', disbursed: 80, collected: 62 },
    { month: 'Feb', disbursed: 55, collected: 78 },
    { month: 'Mar', disbursed: 90, collected: 72 },
    { month: 'Apr', disbursed: 70, collected: 85 },
  ],
  '1Y': [
    { month: 'May', disbursed: 40, collected: 30 },
    { month: 'Jun', disbursed: 55, collected: 42 },
    { month: 'Jul', disbursed: 48, collected: 55 },
    { month: 'Aug', disbursed: 65, collected: 48 },
    { month: 'Sep', disbursed: 72, collected: 60 },
    { month: 'Oct', disbursed: 58, collected: 70 },
    { month: 'Nov', disbursed: 60, collected: 45 },
    { month: 'Dec', disbursed: 75, collected: 58 },
    { month: 'Jan', disbursed: 80, collected: 62 },
    { month: 'Feb', disbursed: 55, collected: 78 },
    { month: 'Mar', disbursed: 90, collected: 72 },
    { month: 'Apr', disbursed: 70, collected: 85 },
  ],
};

// ── Loan type distribution ────────────────────────────
const LOAN_TYPES = [
  { type: 'Personal',  value: 40, color: COLORS.primary,  amount: 'LKR 960K'  },
  { type: 'Business',  value: 30, color: COLORS.success,  amount: 'LKR 720K'  },
  { type: 'Education', value: 20, color: COLORS.warning,  amount: 'LKR 480K'  },
  { type: 'Vehicle',   value: 10, color: COLORS.purple,   amount: 'LKR 240K'  },
];

// ── Performance metrics ───────────────────────────────
const METRICS = [
  { label: 'Collection Rate',   value: '87%',      change: '+2.3%', up: true,  color: COLORS.success },
  { label: 'Default Rate',      value: '3.2%',     change: '-0.5%', up: true,  color: COLORS.danger  },
  { label: 'Avg Loan Size',     value: 'LKR 55K',  change: '+8.1%', up: true,  color: COLORS.primary },
  { label: 'Portfolio Yield',   value: '13.2%',    change: '+1.1%', up: true,  color: COLORS.success },
  { label: 'Avg Tenure',        value: '14 mo',    change: '+1 mo', up: false, color: COLORS.textPrimary },
  { label: 'Active Borrowers',  value: '24',       change: '+4',    up: true,  color: COLORS.primary },
];

// ── Top performing offers ─────────────────────────────
const TOP_OFFERS = [
  { rank: 1, name: 'Quick Personal Loan', collections: 'LKR 480K', rate: '87%', color: COLORS.success },
  { rank: 2, name: 'SME Business Boost',  collections: 'LKR 360K', rate: '82%', color: COLORS.primary },
  { rank: 3, name: 'Education Finance',   collections: 'LKR 240K', rate: '91%', color: COLORS.warning },
];

// ── Format number ────────────────────────────────────
const fmt = (num: number) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── Main Component ────────────────────────────────────
export default function AnalyticsScreen({ navigation }: any) {

  // ── Period filter state ──────────────────────────
  const [period, setPeriod] = useState<'3M' | '6M' | '1Y'>('6M');

  // Get data for selected period
  const chartData = MONTHLY_DATA[period];

  // ── Chart max value for scaling ──────────────────
  // Find the highest value across all bars
  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.disbursed, d.collected))
  );

  // ── Chart bar height calculation ─────────────────
  // Scale each bar relative to max value
  // Max bar height is 120px
  const getBarHeight = (value: number) =>
    Math.max((value / maxValue) * 120, 4);

  // ── Available chart width per group ─────────────
  const chartWidth = width - 80;
  const barGroupWidth = chartWidth / chartData.length;

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

        <Text style={styles.headerTitle}>Analytics</Text>

        <TouchableOpacity style={styles.headerRightBtn} activeOpacity={0.7}>
          <Feather name="download" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ── OVERVIEW STATS ───────────────────── */}
        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Feather name="trending-up" size={20} color={COLORS.primary} />
            <Text style={styles.overviewValue}>LKR 2.4M</Text>
            <Text style={styles.overviewLabel}>Total Lent</Text>
            <Text style={styles.overviewChange}>+12% this month</Text>
          </View>
          <View style={styles.overviewCard}>
            <Feather name="dollar-sign" size={20} color={COLORS.success} />
            <Text style={[styles.overviewValue, { color: COLORS.success }]}>
              LKR 1.8M
            </Text>
            <Text style={styles.overviewLabel}>Collected</Text>
            <Text style={styles.overviewChange}>+8% this month</Text>
          </View>
        </View>

        {/* ── BAR CHART ────────────────────────── */}
        <View style={styles.chartCard}>

          {/* Chart header */}
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Monthly Overview</Text>

            {/* Period filter */}
            <View style={styles.periodRow}>
              {(['3M', '6M', '1Y'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    period === p && styles.periodBtnActive,
                  ]}
                  onPress={() => setPeriod(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.periodText,
                    period === p && styles.periodTextActive,
                  ]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.legendText}>Disbursed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.legendText}>Collected</Text>
            </View>
          </View>

          {/* Chart bars */}
          <View style={styles.chart}>

            {/* Y axis labels */}
            <View style={styles.yAxis}>
              {[100, 75, 50, 25, 0].map((val) => (
                <Text key={val} style={styles.yLabel}>
                  {val}K
                </Text>
              ))}
            </View>

            {/* Bar groups */}
            <View style={styles.barGroups}>
              {chartData.map((item, index) => (
                <View key={index} style={[
                  styles.barGroup,
                  { width: barGroupWidth }
                ]}>

                  {/* Both bars side by side */}
                  <View style={styles.barPair}>

                    {/* Disbursed bar — blue */}
                    <View style={styles.barWrap}>
                      <View style={[
                        styles.bar,
                        {
                          height: getBarHeight(item.disbursed),
                          backgroundColor: COLORS.primary,
                        }
                      ]} />
                    </View>

                    {/* Collected bar — green */}
                    <View style={styles.barWrap}>
                      <View style={[
                        styles.bar,
                        {
                          height: getBarHeight(item.collected),
                          backgroundColor: COLORS.success,
                        }
                      ]} />
                    </View>

                  </View>

                  {/* Month label */}
                  <Text style={styles.barLabel}>{item.month}</Text>

                </View>
              ))}
            </View>

          </View>

        </View>

        {/* ── LOAN TYPE DISTRIBUTION ───────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Loan Distribution</Text>

          {LOAN_TYPES.map((type) => (
            <View key={type.type} style={styles.distRow}>

              {/* Color dot + type name */}
              <View style={styles.distLeft}>
                <View style={[
                  styles.distDot,
                  { backgroundColor: type.color }
                ]} />
                <Text style={styles.distType}>{type.type}</Text>
              </View>

              {/* Progress bar */}
              <View style={styles.distBarWrap}>
                <View style={styles.distBarBg}>
                  <View style={[
                    styles.distBarFill,
                    {
                      width: `${type.value}%`,
                      backgroundColor: type.color,
                    }
                  ]} />
                </View>
                <Text style={[
                  styles.distPct,
                  { color: type.color }
                ]}>
                  {type.value}%
                </Text>
              </View>

              {/* Amount */}
              <Text style={styles.distAmount}>{type.amount}</Text>

            </View>
          ))}

        </View>

        {/* ── PERFORMANCE METRICS ──────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Performance Metrics</Text>

          <View style={styles.metricsGrid}>
            {METRICS.map((metric, index) => (
              <View key={index} style={styles.metricCard}>

                {/* Value */}
                <Text style={[
                  styles.metricValue,
                  { color: metric.color }
                ]}>
                  {metric.value}
                </Text>

                {/* Label */}
                <Text style={styles.metricLabel}>{metric.label}</Text>

                {/* Change indicator */}
                <View style={styles.metricChange}>
                  <Feather
                    name={metric.up ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={metric.up ? COLORS.success : COLORS.danger}
                  />
                  <Text style={[
                    styles.metricChangeText,
                    { color: metric.up ? COLORS.success : COLORS.danger }
                  ]}>
                    {metric.change}
                  </Text>
                </View>

              </View>
            ))}
          </View>

        </View>

        {/* ── TOP PERFORMING OFFERS ────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Performing Offers</Text>

          {TOP_OFFERS.map((offer) => (
            <View key={offer.rank} style={styles.offerRow}>

              {/* Rank badge */}
              <View style={[
                styles.rankBadge,
                { backgroundColor: offer.rank === 1 ? '#FFFBEB' : COLORS.background }
              ]}>
                <Text style={[
                  styles.rankText,
                  { color: offer.rank === 1 ? '#92400E' : COLORS.textSecondary }
                ]}>
                  #{offer.rank}
                </Text>
              </View>

              {/* Offer name */}
              <View style={styles.offerInfo}>
                <Text style={styles.offerName}>{offer.name}</Text>
                <Text style={styles.offerCollections}>
                  {offer.collections} collected
                </Text>
              </View>

              {/* Collection rate */}
              <View style={[
                styles.rateChip,
                { backgroundColor: offer.color + '20' }
              ]}>
                <Text style={[
                  styles.rateText,
                  { color: offer.color }
                ]}>
                  {offer.rate}
                </Text>
              </View>

            </View>
          ))}

        </View>

        {/* ── MONTHLY GROWTH ───────────────────── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Month over Month Growth</Text>

          {[
            { label: 'New Loans Disbursed', value: '+12%', up: true  },
            { label: 'Total Collections',   value: '+8%',  up: true  },
            { label: 'New Borrowers',        value: '+4',   up: true  },
            { label: 'Default Rate',         value: '-0.5%',up: true  },
            { label: 'Avg Loan Size',        value: '+8.1%',up: true  },
          ].map((item, index) => (
            <View key={index} style={styles.growthRow}>
              <Text style={styles.growthLabel}>{item.label}</Text>
              <View style={styles.growthRight}>
                <Feather
                  name={item.up ? 'arrow-up-right' : 'arrow-down-right'}
                  size={14}
                  color={item.up ? COLORS.success : COLORS.danger}
                />
                <Text style={[
                  styles.growthValue,
                  { color: item.up ? COLORS.success : COLORS.danger }
                ]}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}

        </View>

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
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Overview cards
  overviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  overviewChange: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '500',
  },

  // Chart card
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Period filter
  periodRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2,
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Chart
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
  },
  yAxis: {
    justifyContent: 'space-between',
    height: 140,
    marginRight: 8,
    paddingBottom: 20,
  },
  yLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'right',
    width: 28,
  },
  barGroups: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
  },
  barGroup: {
    alignItems: 'center',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 130,
    gap: 3,
  },
  barWrap: {
    justifyContent: 'flex-end',
    height: 120,
  },
  bar: {
    width: 10,
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Section card
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
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

  // Loan distribution
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  distLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 90,
  },
  distDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distType: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  distBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBarFill: {
    height: 8,
    borderRadius: 4,
  },
  distPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 32,
  },
  distAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    width: 70,
    textAlign: 'right',
  },

  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Top offers
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offerCollections: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  rateText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Growth
  growthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  growthLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  growthRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
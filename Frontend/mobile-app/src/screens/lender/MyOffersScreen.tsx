import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
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
const INITIAL_OFFERS = [
  {
    id: '1',
    title: 'Quick Personal Loan',
    type: 'Personal',
    rate: '12',
    min: '10,000',
    max: '100,000',
    applications: 8,
    active: true,
  },
  {
    id: '2',
    title: 'SME Business Boost',
    type: 'Business',
    rate: '15',
    min: '50,000',
    max: '500,000',
    applications: 3,
    active: true,
  },
  {
    id: '3',
    title: 'Education Finance',
    type: 'Education',
    rate: '9',
    min: '5,000',
    max: '200,000',
    applications: 12,
    active: false,
  },
  {
    id: '4',
    title: 'Vehicle Loan',
    type: 'Vehicle',
    rate: '14',
    min: '20,000',
    max: '300,000',
    applications: 5,
    active: true,
  },
];

// ── Filter tabs ──────────────────────────────────────
const FILTERS = [
  { id: 'all',      label: 'All'      },
  { id: 'active',   label: 'Active'   },
  { id: 'inactive', label: 'Inactive' },
];

// ── Loan type icon helper ────────────────────────────
const getTypeIcon = (type: string) => {
  if (type === 'Personal')  return 'user';
  if (type === 'Business')  return 'briefcase';
  if (type === 'Education') return 'book';
  if (type === 'Vehicle')   return 'truck';
  return 'tag';
};

const getTypeColor = (type: string) => {
  if (type === 'Personal')  return COLORS.primary;
  if (type === 'Business')  return COLORS.success;
  if (type === 'Education') return COLORS.warning;
  if (type === 'Vehicle')   return '#8B5CF6';
  return COLORS.textSecondary;
};

const getTypeBg = (type: string) => {
  if (type === 'Personal')  return '#EBF4FF';
  if (type === 'Business')  return '#ECFDF5';
  if (type === 'Education') return '#FFFBEB';
  if (type === 'Vehicle')   return '#F5F3FF';
  return COLORS.border;
};

// ── Main Component ────────────────────────────────────
export default function MyOffersScreen({ navigation }: any) {

  // ── State ────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState('all');

  // offers stored in state so we can toggle active/inactive
  const [offers, setOffers] = useState(INITIAL_OFFERS);

  // ── Toggle offer active/inactive ────────────────
  // Find the offer by id and flip its active value
  const toggleOffer = (id: string) => {
    setOffers((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, active: !o.active } : o
      )
    );
  };

  // ── Filter offers ────────────────────────────────
  const filtered = offers.filter((o) => {
    if (activeFilter === 'active')   return o.active === true;
    if (activeFilter === 'inactive') return o.active === false;
    return true; // 'all'
  });

  // Count active offers for summary
  const activeCount   = offers.filter((o) => o.active).length;
  const inactiveCount = offers.filter((o) => !o.active).length;

  // ── Render each offer card ───────────────────────
  const renderItem = ({ item }: any) => (
    <View style={styles.card}>

      {/* ── TOP ROW — icon + title + active toggle ── */}
      <View style={styles.cardTop}>

        {/* Type icon */}
        <View style={[styles.typeIcon, { backgroundColor: getTypeBg(item.type) }]}>
          <Feather
            name={getTypeIcon(item.type) as any}
            size={18}
            color={getTypeColor(item.type)}
          />
        </View>

        {/* Title and type */}
        <View style={styles.titleBlock}>
          <Text style={styles.offerTitle}>{item.title}</Text>
          <Text style={styles.offerType}>{item.type}</Text>
        </View>

        {/* Active toggle switch */}
        <Switch
          value={item.active}
          onValueChange={() => toggleOffer(item.id)}
          trackColor={{
            false: COLORS.border,
            true: COLORS.primary,
          }}
          thumbColor="#fff"
        />
      </View>

      {/* ── MIDDLE ROW — rate + amount range ────── */}
      <View style={styles.metaRow}>

        <View style={styles.metaItem}>
          <Feather name="percent" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.rate}% p.a.</Text>
        </View>

        <View style={styles.metaDot} />

        <View style={styles.metaItem}>
          <Feather name="dollar-sign" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>
            LKR {item.min} – {item.max}
          </Text>
        </View>

      </View>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* ── BOTTOM ROW — applications + buttons ─── */}
      <View style={styles.cardBottom}>

        {/* Applications count */}
        <TouchableOpacity
          style={styles.appsCount}
          onPress={() => navigation.navigate('ApplicationsReceived')}
          activeOpacity={0.7}
        >
          <Feather name="inbox" size={14} color={COLORS.primary} />
          <Text style={styles.appsText}>
            {item.applications} applications
          </Text>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actionBtns}>

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditOffer', { offer: item })}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={14} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          {/* Status badge */}
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.active ? '#ECFDF5' : '#F3F4F6' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.active ? COLORS.success : COLORS.textSecondary }
            ]}>
              {item.active ? 'Active' : 'Inactive'}
            </Text>
          </View>

        </View>
      </View>

    </View>
  );

  // ── List header ──────────────────────────────────
  const ListHeader = () => (
    <View>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{offers.length}</Text>
          <Text style={styles.summaryLabel}>Total Offers</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>
            {activeCount}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.textSecondary }]}>
            {inactiveCount}
          </Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
      </View>

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
        <Text style={styles.sectionTitle}>
          {activeFilter === 'all'
            ? 'All Offers'
            : activeFilter === 'active'
            ? 'Active Offers'
            : 'Inactive Offers'}
        </Text>
        <Text style={styles.sectionCount}>{filtered.length} offers</Text>
      </View>

    </View>
  );

  // ── Empty state ──────────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="file-text" size={48} color={COLORS.border} />
      <Text style={styles.emptyTitle}>No offers found</Text>
      <Text style={styles.emptySub}>
        {activeFilter === 'inactive'
          ? 'No inactive offers'
          : 'Create your first loan offer'}
      </Text>
      {activeFilter !== 'inactive' && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateLoanOffer')}
          activeOpacity={0.85}
        >
          <Text style={styles.createBtnText}>+ Create Offer</Text>
        </TouchableOpacity>
      )}
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

        <Text style={styles.headerTitle}>My Offers</Text>

        {/* New offer button */}
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('CreateLoanOffer')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color="#fff" />
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
  newBtn: {
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
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

  // Offer card
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
    marginBottom: 12,
  },
  typeIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleBlock: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  offerType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
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
    alignItems: 'center',
  },
  appsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appsText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  createBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
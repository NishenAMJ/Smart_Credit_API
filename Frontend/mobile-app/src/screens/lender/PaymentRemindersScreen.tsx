import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
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
const REMINDERS = [
  { id: '1', name: 'Amal Bandara',    amount: '8,500',  days: 5,  phone: '+94 77 123 4567', sent: false },
  { id: '2', name: 'Sunil Fernando',  amount: '12,000', days: 12, phone: '+94 71 234 5678', sent: false },
  { id: '3', name: 'Ravi Kumar',      amount: '5,000',  days: 3,  phone: '+94 76 987 6543', sent: false },
  { id: '4', name: 'Priya Dias',      amount: '15,000', days: 8,  phone: '+94 70 456 7890', sent: false },
  { id: '5', name: 'Kasun Bandara',   amount: '9,000',  days: 1,  phone: '+94 77 654 3210', sent: false },
];

const FILTERS = [
  { id: 'all',     label: 'All'     },
  { id: 'pending', label: 'Pending' },
  { id: 'sent',    label: 'Sent'    },
];

// ── Main Component ────────────────────────────────────
export default function PaymentRemindersScreen({ navigation }: any) {

  // ── State ────────────────────────────────────────
  // Tracks which reminder IDs have been sent
  const [sentIds, setSentIds]       = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');

  // ── Logic ────────────────────────────────────────

  // Send reminder for one borrower
  const sendReminder = (id: string) => {
    setSentIds((prev) => [...prev, id]);
  };

  // Send all reminders at once
  const sendAll = () => {
    Alert.alert(
      'Send All Reminders',
      `Send reminders to all ${REMINDERS.length} overdue borrowers?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send All',
          onPress: () => setSentIds(REMINDERS.map((r) => r.id)),
        },
      ]
    );
  };

  // Badge color based on days overdue
  // more than 7 days = red (danger), less = yellow (warning)
  const getDaysColor = (days: number) => {
    if (days > 7) return COLORS.danger;
    return COLORS.warning;
  };

  const getDaysBg = (days: number) => {
    if (days > 7) return '#FEF2F2';
    return '#FFFBEB';
  };

  // Filter list based on active tab
  const filtered = REMINDERS.filter((r) => {
    if (activeFilter === 'sent')    return sentIds.includes(r.id);
    if (activeFilter === 'pending') return !sentIds.includes(r.id);
    return true; // 'all'
  });

  // Count how many still pending
  const pendingCount = REMINDERS.filter((r) => !sentIds.includes(r.id)).length;

  // ── Render each reminder card ─────────────────
  const renderItem = ({ item }: any) => {
    const isSent = sentIds.includes(item.id);

    return (
      <View style={styles.card}>

        {/* TOP ROW — avatar + name + days overdue */}
        <View style={styles.cardTop}>

          {/* Avatar with first letter */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>

          {/* Name and phone */}
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
          </View>

          {/* Days overdue badge */}
          <View style={[
            styles.daysBadge,
            { backgroundColor: getDaysBg(item.days) }
          ]}>
            <Text style={[
              styles.daysText,
              { color: getDaysColor(item.days) }
            ]}>
              {item.days}d overdue
            </Text>
          </View>

        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* BOTTOM ROW — amount + buttons */}
        <View style={styles.cardBottom}>

          {/* Outstanding amount */}
          <View>
            <Text style={styles.amountLabel}>Outstanding</Text>
            <Text style={styles.amount}>LKR {item.amount}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>

            {/* Send Reminder button — changes after sent */}
            <TouchableOpacity
              style={[
                styles.reminderBtn,
                isSent && styles.reminderBtnSent,
              ]}
              onPress={() => sendReminder(item.id)}
              disabled={isSent}
              activeOpacity={0.8}
            >
              <Feather
                name={isSent ? 'check' : 'bell'}
                size={14}
                color={isSent ? COLORS.success : COLORS.primary}
              />
              <Text style={[
                styles.reminderBtnText,
                isSent && styles.reminderBtnTextSent,
              ]}>
                {isSent ? 'Sent' : 'Remind'}
              </Text>
            </TouchableOpacity>

            {/* Legal action button */}
            <TouchableOpacity
              style={styles.legalBtn}
              onPress={() => navigation.navigate('LegalActions', { borrower: item })}
              activeOpacity={0.8}
            >
              <Feather name="shield" size={14} color={COLORS.danger} />
              <Text style={styles.legalBtnText}>Legal</Text>
            </TouchableOpacity>

          </View>
        </View>

      </View>
    );
  };

  // ── List header ──────────────────────────────
  const ListHeader = () => (
    <View>

      {/* Alert summary card */}
      {pendingCount > 0 ? (
        <View style={styles.alertCard}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIconWrap}>
              <Feather name="alert-circle" size={20} color={COLORS.warning} />
            </View>
            <View>
              <Text style={styles.alertTitle}>
                {pendingCount} Pending Reminders
              </Text>
              <Text style={styles.alertSub}>
                Borrowers haven't received a reminder yet
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.allSentCard}>
          <Feather name="check-circle" size={20} color={COLORS.success} />
          <Text style={styles.allSentText}>
            All reminders sent!
          </Text>
        </View>
      )}

      {/* Send All button */}
      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.sendAllBtn}
          onPress={sendAll}
          activeOpacity={0.85}
        >
          <Feather name="send" size={16} color="#fff" />
          <Text style={styles.sendAllText}>
            Send All Reminders ({pendingCount})
          </Text>
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
        <Text style={styles.sectionTitle}>Overdue Borrowers</Text>
        <Text style={styles.sectionCount}>{filtered.length} borrowers</Text>
      </View>

    </View>
  );

  // ── Empty state ──────────────────────────────
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="check-circle" size={48} color={COLORS.success} />
      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptySub}>No reminders in this category</Text>
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

        <Text style={styles.headerTitle}>Payment Reminders</Text>

        {/* Placeholder to balance header layout */}
        <View style={{ width: 36 }} />
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

  // Alert card
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
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
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
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

  // All sent card
  allSentCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  allSentText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.success,
  },

  // Send all button
  sendAllBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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

  // Card
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
  phone: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  daysBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  daysText: {
    fontSize: 11,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.danger,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Remind button
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  reminderBtnSent: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.success,
  },
  reminderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  reminderBtnTextSent: {
    color: COLORS.success,
  },

  // Legal button
  legalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  legalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // List content
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
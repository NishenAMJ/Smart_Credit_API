// src/screens/lender/MyBorrowersScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { DashboardService } from '../../services/lender.service';

// ── Helper Functions ──────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 750) return COLORS.success;
  if (score >= 650) return COLORS.warning;
  return COLORS.danger || '#EF4444';
};

// ── Main Component ──────────────────────────────────
export default function MyBorrowersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [allBorrowers, setAllBorrowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await DashboardService.getBorrowers(20);
        setAllBorrowers(data?.borrowers ?? []);
      } catch {
        setAllBorrowers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = allBorrowers.filter((b) =>
    (b.borrowerName ?? b.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const renderCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BorrowerDetail', { borrower: item })} // Changed to better screen name
      activeOpacity={0.8}
    >
      <View style={commonStyles.rowSpaceBetween}>
        <View style={commonStyles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(item.borrowerName ?? item.name ?? '?')[0]}</Text>
          </View>
          <View>
            <Text style={commonStyles.textPrimary}>{item.borrowerName ?? item.name}</Text>
            <Text style={[styles.scoreText, { color: getScoreColor(item.creditScore ?? item.score ?? 0) }]}>
              Score: {item.creditScore ?? item.score ?? '--'} • ★{item.rating ?? '--'}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
      </View>

      <View style={styles.divider} />

      <View style={commonStyles.rowSpaceBetween}>
        <View>
          <Text style={styles.cardLabel}>Active Loans</Text>
          <Text style={commonStyles.textPrimary}>{item.activeLoans ?? item.loans ?? '--'}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardLabel}>Total Borrowed</Text>
          <Text style={commonStyles.textPrimary}>{item.totalBorrowed != null ? `${(item.totalBorrowed / 1000).toFixed(0)}K LKR` : (item.total ? `${item.total} LKR` : '--')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="My Borrowers" onBackPress={() => navigation.goBack()} />

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search borrowers..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Borrower Count */}
      <View style={styles.countRow}>
        <Text style={commonStyles.sectionTitle}>
          {filtered.length} Borrowers
        </Text>
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No borrowers found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────
const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonStyles.card.backgroundColor,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...commonStyles.shadowSmall,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingHorizontal: 8,
  },
  countRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: commonStyles.card.backgroundColor,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...commonStyles.shadowSmall,
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
  scoreText: {
    fontSize: 13,
    color: COLORS.success,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});
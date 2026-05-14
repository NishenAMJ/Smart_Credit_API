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
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { DashboardService } from '../../services/lender.service';

/**
 * Dashboard API returns borrowers with these fields:
 *   id, fullName, email, creditScore, kycStatus,
 *   loanCount, activeLoansCount, totalBorrowedAmount,
 *   outstandingAmount, latestLoanStatus, isActive, createdAt
 */

const getScoreColor = (score: number) => {
  if (score >= 750) return COLORS.success;
  if (score >= 650) return COLORS.warning;
  return COLORS.danger;
};

export default function MyBorrowersScreen({ navigation }: any) {
  const [search, setSearch]             = useState('');
  const [allBorrowers, setAllBorrowers] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await DashboardService.getBorrowers(50);
        // API can return { borrowers: [...] } or a raw array
        setAllBorrowers(data?.borrowers ?? (Array.isArray(data) ? data : []));
      } catch {
        setAllBorrowers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The API field for the borrower's name is 'fullName'
  const filtered = allBorrowers.filter((b) =>
    (b.fullName ?? b.borrowerName ?? b.name ?? '')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const renderCard = ({ item }: any) => {
    // Support both flat and nested field names for safety
    const name          = item.fullName ?? item.borrowerName ?? item.name ?? 'Unknown';
    const creditScore   = item.creditScore ?? item.score ?? 0;
    const activeLoans   = item.activeLoansCount ?? item.activeLoans ?? item.loans ?? 0;
    const totalBorrowed = item.totalBorrowedAmount ?? item.totalBorrowed ?? item.total ?? null;
    const loanCount     = item.loanCount ?? item.loans ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BorrowerDetail', { borrower: item })}
        activeOpacity={0.8}
      >
        <View style={commonStyles.rowSpaceBetween}>
          <View style={commonStyles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
            </View>
            <View>
              <Text style={commonStyles.textPrimary}>{name}</Text>
              <Text style={[styles.scoreText, { color: getScoreColor(creditScore) }]}>
                Score: {creditScore > 0 ? creditScore : '--'}
                {item.rating != null ? ` • ★${item.rating}` : ''}
              </Text>
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
        </View>

        <View style={styles.divider} />

        <View style={commonStyles.rowSpaceBetween}>
          <View>
            <Text style={styles.cardLabel}>Total Loans</Text>
            <Text style={commonStyles.textPrimary}>{loanCount}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>Active</Text>
            <Text style={commonStyles.textPrimary}>{activeLoans}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardLabel}>Total Borrowed</Text>
            <Text style={commonStyles.textPrimary}>
              {totalBorrowed != null
                ? `LKR ${(totalBorrowed / 1000).toFixed(0)}K`
                : '--'}
            </Text>
          </View>
        </View>

        {/* KYC & status badges */}
        <View style={[commonStyles.row, { marginTop: 10, gap: 8 }]}>
          {item.kycStatus && (
            <View style={[styles.badge, {
              backgroundColor: item.kycStatus === 'approved' ? '#ECFDF5' : '#FEF2F2',
            }]}>
              <Text style={[styles.badgeText, {
                color: item.kycStatus === 'approved' ? COLORS.success : COLORS.danger,
              }]}>
                KYC {item.kycStatus}
              </Text>
            </View>
          )}
          {item.latestLoanStatus && (
            <View style={[styles.badge, { backgroundColor: '#EBF4FF' }]}>
              <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                {item.latestLoanStatus}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="My Borrowers" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="My Borrowers" onBackPress={() => navigation.goBack()} />

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search borrowers..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.countRow}>
        <Text style={commonStyles.sectionTitle}>{filtered.length} Borrowers</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id ?? item.borrowerId ?? Math.random().toString()}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={COLORS.border} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>
              {search ? 'No borrowers match your search' : 'No borrowers yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
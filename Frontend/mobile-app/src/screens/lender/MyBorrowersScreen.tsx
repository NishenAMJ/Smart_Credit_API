import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';

// ── Sample Data ──────────────────────────────────────
const BORROWERS = [
  { id: '1', name: 'Kasun Silva', score: 820, rating: 4.5, loans: 3, total: '250,000' },
  { id: '2', name: 'Nimal Perera', score: 750, rating: 4.2, loans: 2, total: '150,000' },
  { id: '3', name: 'Priya Dias', score: 690, rating: 4.0, loans: 1, total: '80,000' },
  { id: '4', name: 'Amal Bandara', score: 780, rating: 4.3, loans: 2, total: '200,000' },
  { id: '5', name: 'Sunil Fernando', score: 710, rating: 4.1, loans: 3, total: '175,000' },
];

// ── Helper Functions ────────────────────────────────
const getScoreColor = (score: number) => {
  if (score >= 750) return COLORS.success;
  if (score >= 650) return COLORS.warning;
  return COLORS.danger;
};

// ── Main Component ──────────────────────────────────
export default function MyBorrowersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');

  const filtered = BORROWERS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderCard = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MyBorrowers', { borrower: item })} activeOpacity={0.8}>
      <View style={commonStyles.rowSpaceBetween}>
        <View style={commonStyles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]}</Text>
          </View>
          <View>
            <Text style={commonStyles.textPrimary}>{item.name}</Text>
            <Text style={[styles.scoreText]}>Score: {item.score} ★{item.rating}</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
      </View>

      <View style={styles.divider} />

      <View style={commonStyles.rowSpaceBetween}>
        <View>
          <Text style={styles.cardLabel}>Active Loans</Text>
          <Text style={commonStyles.textPrimary}>{item.loans}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardLabel}>Total Borrowed</Text>
          <Text style={commonStyles.textPrimary}>{item.total} LKR</Text>
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

      {/* Borrower count */}
      <View style={styles.countRow}>
        <Text style={commonStyles.sectionTitle}>{filtered.length} Borrowers</Text>
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
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
});
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const COLORS = {
  primary: '#007AFF',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  border: '#F3F4F6',
  success: '#10B981',
  warning: '#F59E0B',
};

const BORROWERS = [
  { id: '1', name: 'Kasun Silva',   score: 820, rating: 4.5, loans: 3, total: '250,000' },
  { id: '2', name: 'Nimal Perera',  score: 750, rating: 4.2, loans: 2, total: '150,000' },
  { id: '3', name: 'Priya Dias',    score: 690, rating: 4.0, loans: 1, total: '80,000'  },
  { id: '4', name: 'Amal Bandara',  score: 780, rating: 4.3, loans: 2, total: '200,000' },
  { id: '5', name: 'Sunil Fernando',score: 710, rating: 4.1, loans: 3, total: '175,000' },
];

export default function MyBorrowersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');

  const filtered = BORROWERS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderCard = ({ item }: any) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>

      {/* TOP ROW */}
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <View style={styles.nameBlock}>
          <Text style={styles.borrowerName}>{item.name}</Text>
          <Text style={styles.scoreText}>
            Score: {item.score}  ★{item.rating}
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* BOTTOM ROW */}
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.cardLabel}>Active Loans</Text>
          <Text style={styles.cardValue}>{item.loans}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardLabel}>Total Borrowed</Text>
          <Text style={styles.cardValue}>{item.total} LKR</Text>
        </View>
      </View>

    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* BLUE HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Borrowers</Text>
        <Text style={styles.headerSubtitle}>
          {filtered.length} active borrowers
        </Text>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search borrowers..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F0FE',
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
  borrowerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scoreText: {
    fontSize: 13,
    color: COLORS.success,
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
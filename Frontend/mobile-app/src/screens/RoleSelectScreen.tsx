import React from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';

export default function RoleSelectScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <Text style={styles.title}>Smart Credit</Text>
        <Text style={styles.subtitle}>Who are you?</Text>

        <TouchableOpacity
          style={[styles.card, { borderColor: '#007AFF' }]}
          onPress={() => navigation.navigate('LenderRoot')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>🏦</Text>
          <Text style={styles.cardTitle}>I am a Lender</Text>
          <Text style={styles.cardSub}>Manage loans, borrowers & collections</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, { borderColor: '#10B981' }]}
          onPress={() => navigation.navigate('BorrowerRoot')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>I am a Borrower</Text>
          <Text style={styles.cardSub}>Find loans, apply & manage payments</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#F5F6FA' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title:     { fontSize: 32, fontWeight: '700', color: '#007AFF', textAlign: 'center', marginBottom: 8 },
  subtitle:  { fontSize: 18, color: '#6B7280', textAlign: 'center', marginBottom: 48 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon:  { fontSize: 48, marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  cardSub:   { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
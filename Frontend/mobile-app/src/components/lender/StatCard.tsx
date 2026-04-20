import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/lender.styles';

interface StatCardProps {
  icon: string;
  color: string;
  value: string;
  label: string;
}

export default function StatCard({ icon, color, value, label }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Feather name={icon as any} size={26} color={color} />
      <Text style={[styles.value, { color: COLORS.textPrimary }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  value: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },

  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

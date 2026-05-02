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
      <View style={styles.iconContainer}>
        <Feather name={icon as any} size={20} color={color} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: COLORS.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },

  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  value: {
    fontSize: 26,
    fontWeight: '700',
  },

  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

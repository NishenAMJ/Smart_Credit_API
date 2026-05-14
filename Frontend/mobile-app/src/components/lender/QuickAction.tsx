import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/lender.styles';

interface QuickActionProps {
  icon: string;
  backgroundColor: string;
  iconColor: string;
  label: string;
  onPress: () => void;
}

export default function QuickAction({
  icon,
  backgroundColor,
  iconColor,
  label,
  onPress,
}: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.icon, { backgroundColor }]}>
        <Feather name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    gap: 8,
  },

  icon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});

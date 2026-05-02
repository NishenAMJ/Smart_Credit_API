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
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    marginHorizontal: 4,
  },

  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  label: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
});

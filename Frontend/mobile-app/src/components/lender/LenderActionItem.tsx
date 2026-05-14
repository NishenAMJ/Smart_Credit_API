import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/lender.styles';

interface LenderActionItemProps {
  icon: string;
  iconColor: string;
  label: string;
  onPress: () => void;
  isFirst?: boolean;
}

export default function LenderActionItem({
  icon,
  iconColor,
  label,
  onPress,
  isFirst,
}: LenderActionItemProps) {
  return (
    <TouchableOpacity
      style={[styles.item, isFirst && { borderTopWidth: 1, borderTopColor: COLORS.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
        <Feather name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});

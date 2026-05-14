import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
 
const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#EAF3DE', text: '#3B6D11' },
  { bg: '#FAECE7', text: '#993C1D' },
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#FAEEDA', text: '#854F0B' },
];
 
function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % AVATAR_COLORS.length;
}
 
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
 
interface Props {
  name: string;
  avatarUrl?: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}
 
export default function Avatar({
  name,
  avatarUrl,
  size = 46,
  showOnline = false,
  isOnline = false,
}: Props) {
  const colorSet = AVATAR_COLORS[getColorIndex(name)];
  const fontSize = size * 0.33;
 
  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colorSet.bg,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize, color: colorSet.text }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
 
      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: isOnline ? COLORS.success : COLORS.textSecondary,
              width: size * 0.26,
              height: size * 0.26,
              borderRadius: size * 0.13,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
});
 
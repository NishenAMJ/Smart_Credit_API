// REFACTORED EXAMPLE - Much Shorter!
import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, LenderActionItem } from '../../components/lender';

const PROFILE_ACTIONS = [
  { icon: 'user', label: 'Edit Profile', color: COLORS.primary },
  { icon: 'lock', label: 'Change Password', color: '#8B5CF6' },
  { icon: 'bell', label: 'Notifications', color: COLORS.warning },
  { icon: 'credit-card', label: 'Payment Methods', color: COLORS.success },
  { icon: 'log-out', label: 'Logout', color: COLORS.danger },
];

export default function LenderProfileScreen({ navigation }: any) {
  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Profile" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={commonStyles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>R</Text>
          </View>
          <Text style={styles.name}>Ranil Perera</Text>
          <Text style={styles.email}>ranil@smartcredit.lk</Text>
          <Text style={styles.member}>Member since Jan 2024</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>LKR 2.4M</Text>
            <Text style={styles.statLabel}>Total Lent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Active Loans</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>98%</Text>
            <Text style={styles.statLabel}>Recovery Rate</Text>
          </View>
        </View>

        {/* Actions */}
        <Text style={commonStyles.sectionTitle}>Account Settings</Text>
        <View style={styles.actionsList}>
          {PROFILE_ACTIONS.map((action, idx) => (
            <LenderActionItem
              key={action.label}
              icon={action.icon}
              iconColor={action.color}
              label={action.label}
              onPress={() => {
                // Handle navigation based on action
              }}
              isFirst={idx === 0}
            />
          ))}
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },

  name: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },

  email: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  member: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  statItem: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  actionsList: {
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 12,
  },
});

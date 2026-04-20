import React from 'react';
import { ScrollView, View, TouchableOpacity, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, LenderActionItem } from '../../components/lender';

// ── Profile Data ────────────────────────────────────────
const PROFILE_DATA = {
  name: 'Ranil Perera',
  email: 'ranil.perera@smartcredit.com',
  phone: '+94 71 234 5678',
  registrationDate: 'Jan 15, 2023',
  accountStatus: 'Active & Verified',
  totalLoaned: 'LKR 2,400,000',
  totalReturned: 'LKR 1,800,000',
};

const PROFILE_SETTINGS = [
  { icon: 'edit-3', label: 'Edit Profile', screen: 'EditProfile' },
  { icon: 'lock', label: 'Password & Security', screen: 'SecuritySettings' },
  { icon: 'bell', label: 'Notifications', screen: 'NotificationSettings' },
  { icon: 'file-text', label: 'Terms & Conditions', screen: 'TermsConditions' },
  { icon: 'help-circle', label: 'Help & Support', screen: 'Support' },
  { icon: 'log-out', label: 'Logout', action: 'logout' },
];

// ── Main Component ──────────────────────────────────────
export default function LenderProfileScreen({ navigation }: any) {
  const handleLogout = () => {
    // TODO: Implement logout logic
    alert('Logout functionality to be implemented');
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LenderHeader title="My Profile" onBackPress={() => navigation.goBack()} />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{PROFILE_DATA.name[0]}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[commonStyles.headerName, { marginTop: 16 }]}>
            {PROFILE_DATA.name}
          </Text>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{PROFILE_DATA.accountStatus}</Text>
          </View>

          {/* Contact Info */}
          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{PROFILE_DATA.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{PROFILE_DATA.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>Joined {PROFILE_DATA.registrationDate}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <Text style={commonStyles.sectionTitle}>Account Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Loaned</Text>
            <Text style={styles.statValue}>{PROFILE_DATA.totalLoaned}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Returned</Text>
            <Text style={styles.statValue}>{PROFILE_DATA.totalReturned}</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={commonStyles.sectionTitle}>Settings & Options</Text>
        <View style={styles.settingsList}>
          {PROFILE_SETTINGS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => (item.action === 'logout' ? handleLogout() : navigation.navigate(item.screen))}
              activeOpacity={0.7}
            >
              <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
                <View style={commonStyles.row}>
                  <View style={styles.settingIcon}>
                    <Feather name={item.icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={commonStyles.textPrimary}>{item.label}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 16,
    marginVertical: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    ...commonStyles.shadowSmall,
  },

  avatarContainer: {
    position: 'relative',
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },

  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },

  infoRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  statsGrid: {
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  statBox: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: 'center',
    ...commonStyles.shadowSmall,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  settingsList: {
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: commonStyles.card.backgroundColor,
  },

  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
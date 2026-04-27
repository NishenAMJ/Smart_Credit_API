import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader, LenderActionItem } from '../../components/lender';

// ── Profile Data ──────────────────────────────────────────
const PROFILE_DATA = {
  name:             'Ranil Perera',
  email:            'ranil.perera@smartcredit.com',
  phone:            '+94 71 234 5678',
  registrationDate: 'Jan 15, 2023',
  accountStatus:    'Active & Verified',
  totalLoaned:      'LKR 2,400,000',
  totalReturned:    'LKR 1,800,000',
};

// ── Settings menu ─────────────────────────────────────────
const PROFILE_SETTINGS = [
  { icon: 'edit-3',     label: 'Edit Profile',          screen: 'EditProfile'           },
  { icon: 'lock',       label: 'Password & Security',   screen: 'SecuritySettings'      },
  { icon: 'bell',       label: 'Notifications',          screen: 'NotificationSettings'  },
  { icon: 'file-text',  label: 'Terms & Conditions',    screen: 'TermsConditions'        },
  { icon: 'help-circle',label: 'Help & Support',         screen: 'Support'               },
  { icon: 'log-out',    label: 'Logout',                 action: 'logout'                },
];

// ── Ad menu items ─────────────────────────────────────────
const AD_MENU = [
  {
    icon:  'radio',
    label: 'My Advertisements',
    screen:'MyAds',
    color: '#8B5CF6',
    bg:    '#F5F3FF',
  },
  {
    icon:  'plus-square',
    label: 'Create New Ad',
    screen:'CreateAd',
    color: COLORS.primary,
    bg:    '#EBF4FF',
  },
  {
    icon:  'bar-chart-2',
    label: 'Ad Analytics',
    screen:'AdSummaryAnalytics',
    color: COLORS.success,
    bg:    '#ECFDF5',
  },
];

// ── Main Component ────────────────────────────────────────
export default function LenderProfileScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState(true);
  const [autoReminders, setAutoReminders] = useState(false);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          // TODO: implement logout
        },
      },
    ]);
  };

  const handleSettingPress = (item: any) => {
    if (item.action === 'logout') {
      handleLogout();
      return;
    }
    navigation.navigate(item.screen);
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ──────────────────────────────── */}
        <LenderHeader
          title="My Profile"
          onBackPress={() => navigation.goBack()}
        />

        {/* ── PROFILE CARD ────────────────────────── */}
        <View style={styles.profileCard}>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {PROFILE_DATA.name[0]}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[commonStyles.headerName, styles.profileName]}>
            {PROFILE_DATA.name}
          </Text>

          {/* Status Badge */}
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {PROFILE_DATA.accountStatus}
            </Text>
          </View>

          {/* Contact info */}
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
            <Text style={styles.infoText}>
              Joined {PROFILE_DATA.registrationDate}
            </Text>
          </View>
        </View>

        {/* ── ACCOUNT STATS ───────────────────────── */}
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

        {/* ── ADVERTISEMENT SECTION ───────────────── */}
        <Text style={commonStyles.sectionTitle}>Advertisements</Text>
        <View style={styles.adMenuList}>
          {AD_MENU.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[
                commonStyles.rowSpaceBetween,
                styles.settingItem,
                idx === AD_MENU.length - 1 && styles.settingItemLast,
              ]}>
                <View style={commonStyles.row}>
                  <View style={[styles.settingIcon, { backgroundColor: item.bg }]}>
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={item.color}
                    />
                  </View>
                  <Text style={commonStyles.textPrimary}>{item.label}</Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── QUICK SETTINGS TOGGLES ──────────────── */}
        <Text style={commonStyles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsList}>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#EBF4FF' }]}>
                <Feather name="bell" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>
                  Push Notifications
                </Text>
                <Text style={commonStyles.textSecondary}>
                  Get notified about payments
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
              thumbColor="#fff"
            />
          </View>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem, styles.settingItemLast]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="send" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>
                  Auto Reminders
                </Text>
                <Text style={commonStyles.textSecondary}>
                  Send automatic payment reminders
                </Text>
              </View>
            </View>
            <Switch
              value={autoReminders}
              onValueChange={setAutoReminders}
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
              thumbColor="#fff"
            />
          </View>

        </View>

        {/* ── SETTINGS & OPTIONS ──────────────────── */}
        <Text style={commonStyles.sectionTitle}>Settings & Options</Text>
        <View style={styles.settingsList}>
          {PROFILE_SETTINGS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSettingPress(item)}
              activeOpacity={0.7}
            >
              <View style={[
                commonStyles.rowSpaceBetween,
                styles.settingItem,
                idx === PROFILE_SETTINGS.length - 1 && styles.settingItemLast,
                item.action === 'logout' && styles.logoutItem,
              ]}>
                <View style={commonStyles.row}>
                  <View style={[
                    styles.settingIcon,
                    item.action === 'logout' && styles.logoutIcon,
                  ]}>
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={item.action === 'logout' ? COLORS.danger : COLORS.primary}
                    />
                  </View>
                  <Text style={[
                    commonStyles.textPrimary,
                    item.action === 'logout' && { color: COLORS.danger },
                  ]}>
                    {item.label}
                  </Text>
                </View>
                {item.action !== 'logout' && (
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── APP VERSION ─────────────────────────── */}
        <Text style={styles.version}>Smart Credit v1.0.0</Text>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
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
  profileName: {
    marginTop: 16,
    color: COLORS.textPrimary,
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

  // Stats
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

  // Ad menu
  adMenuList: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },

  // Settings list
  settingsList: {
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    ...commonStyles.shadowSmall,
  },
  settingItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutIcon: {
    backgroundColor: '#FEF2F2',
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
});
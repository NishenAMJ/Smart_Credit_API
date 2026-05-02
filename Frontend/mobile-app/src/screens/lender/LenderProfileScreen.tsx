import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Alert,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { commonStyles, COLORS } from '../../styles/lender.styles';
import { LenderHeader } from '../../components/lender';
import { LenderProfileService, UpdateProfilePayload } from '../../services/lender.service';
import { useAuth } from '../../context/AuthContext';
import { localDatabase } from '../../services/localDatabase';

// ── Settings menu ─────────────────────────────────────────
const PROFILE_SETTINGS = [
  { icon: 'file-text',   label: 'Terms & Conditions', screen: 'TermsConditions' },
  { icon: 'help-circle', label: 'Help & Support',      screen: 'Support'         },
  { icon: 'log-out',     label: 'Logout',               action: 'logout'          },
];

// ── Ad menu items ─────────────────────────────────────────
const AD_MENU = [
  { icon: 'radio',       label: 'My Advertisements', screen: 'MyAds',              color: '#8B5CF6',      bg: '#F5F3FF'  },
  { icon: 'plus-square', label: 'Create New Ad',      screen: 'CreateAd',           color: COLORS.primary, bg: '#EBF4FF'  },
  { icon: 'bar-chart-2', label: 'Ad Analytics',       screen: 'AdSummaryAnalytics', color: COLORS.success, bg: '#ECFDF5'  },
];

// ── Main Component ────────────────────────────────────────
export default function LenderProfileScreen({ navigation }: any) {

  // ── Remote profile state ─────────────────────────────
  const [profile,  setProfile]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  // ── Toggle states ────────────────────────────────────
  const [notifications, setNotifications] = useState(true);
  const [autoReminders, setAutoReminders] = useState(false);
  const [emailAlerts,   setEmailAlerts]   = useState(true);
  const [smsAlerts,     setSmsAlerts]     = useState(false);

  // ── Edit profile section ─────────────────────────────
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName,        setEditName]        = useState('');
  const [editEmail,       setEditEmail]       = useState('');
  const [editPhone,       setEditPhone]       = useState('');
  const [savingProfile,   setSavingProfile]   = useState(false);

  // ── Change password section ──────────────────────────
  const [passwordOpen,    setPasswordOpen]    = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [savingPassword,  setSavingPassword]  = useState(false);

  // ── Load profile ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await LenderProfileService.getProfile();
        setProfile(data);
        setEditName(data?.fullName ?? '');
        setEditEmail(data?.email   ?? '');
        setEditPhone(data?.phone   ?? '');
      } catch (err: any) {
        // Silent fail: profile renders with empty fields rather than blocking with an alert
        console.warn('Profile load failed:', err?.response?.data?.message ?? err?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Resolved display values ──────────────────────────
  const PROFILE_DATA = {
    name:             profile?.fullName || 'My Profile',
    email:            profile?.email    || '',
    phone:            profile?.phone    || '',
    registrationDate: profile?.createdAt
      ? new Date(profile.createdAt).toDateString()
      : '',
    accountStatus: profile?.status ?? 'Active & Verified',
    totalLoaned:   profile?.totalLoaned   != null
      ? `LKR ${Number(profile.totalLoaned).toLocaleString()}`   : 'LKR --',
    totalReturned: profile?.totalReturned != null
      ? `LKR ${Number(profile.totalReturned).toLocaleString()}` : 'LKR --',
  };

  // ── Save profile ─────────────────────────────────────
  // Calls PATCH /lender-profile/:lenderId via LenderProfileService.updateProfile()
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    if (!editEmail.trim() || !editEmail.includes('@')) {
      Alert.alert('Error', 'Enter a valid email address');
      return;
    }
    try {
      setSavingProfile(true);
      const payload: UpdateProfilePayload = {
        fullName: editName.trim(),
        email:    editEmail.trim(),
        phone:    editPhone.trim(),
      };
      const updated = await LenderProfileService.updateProfile(payload);
      // Merge the server response back so the UI reflects exactly what was saved
      setProfile((prev: any) => ({ ...prev, ...updated }));
      setEditProfileOpen(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Save password ─────────────────────────────────────
  // NOTE: lender-profile controller does not expose a change-password endpoint yet.
  // LenderProfileService.changePassword() will throw until the backend adds one.
  const handleSavePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      Alert.alert('Error', 'New password must be different from current');
      return;
    }
    try {
      setSavingPassword(true);
      await LenderProfileService.changePassword({ currentPassword, newPassword });
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ?? err?.message ?? 'Failed to change password.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  // ── Logout ────────────────────────────────────────────
  const { signOut } = useAuth();
  const nav = useNavigation();
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        try {
          signOut();
          localDatabase.clearAll();
          nav.reset({
            index: 0,
            routes: [{ name: 'MobileAuth' as never }],
          });
        } catch (err) {
          console.error('[Logout] Error:', err);
          Alert.alert('Error', 'Could not logout properly. Please restart the app.');
        }
      }},
    ]);
  };

  const handleSettingPress = (item: any) => {
    if (item.action === 'logout') { handleLogout(); return; }
    navigation.navigate(item.screen);
  };

  // ── Password strength indicator ───────────────────────
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0)  return { label: '',       color: 'transparent', width: '0%'   };
    if (pwd.length < 6)    return { label: 'Weak',   color: COLORS.danger, width: '25%'  };
    if (pwd.length < 8)    return { label: 'Fair',   color: COLORS.warning,width: '50%'  };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
                           return { label: 'Good',   color: COLORS.warning,width: '75%'  };
    return                        { label: 'Strong', color: COLORS.success,width: '100%' };
  };
  const strength = getPasswordStrength(newPassword);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

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
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{PROFILE_DATA.name.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Feather name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[commonStyles.headerName, styles.profileName]}>
            {PROFILE_DATA.name}
          </Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{PROFILE_DATA.accountStatus}</Text>
          </View>
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

        {/* ── EDIT PROFILE SECTION ────────────────── */}
        <TouchableOpacity
          style={styles.sectionToggle}
          onPress={() => setEditProfileOpen(!editProfileOpen)}
          activeOpacity={0.8}
        >
          <View style={commonStyles.row}>
            <View style={[styles.settingIcon, { backgroundColor: '#EBF4FF' }]}>
              <Feather name="edit-3" size={18} color={COLORS.primary} />
            </View>
            <Text style={commonStyles.textPrimary}>Edit Profile</Text>
          </View>
          <Feather
            name={editProfileOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {editProfileOpen && (
          <View style={styles.expandedSection}>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Feather name="user" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            <Text style={styles.fieldLabel}>Email Address</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <Feather name="phone" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+94 7X XXX XXXX"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, savingProfile && { opacity: 0.7 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>

          </View>
        )}

        {/* ── PASSWORD & SECURITY SECTION ─────────── */}
        <TouchableOpacity
          style={[styles.sectionToggle, { marginTop: 8 }]}
          onPress={() => setPasswordOpen(!passwordOpen)}
          activeOpacity={0.8}
        >
          <View style={commonStyles.row}>
            <View style={[styles.settingIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="lock" size={18} color={COLORS.danger} />
            </View>
            <Text style={commonStyles.textPrimary}>Password & Security</Text>
          </View>
          <Feather
            name={passwordOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>

        {passwordOpen && (
          <View style={styles.expandedSection}>

            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showCurrent}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <Feather name={showCurrent ? 'eye-off' : 'eye'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Feather name={showNew ? 'eye-off' : 'eye'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {newPassword.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBg}>
                  <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={16} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Feather name={showConfirm ? 'eye-off' : 'eye'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && (
              <View style={styles.matchRow}>
                <Feather
                  name={newPassword === confirmPassword ? 'check-circle' : 'x-circle'}
                  size={14}
                  color={newPassword === confirmPassword ? COLORS.success : COLORS.danger}
                />
                <Text style={[styles.matchText, { color: newPassword === confirmPassword ? COLORS.success : COLORS.danger }]}>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}

            <View style={styles.tipBox}>
              <Text style={styles.tipTitle}>Password Requirements:</Text>
              <Text style={[styles.tipText, newPassword.length >= 8 && styles.tipDone]}>
                {newPassword.length >= 8 ? '✓' : '•'} At least 8 characters
              </Text>
              <Text style={[styles.tipText, /[A-Z]/.test(newPassword) && styles.tipDone]}>
                {/[A-Z]/.test(newPassword) ? '✓' : '•'} At least one uppercase letter
              </Text>
              <Text style={[styles.tipText, /[0-9]/.test(newPassword) && styles.tipDone]}>
                {/[0-9]/.test(newPassword) ? '✓' : '•'} At least one number
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: COLORS.danger }, savingPassword && { opacity: 0.7 }]}
              onPress={handleSavePassword}
              disabled={savingPassword}
              activeOpacity={0.85}
            >
              {savingPassword
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Change Password</Text>
              }
            </TouchableOpacity>

          </View>
        )}

        {/* ── NOTIFICATIONS SECTION ───────────────── */}
        <Text style={[commonStyles.sectionTitle, { marginTop: 16 }]}>Notifications</Text>
        <View style={styles.settingsList}>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#EBF4FF' }]}>
                <Feather name="bell" size={18} color={COLORS.primary} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>Push Notifications</Text>
                <Text style={commonStyles.textSecondary}>Payments and loan updates</Text>
              </View>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: COLORS.primary, false: COLORS.border }} thumbColor="#fff" />
          </View>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="mail" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>Email Alerts</Text>
                <Text style={commonStyles.textSecondary}>Weekly summary and reports</Text>
              </View>
            </View>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ true: COLORS.primary, false: COLORS.border }} thumbColor="#fff" />
          </View>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#FFFBEB' }]}>
                <Feather name="message-square" size={18} color={COLORS.warning} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>SMS Alerts</Text>
                <Text style={commonStyles.textSecondary}>Critical alerts via SMS</Text>
              </View>
            </View>
            <Switch value={smsAlerts} onValueChange={setSmsAlerts} trackColor={{ true: COLORS.primary, false: COLORS.border }} thumbColor="#fff" />
          </View>

          <View style={[commonStyles.rowSpaceBetween, styles.settingItem, styles.settingItemLast]}>
            <View style={commonStyles.row}>
              <View style={[styles.settingIcon, { backgroundColor: '#ECFDF5' }]}>
                <Feather name="send" size={18} color={COLORS.success} />
              </View>
              <View>
                <Text style={commonStyles.textPrimary}>Auto Reminders</Text>
                <Text style={commonStyles.textSecondary}>Send payment reminders automatically</Text>
              </View>
            </View>
            <Switch value={autoReminders} onValueChange={setAutoReminders} trackColor={{ true: COLORS.primary, false: COLORS.border }} thumbColor="#fff" />
          </View>

        </View>

        {/* ── ADVERTISEMENT SECTION ───────────────── */}
        <Text style={commonStyles.sectionTitle}>Advertisements</Text>
        <View style={styles.adMenuList}>
          {AD_MENU.map((item, idx) => (
            <TouchableOpacity key={idx} onPress={() => navigation.navigate(item.screen)} activeOpacity={0.7}>
              <View style={[commonStyles.rowSpaceBetween, styles.settingItem, idx === AD_MENU.length - 1 && styles.settingItemLast]}>
                <View style={commonStyles.row}>
                  <View style={[styles.settingIcon, { backgroundColor: item.bg }]}>
                    <Feather name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={commonStyles.textPrimary}>{item.label}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SETTINGS & OPTIONS ──────────────────── */}
        <Text style={commonStyles.sectionTitle}>Settings & Options</Text>
        <View style={styles.settingsList}>
          {PROFILE_SETTINGS.map((item, idx) => (
            <TouchableOpacity key={idx} onPress={() => handleSettingPress(item)} activeOpacity={0.7}>
              <View style={[
                commonStyles.rowSpaceBetween, styles.settingItem,
                idx === PROFILE_SETTINGS.length - 1 && styles.settingItemLast,
                (item as any).action === 'logout' && styles.logoutItem,
              ]}>
                <View style={commonStyles.row}>
                  <View style={[styles.settingIcon, (item as any).action === 'logout' && styles.logoutIcon]}>
                    <Feather
                      name={item.icon as any}
                      size={18}
                      color={(item as any).action === 'logout' ? COLORS.danger : COLORS.primary}
                    />
                  </View>
                  <Text style={[commonStyles.textPrimary, (item as any).action === 'logout' && { color: COLORS.danger }]}>
                    {item.label}
                  </Text>
                </View>
                {(item as any).action !== 'logout' && (
                  <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>Smart Credit v1.0.0</Text>
        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  profileCard: {
    marginHorizontal: 16, marginVertical: 20, padding: 20,
    backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center',
    ...commonStyles.shadowSmall,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 32, fontWeight: '700', color: '#fff' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  profileName:   { marginTop: 16, color: COLORS.textPrimary },
  statusBadge:   { marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#ECFDF5', flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  statusText:    { fontSize: 12, fontWeight: '600', color: COLORS.success },
  infoRow:       { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText:      { fontSize: 14, color: COLORS.textSecondary },
  statsGrid:     { marginHorizontal: 16, flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox:       { flex: 1, padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center', ...commonStyles.shadowSmall },
  statLabel:     { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 8 },
  statValue:     { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  sectionToggle: { marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...commonStyles.shadowSmall },
  expandedSection: { marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 2, marginBottom: 4, ...commonStyles.shadowSmall },
  fieldLabel:    { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  inputWrap:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  inputIcon:     { marginRight: 8 },
  input:         { flex: 1, fontSize: 15, color: COLORS.textPrimary, paddingVertical: 12 },
  eyeBtn:        { padding: 4 },
  strengthWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, marginBottom: 2 },
  strengthBg:    { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  strengthFill:  { height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 50 },
  matchRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  matchText:     { fontSize: 12, fontWeight: '500' },
  tipBox:        { backgroundColor: COLORS.background, borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 4 },
  tipTitle:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  tipText:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 3 },
  tipDone:       { color: COLORS.success, fontWeight: '500' },
  saveBtn:       { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
  adMenuList:    { marginHorizontal: 16, marginBottom: 20, overflow: 'hidden', borderRadius: 12, backgroundColor: COLORS.surface, ...commonStyles.shadowSmall },
  settingsList:  { marginHorizontal: 16, marginBottom: 20, overflow: 'hidden', borderRadius: 12, backgroundColor: COLORS.surface, ...commonStyles.shadowSmall },
  settingItem:   { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingItemLast: { borderBottomWidth: 0 },
  settingIcon:   { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EBF4FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoutItem:    { borderBottomWidth: 0 },
  logoutIcon:    { backgroundColor: '#FEF2F2' },
  version:       { textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
});
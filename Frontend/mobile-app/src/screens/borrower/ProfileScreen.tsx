/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import SidebarMenu from "../../components/common/SidebarMenu";
import BorrowerRefreshControl from "../../components/borrower/BorrowerRefreshControl";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";
import { COLORS } from "../../constants/colors";
import { profileService } from "../../api/services/profile.service";
import { getApiErrorMessage } from "../../api/api-error";
import { useAuth } from "../../context/AuthContext";
import {
  getScoreColor,
  getScoreRating,
  scoreToPercent,
} from "../../utils/scoreUtils";
import type { BorrowerProfile } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type ProfileScreenProps = {
  navigation: BorrowerNavigation;
};

const EMPTY_EDITABLE_PROFILE = {
  fullName: "",
  email: "",
  newEmail: "",
  phone: "",
  address: "",
  monthlyIncome: "",
  occupation: "",
  currentPassword: "",
  password: "",
  confirmPassword: "",
};

/**
 * Displays borrower profile details and account-related actions.
 */
export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { signOut, sessionStatus } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profile, setProfile] = useState<BorrowerProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState(
    EMPTY_EDITABLE_PROFILE,
  );
  const [savedEditableProfile, setSavedEditableProfile] = useState(
    EMPTY_EDITABLE_PROFILE,
  );
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const toEditableProfile = (response: BorrowerProfile) => ({
    fullName: response.fullName,
    email: response.email,
    newEmail: "",
    phone: response.phone,
    address: profileService.formatAddress(response.address),
    monthlyIncome: String(response.monthlyIncome ?? ""),
    occupation: response.occupation || "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });

  const fetchProfile = async () => {
    try {
      const response = await profileService.getMyProfile();
      const editable = toEditableProfile(response);
      setProfile(response);
      setEditableProfile(editable);
      setSavedEditableProfile(editable);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load profile details.",
      );
      console.error("Error fetching profile:", message);
      Alert.alert("Profile unavailable", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    void fetchProfile();
  }, []);

  const detailRows = useMemo(
    () =>
      profile
        ? ([
            { label: "Borrower ID", value: profile.userId, icon: "hash" },
            { label: "NIC", value: profile.nic, icon: "credit-card" },
            {
              label: "Date of Birth",
              value: profile.dateOfBirth,
              icon: "calendar",
            },
            {
              label: "Joined",
              value: profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString()
                : "-",
              icon: "clock",
            },
          ] as const)
        : [],
    [profile],
  );

  const profileCompletion = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const checks = [
      profile.fullName,
      profile.phone,
      profile.nic,
      profile.dateOfBirth,
      profileService.formatAddress(profile.address),
      profile.monthlyIncome ? String(profile.monthlyIncome) : "",
      profile.occupation,
    ];
    const filled = checks.filter((value) => String(value ?? "").trim()).length;

    return Math.round((filled / checks.length) * 100);
  }, [profile]);

  const creditScore = Number(profile?.creditScore ?? 0);
  const creditRating = getScoreRating(creditScore);
  const creditScoreColor = getScoreColor(creditScore);
  const creditScorePercent = scoreToPercent(creditScore);
  const isDirty = useMemo(
    () =>
      JSON.stringify(editableProfile) !== JSON.stringify(savedEditableProfile),
    [editableProfile, savedEditableProfile],
  );
  const emailChanged =
    editableProfile.newEmail.trim().length > 0 &&
    editableProfile.newEmail.trim() !== savedEditableProfile.email.trim();
  const passwordChanged = editableProfile.password.trim().length > 0;
  const sensitiveChanged = emailChanged || passwordChanged;
  const financeRows = useMemo(
    () =>
      profile
        ? ([
            {
              label: "KYC Status",
              value: profile.kycVerified ? "Verified" : "Pending",
              icon: profile.kycVerified ? "check-circle" : "clock",
            },
          ] as const)
        : [],
    [profile],
  );

  const editableRows: Array<{
    label: string;
    key: keyof typeof editableProfile;
    placeholder: string;
    keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
    multiline?: boolean;
  }> = [
    {
      label: "Full Name",
      key: "fullName",
      placeholder: "Enter full name",
    },
    {
      label: "Phone",
      key: "phone",
      placeholder: "e.g. 0771234567 or +94771234567",
      keyboardType: "phone-pad",
    },
    {
      label: "Address",
      key: "address",
      placeholder: "Enter street address",
      multiline: true,
    },
    {
      label: "Monthly Income (LKR)",
      key: "monthlyIncome",
      placeholder: "e.g. 85000",
      keyboardType: "numeric",
    },
    {
      label: "Occupation / Job Title",
      key: "occupation",
      placeholder: "e.g. Software Engineer",
    },
  ];

  const onChangeEditableField = (
    field: keyof typeof editableProfile,
    value: string,
  ) => {
    setEditableProfile((previous) => ({ ...previous, [field]: value }));
  };

  const onStartEditing = () => {
    setEditing(true);
  };

  const onCancelEditing = () => {
    if (isDirty) {
      Alert.alert("Discard Changes?", "Your unsaved edits will be lost.", [
        { text: "Keep Editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setEditableProfile(savedEditableProfile);
            setEditing(false);
          },
        },
      ]);
      return;
    }

    setEditing(false);
  };

  const onSaveChanges = async () => {
    if (!isDirty || saving) return;
    if (!editableProfile.fullName.trim()) {
      Alert.alert("Name Required", "Full name cannot be empty.");
      return;
    }
    if (
      emailChanged &&
      !/^\S+@\S+\.\S+$/.test(editableProfile.newEmail.trim())
    ) {
      Alert.alert("Invalid Email", "Enter a valid email address.");
      return;
    }
    const phoneDigits = editableProfile.phone.replace(/\D/g, "");
    if (![9, 10, 11].includes(phoneDigits.length)) {
      Alert.alert("Invalid Phone", "Enter a valid Sri Lankan phone number.");
      return;
    }
    const normalizedIncome = editableProfile.monthlyIncome.trim();
    if (
      normalizedIncome &&
      (!/^\d+(?:\.\d{1,2})?$/.test(normalizedIncome) ||
        !Number.isFinite(Number(normalizedIncome)))
    ) {
      Alert.alert(
        "Invalid Income",
        "Monthly income must be a non-negative amount with up to two decimals.",
      );
      return;
    }
    if (passwordChanged && editableProfile.password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (
      passwordChanged &&
      editableProfile.password !== editableProfile.confirmPassword
    ) {
      Alert.alert("Password Mismatch", "Please confirm the same password.");
      return;
    }
    if (sensitiveChanged && !editableProfile.currentPassword.trim()) {
      Alert.alert(
        "Current Password Required",
        "Enter your current password before changing email or password.",
      );
      return;
    }

    try {
      setSaving(true);
      const updated = await profileService.updateMyProfile({
        fullName: editableProfile.fullName,
        email: emailChanged ? editableProfile.newEmail.trim() : undefined,
        phone: editableProfile.phone,
        address: editableProfile.address,
        monthlyIncome: editableProfile.monthlyIncome,
        occupation: editableProfile.occupation,
        currentPassword: sensitiveChanged
          ? editableProfile.currentPassword
          : undefined,
        password: passwordChanged ? editableProfile.password : undefined,
      });
      const editable = toEditableProfile(updated);
      setProfile(updated);
      setEditableProfile(editable);
      setSavedEditableProfile(editable);
      setEditing(false);
      Alert.alert("Profile Updated", "Your changes were saved successfully.");
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to save profile changes.",
      );
      console.error("Error updating profile:", message);
      Alert.alert("Profile update failed", message);
    } finally {
      setSaving(false);
    }
  };

  const onLogOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          signOut();
        },
      },
    ]);
  };

  const avatarText = editableProfile.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const profileImageUri =
    profile?.photoURL ||
    profile?.profilePictureUrl ||
    profile?.profilePicUrl ||
    profile?.profilePhotoUrl ||
    profile?.profilePicture ||
    profile?.imageUrl ||
    profile?.avatarUrl ||
    "";

  return (
    <View style={styles.container}>
      <BorrowerPageHeader
        title="Profile"
        onMenu={() => setSidebarVisible(true)}
        actions={[
          {
            icon: "bell",
            label: "Open notifications",
            onPress: () => navigation.navigate("Notifications"),
          },
          {
            icon: "map-pin",
            label: "Find nearby lenders",
            onPress: () => navigation.navigate("NearbyLendersMap"),
          },
        ]}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <BorrowerRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{avatarText || "B"}</Text>
              )}
            </View>
            <Text style={styles.name}>{editableProfile.fullName || "-"}</Text>
            <Text style={styles.subText}>Borrower Account</Text>
            <View style={styles.completionBlock}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionLabel}>Profile completion</Text>
                <Text style={styles.completionValue}>{profileCompletion}%</Text>
              </View>
              <View style={styles.completionTrack}>
                <View
                  style={[
                    styles.completionFill,
                    { width: `${profileCompletion}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            {detailRows.map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <View style={styles.rowLeft}>
                  <Feather name={row.icon} size={16} color={COLORS.primary} />
                  <Text style={styles.detailLabel}>{row.label}</Text>
                </View>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Financial Snapshot</Text>
            <TouchableOpacity
              style={styles.scorePanel}
              activeOpacity={0.75}
              onPress={() => navigation.navigate("CreditScore")}
            >
              <View>
                <Text style={styles.scoreLabel}>Credit Score</Text>
                <View style={styles.scoreValueRow}>
                  <Text
                    style={[styles.scoreValue, { color: creditScoreColor }]}
                  >
                    {creditScore}
                  </Text>
                  <Text
                    style={[
                      styles.scoreRating,
                      {
                        backgroundColor: `${creditScoreColor}18`,
                        color: creditScoreColor,
                      },
                    ]}
                  >
                    {creditRating}
                  </Text>
                </View>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
            <View style={styles.scoreTrack}>
              <View
                style={[
                  styles.scoreFill,
                  {
                    width: `${creditScorePercent}%`,
                    backgroundColor: creditScoreColor,
                  },
                ]}
              />
            </View>
            {financeRows.map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <View style={styles.rowLeft}>
                  <Feather name={row.icon} size={16} color={COLORS.primary} />
                  <Text style={styles.detailLabel}>{row.label}</Text>
                </View>
                <View style={styles.financeValueRow}>
                  <Text style={styles.detailValue}>{row.value}</Text>
                  {row.label === "KYC Status" && !profile?.kycVerified && (
                    <TouchableOpacity
                      style={styles.statusActionButton}
                      onPress={() => {
                        if (sessionStatus?.kycStatus === "rejected") {
                          navigation.navigate("KycResubmission");
                          return;
                        }
                        Alert.alert(
                          "KYC under review",
                          "Your submitted documents are waiting for review.",
                        );
                      }}
                    >
                      <Text style={styles.statusActionText}>
                        {sessionStatus?.kycStatus === "rejected"
                          ? "Re-upload"
                          : "View status"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              {!editing ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={onStartEditing}
                >
                  <Feather name="edit-2" size={14} color={COLORS.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.infoNote}>
              NIC and Date of Birth are locked after registration.
            </Text>

            {!editing ? (
              <View style={styles.readOnlyList}>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Full Name</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.fullName || "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Phone</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.phone || "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Email</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.email || "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <View style={styles.lockedLabelRow}>
                    <Text style={styles.readOnlyLabel}>NIC</Text>
                    <Feather name="lock" size={12} color="#DC2626" />
                  </View>
                  <Text style={styles.readOnlyValue}>
                    {profile?.nic ?? "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <View style={styles.lockedLabelRow}>
                    <Text style={styles.readOnlyLabel}>Date of Birth</Text>
                    <Feather name="lock" size={12} color="#DC2626" />
                  </View>
                  <Text style={styles.readOnlyValue}>
                    {profile?.dateOfBirth ?? "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Address</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.address || "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Monthly Income</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.monthlyIncome
                      ? `LKR ${Number(editableProfile.monthlyIncome).toLocaleString()}`
                      : "-"}
                  </Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Occupation</Text>
                  <Text style={styles.readOnlyValue}>
                    {editableProfile.occupation || "-"}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {editableRows.map((row) => (
                  <View key={row.key} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{row.label}</Text>
                    <TextInput
                      style={[
                        styles.input,
                        row.multiline && styles.multilineInput,
                      ]}
                      value={
                        editableProfile[row.key as keyof typeof editableProfile]
                      }
                      onChangeText={(value) =>
                        onChangeEditableField(row.key, value)
                      }
                      placeholder={row.placeholder}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={row.keyboardType ?? "default"}
                      autoCapitalize={row.key === "email" ? "none" : "words"}
                      multiline={row.multiline}
                    />
                  </View>
                ))}

                <View style={styles.sensitiveBox}>
                  <Text style={styles.sensitiveTitle}>Security Changes</Text>
                  <Text style={styles.infoNote}>
                    Changing email or password requires your current password.
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Email</Text>
                    <TextInput
                      style={[styles.input, styles.lockedSecurityInput]}
                      value={editableProfile.email}
                      editable={false}
                      placeholder="Current email"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Email</Text>
                    <TextInput
                      style={styles.input}
                      value={editableProfile.newEmail}
                      onChangeText={(value) =>
                        onChangeEditableField("newEmail", value)
                      }
                      placeholder="Leave blank to keep current email"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={editableProfile.password}
                      onChangeText={(value) =>
                        onChangeEditableField("password", value)
                      }
                      placeholder="Leave blank to keep current password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={editableProfile.confirmPassword}
                      onChangeText={(value) =>
                        onChangeEditableField("confirmPassword", value)
                      }
                      placeholder="Confirm new password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                    />
                  </View>

                  {sensitiveChanged ? (
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Current Password</Text>
                      <TextInput
                        style={styles.input}
                        value={editableProfile.currentPassword}
                        onChangeText={(value) =>
                          onChangeEditableField("currentPassword", value)
                        }
                        placeholder="Required for email or password changes"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry
                      />
                    </View>
                  ) : null}
                </View>

                <View style={styles.lockedRow}>
                  <Feather name="lock" size={14} color="#DC2626" />
                  <Text style={styles.lockedText}>
                    NIC: {profile?.nic ?? "-"}
                  </Text>
                </View>
                <View style={styles.lockedRow}>
                  <Feather name="lock" size={14} color="#DC2626" />
                  <Text style={styles.lockedText}>
                    DOB: {profile?.dateOfBirth ?? "-"}
                  </Text>
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onCancelEditing}
                    disabled={saving}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!isDirty || saving) && styles.saveButtonMuted,
                    ]}
                    onPress={() => void onSaveChanges()}
                    disabled={!isDirty || saving}
                  >
                    <Text style={styles.saveButtonText}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account</Text>
            <Text style={styles.infoNote}>
              Log out from this device and return to the sign in screen.
            </Text>
            <TouchableOpacity style={styles.logoutButton} onPress={onLogOut}>
              <Feather name="log-out" size={16} color={COLORS.error} />
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <SidebarMenu
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.onPrimary,
    marginLeft: 15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.primaryPressed,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.72)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.onPrimary,
    letterSpacing: -0.3,
  },
  subText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
  },
  completionBlock: {
    width: "100%",
    marginTop: 20,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.84)",
  },
  completionValue: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.onPrimary,
  },
  completionTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.onPrimary,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primarySoft,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  scorePanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 14,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  scoreValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  scoreRating: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  scoreTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.borderStrong,
    overflow: "hidden",
    marginBottom: 10,
  },
  scoreFill: {
    height: "100%",
    borderRadius: 999,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  financeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  detailLabel: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginLeft: 8,
    flexShrink: 1,
    textAlign: "right",
  },
  infoNote: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  logoutButton: {
    marginTop: 2,
    backgroundColor: COLORS.errorSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: "700",
  },
  readOnlyList: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 48,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  readOnlyLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  lockedLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readOnlyValue: {
    flex: 1.4,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    minHeight: 78,
    textAlignVertical: "top",
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  lockedText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  sensitiveBox: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: COLORS.surfaceMuted,
  },
  sensitiveTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 5,
  },
  lockedSecurityInput: {
    color: COLORS.textSecondary,
    backgroundColor: COLORS.border,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonMuted: {
    backgroundColor: "#93C5FD",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.onPrimary,
  },
  statusActionButton: {
    marginLeft: 8,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  statusActionText: {
    color: COLORS.primaryPressed,
    fontSize: 12,
    fontWeight: "700",
  },
});

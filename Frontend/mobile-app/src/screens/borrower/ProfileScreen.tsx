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
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import SidebarMenu from "../../components/common/SidebarMenu";
import { profileService } from "../../api/services/profile.service";
import { getApiErrorMessage } from "../../api/api-error";
import { PROFILE_UPDATE_VERIFICATION_CODE } from "../../constants/demo";
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
  password: "",
  confirmPassword: "",
};

/**
 * Displays borrower profile details and account-related actions.
 */
export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { signOut } = useAuth();
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
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedForSensitiveSave, setVerifiedForSensitiveSave] =
    useState(false);

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
    if (
      field === "email" ||
      field === "newEmail" ||
      field === "password" ||
      field === "confirmPassword"
    ) {
      setVerifiedForSensitiveSave(false);
    }
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
            setVerificationSent(false);
            setVerificationCode("");
            setVerifiedForSensitiveSave(false);
          },
        },
      ]);
      return;
    }

    setEditing(false);
    setVerificationSent(false);
    setVerificationCode("");
    setVerifiedForSensitiveSave(false);
  };

  const onSendVerificationCode = () => {
    setVerificationSent(true);
    setVerifiedForSensitiveSave(false);
    setVerificationCode("");

    Alert.alert(
      "Verification Required",
      `A verification code was sent. Use ${PROFILE_UPDATE_VERIFICATION_CODE} for this demo.`,
    );
  };

  const onVerifySensitiveChanges = () => {
    if (verificationCode.trim() !== PROFILE_UPDATE_VERIFICATION_CODE) {
      Alert.alert(
        "Invalid Code",
        "Please enter the correct verification code.",
      );
      return;
    }

    setVerifiedForSensitiveSave(true);
    Alert.alert("Verified", "You can now save your sensitive changes.");
  };

  const onSaveChanges = async () => {
    if (!isDirty || saving) return;
    if (passwordChanged && editableProfile.password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (
      passwordChanged &&
      editableProfile.password !== editableProfile.confirmPassword
    ) {
      Alert.alert("Password Mismatch", "Please confirm the same password.");
      return;
    }
    if (sensitiveChanged && !verifiedForSensitiveSave) {
      Alert.alert(
        "Verification Needed",
        "Please verify before changing email or password.",
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
        password: passwordChanged ? editableProfile.password : undefined,
      });
      const editable = toEditableProfile(updated);
      setProfile(updated);
      setEditableProfile(editable);
      setSavedEditableProfile(editable);
      setEditing(false);
      setVerificationSent(false);
      setVerificationCode("");
      setVerifiedForSensitiveSave(false);
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Feather name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name="bell" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="map-pin" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
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
                <Text style={styles.completionValue}>
                  {profileCompletion}%
                </Text>
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
                  <Feather name={row.icon} size={16} color="#007AFF" />
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
                  <Text style={[styles.scoreValue, { color: creditScoreColor }]}>
                    {creditScore}
                  </Text>
                  <Text
                    style={[
                      styles.scoreRating,
                      { backgroundColor: `${creditScoreColor}18`, color: creditScoreColor },
                    ]}
                  >
                    {creditRating}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#9CA3AF" />
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
              <View
                key={row.label}
                style={styles.detailRow}
              >
                <View style={styles.rowLeft}>
                  <Feather name={row.icon} size={16} color="#007AFF" />
                  <Text style={styles.detailLabel}>{row.label}</Text>
                </View>
                <View style={styles.financeValueRow}>
                  <Text style={styles.detailValue}>{row.value}</Text>
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
                  <Feather name="edit-2" size={14} color="#007AFF" />
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
                  <Text style={styles.readOnlyValue}>{profile?.nic ?? "-"}</Text>
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
                        editableProfile[
                          row.key as keyof typeof editableProfile
                        ]
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
                    Changing email or password requires a code sent to your
                    current email.
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
                    <View style={styles.verificationBox}>
                      <View style={styles.sensitiveNotice}>
                        <Feather name="shield" size={15} color="#1D4ED8" />
                        <Text style={styles.sensitiveNoticeText}>
                          Enter the code sent to {savedEditableProfile.email} to
                          save these changes.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={onSendVerificationCode}
                      >
                        <Text style={styles.verifyButtonText}>
                          Send Verification Code
                        </Text>
                      </TouchableOpacity>

                      {verificationSent ? (
                        <>
                          <Text style={styles.inputLabel}>
                            Verification Code
                          </Text>
                          <TextInput
                            style={styles.input}
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                            placeholder="Enter verification code"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="number-pad"
                          />
                          <TouchableOpacity
                            style={styles.confirmButton}
                            onPress={onVerifySensitiveChanges}
                          >
                            <Text style={styles.confirmButtonText}>
                              Verify
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : null}

                      {verifiedForSensitiveSave ? (
                        <Text style={styles.verifiedText}>
                          Sensitive changes verified.
                        </Text>
                      ) : null}
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
                      (!isDirty ||
                        saving ||
                        (sensitiveChanged && !verifiedForSensitiveSave)) &&
                        styles.saveButtonMuted,
                    ]}
                    onPress={() => void onSaveChanges()}
                    disabled={
                      !isDirty ||
                      saving ||
                      (sensitiveChanged && !verifiedForSensitiveSave)
                    }
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
              <Feather name="log-out" size={16} color="#FFFFFF" />
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
    backgroundColor: "#F5F6FA",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F6FA",
  },
  header: {
    backgroundColor: "#007AFF",
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
    color: "#FFFFFF",
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
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E6F1FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  subText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  completionBlock: {
    width: "82%",
    marginTop: 14,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  completionLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  completionValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007AFF",
  },
  completionTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  completionFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#007AFF",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#007AFF",
  },
  scorePanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  scoreValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreValue: {
    fontSize: 30,
    fontWeight: "800",
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
    height: 7,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 6,
  },
  scoreFill: {
    height: "100%",
    borderRadius: 999,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
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
    marginLeft: 8,
    fontSize: 13,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
    flexShrink: 1,
    textAlign: "right",
  },
  infoNote: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  logoutButton: {
    marginTop: 4,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  readOnlyList: {
    marginTop: 2,
  },
  readOnlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  readOnlyLabel: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
  },
  lockedLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  readOnlyValue: {
    flex: 1.4,
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "right",
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
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
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FAFAFB",
  },
  sensitiveTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  lockedSecurityInput: {
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
  },
  sensitiveNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },
  sensitiveNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#1D4ED8",
    lineHeight: 17,
  },
  verifyButton: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  verifyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  verificationBox: {
    marginTop: 12,
  },
  verifiedText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
  },
  confirmButton: {
    marginTop: 8,
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonMuted: {
    backgroundColor: "#93C5FD",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

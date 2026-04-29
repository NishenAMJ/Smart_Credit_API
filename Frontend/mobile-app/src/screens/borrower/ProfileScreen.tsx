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
import { PROFILE_UPDATE_VERIFICATION_CODE } from "../../constants/demo";
import type { BorrowerProfile } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type ProfileScreenProps = {
  navigation: BorrowerNavigation;
};

/**
 * Displays borrower profile details and account-related actions.
 */
export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [profile, setProfile] = useState<BorrowerProfile | null>(null);
  const [editableProfile, setEditableProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    employment: "employed",
    monthlyIncome: "",
    occupation: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifiedForSave, setVerifiedForSave] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    try {
      const response = await profileService.getMyProfile();
      setProfile(response);
      setEditableProfile({
        fullName: response.fullName,
        email: response.email,
        phone: response.phone,
        address: profileService.formatAddress(response.address),
        employment: response.employmentStatus || "employed",
        monthlyIncome: String(response.monthlyIncome ?? ""),
        occupation: response.occupation || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile details.");
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

  const financeRows = useMemo(
    () =>
      profile
        ? ([
            {
              label: "Credit Score",
              value: String(profile.creditScore ?? 0),
              icon: "award",
            },
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
    keyboardType?: "default" | "email-address" | "phone-pad";
  }> = [
    {
      label: "Full Name",
      key: "fullName",
      placeholder: "Enter full name",
    },
    {
      label: "Email",
      key: "email",
      placeholder: "Enter email address",
      keyboardType: "email-address",
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
      placeholder: "Enter address",
    },
    {
      label: "Employment Status",
      key: "employment",
      placeholder: "e.g. Software Engineer, Student, Freelancer",
    },
    {
      label: "Monthly Income (LKR)",
      key: "monthlyIncome",
      placeholder: "e.g. 85000",
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
    if (verifiedForSave) {
      setVerifiedForSave(false);
    }
  };

  const onSendVerificationCode = () => {
    setVerificationSent(true);
    setVerifiedForSave(false);
    setVerificationCode("");

    Alert.alert(
      "Verification Required",
      `A verification code was sent. Use ${PROFILE_UPDATE_VERIFICATION_CODE} for this demo.`,
    );
  };

  const onVerify = () => {
    if (verificationCode.trim() !== PROFILE_UPDATE_VERIFICATION_CODE) {
      Alert.alert(
        "Invalid Code",
        "Please enter the correct verification code.",
      );
      return;
    }

    setVerifiedForSave(true);
    Alert.alert("Verified", "You can now save your updates.");
  };

  const onSaveChanges = async () => {
    if (!verifiedForSave) {
      Alert.alert(
        "Verification Needed",
        "Please verify your identity before saving changes.",
      );
      return;
    }

    try {
      setSaving(true);
      const updated = await profileService.updateMyProfile(editableProfile);
      setProfile(updated);
      setVerifiedForSave(false);
      setVerificationSent(false);
      setVerificationCode("");
      Alert.alert("Profile Updated", "Your changes were saved successfully.");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
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
            {financeRows.map((row) => (
              <TouchableOpacity
                key={row.label}
                style={styles.detailRow}
                activeOpacity={row.label === "Credit Score" ? 0.75 : 1}
                onPress={() => {
                  if (row.label === "Credit Score") {
                    navigation.navigate("CreditScore");
                  }
                }}
              >
                <View style={styles.rowLeft}>
                  <Feather name={row.icon} size={16} color="#007AFF" />
                  <Text style={styles.detailLabel}>{row.label}</Text>
                </View>
                <View style={styles.financeValueRow}>
                  <Text style={styles.detailValue}>{row.value}</Text>
                  {row.label === "Credit Score" ? (
                    <Feather name="chevron-right" size={16} color="#9CA3AF" />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Update Information</Text>
            <Text style={styles.infoNote}>
              You can edit only non-critical fields. NIC and Date of Birth are
              locked.
            </Text>



            {editableRows.map((row) => (
              <View key={row.key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{row.label}</Text>
                <TextInput
                  style={styles.input}
                  value={editableProfile[row.key as keyof typeof editableProfile]}
                  onChangeText={(value) =>
                    onChangeEditableField(row.key, value)
                  }
                  placeholder={row.placeholder}
                  placeholderTextColor="#9CA3AF"
                  keyboardType={row.keyboardType ?? "default"}
                  autoCapitalize={row.key === "email" ? "none" : "words"}
                  editable={row.key !== "email"}
                />
              </View>
            ))}

            <View style={styles.lockedRow}>
              <Feather name="lock" size={14} color="#DC2626" />
              <Text style={styles.lockedText}>NIC: {profile?.nic ?? "-"}</Text>
            </View>
            <View style={styles.lockedRow}>
              <Feather name="lock" size={14} color="#DC2626" />
              <Text style={styles.lockedText}>
                DOB: {profile?.dateOfBirth ?? "-"}
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
              <View style={styles.verificationBox}>
                <Text style={styles.inputLabel}>Verification Code</Text>
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
                  onPress={onVerify}
                >
                  <Text style={styles.confirmButtonText}>Verify</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!verifiedForSave || saving) && styles.saveButtonMuted,
              ]}
              onPress={() => void onSaveChanges()}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Changes"}
              </Text>
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
  saveButton: {
    marginTop: 14,
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

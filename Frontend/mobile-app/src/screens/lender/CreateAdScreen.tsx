import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { AdService } from "../../services/advertisement.service";
import { getApiErrorMessage } from "../../api/api-error";
import { useAuth } from "../../context/AuthContext";

const PURPOSES = [
  "education",
  "business",
  "medical",
  "personal",
  "vehicle",
  "home",
];

export default function CreateAdScreen({ navigation }: any) {
  const { sessionStatus } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [rate, setRate] = useState("");
  const [minTenure, setMinTenure] = useState("");
  const [maxTenure, setMaxTenure] = useState("");
  const [responseHrs, setResponseHrs] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const kycStatus =
    sessionStatus?.kycStatus ?? sessionStatus?.user?.kycStatus ?? null;
  const accountStatus = sessionStatus?.accountStatus ?? null;
  const isKycBlocked = kycStatus !== null && kycStatus !== "approved";
  const isAccountBlocked = accountStatus !== null && accountStatus !== "active";

  const togglePurpose = (p: string) => {
    setPurposes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = async () => {
    if (isAccountBlocked) {
      Alert.alert(
        "Account unavailable",
        "Your lender account must be active before you can submit an advertisement.",
      );
      return;
    }

    if (isKycBlocked) {
      Alert.alert(
        "KYC approval required",
        "You can submit advertisements after an administrator approves your KYC documents.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "View KYC status",
            onPress: () => navigation.navigate("LenderKyc"),
          },
        ],
      );
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const minimumAmount = Number(minAmount);
    const maximumAmount = Number(maxAmount);
    const interestRate = Number(rate);

    if (!cleanTitle || !cleanDescription || !minAmount || !maxAmount || !rate) {
      Alert.alert("Validation Error", "Please fill all required fields (*)");
      return;
    }

    if (cleanTitle.length < 12) {
      Alert.alert("Validation Error", "Title must be at least 12 characters.");
      return;
    }

    if (cleanDescription.length < 12) {
      Alert.alert(
        "Validation Error",
        "Description must be at least 12 characters.",
      );
      return;
    }

    if (purposes.length === 0) {
      Alert.alert("Validation Error", "Select at least one loan purpose");
      return;
    }

    if (!Number.isFinite(minimumAmount) || !Number.isFinite(maximumAmount)) {
      Alert.alert("Validation Error", "Enter valid loan amounts.");
      return;
    }

    if (minimumAmount > maximumAmount) {
      Alert.alert(
        "Validation Error",
        "Maximum amount must be greater than or equal to minimum amount",
      );
      return;
    }

    if (minimumAmount < 10000 || maximumAmount > 5000000) {
      Alert.alert(
        "Validation Error",
        "Loan amounts must be between LKR 10,000 and LKR 5,000,000",
      );
      return;
    }

    if (
      !Number.isFinite(interestRate) ||
      interestRate <= 0 ||
      interestRate > 100
    ) {
      Alert.alert(
        "Validation Error",
        "Interest rate must be greater than 0 and no more than 100%.",
      );
      return;
    }

    if (minTenure && maxTenure && Number(minTenure) > Number(maxTenure)) {
      Alert.alert(
        "Validation Error",
        "Maximum tenure must be >= minimum tenure",
      );
      return;
    }

    const maximumTenure = Number(maxTenure) || Number(minTenure) || 12;
    const minimumTenure = Number(minTenure) || Math.min(6, maximumTenure);
    if (
      !Number.isInteger(minimumTenure) ||
      !Number.isInteger(maximumTenure) ||
      minimumTenure < 3 ||
      maximumTenure > 60
    ) {
      Alert.alert(
        "Validation Error",
        "Loan tenure must be between 3 and 60 months",
      );
      return;
    }

    const responseTimeHours = Number(responseHrs) || 24;
    if (
      !Number.isInteger(responseTimeHours) ||
      responseTimeHours < 1 ||
      responseTimeHours > 168
    ) {
      Alert.alert(
        "Validation Error",
        "Response time must be a whole number between 1 and 168 hours.",
      );
      return;
    }

    try {
      setLoading(true);
      await AdService.createAd({
        headline: cleanTitle,
        supportNote: cleanDescription,
        minAmount: minimumAmount,
        maxAmount: maximumAmount,
        interestRate,
        minTenureMonths: minimumTenure,
        tenureMonths: maximumTenure,
        borrowerFocus: purposes.join(", "),
        preferredPurposes: purposes,
        processingTime: `Reviewed within ${responseTimeHours} hours`,
        responseTimeHours,
        repaymentStyle: "Monthly installments",
        requirements: "Approved KYC and verified supporting documents",
      });

      Alert.alert(
        "Submitted",
        "Your advertisement was sent for admin review.",
        [{ text: "OK", onPress: () => navigation.navigate("MyAds") }],
      );
    } catch (error: unknown) {
      Alert.alert(
        "Could not submit advertisement",
        getApiErrorMessage(error, "Failed to create advertisement."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={commonStyles.header}>
        <View style={commonStyles.headerFlexRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={commonStyles.headerTitle}>Create Ad</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>

      {/* ✅ contentContainerStyle adds bottom padding so button clears phone nav bar */}
      <ScrollView
        style={commonStyles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {(isKycBlocked || isAccountBlocked) && (
          <View style={styles.accessNotice}>
            <Feather name="shield" size={20} color="#92400E" />
            <View style={styles.accessNoticeCopy}>
              <Text style={styles.accessNoticeTitle}>
                {isAccountBlocked
                  ? "Lender account is not active"
                  : "KYC approval required"}
              </Text>
              <Text style={styles.accessNoticeText}>
                {isAccountBlocked
                  ? "Contact support or wait for your account review before submitting an advertisement."
                  : `Your current KYC status is ${(kycStatus ?? "not submitted").replace(/_/g, " ")}. You can prepare this form, but submission is available only after approval.`}
              </Text>
              {!isAccountBlocked && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("LenderKyc")}
                >
                  <Text style={styles.accessNoticeLink}>View KYC status</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        <Text style={commonStyles.sectionTitle}>Ad Details</Text>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Title *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Quick Personal Loan"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <Text style={commonStyles.textPrimary}>Description *</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your offer..."
            multiline
            numberOfLines={4}
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Loan Terms</Text>
        <View style={commonStyles.card}>
          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min Amount (LKR) *</Text>
              <TextInput
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="numeric"
                placeholder="10000"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max Amount (LKR) *</Text>
              <TextInput
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                placeholder="500000"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>

          <View style={commonStyles.spacer12} />

          <Text style={commonStyles.textPrimary}>Interest Rate (%) *</Text>
          <TextInput
            value={rate}
            onChangeText={setRate}
            keyboardType="numeric"
            placeholder="12"
            style={[commonStyles.input, { marginBottom: 12 }]}
            placeholderTextColor={COLORS.textSecondary}
          />

          <View style={commonStyles.rowSpaceBetween}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={commonStyles.textPrimary}>Min Tenure (months)</Text>
              <TextInput
                value={minTenure}
                onChangeText={setMinTenure}
                keyboardType="numeric"
                placeholder="6"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={commonStyles.textPrimary}>Max Tenure (months)</Text>
              <TextInput
                value={maxTenure}
                onChangeText={setMaxTenure}
                keyboardType="numeric"
                placeholder="24"
                style={commonStyles.input}
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
          </View>
        </View>

        <Text style={commonStyles.sectionTitle}>Review timing</Text>
        <View style={commonStyles.card}>
          <Text style={commonStyles.textPrimary}>Response Time (hours)</Text>
          <TextInput
            value={responseHrs}
            onChangeText={setResponseHrs}
            keyboardType="numeric"
            placeholder="24"
            style={commonStyles.input}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        <Text style={commonStyles.sectionTitle}>Loan Purposes</Text>
        <View style={commonStyles.card}>
          {PURPOSES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[commonStyles.row, { paddingVertical: 8 }]}
              onPress={() => togglePurpose(p)}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: COLORS.primary,
                  backgroundColor: purposes.includes(p)
                    ? COLORS.primary
                    : "transparent",
                  marginRight: 8,
                }}
              />
              <Text style={commonStyles.textPrimary}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[
            commonStyles.primaryButton,
            { marginVertical: 24, opacity: loading ? 0.7 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={commonStyles.buttonText}>Submit for review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accessNotice: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
  },
  accessNoticeCopy: { flex: 1, gap: 5 },
  accessNoticeTitle: { color: "#78350F", fontSize: 15, fontWeight: "700" },
  accessNoticeText: { color: "#92400E", fontSize: 13, lineHeight: 19 },
  accessNoticeLink: { color: COLORS.primary, fontSize: 13, fontWeight: "700" },
});

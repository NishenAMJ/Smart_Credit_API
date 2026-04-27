/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  applicationService,
  createApplication,
} from "../../api/services/application.service";
import { profileService } from "../../api/services/profile.service";
import { navigateToBorrowerTab } from "../../utils/borrowerNavigation";
import { isValidAmount } from "../../utils/validation";
import type { BorrowerLoan } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type LoanApplicationScreenProps = {
  route: {
    params?: {
      loan?: BorrowerLoan;
    };
  };
  navigation: BorrowerNavigation;
};

/**
 * Captures and submits a borrower loan application form.
 */
export default function LoanApplicationScreen({
  route,
  navigation,
}: LoanApplicationScreenProps) {
  const loan = route.params?.loan;
  const minimumLoanAmount = useMemo(
    () => Math.max(10000, Number(loan?.minAmount ?? loan?.amount ?? 10000)),
    [loan?.amount, loan?.minAmount],
  );
  const maximumLoanAmount = useMemo(
    () => Number(loan?.maxAmount ?? loan?.amount ?? 0),
    [loan?.amount, loan?.maxAmount],
  );

  const [loanAmount, setLoanAmount] = useState(String(minimumLoanAmount));
  const [employmentStatus, setEmploymentStatus] =
    useState("Full-Time Employee");
  const [loanPurpose, setLoanPurpose] = useState("Car Repair");
  const [monthlyIncome, setMonthlyIncome] = useState("5000.00");
  const [repaymentDuration, setRepaymentDuration] = useState(
    String(loan?.durationMonths ?? 12),
  );
  const [preferredInterestRate, setPreferredInterestRate] = useState(
    loan?.interestRate && loan.interestRate > 0
      ? String(Math.max(loan.interestRate - 0.5, 0.1))
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [kycVerified, setKycVerified] = useState(false);

  useEffect(() => {
    setLoanAmount(String(minimumLoanAmount));
  }, [minimumLoanAmount]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const profile = await profileService.getMyProfile();
        if (isMounted) {
          setKycVerified(Boolean(profile.kycVerified));
        }
      } catch (error) {
        console.error("Error checking borrower eligibility:", error);
      } finally {
        if (isMounted) {
          setCheckingEligibility(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const normalizedLoanCategory = useMemo(() => {
    const purpose = loanPurpose.trim().toLowerCase();

    if (purpose.includes("car") || purpose.includes("vehicle")) {
      return "vehicle";
    }
    if (purpose.includes("medical") || purpose.includes("hospital")) {
      return "medical";
    }
    if (purpose.includes("study") || purpose.includes("education")) {
      return "education";
    }
    if (purpose.includes("home") || purpose.includes("repair")) {
      return "home_improvement";
    }
    if (purpose.includes("business")) {
      return "business";
    }

    return "personal";
  }, [loanPurpose]);

  const handleSubmit = async () => {
    if (!loan?.loanId) {
      Alert.alert(
        "Missing Loan",
        "Please choose a loan before submitting an application.",
      );
      return;
    }

    if (!kycVerified) {
      Alert.alert(
        "KYC Required",
        "Please complete KYC verification before submitting a loan application.",
        [
          { text: "Not Now", style: "cancel" },
          {
            text: "Open Profile",
            onPress: () => navigateToBorrowerTab(navigation, "Profile"),
          },
        ],
      );
      return;
    }

    if (!isValidAmount(loanAmount)) {
      Alert.alert("Invalid amount", "Please enter a valid loan amount.");
      return;
    }

    const requestedAmount = Number.parseFloat(loanAmount);
    if (requestedAmount < minimumLoanAmount) {
      Alert.alert(
        "Amount too low",
        `Requested amount must be at least LKR ${minimumLoanAmount.toLocaleString()}.`,
      );
      return;
    }

    if (maximumLoanAmount > 0 && requestedAmount > maximumLoanAmount) {
      Alert.alert(
        "Amount too high",
        `Requested amount cannot exceed LKR ${maximumLoanAmount.toLocaleString()}.`,
      );
      return;
    }

    if (!loanPurpose.trim()) {
      Alert.alert("Missing purpose", "Please enter the loan purpose.");
      return;
    }

    if (!employmentStatus.trim()) {
      Alert.alert(
        "Missing employment status",
        "Please enter your employment status.",
      );
      return;
    }

    if (!isValidAmount(monthlyIncome)) {
      Alert.alert("Invalid income", "Please enter a valid monthly income.");
      return;
    }

    const duration = Number.parseInt(repaymentDuration, 10);
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert(
        "Invalid repayment duration",
        "Please enter duration in months.",
      );
      return;
    }

    const normalizedPreferredRate = preferredInterestRate.trim();
    if (normalizedPreferredRate.length === 0) {
      Alert.alert(
        "Missing preferred rate",
        "Please enter a preferred interest rate.",
      );
      return;
    }

    const preferredRate = Number.parseFloat(normalizedPreferredRate);
    if (Number.isNaN(preferredRate)) {
      Alert.alert(
        "Invalid preferred rate",
        "Please enter a valid preferred interest rate.",
      );
      return;
    }

    const loanInterestRate = Number(loan.interestRate);
    if (!Number.isFinite(loanInterestRate) || loanInterestRate <= 0) {
      Alert.alert(
        "Loan interest unavailable",
        "Unable to validate preferred rate because loan interest rate is missing.",
      );
      return;
    }

    if (preferredRate >= loanInterestRate) {
      Alert.alert(
        "Preferred rate too high",
        `Preferred interest rate must be lower than ${loanInterestRate}%.`,
      );
      return;
    }

    try {
      setLoading(true);
      const createdApplication = await createApplication({
        loanId: loan.loanId,
        requestedAmount,
        purpose: normalizedLoanCategory,
        description: [
          `Loan Purpose: ${loanPurpose.trim()}`,
          `Employment Status: ${employmentStatus.trim()}`,
          `Monthly Income: LKR ${monthlyIncome.trim()}`,
          `Preferred Interest Rate: ${normalizedPreferredRate}%`,
        ].join(" | "),
        loanTermMonths: duration,
        preferredRepaymentMethod: "qr_payment",
      });

      const applicationId = createdApplication?.data?.applicationId;
      if (applicationId) {
        await applicationService.submitApplication(applicationId);
      }

      Alert.alert("Success", "Application submitted successfully.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("MyApplications"),
        },
      ]);
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert(
        "Error",
        "Failed to submit application. Please review your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name='arrow-left' size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Application</Text>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Feather name='bell' size={20} color='#FFFFFF' />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.lenderCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {loan?.lenderName?.charAt(0) ?? "M"}
            </Text>
          </View>
          <Text style={styles.lenderName}>
            {loan?.lenderName ?? "Maya Fernando"}
          </Text>
        </View>

        <View style={styles.loanInfoCard}>
          <View style={styles.loanInfoRow}>
            <Text style={styles.loanTitle}>Personal Loan</Text>
            <Text style={styles.loanAmountText}>
              LKR {loan?.amount?.toLocaleString() ?? "8,000.00"}
            </Text>
          </View>
          <View style={styles.loanInfoDetails}>
            <Text style={styles.loanInfoText}>
              {loan?.interestRate ?? "6.5"}% | {loan?.durationMonths ?? "22"}{" "}
              months
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "60%" }]} />
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreLabel}>High</Text>
              <Text style={styles.scoreValue}>Smart Score</Text>
              <Feather
                name='check-circle'
                size={16}
                color='#007AFF'
                style={styles.scoreIcon}
              />
            </View>
            <View style={styles.scoreRight}>
              <Feather name='star' size={16} color='#F59E0B' />
              <Feather name='star' size={16} color='#F59E0B' />
              <Text style={styles.scoreRating}>2.0</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Fill Application</Text>

          {!checkingEligibility && !kycVerified ? (
            <View style={styles.warningBanner}>
              <Feather name='alert-circle' size={16} color='#B45309' />
              <Text style={styles.warningText}>
                KYC verification is required before this application can be
                submitted.
              </Text>
            </View>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loan Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currency}>LKR</Text>
              <TextInput
                style={styles.input}
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType='decimal-pad'
                placeholder='Enter loan amount'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Employment Status</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={employmentStatus}
                onChangeText={setEmploymentStatus}
                placeholder='e.g. Full-Time Employee'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loan Purpose</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
                placeholder='Enter loan purpose'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Income</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currency}>LKR</Text>
              <TextInput
                style={styles.input}
                value={monthlyIncome}
                onChangeText={setMonthlyIncome}
                keyboardType='decimal-pad'
                placeholder='Enter monthly income'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Repayment Duration (Months)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={repaymentDuration}
                onChangeText={setRepaymentDuration}
                keyboardType='number-pad'
                placeholder='e.g. 12'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Preferred Interest Rate (%)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={preferredInterestRate}
                onChangeText={setPreferredInterestRate}
                keyboardType='decimal-pad'
                placeholder='e.g. 11.5'
                placeholderTextColor='#9CA3AF'
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (loading || checkingEligibility) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading || checkingEligibility}
        >
          <Text style={styles.submitButtonText}>
            {loading
              ? "Submitting..."
              : checkingEligibility
                ? "Checking eligibility..."
                : "Submit Application"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  notificationButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lenderCard: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#007AFF",
  },
  lenderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  loanInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loanInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  loanTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  loanAmountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  loanInfoDetails: {
    marginBottom: 15,
  },
  loanInfoText: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 15,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 5,
  },
  scoreValue: {
    fontSize: 14,
    color: "#6B7280",
    marginRight: 5,
  },
  scoreIcon: {
    marginLeft: 5,
  },
  scoreRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreRating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 5,
  },
  formSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400E",
    fontWeight: "500",
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 5,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  currency: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 50,
    elevation: 2,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

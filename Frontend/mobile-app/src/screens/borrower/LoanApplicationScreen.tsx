/** @format */

import React, { useState } from "react";
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
import { createApplication } from "../../api/services/application.service";
import { isValidAmount } from "../../utils/validation";

type Loan = {
  loanId: string;
  lenderName?: string;
  amount?: number;
  interestRate?: number;
  durationMonths?: number;
};

type LoanApplicationScreenProps = {
  route: {
    params?: {
      loan?: Loan;
    };
  };
  navigation: any;
};

export default function LoanApplicationScreen({
  route,
  navigation,
}: LoanApplicationScreenProps) {
  const loan = route.params?.loan;
  const [loanAmount, setLoanAmount] = useState("5000.00");
  const [employmentStatus] = useState("Full-Time Employee");
  const [loanPurpose] = useState("Car Repair");
  const [monthlyIncome] = useState("5000.00");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!loan?.loanId) {
      Alert.alert(
        "Missing Loan",
        "Please choose a loan before submitting an application.",
      );
      return;
    }

    if (!isValidAmount(loanAmount)) {
      Alert.alert("Invalid amount", "Please enter a valid loan amount.");
      return;
    }

    try {
      setLoading(true);
      await createApplication({
        loanId: loan.loanId,
        requestedAmount: Number.parseFloat(loanAmount),
        purpose: loanPurpose,
        description: `${employmentStatus} - Monthly Income: LKR ${monthlyIncome}`,
      });

      Alert.alert("Success", "Application submitted successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("MyApplications"),
        },
      ]);
    } catch (error) {
      console.error("Error submitting application:", error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
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
        <TouchableOpacity style={styles.notificationButton}>
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
              {loan?.interestRate ?? "6.5"}% • {loan?.durationMonths ?? "22"}{" "}
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loan Amount</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currency}>LKR</Text>
              <TextInput
                style={styles.input}
                value={loanAmount}
                onChangeText={setLoanAmount}
                keyboardType='decimal-pad'
              />
              <Feather name='chevron-right' size={20} color='#6B7280' />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Employment Status</Text>
            <TouchableOpacity style={styles.dropdownContainer}>
              <View style={styles.dropdownLeft}>
                <Feather name='briefcase' size={20} color='#007AFF' />
                <Text style={styles.dropdownText}>{employmentStatus}</Text>
              </View>
              <Feather name='chevron-down' size={20} color='#6B7280' />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Loan Purpose</Text>
            <TouchableOpacity style={styles.dropdownContainer}>
              <View style={styles.dropdownLeft}>
                <Feather name='tool' size={20} color='#007AFF' />
                <Text style={styles.dropdownText}>{loanPurpose}</Text>
              </View>
              <Feather name='chevron-down' size={20} color='#6B7280' />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Monthly Income</Text>
            <View style={styles.incomeContainer}>
              <Text style={styles.incomeValue}>LKR {monthlyIncome}</Text>
              <Feather name='chevron-right' size={20} color='#6B7280' />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Submitting..." : "Submit Application"}
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
    padding: 20,
    marginBottom: 20,
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
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
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
    paddingHorizontal: 15,
    paddingVertical: 15,
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
  dropdownContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 15,
    color: "#1A1A1A",
    marginLeft: 10,
  },
  incomeContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
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

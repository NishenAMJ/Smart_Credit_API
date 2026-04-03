/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LoanDetailsHeader from "../../components/borrower/LoanDetailsHeader";

type LoanDetailsScreenProps = {
  route: {
    params?: {
      loan?: {
        loanId?: string;
        lenderName?: string;
        minAmount?: number;
        maxAmount?: number;
        durationMonths?: number;
        interestRate?: number;
      };
    };
  };
  navigation: any;
};

export default function LoanDetailsScreen({
  route,
  navigation,
}: LoanDetailsScreenProps) {
  const loan = route.params?.loan;

  return (
    <View style={styles.container}>
      <LoanDetailsHeader
        title='Loan Details'
        onBack={() => navigation.goBack()}
      />

      <View style={styles.card}>
        <Text style={styles.name}>{loan?.lenderName ?? "Unknown Lender"}</Text>
        <Text style={styles.text}>
          Amount Range: LKR {loan?.minAmount?.toLocaleString() ?? "0"} - LKR{" "}
          {loan?.maxAmount?.toLocaleString() ?? "0"}
        </Text>
        <Text style={styles.text}>
          Duration: {loan?.durationMonths ?? 0} months
        </Text>
        <Text style={styles.text}>
          Interest: {loan?.interestRate ?? "N/A"}%
        </Text>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => navigation.navigate("LoanApplication", { loan })}
        >
          <Text style={styles.applyButtonText}>Continue Application</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  card: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },
  applyButton: {
    marginTop: 16,
    backgroundColor: "#0066FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

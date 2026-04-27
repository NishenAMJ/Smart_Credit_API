/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import LoanDetailsHeader from "../../components/borrower/LoanDetailsHeader";

type FilterLoansScreenProps = {
  navigation: any;
};

export default function FilterLoansScreen({
  navigation,
}: FilterLoansScreenProps) {
  return (
    <View style={styles.container}>
      <LoanDetailsHeader title='Filters' onBack={() => navigation.goBack()} />

      <View style={styles.card}>
        <Text style={styles.title}>Loan Filters</Text>
        <Text style={styles.description}>
          Use this screen to add amount, tenure, and lender filters.
        </Text>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
  },
});

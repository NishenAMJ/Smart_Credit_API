/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type LoanCardProps = {
  loan: {
    lenderName?: string;
    minAmount?: number;
    maxAmount?: number;
    amount?: number;
    durationMonths?: number;
    isFeatured?: boolean;
  };
  onPress?: () => void;
};

export default function LoanCard({ loan, onPress }: LoanCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {loan.lenderName?.charAt(0) || "L"}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.lenderName}>
            {loan.lenderName ?? "Unknown Lender"}
          </Text>
          <Text style={styles.amount}>
            LKR {loan.minAmount?.toLocaleString() ?? "0"} - LKR{" "}
            {loan.maxAmount?.toLocaleString() ?? "0"}
          </Text>
          <Text style={styles.duration}>{loan.durationMonths ?? 0} months</Text>
        </View>
        <Text style={styles.totalAmount}>
          LKR {loan.amount?.toLocaleString() ?? "0"}
        </Text>
      </View>

      {loan.isFeatured ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>High Smart Score</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.applyText}>Apply Now</Text>
        <Feather name='arrow-right' size={16} color='#007AFF' />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: "row",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  details: {
    flex: 1,
  },
  lenderName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  amount: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  duration: {
    fontSize: 13,
    color: "#6B7280",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  badge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  applyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 5,
  },
});

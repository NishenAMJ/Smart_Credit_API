/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { BorrowerLoan } from "../../types/borrower";

type LoanCardProps = {
  loan: BorrowerLoan;
  onPress?: () => void;
  showApplyNow?: boolean;
};

/**
 * Renders a borrower-facing loan summary card.
 */
export default function LoanCard({
  loan,
  onPress,
  showApplyNow = true,
}: LoanCardProps) {
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
          {loan.amount && loan.amount > 0 ? (
            <Text style={styles.amount}>
              LKR {loan.amount.toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.amount}>
              LKR {loan.minAmount?.toLocaleString() ?? "0"} - LKR{" "}
              {loan.maxAmount?.toLocaleString() ?? "0"}
            </Text>
          )}
          <Text style={styles.duration}>{loan.durationMonths ?? 0} months</Text>
        </View>
        <Text style={styles.totalAmount}>
          {loan.interestRate
            ? `${loan.interestRate}% p.a.`
            : loan.amount
              ? `LKR ${loan.amount.toLocaleString()}`
              : ""}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, styles.sponsoredBadge]}>
          <Text style={styles.sponsoredBadgeText}>SPONSORED</Text>
        </View>
        {loan.isFeatured ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>High Smart Score</Text>
          </View>
        ) : null}
      </View>

      {showApplyNow ? (
        <View style={styles.footer}>
          <Text style={styles.applyText}>Apply Now</Text>
          <Feather name="arrow-right" size={16} color="#007AFF" />
        </View>
      ) : null}
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginRight: 8,
  },
  sponsoredBadge: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  sponsoredBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C2410C",
    letterSpacing: 0.5,
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

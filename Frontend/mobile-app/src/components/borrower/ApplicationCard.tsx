/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type ApplicationCardProps = {
  application: {
    status?: string;
    createdAt?: string;
    loanTitle?: string;
    amount?: number;
    purpose?: string;
  };
  onPress?: () => void;
};

/**
 * Renders a summary card for a borrower loan application.
 */
export default function ApplicationCard({
  application,
  onPress,
}: ApplicationCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#F59E0B" };
      case "approved":
        return { bg: "#D1FAE5", text: "#10B981" };
      case "rejected":
        return { bg: "#FEE2E2", text: "#EF4444" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const statusColor = getStatusColor(application.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.statusText, { color: statusColor.text }]}>
            {application.status?.toUpperCase() ?? "UNKNOWN"}
          </Text>
        </View>
        <Text style={styles.date}>
          {application.createdAt
            ? new Date(application.createdAt).toLocaleDateString()
            : "-"}
        </Text>
      </View>

      <Text style={styles.title}>
        {application.loanTitle || "Loan Application"}
      </Text>
      <Text style={styles.amount}>
        LKR {application.amount?.toLocaleString() ?? "0"}
      </Text>
      <Text style={styles.purpose}>{application.purpose ?? "-"}</Text>

      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Details</Text>
        <Feather name='chevron-right' size={20} color='#6B7280' />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 13,
    color: "#6B7280",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  purpose: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewDetails: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
});

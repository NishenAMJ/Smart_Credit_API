/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type TransactionCardProps = {
  transaction: {
    type?: string;
    status?: string;
    timestamp?: string;
    amount?: number;
  };
  onPress?: () => void;
};

export default function TransactionCard({
  transaction,
  onPress,
}: TransactionCardProps) {
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "repayment":
        return { icon: "arrow-up-right", color: "#EF4444" };
      case "disbursement":
        return { icon: "arrow-down-left", color: "#10B981" };
      default:
        return { icon: "credit-card", color: "#6B7280" };
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "pending":
        return "#F59E0B";
      case "failed":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const typeInfo = getTypeIcon(transaction.type);
  const statusColor = getStatusColor(transaction.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Feather
          name={typeInfo.icon as React.ComponentProps<typeof Feather>["name"]}
          size={20}
          color={typeInfo.color}
        />
      </View>

      <View style={styles.details}>
        <Text style={styles.type}>
          {transaction.type === "repayment" ? "Payment" : "Loan Disbursed"}
        </Text>
        <Text style={styles.date}>
          {transaction.timestamp
            ? new Date(transaction.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "-"}
        </Text>
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            {
              color: transaction.type === "repayment" ? "#EF4444" : "#10B981",
            },
          ]}
        >
          {transaction.type === "repayment" ? "-" : "+"}LKR{" "}
          {transaction.amount?.toLocaleString() ?? "0"}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
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
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  type: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#6B7280",
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

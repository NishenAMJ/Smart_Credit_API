/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type PaymentCardProps = {
  payment: {
    dueDate?: string;
    paidAt?: string;
    timestamp?: string;
    amount?: number;
    lenderName?: string;
    status?: string;
    type?: string;
  };
  paymentMethod?: string;
  onPay?: () => void;
  onPress?: () => void;
};

/**
 * Renders a borrower repayment card with payment action controls.
 */
export default function PaymentCard({
  payment,
  paymentMethod,
  onPay,
  onPress,
}: PaymentCardProps) {
  const methodLabel = paymentMethod ?? "Card";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {payment.lenderName?.charAt(0)?.toUpperCase() ?? "L"}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>
            {payment.type === "disbursement" ? "Loan Received" : payment.status === "PAID" ? "Payment Made" : "Next Payment"}
          </Text>
          <Text style={styles.date}>
            {(() => {
              const dateVal = payment.timestamp ?? payment.paidAt ?? payment.dueDate;
              return dateVal
                ? typeof dateVal === "object"
                  ? "Invalid Date"
                  : new Date(dateVal).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                : "-";
            })()}
          </Text>
        </View>
        {payment.status !== "PAID" && payment.type !== "disbursement" && (
          <TouchableOpacity style={styles.payButton} onPress={onPay}>
            <Text style={styles.payButtonText}>
              {paymentMethod === "Cash (QR)" ? "Generate Cash Code" : `Pay via ${methodLabel}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.amount}>
          LKR {payment.amount?.toLocaleString() ?? "0"}
        </Text>
        {payment.status !== "PAID" && payment.type !== "disbursement" && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.partialButton} onPress={onPay}>
              <Text style={styles.partialText}>Partial</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.payActionButton} onPress={onPay}>
              <Text style={styles.payActionText}>
                {paymentMethod === "Cash (QR)" ? "Show QR" : "Pay"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: "center",
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
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: "#6B7280",
  },
  payButton: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  payButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  actions: {
    flexDirection: "row",
  },
  partialButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  partialText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "500",
  },
  payActionButton: {
    backgroundColor: "#E0F2FE",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  payActionText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "600",
  },
});

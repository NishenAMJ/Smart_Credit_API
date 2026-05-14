/** @format */

import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getPayments } from "../../api/services/payment.service";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import PaymentCard from "../../components/borrower/PaymentCard";

type Payment = {
  paymentId?: string;
  dueDate?: string;
  status?: string;
  amount?: number;
};

type PaymentsScreenProps = {
  navigation: any;
};

type PaymentMethod = "Card" | "Bank Transfer" | "Mobile Wallet";

export default function PaymentsScreen({ navigation }: PaymentsScreenProps) {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "History">(
    "Upcoming",
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("Card");

  const paymentMethods: Array<{
    label: PaymentMethod;
    icon: React.ComponentProps<typeof Feather>["name"];
  }> = [
    { label: "Card", icon: "credit-card" },
    { label: "Bank Transfer", icon: "repeat" },
    { label: "Mobile Wallet", icon: "smartphone" },
  ];

  useEffect(() => {
    void fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await getPayments();
      setPayments((data as Payment[]) ?? []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    if (activeTab === "Upcoming") {
      return payments.filter((payment) => payment.status !== "PAID");
    }
    return payments.filter((payment) => payment.status === "PAID");
  }, [activeTab, payments]);

  const handlePay = (payment: Payment) => {
    Alert.alert(
      "Payment Method",
      `Proceeding with ${selectedPaymentMethod} for LKR ${
        payment.amount?.toLocaleString() ?? "0"
      }.`,
    );
  };

  const renderPaymentCard = ({ item }: { item: Payment }) => {
    return (
      <PaymentCard
        payment={item}
        paymentMethod={selectedPaymentMethod}
        onPay={() => handlePay(item)}
      />
    );
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name='menu' size={24} color='#FFFFFF' />
          <Text style={styles.headerTitle}>Payments</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Feather name='bell' size={20} color='#FFFFFF' />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("Upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "History" && styles.activeTab]}
          onPress={() => setActiveTab("History")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "History" && styles.activeTabText,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.searchButton}>
          <Feather name='search' size={20} color='#6B7280' />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterLeft}>
          <Text style={styles.filterLabel}>Personal Loan:</Text>
          <TouchableOpacity style={styles.filterDropdown}>
            <Text style={styles.filterValue}>All</Text>
            <Feather name='chevron-down' size={16} color='#6B7280' />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRight}>
          <Text style={styles.filterLabel}>Sort By:</Text>
          <TouchableOpacity style={styles.filterDropdown}>
            <Text style={styles.filterValue}>Due Date</Text>
            <Feather name='chevron-down' size={16} color='#6B7280' />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{activeTab} Payments</Text>
      </View>

      <View style={styles.methodContainer}>
        <Text style={styles.methodTitle}>Payment Method</Text>
        <View style={styles.methodList}>
          {paymentMethods.map((method) => {
            const isActive = selectedPaymentMethod === method.label;
            return (
              <TouchableOpacity
                key={method.label}
                style={[styles.methodChip, isActive && styles.activeMethodChip]}
                onPress={() => setSelectedPaymentMethod(method.label)}
              >
                <Feather
                  name={method.icon}
                  size={16}
                  color={isActive ? "#FFFFFF" : "#007AFF"}
                />
                <Text
                  style={[
                    styles.methodChipText,
                    isActive && styles.activeMethodChipText,
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentCard}
        keyExtractor={(item, index) => item.paymentId ?? String(index)}
        contentContainerStyle={styles.paymentList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title='No payments found.' />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 15,
  },
  notificationButton: {
    padding: 5,
  },
  tabContainer: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  tab: {
    marginRight: 20,
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 15,
    color: "#6B7280",
  },
  activeTabText: {
    fontWeight: "600",
    color: "#007AFF",
  },
  searchButton: {
    marginLeft: "auto",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 8,
  },
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginRight: 4,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F5F6FA",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  methodContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  methodTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
    fontWeight: "500",
  },
  methodList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  methodChip: {
    backgroundColor: "#EAF2FF",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  activeMethodChip: {
    backgroundColor: "#007AFF",
  },
  methodChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
  },
  activeMethodChipText: {
    color: "#FFFFFF",
  },
  paymentList: {
    paddingHorizontal: 15,
    paddingBottom: 100,
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
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
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 13,
    color: "#6B7280",
  },
  payButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  historyButton: {
    backgroundColor: "#007AFF",
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  paymentDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDetailDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  paymentActions: {
    flexDirection: "row",
  },
  partialButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  partialButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  payActionButton: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  payActionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
  },
});

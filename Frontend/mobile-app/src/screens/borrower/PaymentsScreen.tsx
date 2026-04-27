/** @format */

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FlatList,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { getPayments, paymentService } from "../../api/services/payment.service";
import { getTransactions } from "../../api/services/transaction.service";
import { dashboardService } from "../../api/services/dashboard.service";
import EmptyState from "../../components/common/EmptyState";
import Loader from "../../components/common/Loader";
import PaymentCard from "../../components/borrower/PaymentCard";
import SidebarMenu from "../../components/common/SidebarMenu";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";
import { BORDER_RADIUS } from "../../constants/borderRadius";
import type { BorrowerNavigation } from "../../types/navigation";
import type { BorrowerRepayment } from "../../types/borrower";
import type { RouteProp } from "@react-navigation/native";
import TransactionDetailsScreen from "../../screens/borrower/TransactionDetailsScreen";

type PaymentsScreenProps = {
  navigation: BorrowerNavigation;
  route?: RouteProp<any, any>;
};

type PaymentMethod = "Card" | "Bank Transfer" | "Cash (QR)";

type PaymentMethodConfig =
  | {
      label: "Card" | "Bank Transfer";
      iconSet: "feather";
      icon: React.ComponentProps<typeof Feather>["name"];
    }
  | {
      label: "Cash (QR)";
      iconSet: "material";
      icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    };

/**
 * Manages borrower payment workflows for upcoming and past repayments.
 */
export default function PaymentsScreen({ navigation, route }: PaymentsScreenProps) {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "History">(
    route?.params?.tab ?? "Upcoming",
  );
  const [payments, setPayments] = useState<BorrowerRepayment[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dashboardNextPayment, setDashboardNextPayment] = useState<{
    amount?: number;
    dueDate?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("Card");
  const [error, setError] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQRPayment, setSelectedQRPayment] = useState<BorrowerRepayment | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const paymentMethods: PaymentMethodConfig[] = [
    { label: "Card", iconSet: "feather", icon: "credit-card" },
    { label: "Bank Transfer", iconSet: "feather", icon: "repeat" },
    { label: "Cash (QR)", iconSet: "material", icon: "qrcode-scan" },
  ];

  const fetchPayments = async () => {
    try {
      setError(null);
      const [paymentsData, transactionsData, dashboardData] = await Promise.all([
        getPayments(),
        getTransactions(),
        dashboardService.getDashboard().catch(() => null),
      ]);
      setPayments(paymentsData ?? []);
      setTransactions(transactionsData ?? []);
      const dash = dashboardData?.data ?? dashboardData ?? null;
      if (dash?.nextPaymentAmount) {
        setDashboardNextPayment({
          amount: dash.nextPaymentAmount,
          dueDate: dash.nextPaymentDate,
        });
      } else {
        setDashboardNextPayment(null);
      }
    } catch (err) {
      console.error("Error fetching payments/transactions:", err);
      setError("Failed to load data. Please try again.");
      setPayments([]);
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchPayments();
  }, []);

  useEffect(() => {
    if (route?.params?.tab) {
      setActiveTab(route.params.tab as any);
    }
  }, [route?.params?.tab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    if (activeTab === "Upcoming") {
      let upcoming = payments.filter(
        (p) => p.status !== "PAID" && p.status !== "COMPLETED",
      );

      // If the backend returned no upcoming stubs but the dashboard shows a next
      // payment, inject a synthetic entry so the list is never misleadingly empty.
      if (upcoming.length === 0 && dashboardNextPayment?.amount) {
        upcoming = [
          {
            paymentId: "dashboard-next",
            amount: dashboardNextPayment.amount,
            status: "PENDING",
            dueDate: dashboardNextPayment.dueDate,
            lenderName: "Lender",
          } as BorrowerRepayment,
        ];
      }

      // Sort ascending by dueDate (earliest first)
      return upcoming.slice().sort((a, b) => {
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return aTime - bTime;
      });
    }

    // Merge paid repayments from `payments` + all `transactions`, deduplicate by ID
    const paidRepayments = payments.filter(
      (p) => p.status === "PAID" || p.status === "COMPLETED",
    );

    const txAsRepayments: BorrowerRepayment[] = transactions.map((t) => ({
      paymentId: t.transactionId ?? t.repaymentId,
      transactionId: t.transactionId,
      repaymentId: t.repaymentId,
      loanId: t.loanId,
      amount: t.amount,
      status: t.status,
      paidAt: t.paidAt ?? t.timestamp,
      timestamp: t.timestamp,
      type: t.type,
      lenderName: t.lenderName,
    }));

    // Merge and deduplicate by ID
    const seen = new Set<string>();
    const merged: BorrowerRepayment[] = [];
    for (const item of [...paidRepayments, ...txAsRepayments]) {
      const id = item.paymentId ?? item.transactionId ?? item.repaymentId;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      merged.push(item);
    }

    // Sort newest first
    return merged.sort((a, b) => {
      const aTime = new Date(a.paidAt ?? a.timestamp ?? 0).getTime();
      const bTime = new Date(b.paidAt ?? b.timestamp ?? 0).getTime();
      return bTime - aTime;
    });
  }, [activeTab, payments, transactions]);

  const generateQRCodeToken = async (payment: BorrowerRepayment) => {
    try {
      if (!payment.loanId) return;
      setGeneratingQr(true);
      setQrToken(null);
      const data = await paymentService.generateQr(payment.loanId);
      if (data?.qrCode) {
        setQrToken(data.qrCode);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      console.error("QR Generation error:", err);
      Alert.alert("Error", "Failed to generate QR code. Please try again.");
      setQrModalVisible(false);
    } finally {
      setGeneratingQr(false);
    }
  };

  const handlePay = (payment: BorrowerRepayment) => {
    const formattedAmount = new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(payment.amount ?? 0);

    let paymentMethodApi: "bank_transfer" | "qr_payment" | "cash" = "bank_transfer";
    if (selectedPaymentMethod === "Card") paymentMethodApi = "bank_transfer";
    if (selectedPaymentMethod === "Bank Transfer") paymentMethodApi = "bank_transfer";
    if (selectedPaymentMethod === "Cash (QR)") paymentMethodApi = "qr_payment";

    if (selectedPaymentMethod === "Cash (QR)") {
      setSelectedQRPayment(payment);
      setQrModalVisible(true);
      generateQRCodeToken(payment);
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `Proceeding with ${selectedPaymentMethod} for ${formattedAmount}.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Pay Now", 
          onPress: async () => {
            try {
              if (!payment.loanId) {
                Alert.alert("Error", "Loan ID is missing for this payment.");
                return;
              }
              setProcessingPaymentId(payment.paymentId || null);
              
              await paymentService.makeRepayment({
                loanId: payment.loanId,
                amount: payment.amount ?? 0,
                paymentMethod: paymentMethodApi,
                transactionReference: `TXN-${Date.now()}`
              });

              Alert.alert("Success", "Payment submitted successfully and is pending verification.");
              void fetchPayments();
            } catch (err) {
              console.error("Payment error:", err);
              Alert.alert("Error", "Failed to process payment. Please try again.");
            } finally {
              setProcessingPaymentId(null);
            }
          }
        },
      ],
    );
  };

  const renderPaymentCard = ({ item }: { item: BorrowerRepayment }) => {
    const handlePress = () => {
      if (activeTab === "History") {
        // Navigate to TransactionDetailsScreen with the item mapped as a BorrowerTransaction
        navigation.navigate("TransactionDetails", {
          transaction: {
            transactionId: item.transactionId ?? item.repaymentId ?? item.paymentId,
            repaymentId: item.repaymentId,
            loanId: item.loanId,
            type: item.type ?? "repayment",
            status: item.status,
            paidAt: item.paidAt,
            timestamp: item.timestamp,
            createdAt: (item as any).createdAt,
            amount: item.amount,
            lenderName: item.lenderName,
          },
        });
      } else {
        handlePay(item);
      }
    };

    return (
      <PaymentCard
        payment={item}
        paymentMethod={selectedPaymentMethod}
        onPay={handlePress}
        onPress={handlePress}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Feather name="menu" size={24} color={COLORS.surface || "#FFFFFF"} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name="bell" size={20} color={COLORS.surface || "#FFFFFF"} />
          </TouchableOpacity>
        </View>
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

      </View>

      {activeTab === "Upcoming" && (
        <View style={styles.methodWrapper}>
          <View style={styles.methodContainer}>
            <Text style={styles.methodTitle}>Select Payment Method</Text>
            <View style={styles.methodList}>
              {paymentMethods.map((method) => {
                const isActive = selectedPaymentMethod === method.label;
                return (
                  <TouchableOpacity
                    key={method.label}
                    style={[
                      styles.methodChip,
                      isActive && styles.activeMethodChip,
                    ]}
                    onPress={() => setSelectedPaymentMethod(method.label)}
                  >
                    {method.iconSet === "feather" ? (
                      <Feather
                        name={method.icon}
                        size={14}
                        color={isActive ? (COLORS.surface || "#FFFFFF") : COLORS.primary}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={method.icon}
                        size={14}
                        color={isActive ? (COLORS.surface || "#FFFFFF") : COLORS.primary}
                      />
                    )}
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
        </View>
      )}

      {activeTab === "Upcoming" && payments.some((p) => p.status === "PENDING") && (
        <View style={styles.pendingBanner}>
          <Feather name="clock" size={16} color="#B45309" />
          <Text style={styles.pendingBannerText}>
            You have payments pending verification.
          </Text>
        </View>
      )}

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentCard}
        keyExtractor={(item, index) => item.paymentId ?? item.transactionId ?? String(index)}
        contentContainerStyle={styles.paymentList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          loading ? (
            <Loader />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color={COLORS.error || "#EF4444"} />
              <Text style={styles.errorText}>
                {typeof error === "string" ? error : "Failed to load"}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchPayments}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              title={`No ${activeTab.toLowerCase()} payments found.`}
            />
          )
        }
      />

      {/* QR Code Modal for Cash Payments */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setQrModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cash Payment</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)} style={styles.modalCloseBtn}>
                <Feather name="x" size={24} color={COLORS.textSecondary || "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstructions}>
              Show this QR code to your lender. They will scan it to instantly verify and record your cash payment of{" "}
              <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
                LKR {selectedQRPayment?.amount?.toLocaleString() ?? "0"}
              </Text>.
            </Text>

            {generatingQr ? (
              <View style={styles.qrPlaceholderBox}>
                <Loader />
                <Text style={styles.qrPlaceholderText}>Generating QR Code...</Text>
              </View>
            ) : qrToken ? (
              <View style={styles.qrPlaceholderBox}>
                <QRCode value={qrToken} size={200} backgroundColor="#F3F4F6" color={COLORS.primary} />
              </View>
            ) : (
              <View style={styles.qrPlaceholderBox}>
                <MaterialCommunityIcons name="qrcode-scan" size={64} color={COLORS.primary || "#007AFF"} />
                <Text style={styles.qrPlaceholderText}>QR Code automatically generates here</Text>
              </View>
            )}

            <View style={styles.qrInfoBox}>
              <Feather name="info" size={16} color={COLORS.primary || "#007AFF"} />
              <Text style={styles.qrInfoText}>Do not close this screen until the lender has successfully scanned it.</Text>
            </View>
          </View>
        </View>
      </Modal>

      <SidebarMenu
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: SPACING.xl,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle.fontSize,
    fontWeight: TYPOGRAPHY.subtitle.fontWeight,
    color: COLORS.surface,
    marginLeft: SPACING.lg,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 15,
  },
  tabContainer: {
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    marginRight: SPACING.xxl + 1,
    paddingVertical: 6,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: COLORS.textSecondary || "#9CA3AF",
    fontWeight: TYPOGRAPHY.small.fontWeight,
  },
  activeTabText: {
    fontWeight: TYPOGRAPHY.heading.fontWeight,
    color: COLORS.primary,
  },

  methodWrapper: {
    backgroundColor: COLORS.surface,
    paddingVertical: 15,
    marginBottom: 10,
  },
  methodContainer: {
    paddingHorizontal: SPACING.lg,
  },
  methodTitle: {
    fontSize: 14,
    color: COLORS.textPrimary || "#374151",
    marginBottom: SPACING.md,
    fontWeight: "600",
  },
  methodList: {
    flexDirection: "row",
    gap: 10,
  },
  methodChip: {
    backgroundColor: "#EAF2FF",
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
  },
  activeMethodChip: {
    backgroundColor: COLORS.primary,
  },
  methodChipText: {
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  activeMethodChipText: {
    color: COLORS.surface,
  },
  paymentList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  pendingBanner: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: 10,
    borderRadius: BORDER_RADIUS.medium,
    flexDirection: "row",
    alignItems: "center",
  },
  pendingBannerText: {
    marginLeft: 8,
    color: "#B45309",
    fontSize: 13,
    fontWeight: "500",
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.surface,
    fontWeight: "600",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderRadius: 20,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary || "#1A1A1A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalInstructions: {
    fontSize: 15,
    color: COLORS.textSecondary || "#6B7280",
    lineHeight: 22,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  qrPlaceholderBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  qrPlaceholderText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary || "#6B7280",
    fontWeight: "500",
  },
  qrInfoBox: {
    flexDirection: "row",
    backgroundColor: "#EAF2FF",
    padding: SPACING.md,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  qrInfoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.primary || "#007AFF",
    lineHeight: 18,
    fontWeight: "500",
  },
});

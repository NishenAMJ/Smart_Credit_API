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
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import {
  getPayments,
  paymentService,
} from "../../api/services/payment.service";
import { getApiErrorMessage } from "../../api/api-error";
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
import { isPaidPayment } from "../../utils/paymentCardUtils";
//import TransactionDetailsScreen from "../../screens/borrower/TransactionDetailsScreen";

type PaymentsScreenProps = {
  navigation: BorrowerNavigation;
  route?: RouteProp<any, any>;
};

type PaymentMethod = "Card" | "Bank Transfer" | "QR Payment";

type PaymentMethodConfig =
  | {
      label: "Card" | "Bank Transfer";
      iconSet: "feather";
      icon: React.ComponentProps<typeof Feather>["name"];
    }
  | {
      label: "QR Payment";
      iconSet: "material";
      icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    };

/**
 * Manages borrower payment workflows for upcoming and past repayments.
 */
export default function PaymentsScreen({
  navigation,
  route,
}: PaymentsScreenProps) {
  const [activeTab, setActiveTab] = useState<"Upcoming" | "History">(
    route?.params?.tab ?? "Upcoming",
  );
  const [payments, setPayments] = useState<BorrowerRepayment[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dashboardNextPayment, setDashboardNextPayment] = useState<{
    amount?: number;
    dueDate?: string;
    loanId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("Card");
  const [error, setError] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(
    null,
  );
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQRPayment, setSelectedQRPayment] =
    useState<BorrowerRepayment | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [paymentProof, setPaymentProof] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const pickReceiptImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPaymentProof(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking image:", err);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  };

  const paymentMethods: PaymentMethodConfig[] = [
    { label: "Card", iconSet: "feather", icon: "credit-card" },
    { label: "Bank Transfer", iconSet: "feather", icon: "repeat" },
    { label: "QR Payment", iconSet: "material", icon: "qrcode-scan" },
  ];

  const fetchPayments = async () => {
    try {
      setError(null);
      const [paymentsData, transactionsData, dashboardData] = await Promise.all(
        [
          getPayments(),
          getTransactions(),
          dashboardService.getDashboard().catch(() => null),
        ],
      );
      setPayments(paymentsData ?? []);
      setTransactions(transactionsData ?? []);
      const dash = dashboardData?.data ?? dashboardData ?? null;
      if (dash?.nextPaymentAmount) {
        setDashboardNextPayment({
          amount: dash.nextPaymentAmount,
          dueDate: dash.nextDueDate,
          loanId: dash.loanId ?? dash.nextPaymentLoanId,
        });
      } else {
        setDashboardNextPayment(null);
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to load payment data. Please try again.",
      );
      console.error("Error fetching payments/transactions:", message);
      setError(message);
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
      let upcoming = payments.filter((p) => {
        const s = String(p.status || "").toLowerCase();
        return s !== "paid" && s !== "completed";
      });

      // If the backend returned no upcoming stubs but the dashboard shows a next
      // payment, inject a synthetic entry so the list is never misleadingly empty.
      if (
        upcoming.length === 0 &&
        dashboardNextPayment?.amount &&
        (!dashboardNextPayment.dueDate ||
          (new Date(dashboardNextPayment.dueDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24) <=
            25)
      ) {
        upcoming = [
          {
            paymentId: "dashboard-next",
            amount: dashboardNextPayment.amount,
            status: "PENDING",
            dueDate: dashboardNextPayment.dueDate,
            loanId: dashboardNextPayment.loanId,
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
    const paidRepayments = payments.filter((p) => {
      const s = String(p.status || "").toLowerCase();
      return s === "paid" || s === "completed";
    });

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
      paymentMethod: t.paymentMethod,
      lenderName: t.lenderName,
    }));

    // Merge and deduplicate by ID
    const seen = new Set<string>();
    const merged: BorrowerRepayment[] = [];
    for (const item of [...paidRepayments, ...txAsRepayments]) {
      const id = item.paymentId ?? item.transactionId ?? item.repaymentId;
      if (id && seen.has(id)) {
        const existingIndex = merged.findIndex(
          (entry) =>
            (entry.paymentId ?? entry.transactionId ?? entry.repaymentId) ===
            id,
        );
        if (
          existingIndex >= 0 &&
          !merged[existingIndex].lenderName &&
          item.lenderName
        ) {
          merged[existingIndex] = {
            ...merged[existingIndex],
            lenderName: item.lenderName,
          };
        }
        continue;
      }
      if (id) {
        seen.add(id);
      }
      merged.push(item);
    }

    // Sort newest first
    return merged.sort((a, b) => {
      const aTime = new Date(a.paidAt ?? a.timestamp ?? 0).getTime();
      const bTime = new Date(b.paidAt ?? b.timestamp ?? 0).getTime();
      return bTime - aTime;
    });
  }, [activeTab, payments, transactions]);

  //Generate QR
  const generateQRCodeToken = async (payment: BorrowerRepayment) => {
    try {
      if (!payment.loanId) return;
      setGeneratingQr(true);
      setQrToken(null);

      const data = await paymentService.generateQr(payment.loanId);

      if (data?.token) {
        setQrToken(data.token);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        "Failed to generate QR code. Please try again.",
      );
      console.error("QR Generation error:", message);
      Alert.alert("QR unavailable", message);
      setQrModalVisible(false);
    } finally {
      setGeneratingQr(false);
    }
  };

  const handlePay = (payment: BorrowerRepayment) => {
    // Validate payment data before proceeding
    if (!payment.amount || payment.amount <= 0) {
      Alert.alert(
        "Invalid Payment Amount",
        "Payment amount must be greater than 0. Please contact support if this is unexpected.",
      );
      return;
    }

    if (!payment.loanId) {
      Alert.alert(
        "Missing Loan Information",
        "This payment cannot be processed because loan information is missing. Please try again or contact support.",
      );
      return;
    }

    const formattedAmount = new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(payment.amount ?? 0);

    const paymentMethodApi =
      selectedPaymentMethod === "Card"
        ? "card"
        : selectedPaymentMethod === "QR Payment"
          ? "qr_payment"
          : "bank_transfer";

    if (selectedPaymentMethod === "QR Payment") {
      if (!payment.loanId) {
        Alert.alert(
          "Invalid Payment",
          "This payment cannot be completed via QR code. Please try another payment method.",
        );
        return;
      }
      setSelectedQRPayment(payment);
      setQrModalVisible(true);
      generateQRCodeToken(payment);
      return;
    }

    if (selectedPaymentMethod === "Bank Transfer" && !paymentProof) {
      Alert.alert(
        "Receipt Required",
        "Please upload a payment receipt for Bank Transfer verification.",
      );
      return;
    }

    const successMessage =
      selectedPaymentMethod === "Card"
        ? "Payment completed successfully."
        : "Payment submitted successfully and is pending verification.";

    Alert.alert(
      "Confirm Payment",
      `Proceeding with ${selectedPaymentMethod} for ${formattedAmount}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            const { amount, loanId, paymentId } = payment;

            if (!amount || amount <= 0 || !loanId) {
              Alert.alert(
                "Error",
                "Invalid payment amount or missing Loan ID.",
              );
              return;
            }
            try {
              setProcessingPaymentId(payment.paymentId || null);

              let proofUrl = undefined;
              if (paymentProof) {
                setUploadingReceipt(true);
                proofUrl = await paymentService.uploadPaymentReceipt(
                  paymentProof.uri,
                );
              }

              await paymentService.makeRepayment({
                loanId: loanId,
                amount: amount,
                paymentMethod: paymentMethodApi,
                transactionReference: `TXN-${Date.now()}`,
                paymentProofUrl: proofUrl,
              });

              Alert.alert("Success", successMessage);
              setPaymentProof(null);
              void fetchPayments();
            } catch (err) {
              const message = getApiErrorMessage(
                err,
                "Failed to process payment. Please try again.",
              );
              console.error("Payment error:", message);
              Alert.alert("Payment failed", message);
            } finally {
              setProcessingPaymentId(null);
              setUploadingReceipt(false);
            }
          },
        },
      ],
    );
  };

  const renderPaymentCard = ({ item }: { item: BorrowerRepayment }) => {
    const handleCardPress = () => {
      // Navigate to TransactionDetailsScreen when paid payment card is tapped
      navigation.navigate("TransactionDetails", {
        transaction: {
          transactionId:
            item.transactionId ?? item.repaymentId ?? item.paymentId,
          repaymentId: item.repaymentId,
          loanId: item.loanId,
          type: item.type ?? "repayment",
          status: item.status,
          paidAt: item.paidAt,
          timestamp: item.timestamp,
          createdAt: (item as any).createdAt,
          amount: item.amount,
          paymentMethod: item.paymentMethod,
          lenderName: item.lenderName,
        },
      });
    };

    return (
      <PaymentCard
        payment={item}
        paymentMethod={selectedPaymentMethod}
        onPay={() => handlePay(item)}
        onPress={handleCardPress}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setSidebarVisible(true)}>
            <Feather
              name='menu'
              size={24}
              color={COLORS.surface || "#FFFFFF"}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather
              name='bell'
              size={20}
              color={COLORS.surface || "#FFFFFF"}
            />
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
                        color={
                          isActive
                            ? COLORS.surface || "#FFFFFF"
                            : COLORS.primary
                        }
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={method.icon}
                        size={14}
                        color={
                          isActive
                            ? COLORS.surface || "#FFFFFF"
                            : COLORS.primary
                        }
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
            {selectedPaymentMethod === "Bank Transfer" && (
              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Upload Payment Receipt</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickReceiptImage}
                >
                  <Feather
                    name={paymentProof ? "check-circle" : "upload"}
                    size={20}
                    color={paymentProof ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.uploadButtonText}>
                    {paymentProof ? "Receipt Selected" : "Tap to select receipt"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {activeTab === "Upcoming" &&
        payments.some((p) => p.status === "PENDING") && (
          <View style={styles.pendingBanner}>
            <Feather name='clock' size={16} color='#B45309' />
            <Text style={styles.pendingBannerText}>
              You have payments pending verification.
            </Text>
          </View>
        )}

      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentCard}
        keyExtractor={(item, index) =>
          item.paymentId ?? item.transactionId ?? String(index)
        }
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
              <Feather
                name='alert-circle'
                size={48}
                color={COLORS.error || "#EF4444"}
              />
              <Text style={styles.errorText}>
                {typeof error === "string" ? error : "Failed to load"}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchPayments}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              title={
                activeTab === "Upcoming"
                  ? "No upcoming payment"
                  : "No history found"
              }
            />
          )
        }
      />

      {/* QR Code Modal for QR payments */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setQrModalVisible(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Payment</Text>
              <TouchableOpacity
                onPress={() => setQrModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Feather
                  name='x'
                  size={24}
                  color={COLORS.textSecondary || "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalInstructions}>
              Show this QR code to your lender. They will scan it to instantly
              verify and record your QR payment of{" "}
              <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
                LKR {selectedQRPayment?.amount?.toLocaleString() ?? "0"}
              </Text>
              .
            </Text>

            {generatingQr ? (
              <View style={styles.qrPlaceholderBox}>
                <Loader />
                <Text style={styles.qrPlaceholderText}>
                  Generating QR Code...
                </Text>
              </View>
            ) : qrToken ? (
              <View style={styles.qrPlaceholderBox}>
                <QRCode
                  value={qrToken}
                  size={200}
                  backgroundColor='#F3F4F6'
                  color={COLORS.primary}
                />
              </View>
            ) : (
              <View style={styles.qrPlaceholderBox}>
                <MaterialCommunityIcons
                  name='qrcode-scan'
                  size={64}
                  color={COLORS.primary || "#007AFF"}
                />
                <Text style={styles.qrPlaceholderText}>
                  QR Code automatically generates here
                </Text>
              </View>
            )}

            <View style={styles.qrInfoBox}>
              <Feather
                name='info'
                size={16}
                color={COLORS.primary || "#007AFF"}
              />
              <Text style={styles.qrInfoText}>
                Do not close this screen until the lender has successfully
                scanned it.
              </Text>
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
  uploadSection: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  uploadLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    marginBottom: SPACING.sm,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  uploadButtonText: {
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 14,
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

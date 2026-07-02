/** @format */

import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getApiErrorMessage } from "../../api/api-error";
import LoanCard from "../../components/borrower/LoanCard";
import TransactionCard from "../../components/borrower/TransactionCard";
import CreditScoreWidget from "../../components/borrower/CreditScoreWidget";
import SidebarMenu from "../../components/common/SidebarMenu";
import { dashboardService } from "../../api/services/dashboard.service";
import { getMyLoans } from "../../api/services/loan.service";
import { transactionService } from "../../api/services/transaction.service";
import { profileService } from "../../api/services/profile.service";
import { creditScoreService } from "../../api/services/creditScore.service";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";
import { formatCurrency, formatDateLabel } from "../../utils/formatters";
import { navigateToBorrowerTab } from "../../utils/borrowerNavigation";
import type {
  BorrowerLoan,
  BorrowerTransaction,
  BorrowerProfile,
} from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type DashboardSummary = {
  profile?: Partial<BorrowerProfile>;
  activeLoans?: number;
  pendingApplications?: number;
  totalOutstanding?: number;
  nextDueDate?: string;
  nextPaymentAmount?: number;
  creditScore?: number;
  totalBorrowed?: number;
  totalRepaid?: number;
};

type MyLoansScreenProps = {
  navigation: BorrowerNavigation;
};

const ACTIVE_LOAN_PREVIEW_LIMIT = 2;
const RECENT_ACTIVITY_LIMIT = 3;

export default function Home({ navigation }: MyLoansScreenProps) {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loans, setLoans] = useState<BorrowerLoan[]>([]);
  const [transactions, setTransactions] = useState<BorrowerTransaction[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const HEADER_MAX_HEIGHT = 330;
  const HEADER_MIN_HEIGHT = 120;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: "clamp",
  });

  const topRowTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, HEADER_SCROLL_DISTANCE],
    extrapolate: "clamp",
  });

  const metricsOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 1.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const topTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const fetchData = async () => {
    try {
      setErrorMessage("");
      const [dashboardResponse, loanData, transactionResponse, creditResponse] =
        await Promise.all([
          dashboardService.getDashboard(),
          getMyLoans("active"),
          transactionService.getMyTransactions(),
          creditScoreService.getMyCreditScore().catch(() => null),
        ]);

      let dashData = dashboardResponse;
      // Unwrap nested data if the service returned the response wrapper instead of the metrics directly
      if (dashData && dashData.data && !dashData.totalOutstanding) {
        dashData = dashData.data;
      }

      // If the dashboard came back without a profile name, fetch it separately
      if (dashData && !dashData.profile?.fullName) {
        try {
          const profile = await profileService.getMyProfile();
          if (profile) {
            dashData = {
              ...dashData,
              profile,
            };
          }
        } catch (profileError) {
          console.warn(
            "Could not fetch profile separately:",
            getApiErrorMessage(
              profileError,
              "Profile details are unavailable.",
            ),
          );
        }
      }

      // Pull credit score from the dedicated endpoint if the dashboard didn't include it
      if (
        dashData &&
        (!dashData.creditScore || dashData.creditScore === 0) &&
        creditResponse
      ) {
        dashData = {
          ...dashData,
          creditScore: creditResponse.data?.creditScore ?? dashData.creditScore,
        };
      }

      // Derive total outstanding from active loans when the dashboard field is zero or missing
      if (
        dashData &&
        (!dashData.totalOutstanding || dashData.totalOutstanding === 0) &&
        loanData?.length > 0
      ) {
        const totalOutstanding = loanData.reduce((sum, loan) => {
          return sum + (loan.outstandingBalance ?? 0);
        }, 0);
        if (totalOutstanding > 0) {
          dashData = {
            ...dashData,
            totalOutstanding,
          };
        }
      }

      setDashboard(dashData);
      setLoans(loanData ?? []);
      setTransactions(transactionResponse?.data ?? []);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load your borrower dashboard.",
      );
      console.error("Error fetching borrower home data:", message);
      setErrorMessage(message);
      setDashboard(null);
      setLoans([]);
      setTransactions([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);
      fetchData().finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

      return () => {
        isActive = false;
      };
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const borrowerName = useMemo(() => {
    const fullName = dashboard?.profile?.fullName?.trim();
    if (!fullName) {
      return "Borrower";
    }
    return fullName.split(" ")[0] ?? fullName;
  }, [dashboard?.profile?.fullName]);

  const activeLoansPreview = useMemo(
    () => loans.slice(0, ACTIVE_LOAN_PREVIEW_LIMIT),
    [loans],
  );

  const recentRepayments = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "repayment")
        .slice(0, RECENT_ACTIVITY_LIMIT),
    [transactions],
  );

  const totalPaid = useMemo(() => {
    return transactions.reduce((sum, transaction) => {
      return String(transaction.status ?? "").toLowerCase() === "completed"
        ? sum + Number(transaction.amount ?? 0)
        : sum;
    }, 0);
  }, [transactions]);

  const completionRatio = useMemo(() => {
    const totalBorrowed = Number(dashboard?.totalBorrowed ?? 0);
    const totalRepaid = Number(dashboard?.totalRepaid ?? totalPaid);

    if (totalBorrowed <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(1, totalRepaid / totalBorrowed));
  }, [dashboard?.totalBorrowed, dashboard?.totalRepaid, totalPaid]);

  const quickActions = [
    {
      label: "Pay Now",
      icon: "credit-card" as const,
      onPress: () =>
        navigateToBorrowerTab(navigation, "Payments", { tab: "Upcoming" }),
    },
    {
      label: "Find Loans",
      icon: "search" as const,
      onPress: () => navigateToBorrowerTab(navigation, "Loans"),
    },
    {
      label: "Applications",
      icon: "file-text" as const,
      onPress: () => navigation.navigate("MyApplications"),
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.hero,
          {
            height: HEADER_MAX_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.heroTopRow,
            { transform: [{ translateY: topRowTranslateY }], zIndex: 20 },
          ]}
        >
          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => setSidebarVisible(true)}
          >
            <Feather name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <Animated.Text
            style={[styles.heroTopTitle, { opacity: topTitleOpacity }]}
          >
            Welcome back, {borrowerName}
          </Animated.Text>

          <TouchableOpacity
            style={styles.heroIconButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name="bell" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            opacity: metricsOpacity,
            flex: 1,
            justifyContent: "flex-end",
            paddingBottom: SPACING.md,
          }}
        >
          <Text style={styles.heroTitle}>Welcome back, {borrowerName}</Text>
          <Text style={styles.heroSubtitle}>
            Track dues, monitor progress, and move quickly on your next loan
            step.
          </Text>

          <View style={styles.heroMetricsRow}>
            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Outstanding</Text>
              <Text style={styles.heroMetricValue}>
                {formatCurrency(dashboard?.totalOutstanding)}
              </Text>
            </View>

            <View style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>Credit Score</Text>
              <Text style={styles.heroMetricValue}>
                {dashboard?.creditScore ?? 0}
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: HEADER_MAX_HEIGHT + 10 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.surface}
            progressViewOffset={HEADER_MAX_HEIGHT - 50}
          />
        }
      >
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Feather
              name="alert-circle"
              size={16}
              color={COLORS.error ?? "#DC2626"}
            />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickActionCard}
              onPress={action.onPress}
            >
              <View style={styles.quickActionIcon}>
                <Feather name={action.icon} size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Portfolio Snapshot</Text>
          </View>

          <View style={styles.snapshotGrid}>
            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Active Loans</Text>
              <Text style={styles.snapshotValue}>
                {dashboard?.activeLoans ?? loans.length}
              </Text>
            </View>

            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Pending Applications</Text>
              <Text style={styles.snapshotValue}>
                {dashboard?.pendingApplications ?? 0}
              </Text>
            </View>

            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Total Borrowed</Text>
              <Text style={styles.snapshotValueSmall}>
                {formatCurrency(dashboard?.totalBorrowed)}
              </Text>
            </View>

            <View style={styles.snapshotCard}>
              <Text style={styles.snapshotLabel}>Total Repaid</Text>
              <Text style={styles.snapshotValueSmall}>
                {formatCurrency(dashboard?.totalRepaid ?? totalPaid)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <CreditScoreWidget
            score={Number(dashboard?.creditScore ?? 0)}
            creditLimit={Number((dashboard as any)?.profile?.creditLimit ?? 0)}
            onPress={() => navigation.navigate("CreditScore")}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.nextPaymentCard}>
            {!dashboard?.nextPaymentAmount ||
            dashboard.nextPaymentAmount <= 0 ||
            (dashboard.nextDueDate &&
              (new Date(dashboard.nextDueDate).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24) >
                25) ? (
              <View
                style={{ alignItems: "center", paddingVertical: SPACING.sm }}
              >
                <Feather
                  name="check-circle"
                  size={32}
                  color={COLORS.primary}
                  style={{ marginBottom: SPACING.sm }}
                />
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: 16, marginBottom: 4 },
                  ]}
                >
                  No upcoming payment
                </Text>
                <Text
                  style={[
                    styles.heroSubtitle,
                    {
                      color: COLORS.textSecondary,
                      textAlign: "center",
                      marginBottom: 0,
                    },
                  ]}
                >
                  You're all caught up!
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.nextPaymentHeader}>
                  <View>
                    <Text style={styles.cardLabel}>Next Payment</Text>
                    <Text style={styles.nextPaymentAmount}>
                      {formatCurrency(dashboard?.nextPaymentAmount)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    onPress={() =>
                      navigateToBorrowerTab(navigation, "Payments", {
                        tab: "Upcoming",
                      })
                    }
                  >
                    <Text style={styles.primaryActionText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.nextPaymentMetaRow}>
                  <View style={styles.metaPill}>
                    <Feather name="calendar" size={14} color={COLORS.primary} />
                    <Text style={styles.metaPillText}>
                      {formatDateLabel(dashboard?.nextDueDate)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.metaPill}
                    onPress={() =>
                      navigateToBorrowerTab(navigation, "Payments", {
                        tab: "History",
                      })
                    }
                  >
                    <Feather name="clock" size={14} color={COLORS.primary} />
                    <Text style={styles.metaPillText}>View History</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Repayment Progress</Text>
            <Text style={styles.sectionMeta}>
              {Math.round(completionRatio * 100)}%
            </Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.max(8, completionRatio * 100)}%` },
                ]}
              />
            </View>

            <View style={styles.progressLegendRow}>
              <Text style={styles.progressLegendText}>
                Repaid {formatCurrency(dashboard?.totalRepaid ?? totalPaid)}
              </Text>
              <Text style={styles.progressLegendText}>
                Borrowed {formatCurrency(dashboard?.totalBorrowed)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Loans</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("MyLoans")}
            >
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {activeLoansPreview.map((loan) => (
            <LoanCard
              key={loan.loanId}
              loan={loan}
              showApplyNow={false}
              onPress={() => navigation.navigate("LoanDetails", { loan })}
            />
          ))}

          {loans.length > ACTIVE_LOAN_PREVIEW_LIMIT ? (
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={() => navigation.navigate("MyLoans")}
            >
              <Text style={styles.secondaryActionText}>
                {loans.length - ACTIVE_LOAN_PREVIEW_LIMIT} more active loans
              </Text>
              <Feather name="arrow-right" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}

          {loans.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No active loans yet</Text>
              <Text style={styles.emptyStateText}>
                Start with lender discovery and compare offers that fit your
                repayment comfort.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => navigateToBorrowerTab(navigation, "Loans")}
              >
                <Text style={styles.primaryActionText}>Explore Loans</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={() =>
                navigateToBorrowerTab(navigation, "Payments", {
                  tab: "History",
                })
              }
            >
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentRepayments.map((transaction) => (
            <TransactionCard
              key={transaction.transactionId}
              transaction={transaction}
              onPress={() =>
                navigation.navigate("TransactionDetails", { transaction })
              }
            />
          ))}

          {recentRepayments.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateTitle}>No recent activity</Text>
              <Text style={styles.emptyStateText}>
                Your latest repayments and loan movements will appear here.
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  heroTopTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heroIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.body.fontSize,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 21,
    marginBottom: SPACING.lg,
  },
  heroMetricsRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  heroMetricCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    padding: SPACING.lg,
  },
  heroMetricLabel: {
    fontSize: TYPOGRAPHY.small.fontSize,
    color: "rgba(255,255,255,0.74)",
    marginBottom: SPACING.xs,
  },
  heroMetricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: 42,
    gap: SPACING.lg,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: SPACING.md,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.error ?? "#DC2626",
    fontSize: TYPOGRAPHY.small.fontSize,
    lineHeight: 18,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  section: {
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  snapshotCard: {
    width: "48.5%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  snapshotLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  snapshotValue: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  snapshotValueSmall: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  nextPaymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: SPACING.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  nextPaymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.small.fontSize,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  nextPaymentAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  nextPaymentMetaRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAF2FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  primaryActionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.success,
  },
  progressLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  progressLegendText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  secondaryActionText: {
    marginRight: 6,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  emptyStateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xl,
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyStateText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
});

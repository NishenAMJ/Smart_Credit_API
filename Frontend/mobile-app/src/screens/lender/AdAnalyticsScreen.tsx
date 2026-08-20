import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ApiError, getApiErrorMessage } from "../../api/api-error";
import {
  AdService,
  AdvertisementAnalytics,
} from "../../services/advertisement.service";
import {
  BORDER_RADIUS,
  COLORS,
  commonStyles,
  SPACING,
} from "../../styles/lender.styles";

type Metric = { label: string; value: number; color?: string };

function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((metric) => (
        <View key={metric.label} style={styles.metricItem}>
          <Text
            style={[
              styles.metricValue,
              metric.color ? { color: metric.color } : null,
            ]}
          >
            {metric.value}
          </Text>
          <Text style={styles.metricLabel}>{metric.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AdAnalyticsScreen({ route, navigation }: any) {
  const adId = typeof route.params?.adId === "string" ? route.params.adId : "";
  const [analytics, setAnalytics] = useState<AdvertisementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(
    async (refresh = false) => {
      if (!adId) {
        setError("This advertisement could not be identified.");
        setLoading(false);
        return;
      }

      refresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setAnalytics(await AdService.getAdAnalytics(adId));
      } catch (requestError) {
        const accessDenied =
          requestError instanceof ApiError &&
          (requestError.status === 401 || requestError.status === 403);
        setError(
          accessDenied
            ? "Your session cannot access analytics for this advertisement."
            : getApiErrorMessage(
                requestError,
                "Advertisement analytics are unavailable right now.",
              ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adId],
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const header = (
    <View style={commonStyles.header}>
      <View style={commonStyles.headerFlexRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Ad analytics</Text>
        <View style={{ width: 22 }} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        {header}
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.stateText}>Loading advertisement activity…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !analytics) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        {header}
        <View style={styles.centerState}>
          <View style={styles.stateIcon}>
            <Feather name="bar-chart-2" size={26} color={COLORS.textSecondary} />
          </View>
          <Text style={styles.stateTitle}>Analytics unavailable</Text>
          <Text style={styles.stateText}>{error ?? "No analytics were found."}</Text>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={() => void loadAnalytics()}
            accessibilityRole="button"
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={commonStyles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const hasActivity =
    analytics.applications.total > 0 || analytics.loans.funded > 0;

  return (
    <SafeAreaView style={commonStyles.safe}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadAnalytics(true)}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <Feather name="bar-chart-2" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>{analytics.title}</Text>
              <Text style={styles.status}>
                {analytics.status.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
          <View style={styles.conversionRow}>
            <View>
              <Text style={styles.conversionLabel}>Funding rate</Text>
              <Text style={styles.conversionValue}>
                {analytics.fundingRate.toFixed(1)}%
              </Text>
            </View>
            <Text style={styles.conversionHint}>
              {analytics.loans.funded} of {analytics.applications.total} applications funded
            </Text>
          </View>
        </View>

        {!hasActivity && (
          <View style={styles.emptyBanner}>
            <Feather name="inbox" size={18} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              No borrower applications or funded loans have been recorded for this ad yet.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Applications</Text>
        <View style={styles.card}>
          <MetricGrid
            metrics={[
              { label: "Total", value: analytics.applications.total },
              { label: "Submitted", value: analytics.applications.submitted },
              { label: "Under review", value: analytics.applications.underReview },
              { label: "Approved", value: analytics.applications.approved, color: COLORS.success },
              { label: "Rejected", value: analytics.applications.rejected, color: COLORS.danger },
              { label: "Converted", value: analytics.applications.converted, color: COLORS.primary },
            ]}
          />
        </View>

        <Text style={styles.sectionTitle}>Funded loans</Text>
        <View style={styles.card}>
          <MetricGrid
            metrics={[
              { label: "Funded", value: analytics.loans.funded },
              { label: "Active", value: analytics.loans.active, color: COLORS.primary },
              { label: "Overdue", value: analytics.loans.overdue, color: COLORS.warning },
              { label: "Completed", value: analytics.loans.completed, color: COLORS.success },
              { label: "Defaulted", value: analytics.loans.defaulted, color: COLORS.danger },
            ]}
          />
          <Text style={styles.footnote}>
            Pending disbursement and cancelled loans are not counted as funded.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: 48 },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  stateText: { color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center" },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, marginLeft: SPACING.md },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  status: {
    marginTop: 3,
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  conversionRow: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  conversionLabel: { fontSize: 12, color: COLORS.textSecondary },
  conversionValue: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
  },
  conversionHint: {
    flex: 1,
    maxWidth: 180,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  emptyBanner: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: SPACING.lg },
  metricItem: { width: "33.333%", paddingHorizontal: SPACING.xs },
  metricValue: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  metricLabel: { marginTop: 3, color: COLORS.textSecondary, fontSize: 11 },
  footnote: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

/** @format */

import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Card from "../../components/common/Card";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";

export default function LenderHomeScreen() {
  const { dashboard, refreshing, refreshWorkspace, session } = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshWorkspace()}
          tintColor={COLORS.surface}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.badge}>Lender Mobile</Text>
        <Text style={styles.title}>
          {dashboard?.headline ??
            `Welcome back, ${session?.user.fullName?.split(" ")[0] ?? "Lender"}`}
        </Text>
        <Text style={styles.summary}>
          {dashboard?.summary ??
            "Track performance, manage requests, and review your portfolio."}
        </Text>

        <View style={styles.heroMetricsGrid}>
          {(dashboard?.metrics ?? []).slice(0, 2).map((metric) => (
            <View key={metric.label} style={styles.heroMetricCard}>
              <Text style={styles.heroMetricLabel}>{metric.label}</Text>
              <Text style={styles.heroMetricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mainContent}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {dashboard?.primaryListTitle ?? "Portfolio overview"}
          </Text>
          {(dashboard?.primaryList ?? []).length > 0 ? (
            dashboard?.primaryList.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listMain}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.listMetaText}>{item.meta}</Text>
                  <Text style={styles.listStatus}>{item.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No lender portfolio records are available yet.
            </Text>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            {dashboard?.secondaryListTitle ?? "Borrower relationships"}
          </Text>
          {(dashboard?.secondaryList ?? []).length > 0 ? (
            dashboard?.secondaryList.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={styles.listMain}>
                  <Text style={styles.listTitle}>{item.title}</Text>
                  <Text style={styles.listSubtitle}>{item.subtitle}</Text>
                </View>
                <View style={styles.listMeta}>
                  <Text style={styles.listMetaText}>{item.meta}</Text>
                  <Text style={styles.listStatus}>{item.status}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No borrower relationship records are available yet.
            </Text>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 42,
  },
  mainContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    marginTop: SPACING.lg,
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  summary: {
    marginTop: SPACING.sm,
    color: "rgba(255,255,255,0.88)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  heroMetricsGrid: {
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
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  heroMetricValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listMain: {
    flex: 1,
  },
  listTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  listSubtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  listMeta: {
    alignItems: "flex-end",
  },
  listMetaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  listStatus: {
    marginTop: 8,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});

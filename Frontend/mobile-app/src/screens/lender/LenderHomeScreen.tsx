/** @format */

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
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
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.badge}>Lender Mobile</Text>
        <Text style={styles.title}>
          {dashboard?.headline ?? `Welcome back, ${session?.user.fullName ?? "Lender"}`}
        </Text>
        <Text style={styles.summary}>
          {dashboard?.summary ??
            "Your lender dashboard is connected. Pull to refresh live platform data from the backend."}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        {(dashboard?.metrics ?? []).map((metric) => (
          <Card key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricHelper}>{metric.helper}</Text>
          </Card>
        ))}
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  hero: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xxl,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#EAF4FF",
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    marginTop: SPACING.lg,
    color: COLORS.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  summary: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  metricsGrid: {
    gap: SPACING.md,
  },
  metricCard: {
    gap: SPACING.sm,
  },
  metricLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  metricHelper: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    gap: SPACING.md,
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

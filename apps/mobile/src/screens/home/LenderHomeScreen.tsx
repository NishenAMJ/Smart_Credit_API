import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { FormCard } from "../../components/layout/FormCard";
import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";
import type { AdDocument, UserDocument } from "../../types/firestore";

type LenderHomeScreenProps = {
  user: UserDocument;
  ads: AdDocument[];
  refreshing: boolean;
  onRefresh: () => void;
};

export function LenderHomeScreen({
  user,
  ads,
  refreshing,
  onRefresh,
}: LenderHomeScreenProps) {
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={ads.filter((item) => item.lenderId === user.uid)}
      keyExtractor={(item) => item.adId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Lender Home</Text>
            <Text style={styles.heroTitle}>Welcome, {user.fullName}</Text>
            <Text style={styles.heroText}>
              Rating: {user.rating ?? 0} {"\n"}
              Total Lent: LKR {(user.totalAmountLent ?? 0).toLocaleString()}
            </Text>
          </View>

          <View style={styles.statRow}>
            <FormCard>
              <Text style={styles.statLabel}>Loans Completed</Text>
              <Text style={styles.statValue}>{user.totalLoansCompleted ?? 0}</Text>
            </FormCard>
            <FormCard>
              <Text style={styles.statLabel}>KYC Status</Text>
              <Text style={styles.statValue}>{user.kycStatus}</Text>
            </FormCard>
          </View>

          <Text style={styles.sectionTitle}>Your Active Ads</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.adCard}>
          <Text style={styles.adTitle}>
            LKR {item.maxAmount.toLocaleString()} • {item.location}
          </Text>
          <Text style={styles.adMeta}>
            Interest {item.preferredInterestRate}% • {item.minTenureMonths}-{item.maxTenureMonths} months
          </Text>
          <Text style={styles.adPurposes}>{item.preferredPurposes.join(" • ")}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No active lender ads found for this account.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg },
  headerBlock: { gap: SPACING.lg, marginBottom: SPACING.sm },
  hero: {
    backgroundColor: "#0A1628",
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.xl,
  },
  eyebrow: { color: "#8A9BB5", fontSize: 12, fontWeight: "600" },
  heroTitle: {
    color: COLORS.surface,
    fontSize: 24,
    fontWeight: "700",
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  heroText: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20 },
  statRow: { flexDirection: "row", gap: SPACING.md },
  statLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "500" },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: SPACING.xs,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "700" },
  adCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  adTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },
  adMeta: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  adPurposes: { color: COLORS.primary, fontSize: 12, fontWeight: "600" },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    paddingVertical: SPACING.xxl,
  },
});

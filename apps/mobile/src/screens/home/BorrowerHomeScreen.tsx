import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { FormCard } from "../../components/layout/FormCard";
import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";
import type { AdDocument, UserDocument } from "../../types/firestore";

type BorrowerHomeScreenProps = {
  user: UserDocument;
  ads: AdDocument[];
  refreshing: boolean;
  onRefresh: () => void;
};

export function BorrowerHomeScreen({
  user,
  ads,
  refreshing,
  onRefresh,
}: BorrowerHomeScreenProps) {
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={ads}
      keyExtractor={(item) => item.adId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Borrower Home</Text>
            <Text style={styles.heroTitle}>Welcome, {user.fullName}</Text>
            <Text style={styles.heroText}>
              Credit score: {user.creditScore} {"\n"}
              KYC status: {user.kycStatus}
            </Text>
          </View>

          <View style={styles.statRow}>
            <FormCard>
              <Text style={styles.statLabel}>Loans Completed</Text>
              <Text style={styles.statValue}>{user.totalLoansCompleted ?? 0}</Text>
            </FormCard>
            <FormCard>
              <Text style={styles.statLabel}>Borrowed</Text>
              <Text style={styles.statValue}>
                LKR {(user.totalAmountBorrowed ?? 0).toLocaleString()}
              </Text>
            </FormCard>
          </View>

          <Text style={styles.sectionTitle}>Available Lender Ads</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.adCard}>
          <Text style={styles.adTitle}>{item.lenderName}</Text>
          <Text style={styles.adMeta}>
            Up to LKR {item.maxAmount.toLocaleString()} • {item.preferredInterestRate}%
          </Text>
          <Text style={styles.adPurposes}>{item.preferredPurposes.join(" • ")}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No active lender ads found right now.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg },
  headerBlock: { gap: SPACING.lg, marginBottom: SPACING.sm },
  hero: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.xl,
  },
  eyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
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

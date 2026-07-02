import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader } from "../../components/lender";
import { DashboardService } from "../../services/lender.service";

export default function BorrowerDetailScreen({ navigation, route }: any) {
  const borrower = route?.params?.borrower;

  if (!borrower) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader
          title="Borrower"
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No borrower data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    id,
    fullName,
    email,
    phone,
    creditScore,
    kycStatus,
    loanCount,
    activeLoansCount,
    totalBorrowedAmount,
    outstandingAmount,
    rating,
    isActive,
    createdAt,
  } = borrower;

  const getScoreColor = () => {
    if ((creditScore ?? 0) >= 750) return COLORS.success;
    if ((creditScore ?? 0) >= 650) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <SafeAreaView style={commonStyles.safe}>
      <LenderHeader title="Borrower" onBackPress={() => navigation.goBack()} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={commonStyles.card}>
          <View style={commonStyles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName?.[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
            <View>
              <Text style={commonStyles.textPrimary}>
                {fullName ?? "Unknown"}
              </Text>
              <Text style={commonStyles.textSecondary}>{email ?? ""}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={commonStyles.textSecondary}>Credit Score</Text>
              <Text style={[styles.scoreText, { color: getScoreColor() }]}>
                {creditScore ?? "--"}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={commonStyles.textSecondary}>Rating</Text>
              <Text style={commonStyles.textPrimary}>
                {rating != null ? `★${rating}` : "--"}
              </Text>
            </View>
          </View>
        </View>

        {/* Loan Summary */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loan Summary</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Total Loans</Text>
            <Text style={commonStyles.textPrimary}>{loanCount ?? 0}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Active Loans</Text>
            <Text style={commonStyles.textPrimary}>
              {activeLoansCount ?? 0}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>Total Borrowed</Text>
            <Text style={commonStyles.textPrimary}>
              LKR {totalBorrowedAmount?.toLocaleString() ?? 0}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={commonStyles.textSecondary}>Outstanding</Text>
            <Text style={commonStyles.textPrimary}>
              LKR {outstandingAmount?.toLocaleString() ?? 0}
            </Text>
          </View>
        </View>

        {/* KYC Status */}
        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Verification</Text>
          <View style={styles.detailRow}>
            <Text style={commonStyles.textSecondary}>KYC Status</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    kycStatus === "approved" ? "#ECFDF5" : "#FEF2F2",
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      kycStatus === "approved" ? COLORS.success : COLORS.danger,
                  },
                ]}
              >
                {kycStatus ?? "unknown"}
              </Text>
            </View>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={commonStyles.textSecondary}>Status</Text>
            <Text style={commonStyles.textPrimary}>
              {isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={() => navigation.navigate("LoanDetails", { loanId: id })}
          >
            <Text style={commonStyles.buttonText}>View Loans</Text>
          </TouchableOpacity>
        </View>

        <View style={commonStyles.spacer32} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  grid: {
    flexDirection: "row",
    gap: 16,
  },
  gridItem: { flex: 1 },
  scoreText: { fontSize: 18, fontWeight: "700" },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  buttonGroup: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: COLORS.textSecondary },
});

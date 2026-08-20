import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { commonStyles, COLORS } from "../../styles/lender.styles";
import { LenderHeader } from "../../components/lender";
import { DashboardService } from "../../services/lender.service";

export default function BorrowerDetailScreen({ navigation, route }: any) {
  const initialBorrower = route?.params?.borrower;
  const borrowerId = initialBorrower?.id;
  const [borrower, setBorrower] = useState<any>(initialBorrower ?? null);
  const [loading, setLoading] = useState(Boolean(borrowerId));

  useEffect(() => {
    if (!borrowerId) return;
    DashboardService.getBorrowerDetails(borrowerId)
      .then(setBorrower)
      .finally(() => setLoading(false));
  }, [borrowerId]);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safe}>
        <LenderHeader title="Borrower" onBackPress={() => navigation.goBack()} />
        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={COLORS.primary}
          size="large"
        />
      </SafeAreaView>
    );
  }

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
    loans = [],
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

        <View style={commonStyles.card}>
          <Text style={commonStyles.sectionTitle}>Loans with this lender</Text>
          {loans.length === 0 ? (
            <Text style={commonStyles.textSecondary}>No loans found.</Text>
          ) : (
            loans.map((loan: any) => (
              <TouchableOpacity
                key={loan.id}
                style={styles.loanRow}
                onPress={() =>
                  navigation.navigate("LoanDetails", { loanId: loan.id })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={commonStyles.textPrimary}>
                    LKR {Number(loan.amount ?? 0).toLocaleString()}
                  </Text>
                  <Text style={commonStyles.textSecondary}>
                    {String(loan.status ?? "unknown").replace("_", " ")}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={commonStyles.textSecondary}>Outstanding</Text>
                  <Text style={commonStyles.textPrimary}>
                    LKR {Number(loan.remainingAmount ?? 0).toLocaleString()}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={COLORS.textSecondary}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            ))
          )}
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
  loanRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: COLORS.textSecondary },
});

/** @format */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import LoanCard from "../../components/borrower/LoanCard";
import EmptyState from "../../components/common/EmptyState";
import { getMyLoans } from "../../api/services/loan.service";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import type { BorrowerLoan } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";

type MyLoansScreenProps = {
  navigation: BorrowerNavigation;
};

export default function MyLoansScreen({ navigation }: MyLoansScreenProps) {
  const [loans, setLoans] = useState<BorrowerLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches active loans for the current borrower and updates the state.
   */

  const fetchLoans = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyLoans("active");
      setLoans(data ?? []);
    } catch (err) {
      console.error("Error fetching active loans:", err);
      setError("Failed to load your active loans.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handles the pull-to-refresh action on the FlatList.
   */
  const onRefresh = () => {
    setRefreshing(true);
    void fetchLoans();
  };

  useEffect(() => {
    void fetchLoans();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary || "#1A1A1A"} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Loans</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.error || "#EF4444"} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLoans}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.loanId}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              showApplyNow={false}
              onPress={() => navigation.navigate("LoanDetails", { loan: item })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              title="No active loans"
              description="You don't have any active loans right now. Head over to Find Loans to explore offers."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface || "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary || "#1A1A1A",
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.surface || "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
});

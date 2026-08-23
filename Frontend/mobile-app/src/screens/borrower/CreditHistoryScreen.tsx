/** @format */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { getApiErrorMessage } from "../../api/api-error";
import { creditScoreService } from "../../api/services/creditScore.service";
import type { BorrowerNavigation } from "../../types/navigation";
import { COLORS } from "../../constants/colors";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";
import BorrowerRefreshControl from "../../components/borrower/BorrowerRefreshControl";

type CreditHistoryScreenProps = {
  navigation: BorrowerNavigation;
};

type CreditHistoryItem = {
  month: string;
  score: number;
  note?: string;
};

/**
 * Shows borrower credit score trend history.
 */
export default function CreditHistoryScreen({
  navigation,
}: CreditHistoryScreenProps) {
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchHistory = useCallback(async () => {
    try {
      setErrorMessage("");
      const response = await creditScoreService.getCreditHistory();
      setHistory(response?.data ?? []);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load credit history.",
      );
      console.error("Error fetching credit history:", message);
      setErrorMessage(message);
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <View style={styles.container}>
      <BorrowerPageHeader
        title="Credit History"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <BorrowerRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : null}

        {!loading && history.length === 0 ? (
          <Text style={styles.emptyText}>
            {errorMessage || "No credit history available."}
          </Text>
        ) : null}

        {history.map((item) => (
          <View key={item.month} style={styles.historyCard}>
            <View style={styles.historyTop}>
              <Text style={styles.month}>{item.month}</Text>
              <Text style={styles.score}>{item.score}</Text>
            </View>
            <Text style={styles.note}>{item.note}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 20,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  month: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  score: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  note: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

/** @format */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { creditScoreService } from "../../api/services/creditScore.service";
import type { BorrowerNavigation } from "../../types/navigation";

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

  useEffect(() => {
    void (async () => {
      try {
        const response = await creditScoreService.getCreditHistory();
        setHistory(response?.data ?? []);
      } catch (error) {
        console.error("Error fetching credit history:", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Credit History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator size="large" color="#007AFF" /> : null}

        {!loading && history.length === 0 ? (
          <Text style={styles.emptyText}>No credit history available.</Text>
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
    backgroundColor: "#F5F6FA",
  },
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
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
    color: "#007AFF",
  },
  note: {
    fontSize: 12,
    color: "#6B7280",
  },
});

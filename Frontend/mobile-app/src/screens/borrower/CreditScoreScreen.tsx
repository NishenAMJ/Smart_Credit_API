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
import { getApiErrorMessage } from "../../api/api-error";
import { creditScoreService } from "../../api/services/creditScore.service";
import type { CreditScoreSummary } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";
import { getScoreColor, getScoreRating } from "../../utils/scoreUtils";

type CreditScoreScreenProps = {
  navigation: BorrowerNavigation;
};

/**
 * Displays borrower credit score summary and key indicators.
 */
export default function CreditScoreScreen({
  navigation,
}: CreditScoreScreenProps) {
  const [creditData, setCreditData] = useState<CreditScoreSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void fetchCreditScore();
  }, []);

  const fetchCreditScore = async () => {
    try {
      setErrorMessage("");
      const response = await creditScoreService.getMyCreditScore();
      setCreditData(response?.data ?? null);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Failed to load your credit score.",
      );
      console.error("Error fetching credit score:", message);
      setErrorMessage(message);
      setCreditData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
      </View>
    );
  }

  const score = creditData?.smartScore || 0;
  const scoreLevel = {
    text: getScoreRating(score).toUpperCase(),
    color: getScoreColor(score),
  };
  const breakdown = Object.entries(creditData?.breakdown ?? {});

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name='arrow-left' size={24} color='#FFFFFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Credit Score</Text>
        <TouchableOpacity onPress={() => navigation.navigate("CreditHistory")}>
          <Feather name='clock' size={20} color='#FFFFFF' />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {errorMessage ? (
          <Text style={styles.emptyBreakdownText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.scoreCard}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>
              {creditData?.smartScore || 0}
            </Text>
            <Text style={[styles.scoreLevel, { color: scoreLevel.color }]}>
              {scoreLevel.text}
            </Text>
          </View>

          <View style={styles.stars}>
            {[1, 2, 3, 4].map((star) => (
              <Feather
                key={star}
                name='star'
                size={20}
                color={
                  (creditData?.smartScore || 0) >= star * 200
                    ? "#F59E0B"
                    : "#E5E7EB"
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>

          {breakdown.length > 0 ? (
            breakdown.map(([key, item]) => {
              const value = Math.max(0, Math.min(100, item.subScore));

              return (
                <View key={key} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={styles.breakdownValue}>{value}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${value}%` }]}
                    />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyBreakdownText}>
              Your score breakdown will appear after the first calculation.
            </Text>
          )}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.sectionTitle}>Tips to Improve</Text>
          <View style={styles.tip}>
            <Feather name='check-circle' size={20} color='#10B981' />
            <Text style={styles.tipText}>Pay all loans on time</Text>
          </View>
          <View style={styles.tip}>
            <Feather name='check-circle' size={20} color='#10B981' />
            <Text style={styles.tipText}>Maintain low balance</Text>
          </View>
          <View style={styles.tip}>
            <Feather name='check-circle' size={20} color='#10B981' />
            <Text style={styles.tipText}>Avoid multiple loan applications</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  scoreLevel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stars: {
    flexDirection: "row",
    gap: 8,
  },

  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  breakdownItem: {
    marginBottom: 20,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  emptyBreakdownText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  tipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 100,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 12,
  },
});

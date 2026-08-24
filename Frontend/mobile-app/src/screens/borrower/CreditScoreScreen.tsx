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
import type { CreditScoreSummary } from "../../types/borrower";
import type { BorrowerNavigation } from "../../types/navigation";
import { getScoreColor, getScoreRating } from "../../utils/scoreUtils";
import { COLORS } from "../../constants/colors";
import BorrowerPageHeader from "../../components/borrower/BorrowerPageHeader";
import BorrowerRefreshControl from "../../components/borrower/BorrowerRefreshControl";

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
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCreditScore();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <BorrowerPageHeader
        title="Smart Credit Score"
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "clock",
            label: "View credit history",
            onPress: () => navigation.navigate("CreditHistory"),
          },
        ]}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <BorrowerRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
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
                name="star"
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
            <Feather name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.tipText}>Pay all loans on time</Text>
          </View>
          <View style={styles.tip}>
            <Feather name="check-circle" size={20} color={COLORS.success} />
            <Text style={styles.tipText}>Maintain low balance</Text>
          </View>
          <View style={styles.tip}>
            <Feather name="check-circle" size={20} color={COLORS.success} />
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.surface,
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
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyBreakdownText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
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
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
});

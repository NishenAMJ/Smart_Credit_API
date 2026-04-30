/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { getScoreColor, getScoreRating } from "../../utils/scoreUtils";

type CreditScoreWidgetProps = {
  score?: number;
  creditLimit?: number;
  onPress?: () => void;
};

/**
 * Displays borrower credit score metrics in a compact widget.
 */
export default function CreditScoreWidget({
  score = 0,
  onPress,
}: CreditScoreWidgetProps) {
  const rating = getScoreRating(score).toUpperCase();
  const scoreColor = getScoreColor(score);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Credit Score</Text>
        <Feather name='chevron-right' size={20} color='#6B7280' />
      </View>

      <View style={styles.scoreContainer}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={[styles.scoreLevel, { color: scoreColor }]}>
            {rating}
          </Text>
        </View>

        <View style={styles.stars}>
          {[1, 2, 3, 4].map((star) => (
            <Feather
              key={star}
              name='star'
              size={16}
              color={score >= star * 200 ? "#F59E0B" : "#E5E7EB"}
            />
          ))}
        </View>
      </View>

      <View style={styles.divider} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scoreContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  scoreLevel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 15,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

/** @format */

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";

type LoanDetailsHeaderProps = {
  title: string;
  onBack?: () => void;
};

/**
 * Header section for borrower loan details and key values.
 */
export default function LoanDetailsHeader({
  title,
  onBack,
}: LoanDetailsHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack}>
        <Feather name="arrow-left" size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#007AFF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  spacer: {
    width: 22,
  },
});

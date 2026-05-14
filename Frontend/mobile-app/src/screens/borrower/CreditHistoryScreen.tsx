/** @format */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CreditHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Credit History</Text>
      <Text style={styles.subtitle}>Score timeline will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
});

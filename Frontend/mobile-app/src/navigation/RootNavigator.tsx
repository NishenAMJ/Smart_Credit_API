/** @format */

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import AuthStackNavigator from "./AuthStackNavigator";
import BorrowerStackNavigator from "./BorrowerStackNavigator";
import LenderStackNavigator from "./LenderStackNavigator";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/colors";

export default function RootNavigator() {
  const { authLoading, session } = useAuth();

  if (authLoading && !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Preparing your Smart Credit+ workspace...
        </Text>
      </View>
    );
  }

  if (!session) {
    return <AuthStackNavigator />;
  }

  if (session.user.role === "lender") {
    return <LenderStackNavigator />;
  }

  if (session.user.role === "borrower") {
    return <BorrowerStackNavigator />;
  }

  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.unsupportedTitle}>
        Mobile access is unavailable for this role.
      </Text>
      <Text style={styles.loadingText}>
        Admin accounts are supported on the website only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  unsupportedTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
});

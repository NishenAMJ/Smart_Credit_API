/** @format */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ApplicationDetailsScreenProps = {
  route: {
    params?: {
      application?: {
        loanTitle?: string;
      };
    };
  };
};

export default function ApplicationDetailsScreen({
  route,
}: ApplicationDetailsScreenProps) {
  const application = route.params?.application;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Details</Text>
      <Text style={styles.subtitle}>{application?.loanTitle ?? "No data"}</Text>
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

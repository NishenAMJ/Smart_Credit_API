/** @format */

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { useAuth } from "../../context/AuthContext";

export default function LenderProfileScreen() {
  const { session, sessionStatus, signOut } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.title}>Lender profile</Text>
        <Text style={styles.subtitle}>
          These details come from your authenticated user record in Firestore.
        </Text>

        <DetailRow label='Full name' value={session?.user.fullName ?? "-"} />
        <DetailRow label='Email' value={session?.user.email ?? "-"} />
        <DetailRow label='Phone' value={session?.user.phone ?? "-"} />
        <DetailRow label='Role' value={sessionStatus?.activeRole ?? session?.user.role ?? "-"} />
        <DetailRow label='KYC status' value={sessionStatus?.kycStatus ?? session?.user.kycStatus ?? "-"} />
        <DetailRow label='Account status' value={sessionStatus?.accountStatus ?? "active"} />

        <Button onPress={signOut}>Log out</Button>
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
  card: {
    gap: SPACING.md,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  detailValue: {
    marginTop: 6,
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
});

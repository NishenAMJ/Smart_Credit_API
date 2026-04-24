import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type SuccessStateProps = {
  title: string;
  message: string;
};

export function SuccessState({ title, message }: SuccessStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.check}>✓</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: SPACING.md,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2F6BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    color: COLORS.surface,
    fontSize: 48,
    fontWeight: "700",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
});

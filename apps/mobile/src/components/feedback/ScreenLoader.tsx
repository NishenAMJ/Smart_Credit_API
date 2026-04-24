import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";

type ScreenLoaderProps = {
  label?: string;
};

export function ScreenLoader({
  label = "Loading...",
}: ScreenLoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: 24,
  },
  label: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
});

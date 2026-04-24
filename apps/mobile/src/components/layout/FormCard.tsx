import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";

export function FormCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

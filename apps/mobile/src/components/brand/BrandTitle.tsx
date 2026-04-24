import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";

type BrandTitleProps = {
  title?: string;
  subtitle?: string;
};

export function BrandTitle({
  title = "Smart Credit+",
  subtitle,
}: BrandTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: TYPOGRAPHY.body.fontWeight,
    textAlign: "center",
  },
});

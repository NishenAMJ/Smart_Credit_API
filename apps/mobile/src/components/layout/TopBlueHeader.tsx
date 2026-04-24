import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";

type TopBlueHeaderProps = {
  title: string;
  subtitle?: string;
};

export function TopBlueHeader({ title, subtitle }: TopBlueHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomLeftRadius: BORDER_RADIUS.large,
    borderBottomRightRadius: BORDER_RADIUS.large,
    alignItems: "center",
  },
  title: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.heading.fontSize,
    fontWeight: TYPOGRAPHY.heading.fontWeight,
  },
  subtitle: {
    marginTop: SPACING.sm,
    color: "rgba(255,255,255,0.88)",
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: TYPOGRAPHY.body.fontWeight,
    textAlign: "center",
  },
});

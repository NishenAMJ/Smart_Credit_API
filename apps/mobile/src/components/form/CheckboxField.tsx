import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";

type CheckboxFieldProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function CheckboxField({
  label,
  value,
  onChange,
}: CheckboxFieldProps) {
  return (
    <Pressable style={styles.container} onPress={() => onChange(!value)}>
      <View style={[styles.box, value && styles.boxChecked]}>
        {value ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  box: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#D0D5DD",
    borderRadius: BORDER_RADIUS.small / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  boxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  check: {
    color: COLORS.surface,
    fontSize: 10,
    fontWeight: "700",
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
});

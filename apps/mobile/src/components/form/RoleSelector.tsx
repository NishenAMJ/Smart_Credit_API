import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";

type RoleOption = "borrower" | "lender";

type RoleSelectorProps = {
  value: RoleOption;
  onChange: (value: RoleOption) => void;
};

const OPTIONS: Array<{ label: string; value: RoleOption }> = [
  { label: "Borrower", value: "borrower" },
  { label: "Lender", value: "lender" },
];

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#EAF2FF",
    borderRadius: BORDER_RADIUS.large,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    minHeight: 42,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  optionTextActive: {
    color: COLORS.surface,
  },
});

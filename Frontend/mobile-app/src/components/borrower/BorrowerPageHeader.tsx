/** @format */

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { SPACING } from "../../constants/spacing";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export type BorrowerHeaderAction = {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

type BorrowerPageHeaderProps = {
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
  actions?: BorrowerHeaderAction[];
  style?: ViewStyle;
};

/** Shared, accessible header for borrower tab and stack screens. */
export default function BorrowerPageHeader({
  title,
  onBack,
  onMenu,
  actions = [],
  style,
}: BorrowerPageHeaderProps) {
  const leadingAction = onBack ?? onMenu;
  const leadingIcon: FeatherName = onBack ? "arrow-left" : "menu";
  const leadingLabel = onBack ? "Go back" : "Open navigation menu";

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leadingGroup}>
        {leadingAction ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={leadingAction}
            accessibilityRole="button"
            accessibilityLabel={leadingLabel}
          >
            <Feather name={leadingIcon} size={22} color={COLORS.onPrimary} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.iconButton}
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: action.disabled }}
          >
            <Feather name={action.icon} size={20} color={COLORS.onPrimary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 104,
    paddingTop: 48,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leadingGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  title: {
    flexShrink: 1,
    color: COLORS.onPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryOverlay,
  },
});

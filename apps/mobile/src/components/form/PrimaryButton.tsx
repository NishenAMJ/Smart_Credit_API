import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { TYPOGRAPHY } from "../../constants/typography";

type PrimaryButtonProps = PropsWithChildren<{
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}>;

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  children,
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface} />
      ) : (
        <Text style={styles.text}>{title ?? children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  text: {
    color: COLORS.surface,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "600",
  },
});

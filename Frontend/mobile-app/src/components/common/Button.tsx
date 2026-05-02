/** @format */

import React, { PropsWithChildren } from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { COLORS } from "../../constants/colors";

type ButtonProps = PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}>;

export default function Button({
  children,
  onPress,
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  disabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.2,
  },
});

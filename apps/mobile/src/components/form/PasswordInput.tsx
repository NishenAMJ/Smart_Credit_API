import { useState } from "react";
import type { TextInputProps } from "react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS } from "../../constants/colors";
import { BORDER_RADIUS } from "../../constants/radius";
import { SPACING } from "../../constants/spacing";
import { TYPOGRAPHY } from "../../constants/typography";
import { ErrorText } from "../feedback/ErrorText";

type PasswordInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function PasswordInput({
  label,
  error,
  style,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor="#A0A7B4"
          style={[styles.input, style]}
          secureTextEntry={!isVisible}
          {...props}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsVisible((current) => !current)}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>{isVisible ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  label: {
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.lg,
    paddingRight: 64,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: "400",
  },
  toggle: {
    position: "absolute",
    right: SPACING.lg,
  },
  toggleText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});

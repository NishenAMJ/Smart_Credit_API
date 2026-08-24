/** @format */

import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { COLORS } from "../../constants/colors";

export default function Input({
  secureTextEntry,
  style,
  testID,
  ...props
}: TextInputProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordInput = Boolean(secureTextEntry);

  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        testID={testID}
        secureTextEntry={isPasswordInput && !passwordVisible}
        style={[styles.input, style]}
        placeholderTextColor={COLORS.textSecondary}
      />
      {isPasswordInput ? (
        <Pressable
          testID={testID ? `${testID}-visibility-toggle` : undefined}
          accessibilityRole="button"
          accessibilityLabel={
            passwordVisible ? "Hide password" : "Show password"
          }
          accessibilityState={{ expanded: passwordVisible }}
          hitSlop={10}
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={({ pressed }) => [
            styles.visibilityButton,
            pressed && styles.visibilityButtonPressed,
          ]}
        >
          <Feather
            name={passwordVisible ? "eye-off" : "eye"}
            size={20}
            color={COLORS.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#E5EAF2",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  visibilityButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
  },
  visibilityButtonPressed: {
    opacity: 0.6,
  },
});

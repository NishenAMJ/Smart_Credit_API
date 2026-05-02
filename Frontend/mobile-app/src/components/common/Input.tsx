/** @format */

import React from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { COLORS } from "../../constants/colors";

export default function Input(props: TextInputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        {...props}
        style={[styles.input, props.style]}
        placeholderTextColor={COLORS.textSecondary}
      />
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
    justifyContent: "center",
  },
  input: {
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

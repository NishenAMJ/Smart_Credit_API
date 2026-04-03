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
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
  },
  input: {
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});

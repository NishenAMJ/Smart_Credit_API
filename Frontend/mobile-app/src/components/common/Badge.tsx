/** @format */

import React, { PropsWithChildren } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type BadgeProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export default function Badge({ children, style }: BadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },
});

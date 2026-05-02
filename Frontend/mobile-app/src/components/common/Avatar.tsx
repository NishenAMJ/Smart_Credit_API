/** @format */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { firstChar } from "../../utils/helpers";

type AvatarProps = {
  name?: string;
  label?: string;
  size?: number;
  avatarUrl?: string | null;
  showOnline?: boolean;
  isOnline?: boolean;
};

export default function Avatar({ name, label, size = 40, avatarUrl, showOnline, isOnline }: AvatarProps) {
  const displayLabel = name || label;
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.text}>{firstChar(displayLabel, "U")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: "#E0F2FE",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 16,
  },
});

/** @format */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { firstChar } from "../../utils/helpers";

type AvatarProps = {
  label?: string;
  size?: number;
};

export default function Avatar({ label, size = 40 }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.text}>{firstChar(label, "U")}</Text>
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
